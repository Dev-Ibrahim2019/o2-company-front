// src/components/administration/GL/AddJournalEntryModal.tsx
//
// ✅ إصلاحات:
//    1. عند اختيار "موظف/مورد/زبون" يمكن تغيير الحساب المربوط يدوياً
//    2. الأرقام بخط monospace واضح مع لون لكل جانب
//    3. شكل القيد يشبه دفتر اليومية المحاسبي الحقيقي
//    4. canSave يتحقق من كل سطر بشكل صحيح

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw,
  User, Building2, Briefcase, Hash,
} from 'lucide-react';
import { accountService, transactionService, costCenterService } from '../../../services/accountingService';
import type { Account, CostCenter } from '../../../services/accountingService';
import { employeeService } from '../../../services/employeeService';
import type { EmployeeFromApi } from '../../../services/employeeService';
import api from '../../../api/axios';
import { useFormValidation } from '../../../hooks/accounting/useFormValidation';

// ─── Types ────────────────────────────────────────────────────────────────────

type SubledgerType = 'none' | 'employee' | 'customer' | 'supplier';

interface JournalLine {
  subledgerType: SubledgerType;
  subledgerId: string;
  subledgerName: string;
  accountId: string;
  debit: number;
  credit: number;
  description: string;
  costCenterId: string;
}

interface EntityOption { id: number; name: string; code?: string }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: 'journal' | 'payment';
}

const emptyLine = (): JournalLine => ({
  subledgerType: 'none',
  subledgerId: '',
  subledgerName: '',
  accountId: '',
  debit: 0,
  credit: 0,
  description: '',
  costCenterId: '',
});

// ─── Default accounts per subledger type (يمكن تغييرها يدوياً بعدها) ────────

const DEFAULT_ACCOUNT_CODE: Record<SubledgerType, string | null> = {
  none: null,
  employee: '11011',  // ذمم موظفين / سلف موظفين
  customer: '11021',  // ذمم زبائن
  supplier: '21011',  // ذمم موردين
};

const SUBLEDGER_LABELS: Record<SubledgerType, string> = {
  none: 'حساب مباشر',
  employee: 'موظف',
  customer: 'عميل',
  supplier: 'مورد',
};

