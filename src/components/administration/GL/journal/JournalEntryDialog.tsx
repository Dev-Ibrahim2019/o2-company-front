import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Plus, RefreshCw, Trash2, X } from "lucide-react";
import type {
  Account,
  CostCenter,
  EntryLine,
  SubledgerType,
  Transaction,
  TransactionStatus,
  TransactionType,
} from "../../../../services/accounting";

export type JournalSaveMode = "draft" | "posted";

export interface JournalPayloadLine {
  account_id: number;
  debit: number;
  credit: number;
  description?: string;
  cost_center_id?: number | null;
  subledger_type?: SubledgerType | null;
  subledger_id?: number | null;
  sort_order: number;
}

export interface JournalPayload {
  date: string;
  reference?: string;
  description?: string;
  notes?: string;
  type: TransactionType;
  status?: TransactionStatus;
  branch_id?: number | null;
  currency?: string;
  source_type?: string;
  source_id?: number | null;
  is_reversal?: boolean;
  entries: JournalPayloadLine[];
}

export interface JournalSubledgerOption {
  id: number | string;
  type: SubledgerType;
  name: string;
  code?: string;
}

export interface JournalBranchOption {
  id: string;
  name: string;
  currency?: string;
}

type JournalMode = "create" | "edit" | "duplicate";

interface JournalEntryDialogProps {
  open: boolean;
  mode: JournalMode;
  initialEntry?: Transaction | null;
  accounts: Account[];
  costCenters: CostCenter[];
  branches: JournalBranchOption[];
  subledgerOptions: JournalSubledgerOption[];
  loadingReferences?: boolean;
  onClose: () => void;
  onSubmit: (payload: JournalPayload, saveMode: JournalSaveMode) => Promise<void> | void;
}

interface JournalLineState {
  accountId: string;
  costCenterId: string;
  subledgerType: SubledgerType | "none";
  subledgerId: string;
  debit: string;
  credit: string;
  description: string;
}

interface JournalFormState {
  date: string;
  reference: string;
  description: string;
  notes: string;
  type: TransactionType;
  branchId: string;
  currency: string;
  sourceType: string;
  sourceId: string;
  isReversal: boolean;
  lines: JournalLineState[];
}

const inputCls =
  "w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white text-right outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 transition-all placeholder:text-slate-700";
const selectCls = `${inputCls} cursor-pointer`;
const labelCls =
  "block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1.5";

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyLine = (): JournalLineState => ({
  accountId: "",
  costCenterId: "",
  subledgerType: "none",
  subledgerId: "",
  debit: "",
  credit: "",
  description: "",
});

const emptyForm = (entry?: Transaction | null): JournalFormState => {
  if (!entry) {
    return {
      date: todayISO(),
      reference: "",
      description: "",
      notes: "",
      type: "journal",
      branchId: "",
      currency: "",
      sourceType: "",
      sourceId: "",
      isReversal: false,
      lines: [emptyLine(), emptyLine()],
    };
  }

  return {
    date: entry.date ?? todayISO(),
    reference: entry.reference ?? "",
    description: entry.description ?? "",
    notes: entry.notes ?? "",
    type: entry.type ?? "journal",
    branchId: entry.branch?.id ? String(entry.branch.id) : "",
    currency: String((entry as any).currency ?? ""),
    sourceType: String(entry.source_type ?? ""),
    sourceId: entry.source_id ? String(entry.source_id) : "",
    isReversal: Boolean((entry as any).is_reversal),
    lines: (entry.entries ?? []).length
      ? [...(entry.entries ?? [])]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((line: EntryLine) => ({
          accountId: String(line.account_id ?? ""),
          costCenterId: String(line.cost_center_id ?? ""),
          subledgerType: (line.subledger_type ?? "none") as SubledgerType | "none",
          subledgerId: String(line.subledger_id ?? ""),
          debit: line.debit > 0 ? String(line.debit) : "",
          credit: line.credit > 0 ? String(line.credit) : "",
          description: line.description ?? "",
        }))
      : [emptyLine(), emptyLine()],
  };
};

const fmt = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

