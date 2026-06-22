// src/components/administration/Items/ItemModal.tsx

import { useState, useEffect, useMemo } from 'react';
import { X, RefreshCw, Hash, AlertCircle, Building2, Image as ImageIcon } from 'lucide-react';
import { generateNextItemCode, getItemImageUrl, type Item, type ItemFormData } from '../../../services/itemService';
import type { Branch } from '../../../services/branchService';

interface Department {
    id: number;
    name: string;
    nameAr?: string;
    code?: string;
    parent_id?: number | null;
    children?: Department[];
}

interface Props {
    item?: Item | null;
    departments: Department[];       // nested OR flat — we handle both
    allItems: Item[];
    branches?: Branch[];
    defaultDeptId?: number | null;   // ← pre-select when opened from tree row
    onSave: (data: ItemFormData) => Promise<void>;
    onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Flatten nested tree → [{dept, depth}] preserving visual order */
const flattenDepts = (
    depts: Department[],
    depth = 0,
    result: Array<{ dept: Department; depth: number }> = []
): Array<{ dept: Department; depth: number }> => {
    for (const d of depts) {
        result.push({ dept: d, depth });
        if (d.children?.length) flattenDepts(d.children, depth + 1, result);
    }
    return result;
};

/** Find a dept by id anywhere in the tree (handles flat arrays too) */
const findDeptById = (depts: Department[], id: number): Department | undefined => {
    for (const d of depts) {
        if (d.id === id) return d;
        if (d.children?.length) {
            const found = findDeptById(d.children, id);
            if (found) return found;
        }
    }
    return undefined;
};

const UNITS = ['', 'kg', 'g', 'L', 'ml', 'piece', 'box', 'carton', 'portion'];
const IMAGE_MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

const getStoredImageDisplayUrl = (
    image: string | File | null | undefined,
    editingItem?: Item | null,
) =>
    getItemImageUrl({
        image: typeof image === 'string' ? image : '',
        image_url: editingItem?.image_url ?? undefined,
        image_path: editingItem?.image_path ?? undefined,
    });

interface BranchPriceDraft {
    branch_id: number;
    price: string;
    is_availble: boolean;
}

const getInitialBranchPrices = (item?: Item | null): BranchPriceDraft[] => {
    if (!item) return [];

    const pivotRows = item.branch_item ?? item.branch_items ?? item.branch_prices;
    if (pivotRows?.length) {
        return pivotRows.map((entry) => ({
            branch_id: Number(entry.branch_id),
            price: entry.price === null || entry.price === undefined ? '' : String(entry.price),
            is_availble: entry.is_active === undefined ? true : Boolean(entry.is_active),
        }));
    }

    if (item.branches?.length) {
        return item.branches.map((branch) => {
            const price = (branch as any).price ?? '';
            const isAvailble = (branch as any).is_availble ?? (branch as any).is_active ?? true;
            return {
                branch_id: Number(branch.id),
                price: price === null || price === undefined ? '' : String(price),
                is_availble: Boolean(isAvailble),
            };
        });
    }

    return [];
};

// ── Component ─────────────────────────────────────────────────────────────────

const ItemModal = ({ item, departments, allItems, branches = [], defaultDeptId, onSave, onClose }: Props) => {

    // Flatten once for the <select>
    const flatDepts = useMemo(() => flattenDepts(departments), [departments]);

    // Pick a sensible initial department:
    // 1. editing existing item  → use its dept
    // 2. opened from tree row   → use defaultDeptId
    // 3. fallback               → first dept in list
    const initialDeptId =
        item?.department_id ??
        defaultDeptId ??
        flatDepts[0]?.dept.id ??
        0;

    const [form, setForm] = useState<ItemFormData>({
        department_id: initialDeptId,
        name:      item?.name      ?? '',
        name_ar:   item?.name_ar   ?? '',
        code:      item?.code      ?? '',
        image:     item?.image     ?? '',
        unit:      item?.unit      ?? '',
        is_active: item?.is_active ?? true,
        price:     (item as any)?.price ?? 0,
    });

    const [saving,     setSaving]     = useState(false);
    const [codeManual, setCodeManual] = useState(!!item);
    const [noDeptCode, setNoDeptCode] = useState(false); // warn when dept has no code
    const [branchPrices, setBranchPrices] = useState<BranchPriceDraft[]>(() => getInitialBranchPrices(item));
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>(getItemImageUrl(item));
    const [imageUploadError, setImageUploadError] = useState<string | null>(null);

    const currentStoredImageUrl = useMemo(
        () => getStoredImageDisplayUrl(form.image, item),
        [form.image, item],
    );

    const set = (key: keyof ItemFormData, val: any) =>
        setForm(f => ({ ...f, [key]: val }));

    const toggleBranch = (branchId: number) => {
        setBranchPrices((current) => {
            const exists = current.some((entry) => entry.branch_id === branchId);
            if (exists) return current.filter((entry) => entry.branch_id !== branchId);
            return [...current, { branch_id: branchId, price: String((form as any).price ?? 0), is_availble: true }];
        });
    };

    const setBranchPrice = (branchId: number, price: string) => {
        setBranchPrices((current) =>
            current.map((entry) =>
                entry.branch_id === branchId ? { ...entry, price } : entry
            )
        );
    };

    const setBranchAvailability = (branchId: number, isAvailble: boolean) => {
        setBranchPrices((current) =>
            current.map((entry) =>
                entry.branch_id === branchId ? { ...entry, is_availble: isAvailble } : entry
            )
        );
    };

    // ── Core fix: generate code whenever dept changes (or on first mount) ──
    const generateCode = (deptId: number) => {
        // Search both the nested tree AND the flat list
        const dept =
            findDeptById(departments, deptId) ??
            flatDepts.find(({ dept: d }) => d.id === deptId)?.dept;

        if (!dept?.code) {
            setNoDeptCode(true);
            set('code', '');
            return;
        }
        setNoDeptCode(false);
        const generated = generateNextItemCode(dept.code, allItems);
        set('code', generated);
    };

    // Run on mount for new items, and whenever dept selection changes
    useEffect(() => {
        if (item || codeManual) return;   // editing or user typed → don't overwrite
        generateCode(form.department_id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.department_id]);

    // Also run once on mount regardless of codeManual so the field isn't blank
    useEffect(() => {
        if (item) return;
        generateCode(initialDeptId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDeptChange = (deptId: number) => {
        set('department_id', deptId);
        setCodeManual(false); // reset manual flag so generateCode runs via effect
    };

    const handleRegenerateClick = () => {
        setCodeManual(false);
        generateCode(form.department_id);
    };

    const handleImageChange = (file?: File | null) => {
        setImageUploadError(null);

        if (!file) {
            setSelectedImageFile(null);
            setImagePreview(getStoredImageDisplayUrl(form.image, item));
            return;
        }

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            setSelectedImageFile(null);
            setImagePreview(getStoredImageDisplayUrl(form.image, item));
            setImageUploadError('Only JPG and PNG images are allowed.');
            return;
        }

        if (file.size > IMAGE_MAX_SIZE) {
            setSelectedImageFile(null);
            setImagePreview(getStoredImageDisplayUrl(form.image, item));
            setImageUploadError('Image size must not exceed 2MB.');
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setSelectedImageFile(file);
        setImagePreview(previewUrl);
    };

    useEffect(() => {
        return () => {
            if (imagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!form.name.trim())    return alert('الاسم بالإنجليزي مطلوب');
        if (!form.name_ar.trim()) return alert('الاسم بالعربي مطلوب');
        if (!form.code?.trim())   return alert('الكود مطلوب — اختر قسماً يملك كوداً');
        if (!form.department_id)  return alert('يجب اختيار القسم');
        if (branches.length && branchPrices.length === 0) return alert('يجب اختيار فرع واحد على الأقل للصنف');

        const normalizedBranchPrices = branchPrices.map((entry) => ({
            branch_id: entry.branch_id,
            price: Number(entry.price) || 0,
            is_availble: entry.is_availble,
        }));
        const normalizedBranches = normalizedBranchPrices.map((entry) => ({
            id: entry.branch_id,
            price: entry.price,
            is_availble: entry.is_availble,
        }));

        setSaving(true);
        try {
            await onSave({
                ...form,
                price: normalizedBranchPrices[0]?.price ?? (form as any).price ?? 0,
                image: selectedImageFile ?? form.image,
                branch_prices: normalizedBranchPrices,
                branch_item: normalizedBranchPrices,
                branch_items: normalizedBranchPrices,
                branches: normalizedBranches,
            });
            onClose();
        } catch (e: any) {
            alert(e.response?.data?.message ?? 'فشل الحفظ');
        } finally {
            setSaving(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h2 className="text-lg font-bold text-white">
                        {item ? 'تعديل الصنف' : 'إضافة صنف جديد'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">

                    {/* Department selector */}
                    <Field label="القسم *">
                        <select
                            value={form.department_id}
                            onChange={e => handleDeptChange(Number(e.target.value))}
                            className={inputCls}
                        >
                            {flatDepts.map(({ dept, depth }) => (
                                <option key={dept.id} value={dept.id}>
                                    {'　'.repeat(depth)}
                                    {dept.nameAr ?? dept.name}
                                    {dept.code ? ` (${dept.code})` : ' ⚠️ بدون كود'}
                                </option>
                            ))}
                        </select>
                    </Field>

                    {/* Code field */}
                    <Field label="كود الصنف *">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Hash size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    value={form.code ?? ''}
                                    onChange={e => { set('code', e.target.value); setCodeManual(true); }}
                                    className={`${inputCls} pr-8 font-mono tracking-widest`}
                                    placeholder="1101001"
                                    dir="ltr"
                                />
                            </div>
                            {!item && (
                                <button
                                    type="button"
                                    onClick={handleRegenerateClick}
                                    title="إعادة توليد الكود"
                                    className="p-2.5 bg-slate-800 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-red-500/40 transition-colors"
                                >
                                    <RefreshCw size={15} />
                                </button>
                            )}
                        </div>

                        {/* Warning: selected dept has no code */}
                        {noDeptCode && (
                            <p className="flex items-center gap-1 text-[11px] text-orange-400 mt-1.5">
                                <AlertCircle size={11} />
                                هذا القسم لا يملك كوداً — أضف كوداً للقسم أولاً أو اكتب الكود يدوياً
                            </p>
                        )}
                        {!noDeptCode && !item && (
                            <p className="text-[10px] text-slate-600 mt-1">
                                يُولَّد تلقائياً بناءً على كود القسم الأب · يمكنك تعديله يدوياً
                            </p>
                        )}
                    </Field>

                    {/* Names */}
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="الاسم بالإنجليزي *">
                            <input value={form.name} onChange={e => set('name', e.target.value)}
                                className={inputCls} placeholder="Shawarma Chicken" dir="ltr" />
                        </Field>
                        <Field label="الاسم بالعربي *">
                            <input value={form.name_ar} onChange={e => set('name_ar', e.target.value)}
                                className={inputCls} placeholder="شاورما دجاج" dir="rtl" />
                        </Field>
                    </div>

                    {/* Price */}
                    <Field label="السعر">
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={(form as any).price ?? 0}
                            onChange={e => set('price' as any, parseFloat(e.target.value) || 0)}
                            className={`${inputCls} font-mono`}
                            dir="ltr"
                        />
                    </Field>

                    <Field label="الفروع وأسعار الصنف">
                        <div className="rounded-xl border border-white/10 bg-slate-950/30 overflow-hidden">
                            {branches.length === 0 ? (
                                <div className="px-3 py-3 text-xs text-slate-500">
                                    لا توجد فروع متاحة للربط
                                </div>
                            ) : (
                                <div className="max-h-52 overflow-y-auto divide-y divide-white/5">
                                    {branches.map((branch) => {
                                        const selected = branchPrices.find((entry) => entry.branch_id === branch.id);

                                        return (
                                            <div key={branch.id} className="grid grid-cols-[1fr_92px_132px] gap-3 px-3 py-2.5 items-center">
                                                <label className="flex items-center gap-3 min-w-0 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!selected}
                                                        onChange={() => toggleBranch(branch.id)}
                                                        className="h-4 w-4 accent-red-600"
                                                    />
                                                    <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                                                        <Building2 size={13} />
                                                    </span>
                                                    <span className="text-sm text-white truncate">
                                                        {branch.name}
                                                    </span>
                                                </label>
                                                <label className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                                                    <input
                                                        type="checkbox"
                                                        checked={selected?.is_availble ?? false}
                                                        disabled={!selected}
                                                        onChange={e => setBranchAvailability(branch.id, e.target.checked)}
                                                        className="h-3.5 w-3.5 accent-emerald-600 disabled:opacity-40"
                                                    />
                                                    متاح
                                                </label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    disabled={!selected}
                                                    value={selected?.price ?? ''}
                                                    onChange={e => setBranchPrice(branch.id, e.target.value)}
                                                    className={`${inputCls} font-mono disabled:opacity-40 disabled:cursor-not-allowed`}
                                                    placeholder="0.00"
                                                    dir="ltr"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </Field>

                    {/* Unit + Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="الوحدة">
                            <select value={form.unit ?? ''} onChange={e => set('unit', e.target.value)} className={inputCls}>
                                {UNITS.map(u => <option key={u} value={u}>{u || '— بدون وحدة —'}</option>)}
                            </select>
                        </Field>
                        <Field label="الحالة">
                            <select
                                value={form.is_active ? 'true' : 'false'}
                                onChange={e => set('is_active', e.target.value === 'true')}
                                className={inputCls}
                            >
                                <option value="true">نشط</option>
                                <option value="false">غير نشط</option>
                            </select>
                        </Field>
                    </div>

                    {/* Image */}
                    <Field label="رابط الصورة">
                        <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3 space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-24 h-24 rounded-xl bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center text-slate-600 shrink-0">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt={form.name || 'Item preview'} className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon size={24} />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 space-y-2">
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png"
                                        onChange={e => handleImageChange(e.target.files?.[0])}
                                        className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-slate-700"
                                    />
                                    {selectedImageFile && (
                                        <span className="block text-[11px] text-slate-500 truncate">
                                            {selectedImageFile.name}
                                        </span>
                                    )}
                                    <p className="text-[10px] text-slate-600">JPG or PNG, max 2MB. The file will be uploaded when you save the item.</p>
                                </div>
                            </div>

                            {imageUploadError && (
                                <p className="flex items-center gap-1 text-[11px] text-red-400">
                                    <AlertCircle size={12} />
                                    {imageUploadError}
                                </p>
                            )}

                            {currentStoredImageUrl && !selectedImageFile && (
                                <div className="rounded-lg bg-slate-900 border border-white/5 px-3 py-2">
                                    <p className="text-[10px] text-slate-500 mb-1">Current image URL</p>
                                    <a
                                        href={currentStoredImageUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block truncate text-xs text-emerald-400 hover:text-emerald-300"
                                        dir="ltr"
                                    >
                                        {currentStoredImageUrl}
                                    </a>
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
                        {saving ? 'جاري الحفظ...' : item ? 'حفظ التغييرات' : 'إضافة الصنف'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputCls = "w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
        {children}
    </div>
);

export default ItemModal;
