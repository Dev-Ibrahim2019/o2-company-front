// src/components/administration/EmployeeManagement/components/EmployeeModal.tsx

import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import type { EmployeeFromApi, EmployeePayload } from '../../../../services/employeeService';
import type { JobTitle } from '../../../../services/jobTitleService';
import { ROLES, STATUSES } from '../utils';

interface Props {
    employee?: EmployeeFromApi | null;
    departments: { id: number; name: string }[];
    branches: { id: number; name: string }[];
    jobTitles: JobTitle[];                     // ← جديد
    onSave: (payload: EmployeePayload) => Promise<void>;
    onClose: () => void;
}

const inputCls =
    'w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white' +
    ' placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-colors';
const labelCls = 'block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider';
const errorCls = 'text-red-400 text-xs mt-1';

// ── Component ─────────────────────────────────────────────────────────────────

const EmployeeModal = ({ employee, departments, branches, jobTitles, onSave, onClose }: Props) => {
    const isEditing = !!employee;

    const [form, setForm] = useState<EmployeePayload & { jobTitleId?: string }>({
        name: employee?.name ?? '',
        phone: employee?.phone ?? '',
        email: employee?.email ?? '',
        address: employee?.address ?? '',
        nationalId: employee?.nationalId ?? '',
        dob: employee?.dob ?? '',
        branch_id: employee?.branch_id ?? (branches[0]?.id ?? 0),
        department_id: employee?.department_id ?? (departments[0]?.id ?? 0),
        jobTitleId: employee?.jobTitleId ?? '',      // ← مسمى وظيفي
        hireDate: employee?.hireDate ?? new Date().toISOString().split('T')[0],
        salary: employee?.salary ?? undefined,
        role: employee?.role ?? 'EMPLOYEE',
        status: employee?.status ?? 'ACTIVE',
        employeeId: employee?.employeeId ?? '',
        username: employee?.username ?? '',
        pin: '',
        permissions: employee?.permissions ?? [],
        notes: employee?.notes ?? '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const set = (key: string, value: unknown) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setErrors(prev => ({ ...prev, [key]: '' }));
    };

    // عند اختيار Job Title — نملأ الدور تلقائياً إذا أردنا ربطهما
    // حالياً نتركهما منفصلين لمرونة أكبر

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'الاسم مطلوب';
        if (!form.phone.trim()) e.phone = 'رقم الهاتف مطلوب';
        if (!form.branch_id) e.branch_id = 'الفرع مطلوب';
        if (!form.department_id) e.department_id = 'القسم مطلوب';
        if (!form.hireDate) e.hireDate = 'تاريخ التوظيف مطلوب';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSaving(true);
        try { await onSave(form); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
                    <h2 className="text-lg font-bold text-white">
                        {isEditing ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* الاسم + رقم الموظف */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>الاسم الكامل *</label>
                            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="أحمد محمد" />
                            {errors.name && <p className={errorCls}>{errors.name}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>الرقم الوظيفي</label>
                            <input value={form.employeeId} onChange={e => set('employeeId', e.target.value)} className={`${inputCls} font-mono`} placeholder="EMP-101" />
                        </div>
                    </div>

                    {/* هاتف + إيميل */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>رقم الهاتف *</label>
                            <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="0599000000" />
                            {errors.phone && <p className={errorCls}>{errors.phone}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>البريد الإلكتروني</label>
                            <input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="email@example.com" />
                        </div>
                    </div>

                    {/* فرع + قسم */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>الفرع *</label>
                            <select value={form.branch_id} onChange={e => set('branch_id', Number(e.target.value))} className={inputCls}>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            {errors.branch_id && <p className={errorCls}>{errors.branch_id}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>القسم *</label>
                            <select value={form.department_id} onChange={e => set('department_id', Number(e.target.value))} className={inputCls}>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            {errors.department_id && <p className={errorCls}>{errors.department_id}</p>}
                        </div>
                    </div>

                    {/* المسمى الوظيفي + الدور */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>المسمى الوظيفي (Job Title)</label>
                            <select
                                value={(form as any).jobTitleId ?? ''}
                                onChange={e => set('jobTitleId', e.target.value)}
                                className={inputCls}
                            >
                                <option value="">— بدون مسمى —</option>
                                {jobTitles.map(j => (
                                    <option key={j.id} value={String(j.id)}>{j.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>الدور في النظام *</label>
                            <select value={form.role} onChange={e => set('role', e.target.value)} className={inputCls}>
                                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* الحالة + تاريخ التوظيف */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>الحالة *</label>
                            <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>تاريخ التوظيف *</label>
                            <input type="date" value={form.hireDate} onChange={e => set('hireDate', e.target.value)} className={inputCls} />
                            {errors.hireDate && <p className={errorCls}>{errors.hireDate}</p>}
                        </div>
                    </div>

                    {/* الراتب + PIN */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>الراتب (₪)</label>
                            <input type="number" value={form.salary ?? ''} onChange={e => set('salary', e.target.value ? Number(e.target.value) : undefined)} className={inputCls} placeholder="0.00" min={0} />
                        </div>
                        <div>
                            <label className={labelCls}>اسم المستخدم</label>
                            <input value={form.username ?? ''} onChange={e => set('username', e.target.value)} className={`${inputCls} font-mono`} placeholder="ahmed.m" />
                        </div>
                    </div>

                    {/* ملاحظات */}
                    <div>
                        <label className={labelCls}>ملاحظات</label>
                        <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} className={`${inputCls} h-20 resize-none`} placeholder="أي ملاحظات إضافية..." />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors">إلغاء</button>
                    <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'إضافة الموظف'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeModal;