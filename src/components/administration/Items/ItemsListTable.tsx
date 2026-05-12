import { Edit2, Hash, Image as ImageIcon, Package, Trash2 } from 'lucide-react';
import { getItemImageUrl, type Item } from '../../../services/itemService';

interface Department {
    id: number;
    name: string;
    nameAr?: string;
    code?: string;
    parent_id?: number | null;
    children?: Department[];
}

interface Props {
    departments: Department[];
    items: Item[];
    onEditItem: (item: Item) => void;
    onDeleteItem: (id: number) => void;
}

const flattenDepartments = (
    departments: Department[],
    result: Department[] = [],
): Department[] => {
    departments.forEach((department) => {
        result.push(department);
        if (department.children?.length) {
            flattenDepartments(department.children, result);
        }
    });
    return result;
};

const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ar-SA');
};

const formatPrice = (price?: number | string | null) => {
    if (price === undefined || price === null || price === '') return '-';
    const value = Number(price);
    if (Number.isNaN(value)) return String(price);
    return value.toLocaleString('ar-SA', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
};

const getDisplayPrice = (item: Item) => {
    if (item.price !== undefined && item.price !== null && item.price !== '') return item.price;
    const pivotRows = item.branch_item ?? item.branch_items ?? item.branch_prices;
    if (pivotRows?.length) return pivotRows[0]?.price;
    const branch = item.branches?.find((entry) => entry.pivot?.price !== undefined || entry.price !== undefined);
    return branch?.pivot?.price ?? branch?.price ?? null;
};

const ItemsListTable = ({
    departments,
    items,
    onEditItem,
    onDeleteItem,
}: Props) => {
    const departmentById = new Map(
        flattenDepartments(departments).map((department) => [department.id, department]),
    );

    return (
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Package size={16} className="text-red-500" />
                    <span className="text-sm font-bold text-white">فهرس الأصناف</span>
                </div>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-white/5 text-[11px] text-slate-500">
                    {items.length} صنف
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[1060px] text-sm">
                    <thead className="bg-slate-950/40 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="px-4 py-3 text-right">الكود</th>
                            <th className="px-4 py-3 text-right">الصورة</th>
                            <th className="px-4 py-3 text-right">الاسم</th>
                            <th className="px-4 py-3 text-right">القسم</th>
                            <th className="px-4 py-3 text-right">السعر</th>
                            <th className="px-4 py-3 text-right">الوحدة</th>
                            <th className="px-4 py-3 text-right">الحالة</th>
                            <th className="px-4 py-3 text-right">تاريخ الإنشاء</th>
                            <th className="px-4 py-3 text-center">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {items.map((item) => {
                            const department = departmentById.get(item.department_id);
                            const imageUrl = getItemImageUrl(item);

                            return (
                                <tr key={item.id} className="group hover:bg-white/[0.03] transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/5 bg-slate-800/80 px-2 py-1 font-mono text-[11px] font-bold text-slate-300">
                                            <Hash size={10} className="text-slate-500" />
                                            {item.code}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/5 overflow-hidden flex items-center justify-center text-slate-600">
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <ImageIcon size={18} />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="font-bold text-white truncate">{item.name_ar || item.name}</p>
                                            <p className="text-xs text-slate-500 truncate">{item.name}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-slate-300 font-medium">
                                            {department?.nameAr ?? department?.name ?? '-'}
                                        </div>
                                        <div className="text-[10px] text-slate-600 font-mono">
                                            {department?.code ?? ''}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-bold text-emerald-500">
                                            {formatPrice(getDisplayPrice(item))}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-400">{item.unit || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-bold ${
                                            item.is_active
                                                ? 'bg-emerald-500/10 text-emerald-500'
                                                : 'bg-slate-500/10 text-slate-500'
                                        }`}>
                                            {item.is_active ? 'نشط' : 'معطل'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{formatDate(item.created_at)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => onEditItem(item)}
                                                className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                                                title="تعديل"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteItem(item.id)}
                                                className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                                                title="حذف"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
                    <Package size={34} className="opacity-30" />
                    <p className="text-sm">لا توجد أصناف مطابقة</p>
                </div>
            )}
        </div>
    );
};

export default ItemsListTable;
