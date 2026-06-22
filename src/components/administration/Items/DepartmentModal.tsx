// src/components/administration/Items/DepartmentModal.tsx
// مودال إضافة وتعديل الأقسام - نسخة نظيفة ومتوافقة 100%

import { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import api from '../../../api/axios';

interface Department {
    id: number;
    name: string;
    nameAr?: string;
    shortName?: string;
    code?: string;
    color?: string;
    type?: string;
    parent_id?: number | null;
    status?: string;
    branchCategories?: any[];
    branch_categories?: any[];
    branches?: any[];
}

interface Props {
    department?: Department | null;
    branches: { id: number; name: string }[];
    onClose: () => void;
    onSaved: () => void;
}

const inputCls = "w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
        {children}
    </div>
);

interface BranchDraft {
    branch_id: number;
    is_available: boolean;
}

const getInitialBranches = (dept?: Department | null): BranchDraft[] => {
    if (!dept) return [];

    // قراءة علاقات الفروع بشكل مرن تدعم الـ CamelCase والـ snake_case
    const pivotRows = dept.branchCategories ?? dept.branch_categories ?? dept.branches ?? [];
    if (pivotRows.length) {
        return pivotRows.map((entry: any) => {
            // الـ entry هو Branch model مع pivot: { id: X, pivot: { is_active: Y } }
            const branchId = Number(entry.id);
            const isAvailable = entry.pivot?.is_active ?? true;
            return {
                branch_id: branchId,
                is_available: Boolean(isAvailable),
            };
        });
    }

    return [];
};

const DepartmentModal = ({ department, branches, onClose, onSaved }: Props) => {
    const [form, setForm] = useState({
        name: department?.name ?? '',
        nameAr: department?.nameAr ?? '',
        shortName: department?.shortName ?? '',
        code: department?.code ?? '',
        color: department?.color ?? '#ef4444',
        type: department?.type ?? 'department',
        status: department?.status ?? 'ACTIVE',
    });

    const [branchDrafts, setBranchDrafts] = useState<BranchDraft[]>(() => getInitialBranches(department));
    const [saving, setSaving] = useState(false);

    const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

    const toggleBranch = (branchId: number) => {
        setBranchDrafts((current) => {
            const exists = current.some((entry) => entry.branch_id === branchId);
            if (exists) return current.filter((entry) => entry.branch_id !== branchId);
            return [...current, { branch_id: branchId, is_available: true }];
        });
    };

    const setBranchAvailability = (branchId: number, available: boolean) => {
        setBranchDrafts((current) =>
            current.map((entry) =>
                entry.branch_id === branchId ? { ...entry, is_available: available } : entry
            )
        );
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) return alert('الاسم مطلوب');

        // استخراج الـ IDs المحددة فقط
        const branchIds = branchDrafts.map((b) => b.branch_id);

        const payload: any = {
            ...form,
            branch_ids: branchIds,
        };

        setSaving(true);
        try {
            if (department) {
                await api.put(`/departments/${department.id}`, payload);
            } else {
                await api.post('/departments', payload);
            }
            onSaved();
            onClose();
        } catch (e: any) {
            alert(e.response?.data?.message ?? 'فشل الحفظ');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h2 className="text-lg font-bold text-white">
                        {department ? 'تعديل القسم' : 'إضافة قسم جديد'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <Field label="الاسم (إنجليزي) *">
                        <input
                            value={form.name}
                            onChange={e => set('name', e.target.value)}
                            className={inputCls}
                            placeholder="Main Kitchen"
                            dir="ltr"
                        />
                    </Field>

                    <Field label="الاسم (عربي)">
                        <input
                            value={form.nameAr}
                            onChange={e => set('nameAr', e.target.value)}
                            className={inputCls}
                            placeholder="المطبخ الرئيسي"
                            dir="rtl"
                        />
                    </Field>

                    <Field label="الاسم المختصر">
                        <input
                            value={form.shortName}
                            onChange={e => set('shortName', e.target.value)}
                            className={inputCls}
                            placeholder="MK"
                            dir="ltr"
                        />
                    </Field>

                     <Field label="الكود">
                         <input
                             value={form.code}
                             onChange={e => set('code', e.target.value)}
                             className={inputCls}
                             placeholder="1 أو 11 أو 1101"
                             dir="ltr"
                         />
                     </Field>

                     <Field label="اللون">
                         <div className="flex items-center gap-3">
                             <input
                                 type="color"
                                 value={form.color}
                                 onChange={e => set('color', e.target.value)}
                                 className="h-10 w-14 rounded-lg cursor-pointer border-0 bg-transparent"
                             />
                             <input
                                 value={form.color}
                                 onChange={e => set('color', e.target.value)}
                                 className={inputCls}
                                 placeholder="#ef4444"
                                 dir="ltr"
                             />
                         </div>
                     </Field>

                     <Field label="النوع">
                         <select
                             value={form.type}
                             onChange={e => set('type', e.target.value)}
                             className={inputCls}
                         >
                             <option value="section">قسم رئيسي (Section)</option>
                             <option value="department">قسم (Department)</option>
                             <option value="unit">وحدة (Unit)</option>
                         </select>
                     </Field>

                     <Field label="الحالة">
                         <select
                             value={form.status}
                             onChange={e => set('status', e.target.value)}
                             className={inputCls}
                         >
                             <option value="ACTIVE">نشط</option>
                             <option value="BUSY">مزدحم</option>
                             <option value="INACTIVE">معطّل</option>
                         </select>
                     </Field>

                    {/* الفروع المتاحة للقسم */}
                    <Field label="الفروع المتاحة للقسم">
                        <div className="rounded-xl border border-white/10 bg-slate-950/30 overflow-hidden">
                            {branches.length === 0 ? (
                                <div className="px-3 py-3 text-xs text-slate-500 text-center">
                                    لا توجد فروع متاحة للربط
                                </div>
                            ) : (
                                <div className="max-h-52 overflow-y-auto divide-y divide-white/5">
                                    {branches.map((branch) => {
                                        const selected = branchDrafts.find((entry) => entry.branch_id === branch.id);

                                        return (
                                            <div key={branch.id} className="grid grid-cols-[1fr_100px] gap-3 px-3 py-2.5 items-center">
                                                <label className="flex items-center gap-3 min-w-0 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!selected}
                                                        onChange={() => toggleBranch(branch.id)}
                                                        className="h-4 w-4 accent-red-600 rounded"
                                                    />
                                                    <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                                                        <Building2 size={13} />
                                                    </span>
                                                    <span className="text-sm text-slate-200 truncate">
                                                        {branch.name}
                                                    </span>
                                                </label>
                                                <label className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 select-none cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selected?.is_available ?? false}
                                                        disabled={!selected}
                                                        onChange={e => setBranchAvailability(branch.id, e.target.checked)}
                                                        className="h-3.5 w-3.5 accent-emerald-600 disabled:opacity-40 rounded"
                                                    />
                                                    متاح
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </Field>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors">
                        إلغاء
                    </button>
                    <button onClick={handleSubmit} disabled={saving}
                        className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50">
                        {saving ? 'جاري الحفظ...' : department ? 'حفظ التغييرات' : 'إضافة القسم'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DepartmentModal;