// src/components/administration/OrgStructure/RenderBranches.tsx
// متكامل مع الـ API الحقيقي - useBranch hook

import React, { useState } from "react";
import {
  Building2,
  Users2,
  Plus,
  Edit3,
  Trash2,
  MapPin,
  Phone,
  Layers,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  Save,
  Clock,
  Hash,
  Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBranch } from "../../../hooks/useBranch";
import type { Branch } from "../../../services/branchService";

// ── نوع الـ Form Data ──────────────────────────────────────────────────────────
interface BranchFormData {
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
  code: string;
  isMainBranch: boolean;
  openingTime: string;
  closingTime: string;
}

const emptyForm = (): BranchFormData => ({
  name: "",
  address: "",
  phone: "",
  is_active: true,
  code: "",
  isMainBranch: false,
  openingTime: "08:00",
  closingTime: "23:00",
});

const formFromBranch = (b: Branch): BranchFormData => ({
  name: b.name,
  address: b.address ?? "",
  phone: b.phone ?? "",
  is_active: b.is_active ?? true,
  code: b.code ?? "",
  isMainBranch: b.isMainBranch ?? false,
  openingTime: b.openingTime ? String(b.openingTime).slice(0, 5) : "08:00",
  closingTime: b.closingTime ? String(b.closingTime).slice(0, 5) : "23:00",
});

