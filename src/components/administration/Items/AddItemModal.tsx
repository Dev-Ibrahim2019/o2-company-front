import { useState, useEffect } from "react";
import { useApp } from "../../../../store";
import { X, Loader2, RefreshCw, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────

interface ItemFormData {
  departmentId: string;
  name: string;
  nameAr: string;
  code: string;
  image: string;
  unit: string;
  isActive: boolean;
  status: "AVAILABLE" | "UNAVAILABLE" | "OUT_OF_STOCK";
  price: string;
  prepTime: string;
  requiresKitchen: boolean;
  popular: boolean;
  chefRecommended: boolean;
  seasonal: boolean;
}

const EMPTY: ItemFormData = {
  departmentId: "",
  name: "",
  nameAr: "",
  code: "",
  image: "",
  unit: "",
  isActive: true,
  status: "AVAILABLE",
  price: "",
  prepTime: "",
  requiresKitchen: false,
  popular: false,
  chefRecommended: false,
  seasonal: false,
};

// ─── Sequential code generator (client-side mirror of backend) ────

function generateNextCode(existingCodes: string[]): string {
  const numeric = existingCodes
    .map((c) => parseInt(c, 10))
    .filter((n) => !isNaN(n));

  const max = numeric.length > 0 ? Math.max(...numeric) : 0;
  const next = max + 1;
  return String(next).padStart(3, "0");
}

// ─── Modal ────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: any | null;
}

