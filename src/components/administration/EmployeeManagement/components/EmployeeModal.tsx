// src/components/administration/EmployeeManagement/components/EmployeeModal.tsx

import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import type { EmployeeFromApi, EmployeePayload, OperationalRole, VehicleType } from '../../../../services/employeeService';
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
const operationalRoles: Array<{ value: OperationalRole; label: string }> = [
    { value: 'call_center_agent', label: 'موظف كول سنتر' }, { value: 'assembler', label: 'مجمع طلبات' },
    { value: 'delivery_driver', label: 'دليفري' }, { value: 'manager', label: 'مدير' },
    { value: 'cashier', label: 'كاشير' }, { value: 'other', label: 'أخرى' },
];
const vehicleTypes: Array<{ value: VehicleType; label: string }> = [
    { value: 'bicycle', label: 'دراجة هوائية' }, { value: 'electric_bike', label: 'دراجة كهربائية' },
    { value: 'motorcycle', label: 'موتوسيكل' }, { value: 'external', label: 'دليفري خارجي' },
];

// ── Component ─────────────────────────────────────────────────────────────────

const EmployeeModal = ({ employee, departments, branches, jobTitles, onSave, onClose }: Props) => {
    const isEditing = !!employee;

    const [operationalRoleEdited, setOperationalRoleEdited] = useState(Boolean(employee?.operational_role));
    const [form, setForm] = useState<EmployeePayload>({
        name: employee?.name ?? '',
        phone: employee?.phone ?? '',
        email: employee?.email ?? '',
        address: employee?.address ?? '',
        nationalId: employee?.nationalId ?? '',
        dob: employee?.dob ?? '',
        branch_id: employee?.branch_id ?? (branches[0]?.id ?? 0),
        department_id: employee?.department_id ?? (departments[0]?.id ?? 0),
        job_title_id: employee?.job_title_id ?? employee?.job_title?.id ?? (employee?.jobTitleId && /^\d+$/.test(employee.jobTitleId) ? Number(employee.jobTitleId) : null),
        jobTitleId: employee?.jobTitleId ?? (employee?.job_title_id ? String(employee.job_title_id) : ''),
        hireDate: employee?.hireDate ?? new Date().toISOString().split('T')[0],
        salary: employee?.salary ?? undefined,
        role: employee?.role ?? 'EMPLOYEE',
        status: employee?.status ?? 'ACTIVE',
        employeeId: employee?.employeeId ?? '',
        username: employee?.username ?? '',
        pin: '',
        permissions: employee?.permissions ?? [],
        notes: employee?.notes ?? '',
        operational_role: employee?.operational_role,
        is_operations_enabled: employee?.is_operations_enabled ?? false,
        vehicle_type: employee?.vehicle_type,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const set = (key: string, value: unknown) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setErrors(prev => ({ ...prev, [key]: '' }));
    };

    const setJobTitle = (value: string) => {
        const id = value ? Number(value) : null;
        const title = jobTitles.find(item => item.id === id);
        setForm(prev => ({
            ...prev,
            job_title_id: id,
            jobTitleId: value,
            operational_role: !operationalRoleEdited && title?.default_operational_role
                ? title.default_operational_role
                : prev.operational_role,
            vehicle_type: (!operationalRoleEdited && title?.default_operational_role !== 'delivery_driver')
                ? undefined
                : prev.vehicle_type,
        }));
    };

    const setOperationalRole = (role: OperationalRole | undefined) => {
        setOperationalRoleEdited(true);
        setForm(prev => ({ ...prev, operational_role: role, vehicle_type: role === 'delivery_driver' ? prev.vehicle_type : undefined }));
    };

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'الاسم مطلوب';
        if (!form.phone.trim()) e.phone = 'رقم الهاتف مطلوب';
        if (!form.branch_id) e.branch_id = 'الفرع مطلوب';
        if (!form.department_id) e.department_id = 'القسم مطلوب';
        if (!form.hireDate) e.hireDate = 'تاريخ التوظيف مطلوب';
        if (form.is_operations_enabled && form.operational_role === 'delivery_driver' && !form.vehicle_type) e.vehicle_type = 'نوع المركبة مطلوب للدليفري';
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
                                value={form.job_title_id ?? ''}
                                onChange={e => setJobTitle(e.target.value)}
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

                    <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4 space-y-4">
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                            <span><span className="block text-sm font-bold text-white">تفعيل الموظف للعمليات</span><span className="text-[10px] text-slate-500">يسمح باستخدامه لاحقاً في تشغيل الطلبات</span></span>
                            <input type="checkbox" checked={Boolean(form.is_operations_enabled)} onChange={e => set('is_operations_enabled', e.target.checked)} className="h-5 w-5 accent-cyan-500" />
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className={labelCls}>الدور التشغيلي</label><select value={form.operational_role ?? ''} onChange={e => setOperationalRole(e.target.value ? e.target.value as OperationalRole : undefined)} className={inputCls}><option value="">— بدون دور تشغيلي —</option>{operationalRoles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}</select></div>
                            {form.operational_role === 'delivery_driver' && <div><label className={labelCls}>نوع المركبة {form.is_operations_enabled ? '*' : ''}</label><select value={form.vehicle_type ?? ''} onChange={e => set('vehicle_type', e.target.value ? e.target.value as VehicleType : undefined)} className={inputCls}><option value="">— اختر المركبة —</option>{vehicleTypes.map(vehicle => <option key={vehicle.value} value={vehicle.value}>{vehicle.label}</option>)}</select>{errors.vehicle_type && <p className={errorCls}>{errors.vehicle_type}</p>}</div>}
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
