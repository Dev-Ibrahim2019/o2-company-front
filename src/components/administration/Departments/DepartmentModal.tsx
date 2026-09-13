// src/components/administration/Departments/DepartmentModal.tsx

import { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { toast } from '../../shared/Toast';

interface Props {
    dept?: any;
    onSave: (data: any) => Promise<void>;
    onClose: () => void;
}

const TYPES = ['department', 'section', 'unit'];
const STATUSES = ['ACTIVE', 'BUSY', 'INACTIVE'];

const STATUS_STYLES: Record<string, string> = {
    ACTIVE: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    BUSY: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    INACTIVE: 'text-slate-400 border-slate-500/30 bg-slate-500/10',
};

const DepartmentModal = ({ dept, onSave, onClose }: Props) => {
    const [form, setForm] = useState({
        name: dept?.name ?? '',
        nameAr: dept?.nameAr ?? '',
        shortName: dept?.shortName ?? '',
        color: dept?.color ?? '#ef4444',
        type: dept?.type ?? 'department',
        status: dept?.status ?? 'ACTIVE',
        location: dept?.location ?? '',
        stationNumber: dept?.stationNumber ?? '',
        defaultPrepTime: dept?.defaultPrepTime ?? 0,
        maxConcurrentOrders: dept?.maxConcurrentOrders ?? 10,
        hasKds: dept?.hasKds ?? false,
        autoPrintTicket: dept?.autoPrintTicket ?? false,
        startCode: dept?.startCode ?? 100,
        departmentCode: dept?.code ?? dept?.departmentCode ?? '',
    });

    const [saving, setSaving] = useState(false);

    const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

    const handleSubmit = async () => {
        if (!form.name.trim()) { toast.error('اسم القسم مطلوب'); return; }
        if (!String(form.departmentCode).trim()) { toast.error('Department code is required'); return; }
        setSaving(true);
        try {
            const { departmentCode, ...payload } = form;
            await onSave({
                ...payload,
                code: String(departmentCode).trim(),
            });
        } catch (e: any) {
            toast.error('فشل الحفظ', e.response?.data?.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div>
                        <h2 className="text-base font-semibold text-white">
                            {dept ? 'تعديل القسم' : 'إضافة قسم جديد'}
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            {dept ? 'تعديل بيانات القسم الحالي' : 'أدخل بيانات القسم الجديد'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white rounded-full hover:bg-white/8 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5" dir="rtl">

                    {/* Section: Basic Info */}
                    <SectionLabel>المعلومات الأساسية</SectionLabel>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="الاسم بالإنجليزي" required>
                            <input
                                value={form.name}
                                onChange={e => set('name', e.target.value)}
                                className={inputCls}
                                placeholder="Kitchen"
                            />
                        </Field>
                        <Field label="الاسم بالعربي">
                            <input
                                value={form.nameAr}
                                onChange={e => set('nameAr', e.target.value)}
                                className={inputCls}
                                placeholder="المطبخ"
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-3 gap-3 items-end">
                        {/* Color swatch only — no hex text */}
                        <Field label="اللون">
                            <div className="flex items-center gap-2">
                                <label
                                    className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white/10 hover:border-white/30 transition-colors flex-shrink-0"
                                    style={{ backgroundColor: form.color }}
                                >
                                    <input
                                        type="color"
                                        value={form.color}
                                        onChange={e => set('color', e.target.value)}
                                        className="opacity-0 w-0 h-0"
                                    />
                                </label>
                                <span className="text-xs text-slate-500 font-mono">{form.color}</span>
                            </div>
                        </Field>
                        <Field label="الاختصار">
                            <input
                                value={form.shortName}
                                onChange={e => set('shortName', e.target.value)}
                                className={`${inputCls} text-center tracking-widest font-mono uppercase`}
                                placeholder="KIT"
                                maxLength={6}
                            />
                        </Field>
                        <Field label="كود القسم">
                            <input
                                value={form.departmentCode}
                                onChange={e => set('departmentCode', e.target.value)}
                                className={inputCls}
                                placeholder="D-01"
                            />
                        </Field>
                    </div>

                    {/* Section: Configuration */}
                    <SectionLabel>الإعدادات</SectionLabel>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="النوع">
                            <div className="relative">
                                <select
                                    value={form.type}
                                    onChange={e => set('type', e.target.value)}
                                    className={`${inputCls} appearance-none pr-8`}
                                >
                                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            </div>
                        </Field>
                        <Field label="الحالة">
                            <div className="relative">
                                <select
                                    value={form.status}
                                    onChange={e => set('status', e.target.value)}
                                    className={`${inputCls} appearance-none pr-8 ${STATUS_STYLES[form.status]}`}
                                >
                                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                            </div>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="كود البداية">
                            <input
                                type="number"
                                value={form.startCode}
                                onChange={e => set('startCode', Number(e.target.value))}
                                className={inputCls}
                                placeholder="100"
                                min={1}
                                step={100}
                            />
                        </Field>
                        <Field label="الموقع">
                            <input
                                value={form.location}
                                onChange={e => set('location', e.target.value)}
                                className={inputCls}
                                placeholder="الطابق الأول"
                            />
                        </Field>
                    </div>

                    {/* Section: Operations */}
                    <SectionLabel>بيانات التشغيل</SectionLabel>

                    <div className="grid grid-cols-3 gap-3">
                        <Field label="رقم المحطة">
                            <input
                                value={form.stationNumber}
                                onChange={e => set('stationNumber', e.target.value)}
                                className={`${inputCls} text-center`}
                                placeholder="1"
                            />
                        </Field>
                        <Field label="وقت التحضير">
                            <div className="relative">
                                <input
                                    type="number"
                                    value={form.defaultPrepTime}
                                    onChange={e => set('defaultPrepTime', Number(e.target.value))}
                                    className={`${inputCls} pl-8 text-center`}
                                    min={0}
                                />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">دق</span>
                            </div>
                        </Field>
                        <Field label="الطاقة الاستيعابية">
                            <div className="relative">
                                <input
                                    type="number"
                                    value={form.maxConcurrentOrders}
                                    onChange={e => set('maxConcurrentOrders', Number(e.target.value))}
                                    className={`${inputCls} pl-10 text-center`}
                                    min={1}
                                />
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 leading-tight">أوردر</span>
                            </div>
                        </Field>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                جاري الحفظ...
                            </>
                        ) : (
                            dept ? 'حفظ التغييرات' : '+ إضافة القسم'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Shared styles ── */
const inputCls =
    'w-full bg-slate-800 border border-white/30 rounded-xl px-3 py-2 text-sm text-white ' +
    'focus:outline-none focus:border-red-500/50 focus:bg-slate-800/80 transition-colors placeholder:text-slate-600';

/* ── Sub-components ── */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2 pt-1">
        <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">{children}</span>
        <div className="flex-1 h-px bg-white/5" />
    </div>
);

const Field = ({
    label,
    required,
    children,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
}) => (
    <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
            {label}
            {required && <span className="text-red-500 mr-0.5">*</span>}
        </label>
        {children}
    </div>
);

export default DepartmentModal;
