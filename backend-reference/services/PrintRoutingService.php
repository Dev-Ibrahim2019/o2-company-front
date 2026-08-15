<?php

namespace App\Services;

use App\Models\Printer;
use Illuminate\Support\Facades\Log;

/**
 * خدمة التوجيه الذكي للطباعة
 * ─────────────────────────────
 * ⚠️ ملاحظة توافق (2026-07-19): تم نقل التوجيه من جدول `print_routes` المنفصل
 * ليصبح مدمجاً داخل سجل الطابعة نفسه (شاهد Printer::$linked_pos_register_id,
 * $department_ids, $item_ids, $print_on_direct — وشاشة الإدارة src/components/
 * administration/printers-management.tsx بالفرونت). القواعد القديمة المبنية على
 * جدول PrintRoute لم تعد تُنشأ من أي واجهة، لذلك أُزيل الاعتماد عليها هنا؛
 * إن كانت قاعدة بياناتكم لا تزال تحتوي بيانات قديمة بذلك الجدول راجعوا الفريق
 * قبل حذفه نهائياً.
 *
 * الخوارزمية الحالية لكل صنف في الطلب:
 * 1. طابعة تطابق item_id ضمن item_ids الخاص بها (أعلى أولوية)
 * 2. طابعة تطابق department_id ضمن department_ids الخاص بها
 * 3. إن كان الطلب صادراً عن جهاز كاشير معروف (direct-print) → طابعة
 *    linked_pos_register_id == cashierDeviceId و print_on_direct = true
 * 4. طابعة افتراضية نشطة للفرع (بدون تقييد بنوع معيّن — كانت القيود على
 *    type=KITCHEN فقط تمنع اختيار طابعات الكاشير/البار كافتراضية)
 */
class PrintRoutingService
{
    /**
     * معالجة طباعة فاتورة/أمر تشغيل
     *
     * @param int      $branchId         معرّف الفرع
     * @param array    $items            الأصناف: [{item_id, name, quantity, department_id, ...}]
     * @param int|null $cashierDeviceId  معرّف جهاز الكاشير المرسل (POS register)، مطلوب لتفعيل طابعات print_on_direct المرتبطة بجهاز محدد
     * @return array                     مصفوفة الطابعات مع الأصناف الموجهة لكل منها
     */
    public function routeOrder(int $branchId, array $items, ?int $cashierDeviceId = null): array
    {
        $branchPrinters = Printer::where('branch_id', $branchId)
            ->where('is_active', true)
            ->get();

        // تجميع الأصناف حسب الطابعة
        $printerGroups = [];

        foreach ($items as $item) {
            $printer = $this->resolvePrinterForItem($item, $branchPrinters, $cashierDeviceId);

            if ($printer === null) {
                // لا توجد طابعة مطابقة → لا نُسقط الصنف بصمت، بل نسجّله بوضوح
                // ليظهر بأي أداة مراقبة (وليس فقط بملف اللوغ) أن الفاتورة نُشرت جزئياً
                Log::warning("No printer resolved for item {$item['item_id']} in branch {$branchId}");
                continue;
            }

            if (!isset($printerGroups[$printer->id])) {
                $printerGroups[$printer->id] = ['printer' => $printer, 'items' => []];
            }

            $printerGroups[$printer->id]['items'][] = $item;
        }

        $result = [];
        foreach ($printerGroups as $group) {
            $result[] = [
                'printer' => $group['printer'],
                'items'   => $group['items'],
                'count'   => count($group['items']),
            ];
        }

        return $result;
    }

    /**
     * تحديد الطابعة المناسبة لصنف معين من بين طابعات الفرع النشطة
     *
     * @param array                        $item
     * @param \Illuminate\Support\Collection<int, Printer> $branchPrinters
     * @param int|null                     $cashierDeviceId
     * @return Printer|null
     */
    private function resolvePrinterForItem(
        array $item,
        \Illuminate\Support\Collection $branchPrinters,
        ?int $cashierDeviceId
    ): ?Printer {
        $itemId = $item['item_id'];
        $departmentId = $item['department_id'] ?? null;

        // ── المستوى 1: طابعة مرتبطة بهذا الصنف تحديداً ──────
        $itemPrinter = $branchPrinters->first(
            fn (Printer $p) => in_array($itemId, $p->item_ids ?? [], false)
        );
        if ($itemPrinter) {
            Log::info("Route matched: ITEM #{$itemId} → Printer #{$itemPrinter->id}");
            return $itemPrinter;
        }

        // ── المستوى 2: طابعة مرتبطة بقسم هذا الصنف ──────────
        if ($departmentId) {
            $departmentPrinter = $branchPrinters->first(
                fn (Printer $p) => in_array($departmentId, $p->department_ids ?? [], false)
            );
            if ($departmentPrinter) {
                Log::info("Route matched: DEPARTMENT #{$departmentId} → Printer #{$departmentPrinter->id}");
                return $departmentPrinter;
            }
        }

        // ── المستوى 3: طابعة الكاشير المرسل (طباعة فورية) ───
        if ($cashierDeviceId) {
            $registerPrinter = $branchPrinters->first(
                fn (Printer $p) => $p->print_on_direct
                    && $p->linked_pos_register_id == $cashierDeviceId
            );
            if ($registerPrinter) {
                Log::info("Route matched: POS register #{$cashierDeviceId} → Printer #{$registerPrinter->id}");
                return $registerPrinter;
            }
        }

        // ── المستوى 4: طابعة افتراضية للفرع ──────────────────
        // لا نقيّد بنوع معيّن هنا: القيد السابق (type=KITCHEN فقط) كان يمنع
        // اختيار أي طابعة كاشير/بار كافتراضية ويُسقط أصنافها بصمت.
        $defaultPrinter = $branchPrinters->first();
        if ($defaultPrinter) {
            Log::info("Default printer fallback: Printer #{$defaultPrinter->id}");
            return $defaultPrinter;
        }

        return null;
    }

