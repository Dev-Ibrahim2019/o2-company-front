/**
 * AccountingModals.tsx  –  النسخة المحدّثة
 * إضافة: AddCostCenterModal + EditCostCenterModal
 * الباقي: نفس الكود الأصلي بدون تغيير
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Download, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { AccountType } from '../../../../types';

// ─── shared modal wrapper ─────────────────────────────────────────────────

const ModalWrapper: React.FC<{ onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ onClose, children, wide }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" />
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 12 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={`relative w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} bg-slate-900 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden text-right`}
    >
      <button onClick={onClose}
        className="absolute top-5 left-5 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all z-10">
        <X size={15} />
      </button>
      {children}
    </motion.div>
  </div>
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1.5">{children}</label>
);

const inputCls = "w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white text-right outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 transition-all placeholder:text-slate-700";
const selectCls = `${inputCls} cursor-pointer`;

// ─── AddCOAModal ──────────────────────────────────────────────────────────

interface COAForm {
  code?: string; nameAr?: string; type?: AccountType;
  isPosting?: boolean; parentId?: string | null; id?: string;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  [AccountType.ASSET]: 'أصول',
  [AccountType.LIABILITY]: 'خصوم',
  [AccountType.EQUITY]: 'حقوق ملكية',
  [AccountType.REVENUE]: 'إيرادات',
  [AccountType.EXPENSE]: 'مصروفات',
};

export const AddCOAModal: React.FC<{ form: COAForm; setForm: (f: COAForm) => void; onSave: () => void; onClose: () => void }> = ({ form, setForm, onSave, onClose }) => {
  const isValid = form.code && form.nameAr && form.type;

  return (
    <ModalWrapper onClose={onClose}>
      <div className="p-7">
        <div className="mb-6">
          <h3 className="text-xl font-black text-white">إضافة حساب جديد</h3>
          <p className="text-[11px] text-slate-500 mt-1">إنشاء حساب في دليل الحسابات المحاسبي</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>رمز الحساب</FieldLabel>
              <input type="text" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })}
                className={inputCls} placeholder="مثال: 1010" />
            </div>
            <div>
              <FieldLabel>اسم الحساب</FieldLabel>
              <input type="text" value={form.nameAr || ''} onChange={e => setForm({ ...form, nameAr: e.target.value })}
                className={inputCls} placeholder="مثال: النقد في الصندوق" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>نوع الحساب</FieldLabel>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as AccountType })} className={selectCls}>
                {Object.values(AccountType).map(t => (
                  <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t] || t}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>طبيعة الحساب</FieldLabel>
              <select value={form.isPosting ? 'POSTING' : 'HEADING'}
                onChange={e => setForm({ ...form, isPosting: e.target.value === 'POSTING' })} className={selectCls}>
                <option value="POSTING">حركي (فرعي) — يقبل قيوداً</option>
                <option value="HEADING">تجميعي (رئيسي) — لا يقبل قيوداً</option>
              </select>
            </div>
          </div>

          {form.parentId && (
            <div className="bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3 text-right">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">الحساب الأب</p>
              <p className="text-xs text-slate-300 font-bold mt-0.5">ID: {form.parentId}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onSave} disabled={!isValid}
            className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all shadow-xl ${isValid ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-900/20 active:scale-[0.98]' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
            حفظ الحساب
          </button>
          <button onClick={onClose} className="px-6 py-3 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-2xl font-black text-sm transition-all">
            إلغاء
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

// ─── EditCOAModal ─────────────────────────────────────────────────────────

export const EditCOAModal: React.FC<{ form: COAForm; setForm: (f: COAForm) => void; onSave: () => void; onClose: () => void }> = ({ form, setForm, onSave, onClose }) => (
  <ModalWrapper onClose={onClose}>
    <div className="p-7">
      <div className="mb-6">
        <h3 className="text-xl font-black text-white">تعديل الحساب</h3>
        <p className="text-[11px] text-slate-500 mt-1">تعديل بيانات الحساب في دليل الحسابات</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>رمز الحساب</FieldLabel>
            <input type="text" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} className={inputCls} />
          </div>
          <div>
            <FieldLabel>اسم الحساب</FieldLabel>
            <input type="text" value={form.nameAr || ''} onChange={e => setForm({ ...form, nameAr: e.target.value })} className={inputCls} />
          </div>
        </div>

        {/* Type & Nature readonly hint */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-2 text-right">
          <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-400 font-bold">تعديل نوع الحساب قد يؤثر على التقارير المالية.</p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button onClick={onSave}
          className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all">
          حفظ التغييرات
        </button>
        <button onClick={onClose} className="px-6 py-3 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-2xl font-black text-sm transition-all">
          إلغاء
        </button>
      </div>
    </div>
  </ModalWrapper>
);

