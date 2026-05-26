/**
 * AccountingModals.tsx — النسخة الكاملة المحدّثة
 *
 * التحسينات:
 * 1. AddCOAModal → يستدعي suggestCode من الباك عند الفتح تلقائياً
 * 2. مؤشر تحميل الكود (LoadingCode)
 * 3. حقل الكود readonly مع زر Refresh لإعادة الاقتراح
 * 4. EditCOAModal → يعرض حقل is_active + notes
 * 5. AddCostCenterModal / EditCostCenterModal → بدون تغيير
 */

import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Download, CheckCircle2, AlertCircle, Trash2, RefreshCw, Lock } from 'lucide-react';
import { AccountType } from '../../../../types';
import { accountService, costCenterService } from "../../../services/accountingService";

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
  code?: string;
  nameAr?: string;
  type?: AccountType;
  isPosting?: boolean;
  parentId?: string | null;
  id?: string;
  notes?: string;
  is_active?: boolean;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  [AccountType.ASSET]: 'أصول',
  [AccountType.LIABILITY]: 'خصوم',
  [AccountType.EQUITY]: 'حقوق ملكية',
  [AccountType.REVENUE]: 'إيرادات',
  [AccountType.EXPENSE]: 'مصروفات',
};

export const AddCOAModal: React.FC<{
  form: COAForm;
  setForm: (f: COAForm) => void;
  onSave: () => void;
  onClose: () => void;
  /** اسم الحساب الأب للعرض */
  parentName?: string;
}> = ({ form, setForm, onSave, onClose, parentName }) => {
  const [loadingCode, setLoadingCode] = useState(false);
  const isValid = form.code && form.nameAr && form.type;

  // ✅ جلب الكود المقترح من الباك عند فتح الـ modal
  const fetchSuggestedCode = async () => {
    try {
      setLoadingCode(true);
      const parentId = form.parentId ? Number(form.parentId) : undefined;
      const code = await accountService.suggestCode(parentId);
      setForm({ ...form, code });
    } catch {
      // silently fail — المستخدم يكتب يدوياً
    } finally {
      setLoadingCode(false);
    }
  };

  useEffect(() => {
    fetchSuggestedCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.parentId]);

  return (
    <ModalWrapper onClose={onClose}>
      <div className="p-7">
        <div className="mb-6">
          <h3 className="text-xl font-black text-white">إضافة حساب جديد</h3>
          <p className="text-[11px] text-slate-500 mt-1">
            {parentName
              ? `حساب فرعي تحت: ${parentName}`
              : 'إنشاء حساب رئيسي في دليل الحسابات'}
          </p>
        </div>

        <div className="space-y-4">
          {/* الكود + الاسم */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>رمز الحساب</FieldLabel>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={loadingCode ? '' : (form.code || '')}
                  onChange={e => setForm({ ...form, code: e.target.value })}
                  placeholder={loadingCode ? 'جاري توليد الكود...' : 'مثال: 1100'}
                  className={`${inputCls} pl-9`}
                />
                {loadingCode ? (
                  <RefreshCw size={13} className="absolute left-3 text-slate-500 animate-spin" />
                ) : (
                  <button
                    onClick={fetchSuggestedCode}
                    title="إعادة اقتراح الكود من الخادم"
                    className="absolute left-3 text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <RefreshCw size={13} />
                  </button>
                )}
              </div>
              <p className="text-[9px] text-slate-600 mt-1 font-bold">
                يُولَّد تلقائياً من الخادم · يمكن تعديله
              </p>
            </div>
            <div>
              <FieldLabel>اسم الحساب</FieldLabel>
              <input
                type="text"
                value={form.nameAr || ''}
                onChange={e => setForm({ ...form, nameAr: e.target.value })}
                className={inputCls}
                placeholder="مثال: النقد في الصندوق"
                autoFocus
              />
            </div>
          </div>

          {/* نوع الحساب + طبيعته */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>نوع الحساب</FieldLabel>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as AccountType })}
                className={selectCls}
              >
                {Object.values(AccountType).map(t => (
                  <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t] || t}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>طبيعة الحساب</FieldLabel>
              <select
                value={form.isPosting ? 'POSTING' : 'HEADING'}
                onChange={e => setForm({ ...form, isPosting: e.target.value === 'POSTING' })}
                className={selectCls}
              >
                <option value="POSTING">حركي — يقبل قيوداً مباشرة</option>
                <option value="HEADING">تجميعي — لا يقبل قيوداً</option>
              </select>
            </div>
          </div>

          {/* ملاحظات */}
          <div>
            <FieldLabel>ملاحظات (اختياري)</FieldLabel>
            <textarea
              value={form.notes || ''}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className={`${inputCls} resize-none h-16 py-2`}
              placeholder="وصف الحساب أو ملاحظات إضافية..."
            />
          </div>

          {/* معلومة الحساب الأب */}
          {form.parentId && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
              <Lock size={12} className="text-blue-400 shrink-0" />
              <div>
                <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">الحساب الأب</p>
                <p className="text-xs text-slate-300 font-bold mt-0.5">{parentName || `ID: ${form.parentId}`}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onSave}
            disabled={!isValid || loadingCode}
            className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all shadow-xl ${isValid && !loadingCode
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-900/20 active:scale-[0.98]'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
          >
            حفظ الحساب
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

// ─── EditCOAModal ─────────────────────────────────────────────────────────

export const EditCOAModal: React.FC<{
  form: COAForm;
  setForm: (f: COAForm) => void;
  onSave: () => void;
  onClose: () => void;
}> = ({ form, setForm, onSave, onClose }) => (
  <ModalWrapper onClose={onClose}>
    <div className="p-7">
      <div className="mb-6">
        <h3 className="text-xl font-black text-white">تعديل الحساب</h3>
        <p className="text-[11px] text-slate-500 mt-1">تعديل بيانات الحساب في دليل الحسابات</p>
      </div>

      <div className="space-y-4">
        {/* الكود — للعرض فقط */}
        <div>
          <FieldLabel>رمز الحساب</FieldLabel>
          <div className="relative flex items-center">
            <input
              type="text"
              value={form.code || ''}
              readOnly
              className={`${inputCls} pl-9 text-slate-500 cursor-not-allowed`}
            />
            <Lock size={13} className="absolute left-3 text-slate-700" />
          </div>
          <p className="text-[9px] text-slate-600 mt-1 font-bold">الكود لا يمكن تعديله بعد الإنشاء</p>
        </div>

        {/* الاسم */}
        <div>
          <FieldLabel>اسم الحساب</FieldLabel>
          <input
            type="text"
            value={form.nameAr || ''}
            onChange={e => setForm({ ...form, nameAr: e.target.value })}
            className={inputCls}
            autoFocus
          />
        </div>

        {/* ملاحظات */}
        <div>
          <FieldLabel>ملاحظات</FieldLabel>
          <textarea
            value={form.notes || ''}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            className={`${inputCls} resize-none h-16 py-2`}
            placeholder="وصف الحساب..."
          />
        </div>

        {/* الحالة */}
        <div className="flex items-center justify-between bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3">
          <div>
            <p className="text-xs font-black text-white">تفعيل الحساب</p>
            <p className="text-[10px] text-slate-500 mt-0.5">الحسابات المعطّلة لا تظهر في القوائم</p>
          </div>
          <button
            onClick={() => setForm({ ...form, is_active: !form.is_active })}
            className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active !== false ? 'bg-emerald-600' : 'bg-slate-700'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.is_active !== false ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        {/* تحذير */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-400 font-bold">
            تعديل اسم الحساب قد يؤثر على التقارير المالية المحفوظة.
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onSave}
          className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all"
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

// ─── AddJournalModal ──────────────────────────────────────────────────────

interface JournalLine { accountId: string; debit: number; credit: number; description: string; costCenterId?: string }
interface JournalForm { date: string; description: string; type?: string; lines: JournalLine[] }
interface COAOption { id: string; nameAr: string; isPosting: boolean; code?: string }
interface CostCenterOption { id: string; nameAr: string }

export const AddJournalModal: React.FC<{
  form: JournalForm;
  setForm: (f: JournalForm) => void;
  chartOfAccounts: COAOption[];
  costCenters: CostCenterOption[];
  onSave: () => void;
  onClose: () => void;
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
            حفظ القيد
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

type EmployeeActionType = 'ADVANCE' | 'SALARY' | 'DISCOUNT' | 'CUSTODY';

const ACTION_META: Record<EmployeeActionType, { label: string; color: string; desc: string }> = {
  SALARY: { label: 'صرف راتب', color: 'text-emerald-400', desc: 'صرف الراتب الشهري للموظف' },
  ADVANCE: { label: 'سلفة', color: 'text-amber-400', desc: 'منح سلفة من الراتب القادم' },
  DISCOUNT: { label: 'خصم', color: 'text-orange-400', desc: 'خصم مبلغ من راتب الموظف' },
  CUSTODY: { label: 'عهدة', color: 'text-blue-400', desc: 'تسليم عهدة مالية للموظف' },
};

export const EmployeeActionModal: React.FC<{
  amount: number; setAmount: (v: number) => void;
  note: string; setNote: (v: string) => void;
  actionType?: EmployeeActionType;
  onConfirm: () => void; onClose: () => void;
}> = ({ amount, setAmount, note, setNote, actionType, onConfirm, onClose }) => {
  if (!actionType) return null;
  const meta = ACTION_META[actionType];

  return (
    <ModalWrapper onClose={onClose}>
      <div className="p-7">
        <div className="mb-6">
          <h3 className={`text-xl font-black ${meta.color}`}>{meta.label}</h3>
          <p className="text-[11px] text-slate-500 mt-1">{meta.desc}</p>
        </div>
        <div className="space-y-4">
          <div>
            <FieldLabel>المبلغ (₪)</FieldLabel>
            <input type="number" min="0" value={amount || ''} onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              className={inputCls} placeholder="0.00" />
          </div>
          <div>
            <FieldLabel>ملاحظات</FieldLabel>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              className={`${inputCls} h-20 resize-none py-2`} placeholder="سبب العملية..." />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onConfirm} disabled={!amount}
            className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all ${amount ? 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
            تأكيد العملية
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

interface JournalEntry {
  id: string; date: string; description: string; status: string; reference: string;
  lines: {
    accountId: string;
    accountName?: string | null;
    accountCode?: string | null;
    debit: number;
    credit: number;
    description?: string;
  }[];
}

export const ViewJournalModal: React.FC<{
  entry: JournalEntry;
  chartOfAccounts: { id: string; nameAr: string; code?: string }[];
  onClose: () => void;
}> = ({ entry, chartOfAccounts, onClose }) => {
  const totalDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0);

  return (
    <ModalWrapper onClose={onClose} wide>
      <div className="p-7">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-black text-white">تفاصيل القيد المحاسبي</h3>
            <p className="text-[11px] text-slate-500 mt-1">{entry.reference} · {entry.date}</p>
          </div>
          <span className={`px-3 py-1 rounded-xl text-[10px] font-black border ${entry.status === 'POSTED'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
            {entry.status === 'POSTED' ? 'مرحّل' : 'مسودة'}
          </span>
        </div>

        <div className="bg-slate-950/40 rounded-2xl p-4 mb-6">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">البيان</p>
          <p className="text-sm font-bold text-white">{entry.description}</p>
        </div>

        <table className="w-full text-right text-xs mb-6">
          <thead>
            <tr className="text-slate-500 border-b border-white/5">
              <th className="pb-3">الحساب</th>
              <th className="pb-3 text-center">مدين</th>
              <th className="pb-3 text-center">دائن</th>
              <th className="pb-3">البيان</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {entry.lines.map((line, idx) => {
              const acc = chartOfAccounts.find(
                a => a.id === line.accountId
              );

              const displayName =
                line.accountName ??
                acc?.nameAr ??
                line.accountId;

              const displayCode =
                line.accountCode ??
                acc?.code;
              return (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="py-3">
                    <span className="font-bold text-white">{displayName}</span>
                    {displayCode && <span className="text-[9px] text-slate-600 font-mono ml-2">{displayCode}</span>}
                  </td>
                  <td className="py-3 text-center font-mono font-black text-emerald-500">
                    {line.debit > 0 ? `₪${line.debit.toLocaleString()}` : '—'}
                  </td>
                  <td className="py-3 text-center font-mono font-black text-rose-500">
                    {line.credit > 0 ? `₪${line.credit.toLocaleString()}` : '—'}
                  </td>
                  <td className="py-3 text-slate-400 text-[11px]">{line.description}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-white/10">
            <tr>
              <td className="pt-3 font-black text-slate-500 text-[10px] uppercase tracking-widest">الإجماليات</td>
              <td className="pt-3 text-center font-mono font-black text-emerald-400">₪{totalDebit.toLocaleString()}</td>
              <td className="pt-3 text-center font-mono font-black text-rose-400">₪{totalCredit.toLocaleString()}</td>
              <td />
            </tr>
          </tfoot>
        </table>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-2xl font-black text-[11px] transition-all">
            <Download size={14} /> تصدير PDF
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-2xl font-black text-sm transition-all">
            إغلاق
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

// ─── AddCostCenterModal ───────────────────────────────────────────────────

interface CostCenterForm {
  nameAr?: string; code?: string; type?: string;
  parentId?: string; is_active?: boolean;
}

export const AddCostCenterModal: React.FC<{
  form: CostCenterForm;
  setForm: (f: CostCenterForm) => void;
  costCenters: { id: string; nameAr: string; code?: string }[];
  onSave: () => void;
  onClose: () => void;
}> = ({ form, setForm, costCenters, onSave, onClose }) => {
  const [loadingCode, setLoadingCode] = useState(false);
  const isValid = !!(form.nameAr && form.type);

  const fetchSuggestedCode = async (parentId?: string) => {
    try {
      setLoadingCode(true);
      const pid = parentId ? Number(parentId) : undefined;
      const code = await costCenterService.suggestCode(pid);
      setForm({ ...form, code, parentId });
    } catch {
      // المستخدم يكتب يدوياً
    } finally {
      setLoadingCode(false);
    }
  };

  // جلب الكود عند فتح الـ modal أو تغيير الأب
  useEffect(() => {
    fetchSuggestedCode(form.parentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.parentId]);

  return (
    <ModalWrapper onClose={onClose}>
      <div className="p-7">
        <div className="mb-6">
          <h3 className="text-xl font-black text-white">إضافة مركز تكلفة</h3>
          <p className="text-[11px] text-slate-500 mt-1">تصنيف المصروفات والإيرادات بدقة</p>
        </div>
        <div className="space-y-4">

          {/* الاسم + الكود */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>اسم مركز التكلفة</FieldLabel>
              <input
                type="text"
                value={form.nameAr || ''}
                onChange={e => setForm({ ...form, nameAr: e.target.value })}
                className={inputCls}
                placeholder="مثال: قسم المبيعات"
                autoFocus
              />
            </div>
            <div>
              <FieldLabel>الكود</FieldLabel>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={loadingCode ? '' : (form.code || '')}
                  onChange={e => setForm({ ...form, code: e.target.value })}
                  placeholder={loadingCode ? 'جاري التوليد...' : 'مثال: CC-01'}
                  className={`${inputCls} pl-9`}
                />
                {loadingCode ? (
                  <RefreshCw size={13} className="absolute left-3 text-slate-500 animate-spin" />
                ) : (
                  <button
                    onClick={() => fetchSuggestedCode(form.parentId)}
                    title="إعادة توليد الكود"
                    className="absolute left-3 text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <RefreshCw size={13} />
                  </button>
                )}
              </div>
              <p className="text-[9px] text-slate-600 mt-1 font-bold">
                يُولَّد تلقائياً · يمكن تعديله
              </p>
            </div>
          </div>

          {/* النوع + المركز الأب */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>النوع</FieldLabel>
              <select
                value={form.type || 'operational'}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className={selectCls}
              >
                <option value="operational">تشغيلي</option>
                <option value="administrative">إداري</option>
                <option value="service">خدمي</option>
                <option value="production">إنتاجي</option>
              </select>
            </div>
            <div>
              <FieldLabel>المركز الأب (اختياري)</FieldLabel>
              <select
                value={form.parentId || ''}
                onChange={e => {
                  const pid = e.target.value || undefined;
                  setForm({ ...form, parentId: pid });
                  // fetchSuggestedCode يُستدعى تلقائياً عبر useEffect
                }}
                className={selectCls}
              >
                <option value="">— بلا —</option>
                {costCenters.map(cc => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code ? `${cc.code} - ` : ''}{cc.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* معلومة المركز الأب */}
          {form.parentId && (() => {
            const parent = costCenters.find(cc => cc.id === form.parentId);
            return parent ? (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
                <Lock size={12} className="text-blue-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">المركز الأب</p>
                  <p className="text-xs text-slate-300 font-bold mt-0.5">{parent.nameAr}</p>
                </div>
              </div>
            ) : null;
          })()}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onSave}
            disabled={!isValid || loadingCode}
            className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all shadow-xl ${isValid && !loadingCode
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-900/20 active:scale-[0.98]'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
          >
            حفظ المركز
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
// ─── EditCostCenterModal ──────────────────────────────────────────────────

export const EditCostCenterModal: React.FC<{
  form: CostCenterForm;
  setForm: (f: CostCenterForm) => void;
  costCenters: { id: string; nameAr: string }[];
  onSave: () => void;
  onClose: () => void;
}> = ({ form, setForm, costCenters, onSave, onClose }) => (
  <ModalWrapper onClose={onClose}>
    <div className="p-7">
      <div className="mb-6">
        <h3 className="text-xl font-black text-white">تعديل مركز التكلفة</h3>
      </div>
      <div className="space-y-4">
        <div>
          <FieldLabel>الاسم</FieldLabel>
          <input type="text" value={form.nameAr || ''} onChange={e => setForm({ ...form, nameAr: e.target.value })}
            className={inputCls} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>الكود</FieldLabel>
            <input type="text" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} className={inputCls} />
          </div>
          <div>
            <FieldLabel>النوع</FieldLabel>
            <select value={form.type || 'operational'} onChange={e => setForm({ ...form, type: e.target.value })} className={selectCls}>
              <option value="operational">تشغيلي</option>
              <option value="administrative">إداري</option>
              <option value="service">خدمي</option>
              <option value="production">إنتاجي</option>
            </select>
          </div>
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button onClick={onSave}
          className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 active:scale-[0.98] transition-all">
          حفظ
        </button>
        <button onClick={onClose} className="px-6 py-3 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-2xl font-black text-sm transition-all">
          إلغاء
        </button>
      </div>
    </div>
  </ModalWrapper>
);