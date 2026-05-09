import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { AccountType } from '../../../../types';

// ─── shared modal wrapper ─────────────────────────────────────────────────

const ModalWrapper: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden text-right"
    >
      {children}
    </motion.div>
  </div>
);

// ─── AddCOAModal ──────────────────────────────────────────────────────────

interface COAForm {
  code?: string;
  nameAr?: string;
  type?: AccountType;
  isPosting?: boolean;
  parentId?: string | null;
  id?: string;
}

interface AddCOAModalProps {
  form: COAForm;
  setForm: (f: COAForm) => void;
  onSave: () => void;
  onClose: () => void;
}

export const AddCOAModal: React.FC<AddCOAModalProps> = ({ form, setForm, onSave, onClose }) => (
  <ModalWrapper onClose={onClose}>
    <div className="p-8">
      <h3 className="text-xl font-black text-white mb-6">إضافة حساب جديد</h3>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase">الرمز</label>
          <input type="text" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })}
            className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white text-right outline-none focus:border-red-500/30" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase">الاسم (عربي)</label>
          <input type="text" value={form.nameAr || ''} onChange={e => setForm({ ...form, nameAr: e.target.value })}
            className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white text-right outline-none focus:border-red-500/30" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase">نوع الحساب</label>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as AccountType })}
            className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white text-right outline-none focus:border-red-500/30">
            {Object.values(AccountType).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase">طبيعة الحساب</label>
          <select value={form.isPosting ? 'POSTING' : 'HEADING'} onChange={e => setForm({ ...form, isPosting: e.target.value === 'POSTING' })}
            className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white text-right outline-none focus:border-red-500/30">
            <option value="POSTING">حساب فرعي (حركي)</option>
            <option value="HEADING">حساب رئيسي (تجميعي)</option>
          </select>
        </div>
      </div>
      <button onClick={onSave} className="w-full bg-red-600 text-white py-3 rounded-2xl font-black text-sm hover:bg-red-700 active:scale-95 transition-all shadow-xl shadow-red-900/20">
        حفظ الحساب
      </button>
    </div>
  </ModalWrapper>
);

// ─── EditCOAModal ─────────────────────────────────────────────────────────

interface EditCOAModalProps {
  form: COAForm;
  setForm: (f: COAForm) => void;
  onSave: () => void;
  onClose: () => void;
}

export const EditCOAModal: React.FC<EditCOAModalProps> = ({ form, setForm, onSave, onClose }) => (
  <ModalWrapper onClose={onClose}>
    <div className="p-8">
      <h3 className="text-xl font-black text-white mb-6">تعديل الحساب</h3>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase">الرمز</label>
          <input type="text" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })}
            className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white text-right outline-none" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase">الاسم (عربي)</label>
          <input type="text" value={form.nameAr || ''} onChange={e => setForm({ ...form, nameAr: e.target.value })}
            className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white text-right outline-none" />
        </div>
      </div>
      <button onClick={onSave} className="w-full bg-blue-600 text-white py-3 rounded-2xl font-black text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-900/20">
        حفظ التغييرات
      </button>
    </div>
  </ModalWrapper>
);

// ─── AddJournalModal ──────────────────────────────────────────────────────

interface JournalLine { accountId: string; debit: number; credit: number; description: string; costCenterId?: string;}
interface JournalForm { date: string; description: string; lines: JournalLine[] }
interface COAOption { id: string; nameAr: string; isPosting: boolean }

interface CostCenterOption {
  id: string;
  nameAr: string;
}

interface AddJournalModalProps {
  form: JournalForm;
  setForm: (f: JournalForm) => void;
  chartOfAccounts: COAOption[];
  costCenters: CostCenterOption[];
  onSave: () => void;
  onClose: () => void;
}

