<?php

namespace Database\Seeders;

use App\Models\Printer;
use Illuminate\Database\Seeder;

/**
 * ⚠️ التوجيه أصبح مدمجاً داخل سجل الطابعة نفسه (department_ids/item_ids/
 * linked_pos_register_id) بدل جدول print_routes المنفصل — راجع الملاحظة
 * أعلى PrintRoutingService.php.
 */
class PrinterSeeder extends Seeder
{
    public function run(): void
    {
        $branchId = 1; // الفرع الرئيسي

        // كاشير الصالة الرئيسي — مرتبطة بجهاز POS-001 وتطبع مباشرة عند التنفيذ
        Printer::create([
            'name'                    => 'طابعة كاشير الصالة الرئيسي',
            'ip_address'              => '192.168.1.150',
            'port'                    => '9100',
            'type'                    => 'CASHIER',
            'branch_id'               => $branchId,
            'is_active'               => true,
            'print_on_direct'         => true,
            'linked_pos_register_id'  => 1, // POS-001
        ]);

        // قسم المشاوي والفرن (SNBC) — تطبع كل أصناف قسم المشاوي (department_id=10)
        Printer::create([
            'name'            => 'طابعة قسم المشاوي والفرن (SNBC)',
            'ip_address'      => '192.168.1.160',
            'port'            => '9100',
            'type'            => 'KITCHEN',
            'branch_id'       => $branchId,
            'is_active'       => true,
            'department_ids'  => [10],
        ]);

        // بار العصائر والمشروبات — تطبع قسم العصائر (department_id=12) بالإضافة لصنف مفرد (item_id=103)
        Printer::create([
            'name'            => 'طابعة بار العصائر والمشروبات',
            'ip_address'      => '192.168.1.170',
            'port'            => '9100',
            'type'            => 'BAR',
            'branch_id'       => $branchId,
            'is_active'       => true,
            'department_ids'  => [12],
            'item_ids'        => [103],
        ]);

        $this->command->info('✅ تم إنشاء 3 طابعات بنموذج التوجيه المدمج بنجاح');
    }
}
