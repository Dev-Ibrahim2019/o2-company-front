// src/components/administration/Items/ItemModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Store, ChevronRight, Check, AlertCircle } from 'lucide-react';
import type { ItemFromApi } from '../../../services/itemService';

interface Branch {
    id: number;
    name: string;
    code?: string;
    is_active?: boolean;
}

interface Department {
    id: number;
    name: string;
    nameAr?: string;
}

interface BranchPricingState {
    branch_id: number;
    price: string;
    is_active: boolean;
}

export interface ItemFormOutput {
    department_id: number;
    name: string;
    name_ar: string;
    code: string;
    unit: string;
    image: string;
    is_active: boolean;
    branches: { branch_id: number; price: number; is_active: boolean }[];
}

interface ItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingItem?: ItemFromApi | null;
    branches: Branch[];
    departments: Department[];
    onSave: (data: ItemFormOutput) => Promise<void>;
}

const ItemModal: React.FC<ItemModalProps> = ({
    isOpen, onClose, editingItem, branches, departments, onSave,
}) => {
    const [activeTab, setActiveTab] = useState<'info' | 'branches'>('info');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [branchSearch, setBranchSearch] = useState('');

    const [form, setForm] = useState({
        name: '', name_ar: '', code: '', department_id: '', unit: '', image: '', is_active: true,
    });
    const [branchPricings, setBranchPricings] = useState<BranchPricingState[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        setActiveTab('info');
        setErrors({});
        setBranchSearch('');

        if (editingItem) {
            setForm({
                name: editingItem.name ?? '',
                name_ar: editingItem.name_ar ?? '',
                code: editingItem.code ?? '',
                department_id: String(editingItem.department_id ?? ''),
                unit: editingItem.unit ?? '',
                image: editingItem.image ?? '',
                is_active: editingItem.is_active ?? true,
            });
            setBranchPricings(
                (editingItem.branches ?? []).map(b => ({
                    branch_id: b.id,
                    price: String(b.pivot?.price ?? ''),
                    is_active: b.pivot?.is_active ?? true,
                }))
            );
        } else {
            setForm({ name: '', name_ar: '', code: '', department_id: '', unit: '', image: '', is_active: true });
            setBranchPricings([]);
        }
    }, [isOpen, editingItem]);

    const setField = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));

    const toggleBranch = (id: number) => {
        setBranchPricings(prev =>
            prev.find(b => b.branch_id === id)
                ? prev.filter(b => b.branch_id !== id)
                : [...prev, { branch_id: id, price: '', is_active: true }]
        );
    };

    const updateBranchField = (id: number, field: 'price' | 'is_active', val: any) =>
        setBranchPricings(prev => prev.map(b => b.branch_id === id ? { ...b, [field]: val } : b));

    const filteredBranches = useMemo(() =>
        branches.filter(b =>
            b.name.toLowerCase().includes(branchSearch.toLowerCase()) ||
            (b.code ?? '').toLowerCase().includes(branchSearch.toLowerCase())
        ), [branches, branchSearch]);

    const validateInfo = (): boolean => {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = 'الاسم بالإنجليزي مطلوب';
        if (!form.name_ar.trim()) errs.name_ar = 'الاسم بالعربي مطلوب';
        if (!form.code.trim()) errs.code = 'كود الصنف مطلوب';
        if (!form.department_id) errs.department_id = 'القسم مطلوب';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateBranches = (): boolean => {
        const errs: Record<string, string> = {};
        branchPricings.forEach(b => {
            const p = parseFloat(b.price);
            if (b.price === '' || isNaN(p) || p < 0) errs[`price_${b.branch_id}`] = 'أدخل سعراً صحيحاً';
        });
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const goNext = () => { if (validateInfo()) { setErrors({}); setActiveTab('branches'); } };
    const goPrev = () => { setErrors({}); setActiveTab('info'); };

    const handleSubmit = async () => {
        if (!validateBranches()) return;
        setSaving(true);
        try {
            await onSave({
                department_id: Number(form.department_id),
                name: form.name.trim(), name_ar: form.name_ar.trim(),
                code: form.code.trim(), unit: form.unit.trim(),
                image: form.image.trim(), is_active: form.is_active,
                branches: branchPricings.map(b => ({
                    branch_id: b.branch_id, price: parseFloat(b.price), is_active: b.is_active,
                })),
            });
            onClose();
        } catch (e: any) {
            setErrors({ submit: e?.response?.data?.message ?? 'فشل الحفظ، يرجى المحاولة مجدداً' });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const linkedCount = branchPricings.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl" style={{ maxHeight: '90vh' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
                    <h2 className="text-base font-black text-white">
                        {editingItem ? 'تعديل الصنف' : 'إضافة صنف جديد'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 shrink-0 px-6">
                    {[
                        { id: 'info', label: 'المعلومات الأساسية', num: '1' },
                        { id: 'branches', label: 'الفروع والأسعار', num: '2' },
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        const isDone = tab.id === 'info' && activeTab === 'branches';
                        return (
                            <button
                                key={tab.id}
                                onClick={() => tab.id === 'branches' ? goNext() : goPrev()}
                                className={`flex items-center gap-2 px-4 py-3 text-xs font-black border-b-2 transition-all -mb-px ${isActive ? 'border-red-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {isDone ? (
                                    <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                        <Check size={10} className="text-white" strokeWidth={3} />
                                    </span>
                                ) : (
                                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-black ${isActive ? 'border-red-500 text-red-500' : 'border-slate-600 text-slate-500'
                                        }`}>{tab.num}</span>
                                )}
                                {tab.label}
                                {tab.id === 'branches' && linkedCount > 0 && (
                                    <span className="bg-red-600/20 text-red-400 text-[9px] font-black px-1.5 py-0.5 rounded-full">{linkedCount}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">

                    {/* Tab 1 */}
                    {activeTab === 'info' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="الاسم بالإنجليزي *" error={errors.name}>
                                    <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Cappuccino" className={inputCls(!!errors.name)} />
                                </Field>
                                <Field label="الاسم بالعربي *" error={errors.name_ar}>
                                    <input value={form.name_ar} onChange={e => setField('name_ar', e.target.value)} placeholder="كابتشينو" className={inputCls(!!errors.name_ar)} />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="كود الصنف *" error={errors.code}>
                                    <input value={form.code} onChange={e => setField('code', e.target.value)} placeholder="CAP-001" className={inputCls(!!errors.code)} />
                                </Field>
                                <Field label="الوحدة">
                                    <input value={form.unit} onChange={e => setField('unit', e.target.value)} placeholder="كوب / حبة / كغ" className={inputCls(false)} />
                                </Field>
                            </div>
                            <Field label="القسم *" error={errors.department_id}>
                                <select value={form.department_id} onChange={e => setField('department_id', e.target.value)} className={inputCls(!!errors.department_id)}>
                                    <option value="">اختر القسم...</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.nameAr || d.name}</option>)}
                                </select>
                            </Field>
                            <Field label="رابط الصورة">
                                <input value={form.image} onChange={e => setField('image', e.target.value)} placeholder="https://..." className={inputCls(false)} />
                            </Field>
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <div onClick={() => setField('is_active', !form.is_active)}
                                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${form.is_active ? 'bg-red-600' : 'bg-slate-700'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${form.is_active ? 'left-5' : 'left-0.5'}`} />
                                </div>
                                <span className="text-sm text-slate-300">الصنف نشط ومتاح</span>
                            </label>
                        </div>
                    )}

                    {/* Tab 2 */}
                    {activeTab === 'branches' && (
                        <div className="space-y-3">
                            {/* Summary */}
                            <div className="flex items-center justify-between bg-slate-800/40 rounded-xl px-4 py-2.5 border border-white/5">
                                <span className="text-xs text-slate-400">
                                    <span className="text-white font-black">{linkedCount}</span> مرتبط من <span className="text-white font-black">{branches.length}</span> فرع
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => {
                                            const next = [...branchPricings];
                                            filteredBranches.forEach(b => {
                                                if (!next.find(p => p.branch_id === b.id))
                                                    next.push({ branch_id: b.id, price: '', is_active: true });
                                            });
                                            setBranchPricings(next);
                                        }}
                                        className="text-[10px] font-black text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                                    >ربط الكل</button>
                                    <button
                                        onClick={() => setBranchPricings([])}
                                        className="text-[10px] font-black text-slate-400 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/5 transition-colors"
                                    >إلغاء الكل</button>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                <input
                                    type="text" value={branchSearch} onChange={e => setBranchSearch(e.target.value)}
                                    placeholder="البحث عن فرع..."
                                    className="w-full bg-slate-800 border border-white/5 rounded-xl py-2 pr-9 pl-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                                />
                            </div>

                            {/* List */}
                            <div className="space-y-2">
                                {filteredBranches.length === 0 && (
                                    <p className="text-center text-slate-500 text-sm py-8">لا توجد فروع مطابقة</p>
                                )}
                                {filteredBranches.map(branch => {
                                    const linked = branchPricings.some(b => b.branch_id === branch.id);
                                    const bData = branchPricings.find(b => b.branch_id === branch.id);
                                    const priceErr = errors[`price_${branch.id}`];

                                    return (
                                        <div key={branch.id} className={`rounded-xl border transition-all duration-200 ${linked ? 'bg-red-600/5 border-red-600/20' : 'bg-slate-800/30 border-white/5 opacity-60 hover:opacity-90'
                                            }`}>
                                            <div className="flex items-center gap-3 px-4 py-3">
                                                <button onClick={() => toggleBranch(branch.id)}
                                                    className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${linked ? 'bg-red-600 border-red-600' : 'border-slate-600 hover:border-red-500/50'
                                                        }`}>
                                                    {linked && <Check size={11} className="text-white" strokeWidth={3} />}
                                                </button>

                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-black truncate ${linked ? 'text-white' : 'text-slate-400'}`}>{branch.name}</p>
                                                    {branch.code && <p className="text-[10px] text-slate-600 font-mono">#{branch.code}</p>}
                                                </div>

                                                {linked && (
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <div className={`flex items-center bg-slate-900 border rounded-xl overflow-hidden ${priceErr ? 'border-red-500/60' : 'border-white/10 focus-within:border-red-500/40'
                                                            }`}>
                                                            <input
                                                                type="number" min="0" step="0.01"
                                                                value={bData?.price ?? ''}
                                                                onChange={e => updateBranchField(branch.id, 'price', e.target.value)}
                                                                placeholder="0.00"
                                                                className="w-24 bg-transparent px-3 py-1.5 text-sm text-white focus:outline-none text-center font-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <span className="text-xs text-slate-500 font-black pl-1 pr-3">₪</span>
                                                        </div>
                                                        <button
                                                            onClick={() => updateBranchField(branch.id, 'is_active', !bData?.is_active)}
                                                            className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg border transition-all whitespace-nowrap ${bData?.is_active
                                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                                                                    : 'bg-slate-700 text-slate-500 border-white/5 hover:bg-slate-600'
                                                                }`}>
                                                            {bData?.is_active ? 'نشط' : 'متوقف'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {priceErr && linked && (
                                                <div className="px-4 pb-2.5 flex items-center gap-1 text-red-400 text-[10px]">
                                                    <AlertCircle size={10} />{priceErr}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {errors.submit && (
                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                            <AlertCircle size={16} />{errors.submit}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/5 shrink-0 bg-slate-900/50">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors font-black">
                        إلغاء
                    </button>
                    <div className="flex items-center gap-2">
                        {activeTab === 'branches' && (
                            <button onClick={goPrev} className="px-4 py-2 text-sm bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-black">
                                السابق
                            </button>
                        )}
                        {activeTab === 'info' ? (
                            <button onClick={goNext} className="flex items-center gap-1.5 px-5 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all font-black shadow-lg shadow-red-900/20">
                                التالي — الفروع والأسعار <ChevronRight size={14} />
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={saving}
                                className="flex items-center gap-1.5 px-5 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all font-black shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed">
                                {saving ? (
                                    <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري الحفظ...</>
                                ) : (
                                    <>{editingItem ? 'حفظ التعديلات' : 'إضافة الصنف'} <Check size={14} /></>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const inputCls = (hasError: boolean) =>
    `w-full bg-slate-800 border rounded-xl px-3 py-2 text-sm text-white focus:outline-none transition-colors ${hasError ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-red-500/50'
    }`;

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
        {children}
        {error && <p className="mt-1 text-[10px] text-red-400 flex items-center gap-1"><AlertCircle size={9} />{error}</p>}
    </div>
);

export default ItemModal;