export const AddJournalModal: React.FC<AddJournalModalProps> = ({
  form,
  setForm,
  chartOfAccounts,
  costCenters,
  onSave,
  onClose
}) => (
  <ModalWrapper onClose={onClose}>
    <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
      <h3 className="text-xl font-black text-white mb-6">قيد محاسبي جديد</h3>

      {/* Header */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase">التاريخ</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase">الوصف</label>
          <input
            type="text"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white"
          />
        </div>
      </div>

      {/* Lines */}
      <div className="space-y-3 mb-6">
        {form.lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2">

            {/* Account */}
            <div className="col-span-3">
              <select
                value={line.accountId}
                onChange={e => {
                  const nl = [...form.lines];
                  nl[idx].accountId = e.target.value;
                  setForm({ ...form, lines: nl });
                }}
                className="w-full bg-slate-950 border border-white/5 rounded-lg px-2 py-2 text-[10px] text-white"
              >
                <option value="">اختر الحساب</option>
                {chartOfAccounts
                  .filter(a => a.isPosting)
                  .map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nameAr}
                    </option>
                  ))}
              </select>
            </div>

            {/* Cost Center */}
            <div className="col-span-2">
              <select
                value={line.costCenterId || ''}
                onChange={e => {
                  const nl = [...form.lines];
                  nl[idx].costCenterId = e.target.value;
                  setForm({ ...form, lines: nl });
                }}
                className="w-full bg-slate-950 border border-white/5 rounded-lg px-2 py-2 text-[10px] text-white"
              >
                <option value="">مركز التكلفة</option>
                {costCenters.map(cc => (
                  <option key={cc.id} value={cc.id}>
                    {cc.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Debit */}
            <input
              type="number"
              placeholder="مدين"
              value={line.debit}
              onChange={e => {
                const nl = [...form.lines];
                nl[idx].debit = parseFloat(e.target.value) || 0;
                setForm({ ...form, lines: nl });
              }}
              className="col-span-2 bg-slate-950 border border-white/5 rounded-lg p-2 text-xs text-emerald-500"
            />

            {/* Credit */}
            <input
              type="number"
              placeholder="دائن"
              value={line.credit}
              onChange={e => {
                const nl = [...form.lines];
                nl[idx].credit = parseFloat(e.target.value) || 0;
                setForm({ ...form, lines: nl });
              }}
              className="col-span-2 bg-slate-950 border border-white/5 rounded-lg p-2 text-xs text-red-500"
            />

            {/* Description */}
            <input
              type="text"
              placeholder="البيان"
              value={line.description}
              onChange={e => {
                const nl = [...form.lines];
                nl[idx].description = e.target.value;
                setForm({ ...form, lines: nl });
              }}
              className="col-span-3 bg-slate-950 border border-white/5 rounded-lg p-2 text-xs text-white"
            />
          </div>
        ))}

        {/* Add Line */}
        <button
          onClick={() =>
            setForm({
              ...form,
              lines: [
                ...form.lines,
                {
                  accountId: '',
                  debit: 0,
                  credit: 0,
                  description: '',
                  costCenterId: '' // 👈 مهم
                }
              ]
            })
          }
          className="text-[10px] font-black text-red-500 hover:underline"
        >
          + إضافة سطر
        </button>
      </div>

      {/* Save */}
      <button
        onClick={onSave}
        className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-black text-sm"
      >
        حفظ القيد وترحيله
      </button>
    </div>
  </ModalWrapper>
);

// ─── EmployeeActionModal ──────────────────────────────────────────────────

interface EmployeeActionModalProps {
  amount: number;
  setAmount: (v: number) => void;
  note: string;
  setNote: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const EmployeeActionModal: React.FC<EmployeeActionModalProps> = ({ amount, setAmount, note, setNote, onConfirm, onClose }) => (
  <ModalWrapper onClose={onClose}>
    <div className="p-8">
      <h3 className="text-xl font-black text-white mb-6">إجراء مالي</h3>
      <div className="space-y-4 mb-6">
        <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value))}
          className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white" placeholder="المبلغ" />
        <textarea value={note} onChange={e => setNote(e.target.value)}
          className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white h-20" placeholder="ملاحظات" />
      </div>
      <button onClick={onConfirm} className="w-full bg-red-600 text-white py-3 rounded-2xl font-black text-sm">تأكيد</button>
    </div>
  </ModalWrapper>
);