// ─── AddJournalModal ──────────────────────────────────────────────────────

interface JournalLine { accountId: string; debit: number; credit: number; description: string; costCenterId?: string }
interface JournalForm { date: string; description: string; lines: JournalLine[] }
interface COAOption { id: string; nameAr: string; isPosting: boolean; code?: string }
interface CostCenterOption { id: string; nameAr: string }

export const AddJournalModal: React.FC<{
  form: JournalForm; setForm: (f: JournalForm) => void;
  chartOfAccounts: COAOption[]; costCenters: CostCenterOption[];
  onSave: () => void; onClose: () => void;
}> = ({ form, setForm, chartOfAccounts, costCenters, onSave, onClose }) => {

  const totalDebit = form.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const canSave = isBalanced && totalDebit > 0 && form.description;

  const updateLine = (idx: number, patch: Partial<JournalLine>) => {
    const nl = form.lines.map((l, i) => i === idx ? { ...l, ...patch } : l);
    setForm({ ...form, lines: nl });
  };

  const removeLine = (idx: number) => {
    if (form.lines.length <= 2) return;
    setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) });
  };

  const postingAccounts = useMemo(() => chartOfAccounts.filter(a => a.isPosting), [chartOfAccounts]);

  return (
    <ModalWrapper onClose={onClose} wide>
      <div className="p-7 max-h-[85vh] overflow-y-auto custom-scrollbar">
        <div className="mb-6">
          <h3 className="text-xl font-black text-white">قيد محاسبي جديد</h3>
          <p className="text-[11px] text-slate-500 mt-1">إنشاء قيد في دفتر اليومية العامة</p>
        </div>

        {/* Header */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <FieldLabel>تاريخ القيد</FieldLabel>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className={inputCls} />
          </div>
          <div>
            <FieldLabel>البيان العام للقيد</FieldLabel>
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className={inputCls} placeholder="مثال: قيد مبيعات يوم الأحد" />
          </div>
        </div>

        {/* Lines */}
        <div className="mb-4">
          <div className="grid grid-cols-12 gap-2 mb-2 px-1">
            {['الحساب', 'مركز التكلفة', 'مدين', 'دائن', 'البيان', ''].map((h, i) => (
              <div key={i} className={`text-[10px] font-black text-slate-600 uppercase tracking-widest ${i === 0 ? 'col-span-3' : i === 1 ? 'col-span-2' : i === 4 ? 'col-span-3' : i === 5 ? 'col-span-1' : 'col-span-1'} text-right`}>
                {h}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {form.lines.map((line, idx) => (
              <motion.div key={idx}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="grid grid-cols-12 gap-2 items-center"
              >
                <div className="col-span-3">
                  <select value={line.accountId} onChange={e => updateLine(idx, { accountId: e.target.value })}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-[11px] text-white outline-none focus:border-red-500/40">
                    <option value="">اختر الحساب...</option>
                    {postingAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.code ? `${a.code} - ` : ''}{a.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <select value={line.costCenterId || ''} onChange={e => updateLine(idx, { costCenterId: e.target.value })}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-[11px] text-white outline-none focus:border-red-500/40">
                    <option value="">— بلا مركز —</option>
                    {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.nameAr}</option>)}
                  </select>
                </div>
                <input type="number" min="0" placeholder="0.00" value={line.debit || ''}
                  onChange={e => updateLine(idx, { debit: parseFloat(e.target.value) || 0 })}
                  className="col-span-1 bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-[11px] text-emerald-400 font-mono outline-none focus:border-emerald-500/40 text-left" />
                <input type="number" min="0" placeholder="0.00" value={line.credit || ''}
                  onChange={e => updateLine(idx, { credit: parseFloat(e.target.value) || 0 })}
                  className="col-span-1 bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-[11px] text-rose-400 font-mono outline-none focus:border-rose-500/40 text-left" />
                <input type="text" placeholder="بيان السطر" value={line.description}
                  onChange={e => updateLine(idx, { description: e.target.value })}
                  className="col-span-3 bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-[11px] text-white outline-none focus:border-white/20" />
                <button onClick={() => removeLine(idx)}
                  className="col-span-1 flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-rose-600/20 border border-white/5 hover:border-rose-500/30 text-slate-600 hover:text-rose-400 transition-all mx-auto">
                  <Trash2 size={13} />
                </button>
              </motion.div>
            ))}
          </div>

          <button
            onClick={() => setForm({ ...form, lines: [...form.lines, { accountId: '', debit: 0, credit: 0, description: '', costCenterId: '' }] })}
            className="mt-3 flex items-center gap-1.5 text-[11px] font-black text-red-500 hover:text-red-400 transition-colors"
          >
            <Plus size={13} /> إضافة سطر جديد
          </button>
        </div>

        {/* Totals */}
        <div className={`rounded-2xl border px-5 py-4 mb-6 ${isBalanced ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isBalanced
                ? <CheckCircle2 size={16} className="text-emerald-500" />
                : <AlertCircle size={16} className="text-rose-500" />}
              <span className={`text-xs font-black ${isBalanced ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isBalanced ? 'القيد متزن ✓' : `فرق: ₪${Math.abs(totalDebit - totalCredit).toLocaleString()}`}
              </span>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">إجمالي مدين</p>
                <p className="text-sm font-black font-mono text-emerald-400">₪{totalDebit.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">إجمالي دائن</p>
                <p className="text-sm font-black font-mono text-rose-400">₪{totalCredit.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onSave} disabled={!canSave}
            className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all shadow-xl ${canSave ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-900/20 active:scale-[0.98]' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
            ترحيل القيد
          </button>
          <button onClick={onClose} className="px-6 py-3 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-2xl font-black text-sm transition-all">
            إلغاء
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

// ─── EmployeeActionModal ──────────────────────────────────────────────────

const ACTION_LABELS: Record<string, { label: string; color: string; hint: string }> = {
  ADVANCE: { label: 'صرف سلفة', color: 'bg-amber-600', hint: 'سيُسجَّل قيد مدين على حساب الموظف' },
  SALARY: { label: 'صرف راتب', color: 'bg-emerald-600', hint: 'سيُسجَّل قيد مدين على رواتب الموظفين' },
  DISCOUNT: { label: 'خصم من الراتب', color: 'bg-orange-600', hint: 'سيُسجَّل قيد دائن على حساب الموظف' },
  CUSTODY: { label: 'عهدة مالية', color: 'bg-blue-600', hint: 'سيُسجَّل قيد عهدة لدى الموظف' },
};

export const EmployeeActionModal: React.FC<{
  amount: number; setAmount: (v: number) => void;
  note: string; setNote: (v: string) => void;
  actionType?: string;
  onConfirm: () => void; onClose: () => void;
}> = ({ amount, setAmount, note, setNote, actionType, onConfirm, onClose }) => {
  const cfg = ACTION_LABELS[actionType || 'ADVANCE'] || ACTION_LABELS.ADVANCE;

  return (
    <ModalWrapper onClose={onClose}>
      <div className="p-7">
        <div className="mb-6">
          <h3 className="text-xl font-black text-white">{cfg.label}</h3>
          <p className="text-[11px] text-slate-500 mt-1">{cfg.hint}</p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <FieldLabel>المبلغ (₪)</FieldLabel>
            <input type="number" min="0" step="0.01" value={amount || ''}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              className={inputCls + ' text-2xl font-black font-mono text-white'} placeholder="0.00" />
          </div>
          <div>
            <FieldLabel>ملاحظات</FieldLabel>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              className={inputCls + ' resize-none'} placeholder="أدخل ملاحظات أو سبب الإجراء..." />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={!amount || amount <= 0}
            className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all shadow-xl text-white ${amount > 0 ? `${cfg.color} active:scale-[0.98]` : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
            تأكيد الإجراء وترحيله
          </button>
          <button onClick={onClose} className="px-6 py-3 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-2xl font-black text-sm transition-all">
            إلغاء
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

// ─── ViewJournalModal ─────────────────────────────────────────────────────

interface JournalEntryLine { accountId: string; debit: number; credit: number; description?: string }
interface JournalEntryFull { id: string; date: string; description: string; lines: JournalEntryLine[] }
interface COAMap { id: string; nameAr: string; code: string }

export const ViewJournalModal: React.FC<{
  entry: JournalEntryFull; chartOfAccounts: COAMap[]; onClose: () => void;
}> = ({ entry, chartOfAccounts, onClose }) => {
  const totalDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <ModalWrapper onClose={onClose} wide>
      <div className="p-7">
        <div className="flex items-start justify-between mb-6">
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-black text-white">تفاصيل القيد المحاسبي</h3>
              <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black ${isBalanced ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
                {isBalanced ? 'متزن' : 'غير متزن'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">REF: #{entry.id.split('_').pop() || entry.id.slice(-8)}</p>
          </div>
          <div className="text-left bg-slate-950 border border-white/5 rounded-2xl px-5 py-3">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">تاريخ القيد</p>
            <p className="text-base font-black text-white font-mono">{entry.date}</p>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-white/5 rounded-2xl px-5 py-4 mb-5 text-right">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">البيان العام</p>
          <p className="text-sm font-black text-white">{entry.description}</p>
        </div>

        <div className="bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden mb-5">
          <table className="w-full text-right text-xs">
            <thead className="bg-white/5 border-b border-white/5">
              <tr className="text-slate-500 font-black uppercase tracking-widest">
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">الحساب</th>
                <th className="px-5 py-3 text-center">مدين</th>
                <th className="px-5 py-3 text-center">دائن</th>
                <th className="px-5 py-3">البيان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entry.lines.map((line, idx) => {
                const acc = chartOfAccounts.find(a => a.id === line.accountId);
                return (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 text-slate-600 font-mono">{idx + 1}</td>
                    <td className="px-5 py-3.5">
                      <div className="text-right">
                        <p className="font-bold text-white">{acc?.nameAr || 'حساب غير معروف'}</p>
                        <p className="text-[9px] text-slate-500 font-mono">{acc?.code}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center font-black font-mono text-emerald-400">
                      {line.debit > 0 ? `₪${line.debit.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center font-black font-mono text-rose-400">
                      {line.credit > 0 ? `₪${line.credit.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 italic">{line.description || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-white/5 border-t border-white/5">
              <tr>
                <td colSpan={2} className="px-5 py-3 font-black text-white text-xs">الإجماليات</td>
                <td className="px-5 py-3 text-center font-black font-mono text-emerald-400">₪{totalDebit.toLocaleString()}</td>
                <td className="px-5 py-3 text-center font-black font-mono text-rose-400">₪{totalCredit.toLocaleString()}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5 justify-end">
                    {isBalanced
                      ? <><CheckCircle2 size={13} className="text-emerald-500" /><span className="text-[10px] font-black text-emerald-500">متزن</span></>
                      : <><AlertCircle size={13} className="text-rose-500" /><span className="text-[10px] font-black text-rose-500">غير متزن</span></>}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose}
            className="px-6 py-2.5 bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-700 shadow-xl shadow-red-900/20 transition-all active:scale-[0.98]">
            إغلاق
          </button>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-2xl font-black text-sm transition-all">
            <Download size={15} /> طباعة القيد
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ─── AddCostCenterModal  (جديد) ───────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

interface CostCenterForm {
  id?: string | number;
  nameAr?: string;
  name?: string;
  code?: string;
  type?: string;
  parentId?: string | number | null;
  is_active?: boolean;
  notes?: string;
}

interface CostCenterOption2 { id: string; nameAr: string; code?: string }

const COST_CENTER_TYPES = [
  { value: 'operational', label: 'تشغيلي' },
  { value: 'administrative', label: 'إداري' },
  { value: 'service', label: 'خدمي' },
  { value: 'production', label: 'إنتاجي' },
];

const CostCenterFormFields: React.FC<{
  form: CostCenterForm;
  setForm: (f: CostCenterForm) => void;
  costCenters: CostCenterOption2[];
  excludeId?: string | number;
}> = ({ form, setForm, costCenters, excludeId }) => {
  const parents = costCenters.filter(cc => String(cc.id) !== String(excludeId));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>اسم مركز التكلفة</FieldLabel>
          <input
            type="text"
            value={form.nameAr || form.name || ''}
            onChange={e => setForm({ ...form, nameAr: e.target.value, name: e.target.value })}
            className={inputCls}
            placeholder="مثال: فرع رام الله"
          />
        </div>
        <div>
          <FieldLabel>الكود (اختياري)</FieldLabel>
          <input
            type="text"
            value={form.code || ''}
            onChange={e => setForm({ ...form, code: e.target.value })}
            className={inputCls}
            placeholder="مثال: CC-001"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>النوع</FieldLabel>
          <select
            value={(form.type || 'operational').toLowerCase()}
            onChange={e => setForm({ ...form, type: e.target.value })}
            className={selectCls}
          >
            {COST_CENTER_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>الحالة</FieldLabel>
          <select
            value={form.is_active !== false ? 'active' : 'inactive'}
            onChange={e => setForm({ ...form, is_active: e.target.value === 'active' })}
            className={selectCls}
          >
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
        </div>
      </div>

      {parents.length > 0 && (
        <div>
          <FieldLabel>المركز الأب (اختياري)</FieldLabel>
          <select
            value={form.parentId ? String(form.parentId) : ''}
            onChange={e => setForm({ ...form, parentId: e.target.value || null })}
            className={selectCls}
          >
            <option value="">— بلا مركز أب —</option>
            {parents.map(cc => (
              <option key={cc.id} value={cc.id}>
                {cc.code ? `${cc.code} – ` : ''}{cc.nameAr}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <FieldLabel>ملاحظات (اختياري)</FieldLabel>
        <textarea
          value={form.notes || ''}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          rows={2}
          className={inputCls + ' resize-none'}
          placeholder="أي ملاحظات إضافية..."
        />
      </div>
    </div>
  );
};

export const AddCostCenterModal: React.FC<{
  form: CostCenterForm;
  setForm: (f: CostCenterForm) => void;
  costCenters: CostCenterOption2[];
  onSave: () => void;
  onClose: () => void;
}> = ({ form, setForm, costCenters, onSave, onClose }) => {
  const isValid = !!(form.nameAr || form.name);

  return (
    <ModalWrapper onClose={onClose}>
      <div className="p-7">
        <div className="mb-6">
          <h3 className="text-xl font-black text-white">إضافة مركز تكلفة</h3>
          <p className="text-[11px] text-slate-500 mt-1">إنشاء مركز تكلفة جديد لتتبع التدفقات المالية</p>
        </div>

        <CostCenterFormFields form={form} setForm={setForm} costCenters={costCenters} />

        <div className="mt-6 flex gap-3">
          <button
            onClick={onSave}
            disabled={!isValid}
            className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all shadow-xl ${isValid
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-900/20 active:scale-[0.98]'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
          >
            حفظ مركز التكلفة
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-2xl font-black text-sm transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

// ─── EditCostCenterModal  (جديد) ──────────────────────────────────────────

export const EditCostCenterModal: React.FC<{
  form: CostCenterForm;
  setForm: (f: CostCenterForm) => void;
  costCenters: CostCenterOption2[];
  onSave: () => void;
  onClose: () => void;
}> = ({ form, setForm, costCenters, onSave, onClose }) => {
  const isValid = !!(form.nameAr || form.name);

  return (
    <ModalWrapper onClose={onClose}>
      <div className="p-7">
        <div className="mb-6">
          <h3 className="text-xl font-black text-white">تعديل مركز التكلفة</h3>
          <p className="text-[11px] text-slate-500 mt-1">تحديث بيانات مركز التكلفة</p>
        </div>

        <CostCenterFormFields
          form={form}
          setForm={setForm}
          costCenters={costCenters}
          excludeId={form.id}
        />

        <div className="mt-6 flex gap-3">
          <button
            onClick={onSave}
            disabled={!isValid}
            className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all shadow-xl ${isValid
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-900/20 active:scale-[0.98]'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
          >
            حفظ التغييرات
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-2xl font-black text-sm transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};