const SUBLEDGER_ICONS: Record<SubledgerType, React.ElementType> = {
  none: Hash,
  employee: User,
  customer: Briefcase,
  supplier: Building2,
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const inp = 'w-full bg-slate-950/80 border border-white/[0.07] rounded-xl px-3 py-2 text-[12px] text-white text-right outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/15 transition-all placeholder:text-slate-700';
const sel = `${inp} cursor-pointer`;
const lbl = 'text-[9px] font-black text-slate-500 uppercase tracking-[0.16em] mb-1.5 block';

// ─── Component ────────────────────────────────────────────────────────────────

const AddJournalEntryModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, mode = 'journal' }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [globalDesc, setGlobalDesc] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // master data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [employees, setEmployees] = useState<EmployeeFromApi[]>([]);
  const [customers, setCustomers] = useState<EntityOption[]>([]);
  const [suppliers, setSuppliers] = useState<EntityOption[]>([]);
  const [masterLoad, setMasterLoad] = useState(false);

  // جلب البيانات عند الفتح
  useEffect(() => {
    if (!isOpen) return;
    setMasterLoad(true);
    Promise.all([
      accountService.getAll({ allow_posting: true }),
      costCenterService.getAll(),
      employeeService.getAll(),
    ]).then(([accs, ccs, emps]) => {
      setAccounts(accs);
      setCostCenters(ccs);
      setEmployees(emps);
    }).catch(() => { });

    // موردين وزبائن
    Promise.all([api.get('/suppliers'), api.get('/customers')])
      .then(([s, c]) => {
        setSuppliers(s.data?.data ?? s.data ?? []);
        setCustomers(c.data?.data ?? c.data ?? []);
      })
      .catch(() => { })
      .finally(() => setMasterLoad(false));
  }, [isOpen]);

  // ── Line helpers ──────────────────────────────────────────────────────────

  const getOptions = (type: SubledgerType): EntityOption[] => {
    if (type === 'employee') return employees.map(e => ({ id: e.id, name: e.name, code: e.employeeId }));
    if (type === 'customer') return customers;
    if (type === 'supplier') return suppliers;
    return [];
  };

  const findDefaultAccountId = (type: SubledgerType): string => {
    const code = DEFAULT_ACCOUNT_CODE[type];
    if (!code) return '';
    const acc = accounts.find(a => a.code === code && a.allow_posting);
    // إذا لم نجد الحساب الافتراضي بالكود، أرجع فارغاً ليختار المستخدم
    return acc ? String(acc.id) : '';
  };

  const updateLine = (idx: number, patch: Partial<JournalLine>) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      let updated = { ...l, ...patch };

      // عند تغيير نوع الجهة
      if ('subledgerType' in patch) {
        const type = patch.subledgerType!;
        updated.subledgerId = '';
        updated.subledgerName = '';
        // ضع الحساب الافتراضي لكن يمكن تغييره
        updated.accountId = findDefaultAccountId(type);
      }

      // عند اختيار الجهة → حفظ الاسم
      if ('subledgerId' in patch && patch.subledgerId) {
        const opts = getOptions(updated.subledgerType);
        const found = opts.find(o => String(o.id) === patch.subledgerId);
        if (found) updated.subledgerName = found.name;
      }

      return updated;
    }));
  };

  const addLine = () => setLines(p => [...p, emptyLine()]);
  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(p => p.filter((_, i) => i !== idx));
  };

  // ── Totals & validation ───────────────────────────────────────────────────

  const totalDebit = useMemo(() => lines.reduce((s, l) => s + (l.debit || 0), 0), [lines]);
  const totalCredit = useMemo(() => lines.reduce((s, l) => s + (l.credit || 0), 0), [lines]);
  const validationRules = useMemo(() => ([
    {
      message: 'يجب إدخال البيان العام',
      test: () => !!globalDesc.trim(),
    },
    {
      message: 'يجب اختيار حساب لكل سطر',
      test: () => lines.every((line) => line.accountId),
    },
    {
      message: 'يجب إدخال مبلغ في كل سطر',
      test: () => lines.every((line) => line.debit > 0 || line.credit > 0),
    },
    {
      message: 'القيد غير متوازن',
      test: () => Math.abs(totalDebit - totalCredit) < 0.01,
    },
    {
      message: 'يجب أن يكون إجمالي المدين أكبر من الصفر',
      test: () => totalDebit > 0,
    },
  ]), [globalDesc, lines, totalDebit, totalCredit]);
  const validation = useFormValidation(
    { globalDesc, lines, totalDebit, totalCredit },
    validationRules,
  );
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const canSave = validation.isValid;

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const SUBLEDGER_MAP: Record<SubledgerType, string | null> = {
        none: null, employee: 'employee', customer: 'customer', supplier: 'supplier',
      };
      await transactionService.create({
        date,
        description: globalDesc,
        type: mode === 'payment' ? 'payment' : 'journal',
        entries: lines.map((l, i) => ({
          account_id: Number(l.accountId),
          debit: l.debit || 0,
          credit: l.credit || 0,
          description: l.description || globalDesc,
          cost_center_id: l.costCenterId ? Number(l.costCenterId) : null,
          sort_order: i + 1,
          subledger_type: SUBLEDGER_MAP[l.subledgerType],
          subledger_id: l.subledgerId ? Number(l.subledgerId) : null,
        })),
      });
      onSuccess?.();
      handleClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setLines([emptyLine(), emptyLine()]);
    setGlobalDesc('');
    setDate(new Date().toISOString().slice(0, 10));
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const postingAccounts = accounts.filter(a => a.allow_posting);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
        {/* backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="relative w-full sm:max-w-[90vw] xl:max-w-6xl bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.07] bg-gradient-to-l from-blue-950/30 to-transparent">
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={14} />
            </button>
            <div className="text-right">
              <h3 className="text-[17px] font-black text-white leading-tight">
                {mode === 'payment' ? 'سند صرف' : 'قيد يومية جديد'}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                دفتر اليومية العامة · {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[80vh]">
            {/* ── Meta row ───────────────────────────────────── */}
            <div className="px-7 pt-6 pb-4 grid grid-cols-4 gap-4 border-b border-white/[0.06]">
              <div>
                <label className={lbl}>تاريخ القيد</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} />
              </div>
              <div className="col-span-3">
                <label className={lbl}>البيان العام <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={globalDesc}
                  onChange={e => setGlobalDesc(e.target.value)}
                  placeholder="مثال: رواتب شهر يناير 2025"
                  className={inp}
                />
              </div>
            </div>

            {/* ── Lines ──────────────────────────────────────── */}
            <div className="px-7 py-5 space-y-2">

              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 mb-1 px-1">
                {[
                  { label: 'الجهة', span: 2 },
                  { label: 'اختر الجهة', span: 2 },
                  { label: 'الحساب', span: 3 },
                  { label: 'مدين ₪', span: 1 },
                  { label: 'دائن ₪', span: 1 },
                  { label: 'البيان', span: 2 },
                  { label: 'مركز التكلفة', span: 1 },
                ].map(({ label, span }, i) => (
                  <div
                    key={i}
                    className={`col-span-${span} text-[9px] font-black text-slate-600 uppercase tracking-[0.15em] text-right`}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Lines */}
              {lines.map((line, idx) => {
                const SubIcon = SUBLEDGER_ICONS[line.subledgerType];
                const opts = getOptions(line.subledgerType);
                const isFirst = idx === 0;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`grid grid-cols-12 gap-2 items-start p-2.5 rounded-2xl border transition-colors
                                            ${line.debit > 0
                        ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
                        : line.credit > 0
                          ? 'border-rose-500/20 bg-rose-500/[0.03]'
                          : 'border-white/[0.05] bg-white/[0.015]'}`}
                  >
                    {/* نوع الجهة */}
                    <div className="col-span-2">
                      <select
                        value={line.subledgerType}
                        onChange={e => updateLine(idx, { subledgerType: e.target.value as SubledgerType })}
                        className={sel}
                      >
                        <option value="none">حساب مباشر</option>
                        <option value="employee">موظف</option>
                        <option value="customer">عميل</option>
                        <option value="supplier">مورد</option>
                      </select>
                    </div>

                    {/* اسم الجهة */}
                    <div className="col-span-2">
                      {line.subledgerType === 'none' ? (
                        <div className={`${inp} text-slate-700 text-center`}>—</div>
                      ) : (
                        <select
                          value={line.subledgerId}
                          onChange={e => updateLine(idx, { subledgerId: e.target.value })}
                          className={sel}
                        >
                          <option value="">اختر {SUBLEDGER_LABELS[line.subledgerType]}...</option>
                          {opts.map(o => (
                            <option key={o.id} value={String(o.id)}>
                              {o.code ? `${o.code} · ` : ''}{o.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* الحساب — دائماً قابل للتغيير */}
                    <div className="col-span-3">
                      <select
                        value={line.accountId}
                        onChange={e => updateLine(idx, { accountId: e.target.value })}
                        className={`${sel} ${!line.accountId ? 'border-rose-500/30' : ''}`}
                      >
                        <option value="">اختر الحساب...</option>
                        {postingAccounts.map(a => (
                          <option key={a.id} value={String(a.id)}>
                            {a.code} · {a.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* مدين */}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={line.debit || ''}
                      onChange={e => updateLine(idx, {
                        debit: parseFloat(e.target.value) || 0,
                        credit: 0,
                      })}
                      className={`col-span-1 ${inp} font-mono text-emerald-400 placeholder:text-slate-700 text-right font-black`}
                    />

                    {/* دائن */}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={line.credit || ''}
                      onChange={e => updateLine(idx, {
                        credit: parseFloat(e.target.value) || 0,
                        debit: 0,
                      })}
                      className={`col-span-1 ${inp} font-mono text-rose-400 placeholder:text-slate-700 text-right font-black`}
                    />

                    {/* البيان */}
                    <input
                      type="text"
                      placeholder="بيان..."
                      value={line.description}
                      onChange={e => updateLine(idx, { description: e.target.value })}
                      className={`col-span-2 ${inp}`}
                    />

                    {/* مركز التكلفة + حذف */}
                    <div className="col-span-1 flex items-center gap-1.5">
                      <select
                        value={line.costCenterId}
                        onChange={e => updateLine(idx, { costCenterId: e.target.value })}
                        className={`flex-1 ${sel} text-[11px]`}
                      >
                        <option value="">—</option>
                        {costCenters.map(cc => (
                          <option key={cc.id} value={String(cc.id)}>{cc.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeLine(idx)}
                        disabled={lines.length <= 2}
                        className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-rose-600/20 border border-white/[0.06] hover:border-rose-500/30 text-slate-600 hover:text-rose-400 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              {/* Add line */}
              <button
                onClick={addLine}
                className="flex items-center gap-1.5 text-[11px] font-black text-blue-500 hover:text-blue-400 transition-colors py-1"
              >
                <Plus size={13} /> إضافة سطر
              </button>
            </div>

            {/* ── Balance strip ───────────────────────────────── */}
            <div className={`mx-7 mb-5 rounded-2xl border px-5 py-4 transition-colors
                            ${isBalanced && totalDebit > 0
                ? 'bg-emerald-500/[0.05] border-emerald-500/25'
                : 'bg-rose-500/[0.05] border-rose-500/25'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isBalanced && totalDebit > 0
                    ? <CheckCircle2 size={16} className="text-emerald-500" />
                    : <AlertCircle size={16} className="text-rose-500" />
                  }
                  <span className={`text-[12px] font-black ${isBalanced && totalDebit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isBalanced && totalDebit > 0
                      ? 'القيد متوازن ✓'
                      : totalDebit === 0
                        ? 'أدخل المبالغ'
                        : `فرق: ₪${Math.abs(totalDebit - totalCredit).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}`
                    }
                  </span>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">مجموع مدين</p>
                    <p className="text-[18px] font-black font-mono text-emerald-400 tabular-nums leading-none">
                      ₪{totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="w-px h-10 bg-white/[0.08]" />
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">مجموع دائن</p>
                    <p className="text-[18px] font-black font-mono text-rose-400 tabular-nums leading-none">
                      ₪{totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Validation hints */}
              {!globalDesc.trim() && (
                <p className="text-[10px] text-amber-400/80 mt-2 font-bold">⚠ يجب إدخال البيان العام</p>
              )}
              {lines.some(l => !l.accountId) && (
                <p className="text-[10px] text-amber-400/80 mt-1 font-bold">⚠ بعض الأسطر لا تحتوي على حساب</p>
              )}
              {lines.some(l => l.debit === 0 && l.credit === 0) && (
                <p className="text-[10px] text-amber-400/80 mt-1 font-bold">⚠ بعض الأسطر المبلغ صفر</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mx-7 mb-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl px-5 py-3 text-[12px] text-rose-400 font-bold">
                {error}
              </div>
            )}

            {/* ── Actions ─────────────────────────────────────── */}
            <div className="px-7 pb-7 flex gap-3">
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className={`flex-1 py-3.5 rounded-2xl font-black text-[13px] transition-all flex items-center justify-center gap-2
                                    ${canSave && !saving
                    ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-xl shadow-emerald-900/30 active:scale-[0.99]'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
              >
                {saving && <RefreshCw size={14} className="animate-spin" />}
                {saving ? 'جاري الحفظ...' : mode === 'payment' ? 'حفظ سند الصرف' : 'حفظ القيد'}
              </button>
              <button
                onClick={handleClose}
                className="px-7 py-3.5 bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl font-black text-[13px] transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddJournalEntryModal;
