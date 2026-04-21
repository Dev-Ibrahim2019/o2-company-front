// src/components/administration/OrgStructure/RenderJobs.tsx
// يستخدم الـ API الحقيقي بدلاً من الـ store المحلي

import React, { useState } from "react";
import {
  Briefcase,
  Users2,
  Plus,
  Edit3,
  Trash2,
  FileText,
  Loader2,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useJobTitles } from "../../../hooks/useJobTitles";
import type { JobTitle } from "../../../services/jobTitleService";

// ── نوع الـ Props ──────────────────────────────────────────────────────────────
type Props = {
  onAdd?: (type: "JOB_TITLE") => void;
  onEdit?: (type: "JOB_TITLE", id: string, data: any) => void;
};

// ── FormModal داخلي ────────────────────────────────────────────────────────────
const JobTitleFormModal: React.FC<{
  initial?: Partial<JobTitle>;
  onSave: (data: { name: string; description?: string; is_active: boolean }) => Promise<void>;
  onClose: () => void;
  title: string;
}> = ({ initial, onSave, onClose, title }) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("اسم المسمى الوظيفي مطلوب"); return; }
    try {
      setSaving(true);
      setError(null);
      await onSave({ name: name.trim(), description: description.trim() || undefined, is_active: isActive });
      onClose();
    } catch {
      setError("حدث خطأ أثناء الحفظ، يرجى المحاولة مجدداً");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative bg-slate-900 w-full max-w-md rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-white/10"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
          <div>
            <h3 className="text-base font-black text-white tracking-tight">{title}</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-[0.1em]">
              Job Title Management
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 bg-slate-950/30">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-600/10 border border-red-600/20 rounded-xl">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-400 font-bold">{error}</p>
            </div>
          )}

          {/* اسم المسمى */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Briefcase size={12} /> اسم المسمى الوظيفي *
            </label>
            <input
              type="text"
              className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-white font-bold text-xs transition-all"
              placeholder="مثلاً: مدير صالة، شيف دي بارتي، كاشير..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
          </div>

          {/* الوصف */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <FileText size={12} /> الوصف الوظيفي المختصر
            </label>
            <textarea
              className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-white font-bold text-xs transition-all h-24 resize-none"
              placeholder="اكتب مهام هذا المسمى باختصار..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* الحالة */}
          <div className="flex items-center gap-3 p-3 bg-slate-800 border border-white/5 rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded-lg accent-blue-600"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span className="text-xs font-bold text-white">
                {isActive ? "نشط (Active)" : "غير نشط (Inactive)"}
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900/80 border-t border-white/5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800/50 text-slate-400 rounded-xl font-black text-xs hover:bg-slate-700 hover:text-white transition-all border border-white/5 flex items-center justify-center gap-2"
          >
            <X size={14} /> إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-[2] py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-black text-xs shadow-lg hover:shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? "جاري الحفظ..." : "حفظ المسمى الوظيفي"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── المكوّن الرئيسي ─────────────────────────────────────────────────────────────
const RenderJobs: React.FC<Props> = () => {
  const { jobTitles, loading, error, addJobTitle, updateJobTitle, deleteJobTitle } = useJobTitles();
  const [modal, setModal] = useState<{ mode: "add" | "edit"; item?: JobTitle } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المسمى الوظيفي؟")) return;
    setDeletingId(id);
    try {
      await deleteJobTitle(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/20 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
        <div>
          <h3 className="text-lg font-black text-white tracking-tighter">المسميات الوظيفية</h3>
          <p className="text-slate-500 font-bold mt-1 flex items-center gap-2 text-[10px]">
            <span className="w-4 h-[1px] bg-blue-600"></span>
            إدارة أدوار الكادر الوظيفي وتوصيف المهام
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "add" })}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-lg flex items-center gap-2 active:scale-95 transition-all whitespace-nowrap hover:bg-blue-500"
        >
          <Plus size={16} className="transition-transform group-hover:rotate-90" />
          إضافة مسمى وظيفي
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-blue-500" />
          <span className="mr-3 text-sm font-bold text-slate-400">جاري التحميل...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-600/10 border border-red-600/20 rounded-xl">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-400 font-bold">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && jobTitles.length === 0 && (
        <div className="bg-slate-900/40 p-10 rounded-2xl text-center border border-white/5 shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-700 border border-white/5">
            <Briefcase size={24} />
          </div>
          <p className="text-slate-500 font-black text-base">لم يتم إضافة مسميات وظيفية بعد</p>
          <button
            onClick={() => setModal({ mode: "add" })}
            className="mt-4 text-blue-500 font-bold hover:underline text-xs"
          >
            ابدأ بإضافة أول مسمى الآن
          </button>
        </div>
      )}

      {/* Grid */}
      {!loading && jobTitles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobTitles.map((jt, idx) => (
            <motion.div
              key={jt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-slate-900/50 backdrop-blur-md p-4 rounded-xl border border-white/5 flex items-start justify-between group hover:border-blue-600/40 transition-all duration-500 shadow-md relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              <div className="flex items-start gap-3 relative z-10 flex-1 min-w-0">
                <div className="w-9 h-9 bg-blue-600/10 text-blue-500 rounded-xl flex items-center justify-center shadow-inner border border-blue-600/20 group-hover:scale-110 transition-transform duration-500 shrink-0">
                  <Briefcase size={14} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-white text-sm tracking-tight truncate">{jt.name}</h4>
                  {jt.description && (
                    <p className="text-[10px] text-slate-400 font-bold mt-1 line-clamp-2">{jt.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border ${jt.is_active !== false
                        ? "bg-emerald-600/10 text-emerald-500 border-emerald-600/20"
                        : "bg-slate-700/50 text-slate-400 border-slate-600/20"
                      }`}>
                      {jt.is_active !== false ? "Active" : "Inactive"}
                    </span>
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1">
                      <Users2 size={9} /> موظفون
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 relative z-10 shrink-0 mr-2">
                <button
                  onClick={() => setModal({ mode: "edit", item: jt })}
                  className="p-1.5 bg-slate-800 text-slate-400 hover:text-blue-400 rounded-lg transition-all border border-white/5"
                  title="تعديل"
                >
                  <Edit3 size={11} />
                </button>
                <button
                  onClick={() => handleDelete(jt.id)}
                  disabled={deletingId === jt.id}
                  className="p-1.5 bg-slate-800 text-slate-400 hover:text-red-500 rounded-lg transition-all border border-white/5 disabled:opacity-50"
                  title="حذف"
                >
                  {deletingId === jt.id
                    ? <Loader2 size={11} className="animate-spin" />
                    : <Trash2 size={11} />
                  }
                </button>
              </div>
            </motion.div>
          ))}

          {/* Add Button */}
          <motion.button
            whileHover={{ scale: 0.98 }}
            onClick={() => setModal({ mode: "add" })}
            className="bg-slate-900/20 border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-slate-700 hover:bg-slate-900/40 hover:border-blue-600/40 hover:text-blue-500 transition-all group shadow-lg min-h-[100px]"
          >
            <div className="w-8 h-8 bg-slate-800/50 rounded-full flex items-center justify-center group-hover:bg-blue-600/10 group-hover:border-blue-600/20 border border-white/5 transition-all">
              <Plus size={14} />
            </div>
            <span className="font-black text-xs uppercase tracking-wider">إضافة مسمى</span>
          </motion.button>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <JobTitleFormModal
            title={modal.mode === "add" ? "إضافة مسمى وظيفي جديد" : "تعديل المسمى الوظيفي"}
            initial={modal.item}
            onClose={() => setModal(null)}
            onSave={async (payload) => {
              if (modal.mode === "add") {
                await addJobTitle(payload);
              } else if (modal.item) {
                await updateJobTitle(modal.item.id, payload);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RenderJobs;