const AddItemModal: React.FC<Props> = ({ isOpen, onClose, editingItem }) => {
  const { menuItems, departments, addMenuItem, updateMenuItem } = useApp();

  const [form, setForm] = useState<ItemFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof ItemFormData, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [codeGenerating, setCodeGenerating] = useState(false);

  // ── Init ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (editingItem) {
      setForm({
        departmentId: editingItem.departmentId ?? "",
        name: editingItem.name ?? "",
        nameAr: editingItem.nameAr ?? "",
        code: editingItem.code ?? "",
        image: editingItem.image ?? "",
        unit: editingItem.unit ?? "",
        isActive: editingItem.isActive ?? true,
        status: editingItem.status ?? "AVAILABLE",
        price: editingItem.price?.toString() ?? "",
        prepTime: editingItem.prepTime?.toString() ?? "",
        requiresKitchen: editingItem.requiresKitchen ?? false,
        popular: editingItem.popular ?? false,
        chefRecommended: editingItem.chefRecommended ?? false,
        seasonal: editingItem.seasonal ?? false,
      });
    } else {
      // Auto-generate code for new items
      const codes = (menuItems as any[]).map((m: any) => m.code ?? "");
      const code = generateNextCode(codes);
      setForm({ ...EMPTY, code });
    }

    setErrors({});
  }, [isOpen, editingItem]);

  // ── Regenerate code ──────────────────────────────────────────
  const regenerate = () => {
    setCodeGenerating(true);
    const codes = (menuItems as any[])
      .filter((m: any) => !editingItem || m.id !== editingItem.id)
      .map((m: any) => m.code ?? "");
    const code = generateNextCode(codes);
    setTimeout(() => {
      set("code", code);
      setCodeGenerating(false);
    }, 250);
  };

  // ── Helpers ──────────────────────────────────────────────────
  const set = <K extends keyof ItemFormData>(k: K, v: ItemFormData[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.departmentId) e.departmentId = "اختر القسم";
    if (!form.nameAr.trim()) e.nameAr = "مطلوب";
    if (!form.name.trim()) e.name = "مطلوب";
    if (!form.code.trim()) e.code = "مطلوب";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSaving(true);
    const payload = {
      ...form,
      price: Number(form.price) || 0,
      prepTime: Number(form.prepTime) || 0,
    };
    try {
      if (editingItem) {
        await (updateMenuItem as any)?.(editingItem.id, payload);
      } else {
        await (addMenuItem as any)?.(payload);
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <div>
                <h2 className="text-base font-bold text-white">
                  {editingItem ? "تعديل الصنف" : "إضافة صنف جديد"}
                </h2>
                {!editingItem && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    سيتم توليد كود الصنف تلقائياً
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* ── Code (auto) ── */}
              <Field label="كود الصنف" error={errors.code}>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600">
                    <Hash size={14} />
                  </span>
                  <input
                    dir="ltr"
                    type="text"
                    value={form.code}
                    onChange={(e) => set("code", e.target.value)}
                    placeholder="001"
                    className={`${iCls(!!errors.code)} pr-9 pl-10 font-mono tracking-widest`}
                  />
                  <button
                    type="button"
                    onClick={regenerate}
                    title="توليد كود جديد"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    {codeGenerating
                      ? <Loader2 size={13} className="animate-spin" />
                      : <RefreshCw size={13} />}
                  </button>
                  {!editingItem && (
                    <span className="absolute left-9 top-1/2 -translate-y-1/2 text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full">
                      تلقائي
                    </span>
                  )}
                </div>
              </Field>

              {/* ── Department ── */}
              <Field label="القسم *" error={errors.departmentId}>
                <select
                  value={form.departmentId}
                  onChange={(e) => set("departmentId", e.target.value)}
                  className={sCls(!!errors.departmentId)}
                >
                  <option value="">اختر القسم</option>
                  {(departments as any[]).map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.nameAr ?? d.name}
                    </option>
                  ))}
                </select>
              </Field>

              {/* ── Names ── */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="الاسم العربي *" error={errors.nameAr}>
                  <input
                    dir="rtl"
                    type="text"
                    value={form.nameAr}
                    onChange={(e) => set("nameAr", e.target.value)}
                    placeholder="برجر دجاج"
                    className={iCls(!!errors.nameAr)}
                  />
                </Field>
                <Field label="الاسم الإنجليزي *" error={errors.name}>
                  <input
                    dir="ltr"
                    type="text"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Chicken Burger"
                    className={iCls(!!errors.name)}
                  />
                </Field>
              </div>

              {/* ── Price / Unit / Prep ── */}
              <div className="grid grid-cols-3 gap-4">
                <Field label="السعر" error={errors.price}>
                  <input
                    dir="ltr"
                    type="number"
                    min={0}
                    step="0.001"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                    placeholder="0.000"
                    className={iCls(!!errors.price)}
                  />
                </Field>
                <Field label="الوحدة">
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => set("unit", e.target.value)}
                    placeholder="كيلو / حبة"
                    className={iCls(false)}
                  />
                </Field>
                <Field label="وقت التحضير (د)">
                  <input
                    dir="ltr"
                    type="number"
                    min={0}
                    value={form.prepTime}
                    onChange={(e) => set("prepTime", e.target.value)}
                    placeholder="0"
                    className={iCls(false)}
                  />
                </Field>
              </div>

              {/* ── Image ── */}
              <Field label="رابط الصورة">
                <input
                  dir="ltr"
                  type="text"
                  value={form.image}
                  onChange={(e) => set("image", e.target.value)}
                  placeholder="https://..."
                  className={iCls(false)}
                />
              </Field>

              {/* ── Status ── */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="الحالة">
                  <select
                    value={form.status}
                    onChange={(e) => set("status", e.target.value as any)}
                    className={sCls(false)}
                  >
                    <option value="AVAILABLE">متوفر</option>
                    <option value="UNAVAILABLE">غير متوفر</option>
                    <option value="OUT_OF_STOCK">نفذت الكمية</option>
                  </select>
                </Field>
              </div>

              {/* ── Flags ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {([
                  { k: "popular",         label: "الأكثر مبيعاً" },
                  { k: "chefRecommended", label: "توصية الشيف" },
                  { k: "seasonal",        label: "موسمي" },
                  { k: "requiresKitchen", label: "يحتاج مطبخ" },
                ] as { k: keyof ItemFormData; label: string }[]).map(({ k, label }) => (
                  <label
                    key={k}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all text-xs font-medium ${
                      form[k]
                        ? "bg-red-600/10 border-red-500/30 text-red-400"
                        : "bg-slate-900 border-white/5 text-slate-400 hover:border-white/10"
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-colors ${
                        form[k] ? "bg-red-600 border-red-600" : "border-slate-600"
                      }`}
                    >
                      {form[k] && (
                        <svg viewBox="0 0 10 8" className="w-2 h-2">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5"
                            fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={form[k] as boolean}
                      onChange={(e) => set(k, e.target.checked as any)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-900/20"
              >
                {isSaving && <Loader2 size={13} className="animate-spin" />}
                {editingItem ? "حفظ التعديلات" : "إضافة الصنف"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Field wrapper ────────────────────────────────────────────────

const Field: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({
  label, error, children,
}) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</label>
    {children}
    {error && <p className="text-[10px] text-red-400">{error}</p>}
  </div>
);

const iCls = (err: boolean) =>
  `w-full bg-slate-900 border ${err ? "border-red-500/50" : "border-white/5"} rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-red-500/40 transition-all placeholder:text-slate-600`;

const sCls = (err: boolean) =>
  `w-full bg-slate-900 border ${err ? "border-red-500/50" : "border-white/5"} rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-red-500/40 transition-all`;

export default AddItemModal;