// ── Modal إضافة/تعديل فرع ─────────────────────────────────────────────────────
const BranchModal: React.FC<{
  title: string;
  initial: BranchFormData;
  onSave: (data: BranchFormData) => Promise<void>;
  onClose: () => void;
}> = ({ title, initial, onSave, onClose }) => {
  const [form, setForm] = useState<BranchFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BranchFormData, string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const set = (key: keyof BranchFormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const e: Partial<Record<keyof BranchFormData, string>> = {};
    if (!form.name.trim()) e.name = "اسم الفرع مطلوب";
    if (!form.code.trim()) e.code = "الكود مطلوب";
    if (!form.openingTime) e.openingTime = "وقت الفتح مطلوب";
    if (!form.closingTime) e.closingTime = "وقت الإغلاق مطلوب";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      setApiError(null);
      await onSave(form);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "حدث خطأ أثناء الحفظ";
      setApiError(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (key: keyof BranchFormData) =>
    `w-full p-3 bg-slate-800 border rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all ${errors[key] ? "border-red-500/60" : "border-white/5"
    }`;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative bg-slate-900 w-full max-w-lg rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh] border border-white/10"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
          <div>
            <h3 className="text-base font-black text-white tracking-tight">{title}</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-[0.1em]">
              Branch Configuration
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950/30 space-y-4">
          {apiError && (
            <div className="flex items-center gap-2 p-3 bg-red-600/10 border border-red-600/20 rounded-xl">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-400 font-bold">{apiError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* اسم الفرع */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Building2 size={12} /> اسم الفرع *
              </label>
              <input type="text" className={inputClass("name")} placeholder="فرع الميناء الرئيسي"
                value={form.name} onChange={(e) => set("name", e.target.value)} />
              {errors.name && <p className="text-[10px] text-red-400 font-bold">{errors.name}</p>}
            </div>

            {/* الكود */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Hash size={12} /> الكود المميز *
              </label>
              <input type="text" className={inputClass("code")} placeholder="BR-001"
                value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} />
              {errors.code && <p className="text-[10px] text-red-400 font-bold">{errors.code}</p>}
            </div>

            {/* الموقع */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={12} /> الموقع الجغرافي
              </label>
              <input type="text" className={inputClass("address")} placeholder="المدينة، الشارع..."
                value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>

            {/* الهاتف */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Phone size={12} /> رقم الاتصال
              </label>
              <input type="text" className={inputClass("phone")} placeholder="059..."
                value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>

            {/* وقت الفتح */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Clock size={12} /> وقت الفتح *
              </label>
              <input type="time" className={inputClass("openingTime")}
                value={form.openingTime} onChange={(e) => set("openingTime", e.target.value)} />
              {errors.openingTime && <p className="text-[10px] text-red-400 font-bold">{errors.openingTime}</p>}
            </div>

            {/* وقت الإغلاق */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Clock size={12} /> وقت الإغلاق *
              </label>
              <input type="time" className={inputClass("closingTime")}
                value={form.closingTime} onChange={(e) => set("closingTime", e.target.value)} />
              {errors.closingTime && <p className="text-[10px] text-red-400 font-bold">{errors.closingTime}</p>}
            </div>

            {/* الحالة */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 size={12} /> حالة الفرع
              </label>
              <select className={`${inputClass("is_active")} appearance-none`}
                value={form.is_active ? "1" : "0"}
                onChange={(e) => set("is_active", e.target.value === "1")}>
                <option value="1">نشط (Active)</option>
                <option value="0">غير نشط (Inactive)</option>
              </select>
            </div>

            {/* فرع رئيسي */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Crown size={12} /> نوع الفرع
              </label>
              <div className="flex items-center gap-3 p-3 bg-slate-800 border border-white/5 rounded-xl h-[42px]">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-red-600"
                    checked={form.isMainBranch}
                    onChange={(e) => set("isMainBranch", e.target.checked)} />
                  <span className="text-xs font-bold text-white">فرع رئيسي</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 flex items-center gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 bg-slate-800/50 text-slate-400 rounded-xl font-black text-xs hover:bg-slate-700 hover:text-white transition-all border border-white/5 flex items-center justify-center gap-2">
            <X size={14} /> إلغاء
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-[2] py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-black text-xs shadow-lg hover:shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "جاري الحفظ..." : "حفظ بيانات الفرع"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Props ──────────────────────────────────────────────────────────────────────
type Props = {
  onAdd?: (type: "BRANCH") => void;
  onEdit?: (type: "BRANCH", id: string, data: any) => void;
};

// ── المكوّن الرئيسي ─────────────────────────────────────────────────────────────
const RenderBranches: React.FC<Props> = () => {
  const { branches, loading, error, addBranch, updateBranch, deleteBranch } = useBranch();
  const [modal, setModal] = useState<{ mode: "add" | "edit"; branch?: Branch } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (branch: Branch) => {
    if (!confirm(`هل أنت متأكد من حذف فرع "${branch.name}"؟`)) return;
    setDeletingId(branch.id);
    try {
      await deleteBranch(branch.id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Dashboard Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الفروع", value: branches.length, icon: Building2, color: "bg-red-600" },
          { label: "الفروع النشطة", value: branches.filter((b) => b.is_active !== false).length, icon: CheckCircle2, color: "bg-emerald-600" },
          { label: "الفروع الرئيسية", value: branches.filter((b) => b.isMainBranch).length, icon: Crown, color: "bg-amber-600" },
          { label: "وحدات تشغيلية", value: branches.length, icon: Layers, color: "bg-blue-600" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-slate-900/40 backdrop-blur-md p-2 rounded-lg border border-white/5 flex items-center gap-2 group hover:border-white/10 transition-all">
            <div className={`w-6 h-6 ${stat.color} rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
              <stat.icon size={12} className="text-white" />
            </div>
            <div>
              <p className="text-base font-black text-white leading-none mb-1">{stat.value}</p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-white tracking-tighter">الفروع والانتشار</h3>
          <p className="text-slate-500 font-bold mt-1 flex items-center gap-2 text-[10px]">
            <span className="w-4 h-[1px] bg-red-600"></span>
            إدارة المواقع الجغرافية ومراكز التكلفة التشغيلية
          </p>
        </div>
        <button onClick={() => setModal({ mode: "add" })}
          className="bg-white text-black px-5 py-2.5 rounded-xl font-black text-xs shadow-lg hover:bg-red-600 hover:text-white transition-all active:scale-95 flex items-center gap-2 group">
          <Plus size={16} className="group-hover:rotate-90 transition-transform duration-500" /> تأسيس فرع جديد
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-red-500" />
          <span className="mr-3 text-sm font-bold text-slate-400">جاري تحميل الفروع...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-600/10 border border-red-600/20 rounded-xl">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-400 font-bold">{error}</p>
        </div>
      )}

      {/* Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch, idx) => (
            <motion.div key={branch.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }} whileHover={{ y: -4 }}
              className="bg-slate-900/50 backdrop-blur-xl p-1.5 rounded-xl border border-white/5 shadow-xl hover:border-red-600/40 transition-all group relative overflow-hidden">
              <div className="absolute -left-12 -top-12 w-24 h-24 bg-red-600/5 rounded-full blur-[40px] group-hover:bg-red-600/10 transition-colors duration-1000" />

              <div className="flex justify-between items-start mb-1.5 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center shadow-lg border border-white/5 group-hover:scale-110 transition-transform duration-500">
                    <Building2 size={12} className="text-red-500" />
                  </div>
                  {branch.isMainBranch && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-600/10 text-amber-500 border border-amber-600/20 uppercase tracking-widest flex items-center gap-1">
                      <Crown size={8} /> رئيسي
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal({ mode: "edit", branch })}
                    className="p-1 bg-slate-800/80 text-slate-400 hover:text-white rounded-lg transition-all border border-white/5">
                    <Edit3 size={10} />
                  </button>
                  <button onClick={() => handleDelete(branch)} disabled={deletingId === branch.id}
                    className="p-1 bg-slate-800/80 text-slate-400 hover:text-red-500 rounded-lg transition-all border border-white/5 disabled:opacity-50">
                    {deletingId === branch.id
                      ? <Loader2 size={10} className="animate-spin" />
                      : <Trash2 size={10} />}
                  </button>
                </div>
              </div>

              <h3 className="text-sm font-black text-white mb-1.5 relative z-10 tracking-tighter">{branch.name}</h3>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 relative z-10">{branch.code}</p>

              <div className="space-y-1 mb-3 relative z-10">
                {branch.address && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="w-5 h-5 rounded-md bg-slate-800/50 flex items-center justify-center text-red-500 border border-white/5">
                      <MapPin size={10} />
                    </div>
                    <span className="text-[10px] font-bold truncate">{branch.address}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="w-5 h-5 rounded-md bg-slate-800/50 flex items-center justify-center text-red-500 border border-white/5">
                      <Phone size={10} />
                    </div>
                    <span className="text-[10px] font-bold">{branch.phone}</span>
                  </div>
                )}
                {(branch.openingTime || branch.closingTime) && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="w-5 h-5 rounded-md bg-slate-800/50 flex items-center justify-center text-blue-500 border border-white/5">
                      <Clock size={10} />
                    </div>
                    <span className="text-[10px] font-bold">
                      {String(branch.openingTime).slice(0, 5)} - {String(branch.closingTime).slice(0, 5)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-white/5 relative z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${branch.is_active !== false ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-slate-600"}`} />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {branch.is_active !== false ? "Operational" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users2 size={10} className="text-slate-600" />
                  <span className="text-[10px] font-black text-slate-500">0 Staff</span>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Add Button */}
          <motion.button whileHover={{ scale: 0.98 }} onClick={() => setModal({ mode: "add" })}
            className="bg-slate-900/20 border-2 border-dashed border-white/10 rounded-xl p-1.5 flex flex-col items-center justify-center gap-1.5 text-slate-700 hover:bg-slate-900/40 hover:border-red-600/40 hover:text-red-500 transition-all group shadow-lg min-h-[140px]">
            <div className="w-6 h-6 bg-slate-800/50 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform border border-white/5 group-hover:bg-red-600/10 group-hover:border-red-600/20">
              <Plus size={12} />
            </div>
            <div className="text-center">
              <span className="font-black text-xs uppercase tracking-wider block mb-1">New Branch</span>
              <span className="text-[10px] font-bold text-slate-500 group-hover:text-red-400 transition-colors">تأسيس وحدة تشغيلية جديدة</span>
            </div>
          </motion.button>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <BranchModal
            title={modal.mode === "add" ? "تأسيس فرع جديد" : `تحديث بيانات: ${modal.branch?.name}`}
            initial={modal.branch ? formFromBranch(modal.branch) : emptyForm()}
            onClose={() => setModal(null)}
            onSave={async (formData) => {
              const payload = {
                name: formData.name,
                address: formData.address || undefined,
                phone: formData.phone || undefined,
                is_active: formData.is_active,
                code: formData.code,
                isMainBranch: formData.isMainBranch,
                openingTime: formData.openingTime as any,
                closingTime: formData.closingTime as any,
              };
              if (modal.mode === "add") {
                await addBranch(payload);
              } else if (modal.branch) {
                await updateBranch(modal.branch.id, payload);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RenderBranches;