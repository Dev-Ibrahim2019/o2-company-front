<?php

namespace Database\Seeders;

use App\Models\Printer;
use App\Models\PrintRoute;
use Illuminate\Database\Seeder;

class PrinterSeeder extends Seeder
{
    public function run(): void
    {
        // ── إنشاء الطابعات ─────────────────────────────────

        $branchId = 1; // الفرع الرئيسي

        $cashierPrinter = Printer::create([
            'name'       => 'طابعة كاشير الصالة الرئيسي',
            'ip_address' => '192.168.1.150',
            'port'       => '9100',
            'type'       => 'CASHIER',
            'branch_id'  => $branchId,
            'is_active'  => true,
        ]);

        $kitchenPrinter = Printer::create([
            'name'       => 'طابعة قسم المشاوي والفرن (SNBC)',
            'ip_address' => '192.168.1.160',
            'port'       => '9100',
            'type'       => 'KITCHEN',
            'branch_id'  => $branchId,
            'is_active'  => true,
        ]);

        $barPrinter = Printer::create([
            'name'       => 'طابعة بار العصائر والمشروبات',
            'ip_address' => '192.168.1.170',
            'port'       => '9100',
            'type'       => 'BAR',
            'branch_id'  => $branchId,
            'is_active'  => true,
        ]);

        // ── إنشاء قواعد التوجيه ─────────────────────────────

        // قاعدة 1: قسم المشاوي بالكامل → طابعة المشاوي
        PrintRoute::create([
            'branch_id'   => $branchId,
            'printer_id'  => $kitchenPrinter->id,
            'user_id'     => null, // كل الأجهزة
            'scope'       => 'CATEGORY',
            'category_id' => 10,   // معرّف قسم المشاوي في جدول departments
            'item_id'     => null,
            'priority'    => 0,
            'is_active'   => true,
        ]);

        // قاعدة 2: صنف ستيك لحم خاص → طابعة الكاشير (للتنبيه)
        PrintRoute::create([
            'branch_id'   => $branchId,
            'printer_id'  => $cashierPrinter->id,
            'user_id'     => null,
            'scope'       => 'ITEM',
            'category_id' => null,
            'item_id'     => 103,  // معرّف الصنف في جدول items
            'priority'    => 10,   // أعلى أولوية (تتفوق على قاعدة القسم)
            'is_active'   => true,
        ]);

        // قاعدة 3: العصائر والمشروبات → طابعة البار
        PrintRoute::create([
            'branch_id'   => $branchId,
            'printer_id'  => $barPrinter->id,
            'user_id'     => null,
            'scope'       => 'CATEGORY',
            'category_id' => 12,   // معرّف قسم العصائر
            'item_id'     => null,
            'priority'    => 0,
            'is_active'   => true,
        ]);

        $this->command->info('✅ تم إنشاء 3 طابعات و 3 قواعد توجيه بنجاح');
    }
}