// ─── ViewJournalModal ─────────────────────────────────────────────────────

interface JournalEntryLine { accountId: string; debit: number; credit: number; description?: string }
interface JournalEntryFull { id: string; date: string; description: string; lines: JournalEntryLine[] }
interface COAMap { id: string; nameAr: string; code: string }

interface ViewJournalModalProps {
  entry: JournalEntryFull;
  chartOfAccounts: COAMap[];
  onClose: () => void;
}

export const ViewJournalModal: React.FC<ViewJournalModalProps> = ({ entry, chartOfAccounts, onClose }) => {
  const totalDebit  = entry.lines.reduce((s, l) => s + l.debit,  0);
  const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <ModalWrapper onClose={onClose}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8 text-right">
          <div>
            <h3 className="text-2xl font-black text-white">تفاصيل القيد المحاسبي</h3>
            <p className="text-xs text-slate-500 font-mono mt-1">ID: {entry.id}</p>
          </div>
          <div className="text-left bg-slate-950 p-4 rounded-2xl border border-white/5">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">تاريخ القيد</p>
            <p className="text-lg font-black text-white font-mono">{entry.date}</p>
          </div>
        </div>

        <div className="bg-slate-950/50 rounded-2xl border border-white/5 p-6 mb-8 text-right">
          <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-2">البيان العام</p>
          <p className="text-sm font-black text-white leading-relaxed">{entry.description}</p>
        </div>

        <div className="overflow-hidden bg-slate-950/30 rounded-2xl border border-white/5">
          <table className="w-full text-right text-xs">
            <thead className="bg-white/5">
              <tr className="text-slate-500 font-black uppercase tracking-widest">
                <th className="px-5 py-4">الحساب</th>
                <th className="px-5 py-4 text-center">مدين</th>
                <th className="px-5 py-4 text-center">دائن</th>
                <th className="px-5 py-4">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entry.lines.map((line, idx) => {
                const account = chartOfAccounts.find(a => a.id === line.accountId);
                return (
                  <tr key={idx} className="text-white hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-col">
                        <span className="font-bold">{account?.nameAr || 'حساب غير معروف'}</span>
                        <span className="text-[9px] text-slate-500 font-mono">{account?.code}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center font-black text-emerald-500">{line.debit   > 0 ? `₪${line.debit.toLocaleString()}`   : '-'}</td>
                    <td className="px-5 py-4 text-center font-black text-red-500">{line.credit > 0 ? `₪${line.credit.toLocaleString()}` : '-'}</td>
                    <td className="px-5 py-4 text-slate-400 font-medium italic text-right">{line.description || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-white/5 font-black">
              <tr className="text-sm">
                <td className="px-5 py-4 text-white">الإجمالي</td>
                <td className="px-5 py-4 text-center text-emerald-500">₪{totalDebit.toLocaleString()}</td>
                <td className="px-5 py-4 text-center text-red-500">₪{totalCredit.toLocaleString()}</td>
                <td className="px-5 py-4 text-slate-600">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[10px] uppercase">{isBalanced ? 'متزن' : 'غير متزن'}</span>
                    {isBalanced ? <CheckCircle2 size={14} className="text-emerald-500" /> : <AlertCircle size={14} className="text-red-500" />}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="px-8 py-3 bg-red-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-red-900/20 hover:bg-red-700 transition-all active:scale-95">إغلاق</button>
          <button className="px-8 py-3 bg-white/5 text-slate-400 rounded-2xl font-black text-sm border border-white/5 hover:text-white transition-all flex items-center gap-2">
            <Download size={16} /> طباعة القيد
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};