    /**
     * إرسال أمر طباعة لعدة طابعات دفعة واحدة، بالتوازي (Non-blocking sockets)
     * ──────────────────────────────────────────────────────────────────────
     * سبب البطء الشديد سابقاً: fsockopen كانت تُستدعى بشكل متسلسل لكل طابعة
     * (blocking, timeout=5s لكل واحدة)، فطلب فيه 3 طابعات وواحدة منها غير
     * متاحة كان يُبقي طلب الـ HTTP كاملاً معلّقاً حتى 10-15 ثانية قبل ما يرجع
     * رد للفرونت (اللي أصلاً ما كان عنده أي timeout ليقطع الانتظار).
     * هون بنفتح كل الاتصالات دفعة وحدة (non-blocking) وبنستخدم stream_select
     * لانتظارها معاً، فزمن الانتظار الكلي = أبطأ طابعة وحدة، مش مجموع كلهم.
     *
     * @param array $groups نتيجة routeOrder(): [{printer, items, count}, ...]
     * @return array نتيجة الإرسال لكل طابعة
     */
    public function sendToPrinters(array $groups, int $connectTimeoutSec = 3): array
    {
        if (empty($groups)) {
            return [];
        }

        $pending = [];
        $results = [];

        // 1) فتح كل الاتصالات كـ non-blocking بالتوازي
        foreach ($groups as $group) {
            $printer = $group['printer'];
            $ip = $printer->ip_address;
            $port = (int) $printer->port;

            $fp = @stream_socket_client(
                "tcp://{$ip}:{$port}",
                $errno,
                $errstr,
                $connectTimeoutSec,
                STREAM_CLIENT_ASYNC_CONNECT
            );

            if (!$fp) {
                $results[] = [
                    'success' => false,
                    'printer' => $printer->name,
                    'message' => "فشل الاتصال: {$errstr} ({$errno})",
                ];
                continue;
            }

            $pending[(int) $fp] = [
                'fp'      => $fp,
                'printer' => $printer,
                'content' => $this->buildPrintContent($printer, $group['items']),
                'count'   => $group['count'],
            ];
        }

        // 2) انتظار جاهزية الكتابة على كل الاتصالات معاً (بحد أقصى واحد لا مجموع)
        $deadline = microtime(true) + $connectTimeoutSec;
        while (!empty($pending) && microtime(true) < $deadline) {
            $write = array_column($pending, 'fp');
            $read = $except = [];
            $remaining = max(0, $deadline - microtime(true));

            if (stream_select($read, $write, $except, (int) $remaining, (int) (($remaining - (int) $remaining) * 1e6)) === false) {
                break;
            }

            foreach ($write as $fp) {
                $key = (int) $fp;
                $job = $pending[$key];
                unset($pending[$key]);

                fwrite($fp, $job['content']);
                fclose($fp);

                Log::info("Print job sent to {$job['printer']->name}, {$job['count']} items");
                $results[] = [
                    'success'     => true,
                    'printer'     => $job['printer']->name,
                    'message'     => 'تم الإرسال بنجاح',
                    'items_count' => $job['count'],
                ];
            }
        }

        // 3) أي طابعة ما ردّت بالمهلة المسموحة → فشل صريح، مش تجاهل صامت
        foreach ($pending as $job) {
            fclose($job['fp']);
            Log::error("Print timeout on {$job['printer']->name} after {$connectTimeoutSec}s");
            $results[] = [
                'success' => false,
                'printer' => $job['printer']->name,
                'message' => 'انتهت مهلة الاتصال بالطابعة',
            ];
        }

        return $results;
    }

    /**
     * إرسال أمر طباعة لطابعة واحدة (يُستخدم لطباعة تجريبية أو طابعة مفردة فقط)
     *
     * @param Printer $printer  الطابعة المستهدفة
     * @param array   $items    الأصناف الموجهة لهذه الطابعة
     * @return array            نتيجة الإرسال
     */
    public function sendToPrinter(Printer $printer, array $items): array
    {
        $results = $this->sendToPrinters([[
            'printer' => $printer,
            'items'   => $items,
            'count'   => count($items),
        ]]);

        return $results[0] ?? [
            'success' => false,
            'printer' => $printer->name,
            'message' => 'فشل غير متوقع',
        ];
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