export const JournalEntryDialog: React.FC<JournalEntryDialogProps> = ({
  open,
  mode,
  initialEntry,
  accounts,
  costCenters,
  branches,
  subledgerOptions,
  loadingReferences,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<JournalFormState>(() => emptyForm(initialEntry ?? null));
  const [savingMode, setSavingMode] = useState<JournalSaveMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "duplicate" && initialEntry) {
      setForm(
        emptyForm({
          ...initialEntry,
          date: todayISO(),
          reference: "",
        }),
      );
    } else {
      setForm(emptyForm(initialEntry ?? null));
    }
    setError(null);
    setSavingMode(null);
  }, [open, mode, initialEntry]);

  const postingAccounts = useMemo(() => accounts.filter((account) => account.allow_posting), [accounts]);
  const branchCurrency = useMemo(
    () => branches.find((branch) => branch.id === form.branchId)?.currency ?? "",
    [branches, form.branchId],
  );

  useEffect(() => {
    if (!form.currency && branchCurrency) {
      setForm((prev) => ({ ...prev, currency: branchCurrency }));
    }
  }, [branchCurrency, form.currency]);

  const totals = useMemo(() => {
    const debit = form.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const credit = form.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    return {
      debit,
      credit,
      balanced: Math.abs(debit - credit) < 0.001,
    };
  }, [form.lines]);

  const isValid = useMemo(() => {
    return (
      form.date &&
      form.description.trim() &&
      form.branchId &&
      form.lines.length >= 2 &&
      form.lines.every((line) => line.accountId && (Number(line.debit) > 0 || Number(line.credit) > 0)) &&
      totals.balanced &&
      totals.debit > 0
    );
  }, [form, totals]);

  const updateLine = (index: number, patch: Partial<JournalLineState>) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        return { ...line, ...patch };
      }),
    }));
  };

  const addLine = () => setForm((prev) => ({ ...prev, lines: [...prev.lines, emptyLine()] }));
  const removeLine = (index: number) => {
    setForm((prev) => {
      if (prev.lines.length <= 2) return prev;
      return { ...prev, lines: prev.lines.filter((_, lineIndex) => lineIndex !== index) };
    });
  };

  const setSharedField = <K extends keyof JournalFormState>(key: K, value: JournalFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayload = (status: JournalSaveMode): JournalPayload => ({
    date: form.date,
    reference: form.reference.trim() || undefined,
    description: form.description.trim() || undefined,
    notes: form.notes.trim() || undefined,
    type: form.type,
    status,
    branch_id: form.branchId ? Number(form.branchId) : null,
    currency: form.currency.trim() || undefined,
    source_type: form.sourceType.trim() || undefined,
    source_id: form.sourceId ? Number(form.sourceId) : null,
    is_reversal: form.isReversal,
    entries: form.lines
      .filter((line) => line.accountId && (Number(line.debit) > 0 || Number(line.credit) > 0))
      .map((line, index) => ({
        account_id: Number(line.accountId),
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        description: line.description.trim() || form.description.trim() || undefined,
        cost_center_id: line.costCenterId ? Number(line.costCenterId) : null,
        subledger_type:
          line.subledgerType !== "none" ? (line.subledgerType as SubledgerType) : null,
        subledger_id: line.subledgerId ? Number(line.subledgerId) : null,
        sort_order: index + 1,
      })),
  });

  const submit = async (status: JournalSaveMode) => {
    if (!isValid || savingMode) return;
    setSavingMode(status);
    setError(null);
    try {
      await onSubmit(buildPayload(status), status);
    } catch (submitError: any) {
      setError(
        submitError?.response?.data?.message ??
        submitError?.message ??
        "فشل حفظ القيد",
      );
    } finally {
      setSavingMode(null);
    }
  };

  if (!open) return null;

  const title =
    mode === "edit"
      ? "تعديل قيد يومية"
      : mode === "duplicate"
        ? "نسخ قيد يومية"
        : "قيد يومية جديد";

  const subtitle = initialEntry
    ? `${initialEntry.transaction_number} · ${initialEntry.date}`
    : "إدخال جميع البيانات المالية الخاصة بالقيد";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative w-full sm:max-w-[92vw] xl:max-w-7xl bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden text-right"
        >
          <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.07] bg-gradient-to-l from-red-950/25 to-transparent">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              type="button"
            >
              <X size={14} />
            </button>
            <div className="text-right">
              <h3 className="text-[17px] font-black text-white leading-tight">{title}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{subtitle}</p>
            </div>
          </div>

          <div className="max-h-[82vh] overflow-y-auto custom-scrollbar">
            <div className="px-7 pt-6 pb-4 grid grid-cols-1 xl:grid-cols-4 gap-4 border-b border-white/[0.06]">
              <div>
                <label className={labelCls}>تاريخ القيد</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setSharedField("date", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="xl:col-span-2">
                <label className={labelCls}>البيان العام</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setSharedField("description", e.target.value)}
                  className={inputCls}
                  placeholder="مثال: قيد مبيعات يوم الأحد"
                />
              </div>
              <div>
                <label className={labelCls}>المرجع</label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) => setSharedField("reference", e.target.value)}
                  className={inputCls}
                  placeholder="رقم فاتورة / مرجع داخلي"
                />
              </div>
            </div>

            <div className="px-7 py-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 border-b border-white/[0.06]">
              <div>
                <label className={labelCls}>الفرع</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setSharedField("branchId", e.target.value)}
                  className={selectCls}
                >
                  <option value="">اختر الفرع</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>العملة</label>
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => setSharedField("currency", e.target.value.toUpperCase())}
                  className={inputCls}
                  placeholder="USD / ILS / JOD"
                />
              </div>
              <div>
                <label className={labelCls}>نوع الحركة</label>
                <select
                  value={form.type}
                  onChange={(e) => setSharedField("type", e.target.value as TransactionType)}
                  className={selectCls}
                >
                  <option value="journal">قيد عام</option>
                  <option value="adjustment">تسوية</option>
                  <option value="opening">افتتاحي</option>
                  <option value="receipt">سند قبض</option>
                  <option value="payment">سند صرف</option>
                  <option value="sale">مبيعات</option>
                  <option value="purchase">مشتريات</option>
                  <option value="salary">رواتب</option>
                  <option value="expense">مصروف</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>نوع المصدر</label>
                <input
                  type="text"
                  value={form.sourceType}
                  onChange={(e) => setSharedField("sourceType", e.target.value)}
                  className={inputCls}
                  placeholder="customer / invoice / manual ..."
                />
              </div>
            </div>

            <div className="px-7 pb-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>معرف المصدر</label>
                <input
                  type="number"
                  min="0"
                  value={form.sourceId}
                  onChange={(e) => setSharedField("sourceId", e.target.value)}
                  className={inputCls}
                  placeholder="اختياري"
                />
              </div>
              <div className="xl:col-span-2">
                <label className={labelCls}>ملاحظات داخلية</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setSharedField("notes", e.target.value)}
                  className={`${inputCls} resize-none h-16 py-2`}
                  placeholder="ملاحظات داخلية مرتبطة بالقيد..."
                />
              </div>
            </div>

            <div className="px-7 pb-2 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-[11px] font-black">
                <button
                  type="button"
                  onClick={() => setSharedField("isReversal", !form.isReversal)}
                  className={`px-3 py-2 rounded-xl border transition-all ${form.isReversal
                    ? "bg-rose-600/20 border-rose-500/30 text-rose-300"
                    : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                    }`}
                >
                  القيد عكسي
                </button>
                {loadingReferences && (
                  <span className="inline-flex items-center gap-2 text-slate-500">
                    <RefreshCw size={12} className="animate-spin" /> جار تحميل بيانات السندات...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">إجمالي مدين</p>
                  <p className="text-[16px] font-black font-mono text-emerald-400 tabular-nums">₪{fmt(totals.debit)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">إجمالي دائن</p>
                  <p className="text-[16px] font-black font-mono text-rose-400 tabular-nums">₪{fmt(totals.credit)}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black ${totals.balanced && totals.debit > 0
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    }`}
                >
                  {totals.balanced && totals.debit > 0 ? (
                    <>
                      <CheckCircle2 size={11} /> القيد متوازن
                    </>
                  ) : (
                    <>
                      <AlertCircle size={11} /> فرق ₪{Math.abs(totals.debit - totals.credit).toLocaleString()}
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="px-7 pt-3 pb-5">
              <div className="grid grid-cols-12 gap-2 mb-2 px-1">
                <div className="col-span-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.15em]">النوع</div>
                <div className="col-span-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.15em]">الكيان</div>
                <div className="col-span-3 text-[9px] font-black text-slate-600 uppercase tracking-[0.15em]">الحساب</div>
                <div className="col-span-1 text-[9px] font-black text-slate-600 uppercase tracking-[0.15em] text-left">مدين</div>
                <div className="col-span-1 text-[9px] font-black text-slate-600 uppercase tracking-[0.15em] text-left">دائن</div>
                <div className="col-span-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.15em]">البيان</div>
                <div className="col-span-1 text-[9px] font-black text-slate-600 uppercase tracking-[0.15em]">مركز</div>
              </div>

              <div className="space-y-2">
                {form.lines.map((line, index) => {
                  const selectedSubledger = subledgerOptions.find(
                    (option) =>
                      option.type === line.subledgerType &&
                      String(option.id) === line.subledgerId,
                  );

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`grid grid-cols-12 gap-2 items-start p-2.5 rounded-2xl border transition-colors ${Number(line.debit) > 0
                        ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                        : Number(line.credit) > 0
                          ? "border-rose-500/20 bg-rose-500/[0.03]"
                          : "border-white/[0.05] bg-white/[0.015]"
                        }`}
                    >
                      <div className="col-span-2">
                        <select
                          value={line.subledgerType}
                          onChange={(e) =>
                            updateLine(index, {
                              subledgerType: e.target.value as JournalLineState["subledgerType"],
                              subledgerId: "",
                            })
                          }
                          className={selectCls}
                        >
                          <option value="none">حساب مباشر</option>
                          <option value="employee">موظف</option>
                          <option value="customer">عميل</option>
                          <option value="supplier">مورد</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        {line.subledgerType === "none" ? (
                          <div className={`${inputCls} text-slate-700 text-center`}>—</div>
                        ) : (
                          <select
                            value={line.subledgerId}
                            onChange={(e) => updateLine(index, { subledgerId: e.target.value })}
                            className={selectCls}
                          >
                            <option value="">اختر الكيان</option>
                            {subledgerOptions
                              .filter((option) => option.type === line.subledgerType)
                              .map((option) => (
                                <option key={`${option.type}-${option.id}`} value={String(option.id)}>
                                  {option.code ? `${option.code} · ` : ""}
                                  {option.name}
                                </option>
                              ))}
                          </select>
                        )}
                        {selectedSubledger && (
                          <p className="mt-1 text-[9px] text-slate-600 font-bold">
                            {selectedSubledger.code ? `${selectedSubledger.code} · ` : ""}
                            {selectedSubledger.name}
                          </p>
                        )}
                      </div>

                      <div className="col-span-3">
                        <select
                          value={line.accountId}
                          onChange={(e) => updateLine(index, { accountId: e.target.value })}
                          className={`${selectCls} ${!line.accountId ? "border-rose-500/30" : ""}`}
                        >
                          <option value="">اختر الحساب...</option>
                          {postingAccounts.map((account) => (
                            <option key={account.id} value={String(account.id)}>
                              {account.code} · {account.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={line.debit}
                        onChange={(e) =>
                          updateLine(index, {
                            debit: e.target.value,
                            credit: e.target.value ? "" : line.credit,
                          })
                        }
                        className={`col-span-1 ${inputCls} font-mono text-emerald-400 placeholder:text-slate-700 text-left font-black`}
                      />

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={line.credit}
                        onChange={(e) =>
                          updateLine(index, {
                            credit: e.target.value,
                            debit: e.target.value ? "" : line.debit,
                          })
                        }
                        className={`col-span-1 ${inputCls} font-mono text-rose-400 placeholder:text-slate-700 text-left font-black`}
                      />

                      <input
                        type="text"
                        placeholder="وصف السطر"
                        value={line.description}
                        onChange={(e) => updateLine(index, { description: e.target.value })}
                        className={`col-span-2 ${inputCls}`}
                      />

                      <div className="col-span-1 flex items-center gap-1.5">
                        <select
                          value={line.costCenterId}
                          onChange={(e) => updateLine(index, { costCenterId: e.target.value })}
                          className={`${selectCls} text-[11px]`}
                        >
                          <option value="">—</option>
                          {costCenters.map((costCenter) => (
                            <option key={costCenter.id} value={String(costCenter.id)}>
                              {costCenter.code ? `${costCenter.code} · ` : ""}
                              {costCenter.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          disabled={form.lines.length <= 2}
                          className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-rose-600/20 border border-white/[0.06] hover:border-rose-500/30 text-slate-600 hover:text-rose-400 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={addLine}
                className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-black text-blue-500 hover:text-blue-400 transition-colors py-1"
              >
                <Plus size={13} /> إضافة سطر
              </button>
            </div>

            {error && (
              <div className="mx-7 mb-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl px-5 py-3 text-[12px] text-rose-400 font-bold">
                {error}
              </div>
            )}

            <div className="px-7 pb-7 flex flex-col lg:flex-row gap-3">
              <button
                type="button"
                onClick={() => submit("draft")}
                disabled={!isValid || Boolean(savingMode)}
                className={`flex-1 py-3.5 rounded-2xl font-black text-[13px] transition-all flex items-center justify-center gap-2 ${isValid && !savingMode
                  ? "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  : "bg-slate-800 text-slate-600 cursor-not-allowed"
                  }`}
              >
                {savingMode === "draft" && <RefreshCw size={14} className="animate-spin" />}
                {mode === "edit" ? "حفظ التعديلات" : "حفظ كمسودة"}
              </button>

              <button
                type="button"
                onClick={() => submit("posted")}
                disabled={!isValid || Boolean(savingMode)}
                className={`flex-1 py-3.5 rounded-2xl font-black text-[13px] transition-all flex items-center justify-center gap-2 ${isValid && !savingMode
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-900/30 active:scale-[0.99]"
                  : "bg-slate-800 text-slate-600 cursor-not-allowed"
                  }`}
              >
                {savingMode === "posted" && <RefreshCw size={14} className="animate-spin" />}
                {mode === "edit" ? "حفظ وترحيل" : "حفظ وترحيل القيد"}
              </button>

              <button
                type="button"
                onClick={onClose}
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

export default JournalEntryDialog;
