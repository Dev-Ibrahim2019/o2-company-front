<?php

namespace App\Services;

use App\Models\Printer;
use App\Models\PrintRoute;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

/**
 * خدمة التوجيه الذكي للطباعة
 * ─────────────────────────────
 * الخوارزمية: عند استلام فاتورة/أمر تشغيل:
 * 1. Loop على كل صنف في الطلب
 * 2. فحص item_id مباشرة (أعلى أولوية)
 * 3. إذا لم يجد → فحص category_id
 * 4. إذا لم يجد → استخدام الطابعة الافتراضية للفرع
 * 5. تجميع الأصناف الموجهة لنفس الطابعة في مصفوفة
 * 6. إرسال كل مجموعة عبر TCP Socket
 */
class PrintRoutingService
{
    /**
     * معالجة طباعة فاتورة/أمر تشغيل
     *
     * @param int    $branchId    معرّف الفرع
     * @param array  $items       الأصناف: [{item_id, name, quantity, category_id, ...}]
     * @param int|null $userId    معرّف المستخدم/الجهاز المرسل (null = غير معروف)
     * @return array             مصفوفة الطابعات مع الأصناف الموجهة لكل منها
     */
    public function routeOrder(int $branchId, array $items, ?int $userId = null): array
    {
        // 1. جلب جميع القواعد الفعالة للفرع
        $routes = $this->getActiveRoutes($branchId);

        // 2. تجميع الأصناف حسب الطابعة
        $printerGroups = [];

        foreach ($items as $item) {
            $printerId = $this->resolvePrinterForItem(
                $item,
                $routes,
                $userId,
                $branchId
            );

            if ($printerId === null) {
                // لا توجد قاعدة → تجاهل (أو استخدم افتراضي)
                Log::warning("No print route found for item {$item['item_id']} in branch {$branchId}");
                continue;
            }

            if (!isset($printerGroups[$printerId])) {
                $printerGroups[$printerId] = [];
            }

            $printerGroups[$printerId][] = $item;
        }

        // 3. جلب بيانات الطابعات النهائية
        $result = [];
        foreach ($printerGroups as $printerId => $groupItems) {
            $printer = Printer::find($printerId);
            if ($printer && $printer->is_active) {
                $result[] = [
                    'printer' => $printer,
                    'items'   => $groupItems,
                    'count'   => count($groupItems),
                ];
            }
        }

        return $result;
    }

    /**
     * تحديد الطابعة المناسبة لصنف معين
     * ─────────────────────────────────────
     * الأولوية:
     *   1. قاعدة الصنف المحدد (scope=ITEM, item_id=...)
     *   2. قاعدة القسم (scope=CATEGORY, category_id=...)
     *   3. الطابعة الافتراضية للفرع
     *
     * @return int|null معرّف الطابعة أو null
     */
    private function resolvePrinterForItem(
        array $item,
        Collection $routes,
        ?int $userId,
        int $branchId
    ): ?int {
        $itemId = $item['item_id'];
        $categoryId = $item['category_id'] ?? null;

        // ── المستوى 1: بحث دقيق عن الصنف ───────────────────
        $itemRoute = $routes->first(function ($route) use ($itemId, $userId) {
            return $route->scope === 'ITEM'
                && $route->item_id == $itemId
                && $this->matchesUser($route, $userId);
        });

        if ($itemRoute) {
            Log::info("Route matched: ITEM #{$itemId} → Printer #{$itemRoute->printer_id}");
            return $itemRoute->printer_id;
        }

        // ── المستوى 2: بحث بالقسم ──────────────────────────
        if ($categoryId) {
            $categoryRoute = $routes->first(function ($route) use ($categoryId, $userId) {
                return $route->scope === 'CATEGORY'
                    && $route->category_id == $categoryId
                    && $this->matchesUser($route, $userId);
            });

            if ($categoryRoute) {
                Log::info("Route matched: CATEGORY #{$categoryId} → Printer #{$categoryRoute->printer_id}");
                return $categoryRoute->printer_id;
            }
        }

        // ── المستوى 3: الطابعة الافتراضية ──────────────────
        $defaultPrinter = Printer::where('branch_id', $branchId)
            ->where('is_active', true)
            ->where('type', 'KITCHEN')
            ->first();

        if ($defaultPrinter) {
            Log::info("Default printer fallback: Printer #{$defaultPrinter->id}");
            return $defaultPrinter->id;
        }

        return null;
    }

    /**
     * فحص تطابق المستخدم مع القاعدة
     * null في القاعدة = كل الأجهزة
     */
    private function matchesUser(PrintRoute $route, ?int $userId): bool
    {
        // القاعدة عامة (لكل الأجهزة)
        if ($route->user_id === null) {
            return true;
        }

        // القاعدة محددة لمستخدم معين
        if ($userId !== null && $route->user_id == $userId) {
            return true;
        }

        return false;
    }

    /**
     * جلب القواعد الفعالة مع الترتيب حسب الأولوية
     */
    private function getActiveRoutes(int $branchId): Collection
    {
        return PrintRoute::where('branch_id', $branchId)
            ->where('is_active', true)
            ->orderByDesc('priority')
            ->get();
    }

    /**
     * إرسال أمر طباعة لطابعة SNBC عبر TCP Socket
     * ──────────────────────────────────────────────
     * SNBC تستخدم بروتوكول ESC/POS عبر المنفذ 9100
     *
     * @param Printer $printer  الطابعة المستهدفة
     * @param array   $items    الأصناف الموجهة لهذه الطابعة
     * @return array            نتيجة الإرسال
     */
    public function sendToPrinter(Printer $printer, array $items): array
    {
        $ip = $printer->ip_address;
        $port = (int) $printer->port;

        // بناء محتوى الطباعة (ESC/POS format)
        $content = $this->buildPrintContent($printer, $items);

        try {
            $fp = fsockopen($ip, $port, $errno, $errstr, 5);

            if (!$fp) {
                return [
                    'success' => false,
                    'printer' => $printer->name,
                    'message' => "فشل الاتصال: {$errstr} ({$errno})",
                ];
            }

            // إرسال المحتوى
            fwrite($fp, $content);
            fclose($fp);

            Log::info("Print job sent to {$printer->name} ({$ip}:{$port}), " . count($items) . " items");

            return [
                'success' => true,
                'printer' => $printer->name,
                'message' => 'تم الإرسال بنجاح',
                'items_count' => count($items),
            ];
        } catch (\Exception $e) {
            Log::error("Print error on {$printer->name}: " . $e->getMessage());

            return [
                'success' => false,
                'printer' => $printer->name,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * بناء محتوى الطباعة بصيغة ESC/POS
     */
    private function buildPrintContent(Printer $printer, array $items): string
    {
        $lines = [];

        // رأس الفاتورة
        $lines[] = str_repeat('=', 32);
        $lines[] = $printer->name;
        $lines[] = date('Y-m-d H:i:s');
        $lines[] = str_repeat('-', 32);

        // الأصناف
        foreach ($items as $item) {
            $name = $item['name'] ?? 'صنف #' . $item['item_id'];
            $qty = $item['quantity'] ?? 1;
            $lines[] = "{$qty}x {$name}";

            if (!empty($item['note'])) {
                $lines[] = "  ملاحظة: {$item['note']}";
            }
        }

        $lines[] = str_repeat('=', 32);
        $lines[] = "عدد الأصناف: " . count($items);
        $lines[] = '';

        return implode("\n", $lines);
    }
}
