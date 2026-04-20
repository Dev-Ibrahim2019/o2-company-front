// src/components/administration/Departments/DepartmentModal.tsx

import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
    dept?: any;
    onSave: (data: any) => Promise<void>;
    onClose: () => void;
}

const TYPES = ['sale', 'production', 'storage'];
const STATUSES = ['ACTIVE', 'BUSY', 'INACTIVE'];

const DepartmentModal = ({ dept, onSave, onClose }: Props) => {
    const [form, setForm] = useState({
        name: dept?.name ?? '',
        nameAr: dept?.nameAr ?? '',
        shortName: dept?.shortName ?? '',
        color: dept?.color ?? '#ef4444',
        type: dept?.type ?? 'sale',
        status: dept?.status ?? 'ACTIVE',
        location: dept?.location ?? '',
        stationNumber: dept?.stationNumber ?? '',
        defaultPrepTime: dept?.defaultPrepTime ?? 0,
        maxConcurrentOrders: dept?.maxConcurrentOrders ?? 10,
        hasKds: dept?.hasKds ?? false,
        autoPrintTicket: dept?.autoPrintTicket ?? false,
    });

    const [saving, setSaving] = useState(false);

    const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

    const handleSubmit = async () => {
        if (!form.name.trim()) return alert('اسم القسم مطلوب');

        setSaving(true);

        try {
            console.log("SENDING:", form);

            await onSave(form);

        } catch (e: any) {
            console.log("ERROR:", e.response?.data);

            alert(
                e.response?.data?.message ||
                "فشل الحفظ"
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h2 className="text-lg font-bold text-white">
                        {dept ? 'تعديل القسم' : 'إضافة قسم جديد'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <Field label="الاسم بالإنجليزي *">
                        <input value={form.name} onChange={e => set('name', e.target.value)}
                            className={input} placeholder="Kitchen" />
                    </Field>

                    <Field label="الاسم بالعربي">
                        <input value={form.nameAr} onChange={e => set('nameAr', e.target.value)}
                            className={input} placeholder="المطبخ" />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="الاختصار">
                            <input value={form.shortName} onChange={e => set('shortName', e.target.value)}
                                className={input} placeholder="KIT" maxLength={6} />
                        </Field>
                        <Field label="اللون">
                            <div className="flex items-center gap-2">
                                <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                                    className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent" />
                                <span className="text-sm text-slate-400 font-mono">{form.color}</span>
                            </div>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="النوع">
                            <select value={form.type} onChange={e => set('type', e.target.value)} className={input}>
                                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </Field>
                        <Field label="الحالة">
                            <select value={form.status} onChange={e => set('status', e.target.value)} className={input}>
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="رقم المحطة">
                            <input value={form.stationNumber} onChange={e => set('stationNumber', e.target.value)}
                                className={input} placeholder="1" />
                        </Field>
                        <Field label="وقت التحضير (دقيقة)">
                            <input type="number" value={form.defaultPrepTime}
                                onChange={e => set('defaultPrepTime', Number(e.target.value))}
                                className={input} min={0} />
                        </Field>
                    </div>

                    <Field label="الطاقة الاستيعابية (أوردر)">
                        <input type="number" value={form.maxConcurrentOrders}
                            onChange={e => set('maxConcurrentOrders', Number(e.target.value))}
                            className={input} min={1} />
                    </Field>

                    <Field label="الموقع">
                        <input value={form.location} onChange={e => set('location', e.target.value)}
                            className={input} placeholder="الطابق الأول" />
                    </Field>

                    <div className="flex gap-6">
                        <Toggle label="شاشة KDS" checked={form.hasKds} onChange={v => set('hasKds', v)} />
                        <Toggle label="طباعة تلقائية" checked={form.autoPrintTicket} onChange={v => set('autoPrintTicket', v)} />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors">
                        إلغاء
                    </button>
                    <button onClick={handleSubmit} disabled={saving}
                        className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50">
                        {saving ? 'جاري الحفظ...' : dept ? 'حفظ التغييرات' : 'إضافة القسم'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const input = "w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
        {children}
    </div>
);

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center gap-2 cursor-pointer">
        <div onClick={() => onChange(!checked)}
            className={`w-10 h-5 rounded-full transition-colors relative ${checked ? 'bg-red-600' : 'bg-slate-700'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${checked ? 'left-5' : 'left-0.5'}`} />
        </div>
        <span className="text-sm text-slate-400">{label}</span>
    </label>
);

export default DepartmentModal;