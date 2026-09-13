import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ChevronRight, Tag } from 'lucide-react';
import type { Customer } from '../../../types';

// ───────────────────────────────────────────────
// CustomerSearchModal
// ───────────────────────────────────────────────
interface CustomerSearchModalProps {
  show: boolean;
  onClose: () => void;
  customerSearchQuery: string;
  setCustomerSearchQuery: (q: string) => void;
  filteredCustomers: Customer[];
  handleSelectCustomer: (c: Customer) => void;
  onAddNew: (name: string) => void;
}

export const CustomerSearchModal: React.FC<CustomerSearchModalProps> = ({
  show, onClose, customerSearchQuery, setCustomerSearchQuery,
  filteredCustomers, handleSelectCustomer, onAddNew,
}) => (
  <AnimatePresence>
    {show && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[75vh]"
        >
          <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">البحث عن عميل</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
          </div>

          <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="ابحث بالاسم أو رقم الهاتف..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-white/5 rounded-xl py-2.5 pr-9 pl-3 text-sm text-white focus:outline-none focus:border-red-500/50"
              />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5">
              {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  className="w-full bg-slate-800/50 hover:bg-slate-800 p-3 rounded-xl border border-white/5 flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-500 font-bold text-xs">
                      {c.name.charAt(0)}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-white group-hover:text-red-500 transition-colors">{c.name}</p>
                      <p className="text-[9px] text-slate-500">{c.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">{c.points} نقطة</span>
                    <ChevronRight size={14} className="text-slate-600" />
                  </div>
                </button>
              )) : customerSearchQuery && (
                <div className="text-center py-6">
                  <p className="text-slate-500 text-xs mb-3">لا يوجد نتائج لهذا البحث</p>
                  <button
                    onClick={() => onAddNew(customerSearchQuery)}
                    className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold"
                  >
                    إضافة كعميل جديد سريع
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// ───────────────────────────────────────────────
// QuickAddCustomerModal
// ───────────────────────────────────────────────
interface QuickAddCustomerModalProps {
  show: boolean;
  onClose: () => void;
  quickCustomerName: string;
  setQuickCustomerName: (v: string) => void;
  quickCustomerPhone: string;
  setQuickCustomerPhone: (v: string) => void;
  handleQuickAddCustomer: () => void;
}

export const QuickAddCustomerModal: React.FC<QuickAddCustomerModalProps> = ({
  show, onClose, quickCustomerName, setQuickCustomerName,
  quickCustomerPhone, setQuickCustomerPhone, handleQuickAddCustomer,
}) => (
  <AnimatePresence>
    {show && (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xs overflow-hidden"
        >
          <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">إضافة عميل سريع</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>
          <div className="p-4 sm:p-5 space-y-3.5">
            {[
              { label: 'الاسم', value: quickCustomerName, onChange: setQuickCustomerName },
              { label: 'رقم الهاتف', value: quickCustomerPhone, onChange: setQuickCustomerPhone },
            ].map(({ label, value, onChange }) => (
              <div key={label} className="space-y-1.5">
                <label className="text-[9px] text-slate-500 uppercase font-bold">{label}</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>
            ))}
            <button
              onClick={handleQuickAddCustomer}
              className="w-full bg-red-600 text-white py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-red-900/20 active:scale-95 transition-all"
            >
              حفظ العميل
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// ───────────────────────────────────────────────
// CloseInvoiceModal
// ───────────────────────────────────────────────
interface CloseInvoiceModalProps {
  show: boolean;
  onClose: () => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  setPosError: (err: string) => void;
  onConfirm: () => void;
}

export const CloseInvoiceModal: React.FC<CloseInvoiceModalProps> = ({
  show, onClose, customerName, setCustomerName, setPosError, onConfirm,
}) => (
  <AnimatePresence>
    {show && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 w-full max-w-xs rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5"
        >
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 bg-red-600/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Tag size={24} />
            </div>
            <h3 className="text-lg font-black text-white">إغلاق الفاتورة</h3>
            <p className="text-slate-500 font-bold text-xs">يرجى إدخال اسم الزبون لإتمام العملية</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">اسم الزبون</label>
              <input
                type="text"
                autoFocus
                value={customerName === 'صندوق مبيعات' ? '' : customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="أدخل اسم الزبون..."
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 font-black text-xs text-white"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                if (!customerName || customerName.trim() === '') { setPosError('يرجى إدخال اسم الزبون'); return; }
                onConfirm();
                onClose();
              }}
              className="w-full bg-red-600 text-white py-3 rounded-2xl font-black text-xs shadow-lg shadow-red-900/20 active:scale-95 transition-all"
            >
              تأكيد وإغلاق الفاتورة
            </button>
            <button onClick={onClose} className="w-full bg-slate-800 text-slate-400 py-3 rounded-2xl font-black text-xs active:scale-95 transition-all">
              إلغاء
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);