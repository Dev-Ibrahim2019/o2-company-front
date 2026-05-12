// src/components/administration/OrgStructure/ModalContainer.tsx
// نسخة محدّثة - تقبل onSave كـ prop

import React from "react";
import { motion } from "framer-motion";
import { X, Save } from "lucide-react";

const ModalContainer: React.FC<{
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
}> = ({ title, children, onClose, onSave }) => {
  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative bg-slate-900 w-full max-w-lg rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh] border border-white/10"
      >
        <div className="p-3 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">{title}</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-[0.1em]">
              Unified Data Entry Protocol
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-3 bg-slate-950/30">
          {children}
        </div>
        <div className="p-3 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800/50 text-slate-400 rounded-xl font-black text-xs hover:bg-slate-700 hover:text-white transition-all border border-white/5 flex items-center justify-center gap-2 group"
          >
            <X size={16} className="group-hover:rotate-90 transition-transform" />
            إلغاء الأمر
          </button>
          <button
            onClick={onSave}
            className="flex-[2] py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-black text-xs shadow-lg hover:shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 group"
          >
            <Save size={18} className="group-hover:scale-110 transition-transform" />
            تأكيد وحفظ البيانات
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ModalContainer;