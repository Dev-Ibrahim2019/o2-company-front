import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  Filter,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { employeeService, type EmployeeFromApi } from "../../../../services/employeeService";
import type { UseAccountingReturn } from "../../../../hooks/useAccounting";
import type { Transaction } from "../../../../services/accounting";
import ViewJournalModal from "../ViewJournalModal";
import {
  JournalEntryDialog,
  type JournalBranchOption,
  type JournalPayload,
  type JournalSaveMode,
  type JournalSubledgerOption,
} from "./JournalEntryDialog";

type BranchOption = JournalBranchOption;
type EntityOption = { id: string | number; name: string; code?: string };

interface JournalEntriesWorkspaceProps {
  accounting: UseAccountingReturn;
  branches: BranchOption[];
  customers: EntityOption[];
  suppliers: EntityOption[];
}

interface FilterState {
  status: string;
  type: string;
  branch: string;
  dateFrom: string;
  dateTo: string;
  reference: string;
  search: string;
  reversedOnly: boolean;
  minAmount: string;
  maxAmount: string;
}

const DEFAULT_FILTERS: FilterState = {
  status: "",
  type: "",
  branch: "",
  dateFrom: "",
  dateTo: "",
  reference: "",
  search: "",
  reversedOnly: false,
  minAmount: "",
  maxAmount: "",
};

type DialogState =
  | { open: false; mode: "create" | "edit" | "duplicate"; entry: Transaction | null }
  | { open: true; mode: "create" | "edit" | "duplicate"; entry: Transaction | null };

const STATUS_META: Record<
  "draft" | "posted" | "cancelled",
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  draft: {
    label: "مسودة",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: Clock,
  },
  posted: {
    label: "مرحّل",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "ملغي",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    icon: AlertCircle,
  },
};

const TYPE_META: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  journal: { label: "قيد عام", color: "text-slate-300", bg: "bg-white/5", border: "border-white/10", icon: Copy },
  sale: { label: "مبيعات", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
  purchase: { label: "مشتريات", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Building2 },
  salary: { label: "رواتب", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", icon: Users },
  expense: { label: "مصروف", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: ShieldAlert },
  receipt: { label: "سند قبض", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", icon: CheckCircle2 },
  payment: { label: "سند صرف", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: Building2 },
  opening: { label: "افتتاحي", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", icon: Copy },
  adjustment: { label: "تسوية", color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20", icon: RefreshCw },
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

const statusKey = (status: string): "draft" | "posted" | "cancelled" => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "posted" || normalized === "cancelled" || normalized === "draft") return normalized;
  return "draft";
};

const typeKey = (type?: string) => String(type || "journal").toLowerCase();

const optionize = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

const normalizeBranch = (branch?: { id: number | string; name: string; currency?: string | null }) => ({
  id: String(branch?.id ?? ""),
  name: branch?.name ?? "",
  currency: branch?.currency ?? "",
});

export const JournalEntriesWorkspace: React.FC<JournalEntriesWorkspaceProps> = ({
  accounting,
  branches,
  customers,
  suppliers,
}) => {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ open: false, mode: "create", entry: null });
  const [employees, setEmployees] = useState<EmployeeFromApi[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoadingEmployees(true);
    employeeService
      .getAll()
      .then((data) => {
        if (!cancelled) setEmployees(data);
      })
      .catch(() => {
        if (!cancelled) setEmployees([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEmployees(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const subledgerOptions = useMemo<JournalSubledgerOption[]>(() => {
    const employeeOptions = employees.map((employee) => ({
      id: employee.id,
      type: "employee" as const,
      name: employee.name,
      code: employee.employeeId,
    }));
    const customerOptions = customers.map((customer) => ({
      id: customer.id,
      type: "customer" as const,
      name: customer.name,
      code: customer.code,
    }));
    const supplierOptions = suppliers.map((supplier) => ({
      id: supplier.id,
      type: "supplier" as const,
      name: supplier.name,
      code: supplier.code,
    }));

    return [...employeeOptions, ...customerOptions, ...supplierOptions];
  }, [employees, customers, suppliers]);

  const journalEntries = accountMapping(accounting.transactions);
  const selectedEntry = useMemo(
    () => journalEntries.find((entry) => entry.id === String(selectedTransactionId)) ?? null,
    [journalEntries, selectedTransactionId],
  );

  const filteredEntries = useMemo(() => {
    return journalEntries.filter((entry) => {
      const entryStatus = statusKey(entry.status);
      const entryType = typeKey(entry.type);
      const query = search.trim().toLowerCase();
      const totalDebit = entry.totalDebit ?? entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      if (query) {
        const haystack = [
          entry.transactionNumber,
          entry.reference,
          entry.description,
          entry.branchName,
          entry.userName,
          entry.currency,
          entry.notes,
          entry.date,
          ...(entry.lines ?? []).flatMap((line) => [
            line.accountName ?? "",
            line.accountCode ?? "",
            line.subledgerName ?? "",
          ]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      if (filters.status && entryStatus !== filters.status) return false;
      if (filters.type && entryType !== filters.type) return false;
      if (filters.branch && entry.branchName !== filters.branch) return false;
      if (filters.reference && !(entry.reference ?? "").toLowerCase().includes(filters.reference.toLowerCase())) return false;
      if (filters.dateFrom && entry.date < filters.dateFrom) return false;
      if (filters.dateTo && entry.date > filters.dateTo) return false;
      if (filters.reversedOnly && !entry.isReversal) return false;
      if (filters.minAmount && totalDebit < Number(filters.minAmount)) return false;
      if (filters.maxAmount && totalDebit > Number(filters.maxAmount)) return false;
      return true;
    });
  }, [journalEntries, search, filters]);

  const totalDebit = useMemo(
    () => journalEntries.reduce((sum, entry) => sum + (entry.totalDebit ?? entry.lines.reduce((acc, line) => acc + (line.debit || 0), 0)), 0),
    [journalEntries],
  );
  const totalCredit = useMemo(
    () => journalEntries.reduce((sum, entry) => sum + (entry.totalCredit ?? entry.lines.reduce((acc, line) => acc + (line.credit || 0), 0)), 0),
    [journalEntries],
  );

  const postedCount = journalEntries.filter((entry) => statusKey(entry.status) === "posted").length;
  const draftCount = journalEntries.filter((entry) => statusKey(entry.status) === "draft").length;
  const cancelledCount = journalEntries.filter((entry) => statusKey(entry.status) === "cancelled").length;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = journalEntries.filter((entry) => entry.date === today).length;

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / 10));
  const safePage = Math.min(page, totalPages);
  const visibleEntries = filteredEntries.slice((safePage - 1) * 10, safePage * 10);
  const activeFilterCount = Object.entries(filters).filter(([, value]) => {
    if (typeof value === "boolean") return value;
    return value !== "";
  }).length;

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  const openCreate = () => setDialog({ open: true, mode: "create", entry: null });
  const openEdit = (entry: Transaction) => setDialog({ open: true, mode: "edit", entry });
  const openDuplicate = (entry: Transaction) => setDialog({ open: true, mode: "duplicate", entry });

  const handleSubmit = async (payload: JournalPayload, saveMode: JournalSaveMode) => {
    const workingPayload: JournalPayload = {
      ...payload,
      status: saveMode === "posted" ? "posted" : "draft",
    };

    if (dialog.mode === "edit" && dialog.entry) {
      const updated = await accounting.updateTransaction(dialog.entry.id, workingPayload);
      if (saveMode === "posted" && statusKey(updated.status) !== "posted") {
        await accounting.postTransaction(updated.id);
      }
    } else {
      const created = await accounting.createTransaction(workingPayload);
      if (saveMode === "posted" && statusKey(created.status) !== "posted") {
        await accounting.postTransaction(created.id);
      }
    }

    setDialog({ open: false, mode: "create", entry: null });
    await accounting.fetchTransactions({ per_page: 100, type: "journal" });
  };

  const handleDelete = async (entry: Transaction) => {
    const confirmed = confirm(`حذف القيد ${entry.transaction_number}؟`);
    if (!confirmed) return;
    setActionBusyId(entry.id);
    try {
      await accounting.deleteTransaction(entry.id);
      // لا نحتاج fetch بعد الحذف — الـ hook يحدث القائمة محلياً
    } catch (err) {
      console.error("فشل حذف القيد:", err);
    } finally {
      setActionBusyId(null);
    }
  };

  const handlePost = async (entry: Transaction) => {
    setActionBusyId(entry.id);
    try {
      await accounting.postTransaction(entry.id);
      await accounting.fetchTransactions({ per_page: 100, type: "journal" });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleCancel = async (entry: Transaction) => {
    const confirmed = confirm(`إلغاء القيد ${entry.transaction_number}؟`);
    if (!confirmed) return;
    setActionBusyId(entry.id);
    try {
      await accounting.cancelTransaction(entry.id);
      await accounting.fetchTransactions({ per_page: 100, type: "journal" });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleRefresh = async () => {
    await accounting.fetchTransactions({ per_page: 100, type: "journal" });
  };

  const filteredTypeOptions = optionize(journalEntries.map((entry) => typeKey(entry.type)));
  const filteredBranchOptions = optionize(journalEntries.map((entry) => entry.branchName || ""));
  const filteredUserOptions = optionize(journalEntries.map((entry) => entry.userName || ""));
  const filteredCurrencyOptions = optionize(journalEntries.map((entry) => entry.currency || ""));

  return (
    <motion.div
      key="journal-workspace"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="h-full overflow-y-auto custom-scrollbar pb-10 space-y-5"
      dir="rtl"
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "إجمالي القيود", value: String(journalEntries.length), color: "text-white", bg: "bg-white/5", border: "border-white/10", icon: Copy },
          { label: "مرحلة", value: `${postedCount}`, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
          { label: "مسودة", value: `${draftCount}`, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock },
          { label: "ملغاة", value: `${cancelledCount}`, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: AlertCircle },
          { label: "قيود اليوم", value: `${todayCount}`, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Building2 },
        ].map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-slate-900/60 border ${card.border} rounded-2xl p-4 flex items-center justify-between`}
          >
            <div className="text-right">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">{card.label}</p>
              <p className={`text-2xl font-black font-mono ${card.color}`}>{card.value}</p>
            </div>
            <div className={`w-9 h-9 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center ${card.color}`}>
              <card.icon size={17} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white">قيود اليومية العامة</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {filteredEntries.length} قيد
              {activeFilterCount > 0 && <span className="mr-1 text-red-400">(مفلتر من {journalEntries.length})</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في رقم القيد، المرجع، الوصف..."
                className="bg-slate-950 border border-white/5 rounded-xl py-2 pr-9 pl-4 text-xs text-white outline-none focus:border-red-500/50 w-72"
              />
            </div>

            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/5 text-slate-300 hover:text-white rounded-xl text-xs font-black transition-all"
            >
              <Filter size={13} /> الفلاتر
            </button>

            <button
              onClick={handleRefresh}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <RefreshCw size={13} className={accounting.loading.transactions ? "animate-spin" : ""} />
            </button>

            <button className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-xl text-xs font-black transition-all">
              <Download size={13} /> تصدير
            </button>

            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-all shadow-lg shadow-red-900/20"
            >
              <Plus size={14} /> قيد جديد
            </button>
          </div>
        </div>

        {(filters.status ||
          filters.type ||
          filters.branch ||
          filters.dateFrom ||
          filters.dateTo ||
          filters.reference ||
          filters.reversedOnly ||
          filters.minAmount ||
          filters.maxAmount) && (
            <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
              {filters.status && (
                <FilterTag label={STATUS_META[filters.status as keyof typeof STATUS_META]?.label ?? filters.status} onClear={() => setFilters((prev) => ({ ...prev, status: "" }))} />
              )}
              {filters.type && (
                <FilterTag label={TYPE_META[typeKey(filters.type)]?.label ?? filters.type} onClear={() => setFilters((prev) => ({ ...prev, type: "" }))} />
              )}
              {filters.branch && <FilterTag label={filters.branch} onClear={() => setFilters((prev) => ({ ...prev, branch: "" }))} />}
              {filters.reference && <FilterTag label={`مرجع: ${filters.reference}`} onClear={() => setFilters((prev) => ({ ...prev, reference: "" }))} />}
              {(filters.dateFrom || filters.dateTo) && (
                <FilterTag
                  label={`${filters.dateFrom || "..."} → ${filters.dateTo || "..."}`}
                  onClear={() => setFilters((prev) => ({ ...prev, dateFrom: "", dateTo: "" }))}
                />
              )}
              {filters.reversedOnly && (
                <FilterTag label="عكسي فقط" onClear={() => setFilters((prev) => ({ ...prev, reversedOnly: false }))} />
              )}
              {(filters.minAmount || filters.maxAmount) && (
                <FilterTag
                  label={`${money(Number(filters.minAmount || 0))} - ${filters.maxAmount ? money(Number(filters.maxAmount)) : "∞"}`}
                  onClear={() => setFilters((prev) => ({ ...prev, minAmount: "", maxAmount: "" }))}
                />
              )}
            </div>
          )}

        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/60">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-white/5">
              <tr className="text-right text-[10px] uppercase tracking-[0.18em] text-slate-500 font-black">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">رقم القيد</th>
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">النوع</th>
                <th className="px-4 py-3">المرجع</th>
                <th className="px-4 py-3">الوصف</th>
                <th className="px-4 py-3">الفرع</th>
                <th className="px-4 py-3">العملة</th>
                <th className="px-4 py-3">مدين</th>
                <th className="px-4 py-3">دائن</th>
                <th className="px-4 py-3">السطر</th>
                <th className="px-4 py-3">إجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {visibleEntries.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-16 text-center text-slate-500 text-sm">
                    {search || activeFilterCount > 0 ? "لا توجد قيود تطابق الفلاتر الحالية" : "لا توجد قيود محاسبية بعد"}
                  </td>
                </tr>
              ) : (
                visibleEntries.map((entry, index) => {
                  const entryStatus = statusKey(entry.status);
                  const statusMeta = STATUS_META[entryStatus];
                  const entryType = typeKey(entry.type);
                  const typeMeta = TYPE_META[entryType] ?? TYPE_META.journal;
                  const isBusy = actionBusyId === Number(entry.id);
                  const totalDebitValue = entry.totalDebit ?? entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
                  const totalCreditValue = entry.totalCredit ?? entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
                  const lineCount = entry.entriesCount ?? entry.lines.length;

                  return (
                    <tr key={entry.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-4 text-slate-500 font-mono tabular-nums">{index + 1}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-black ${statusMeta.color} ${statusMeta.bg} ${statusMeta.border}`}>
                          <statusMeta.icon size={10} />
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-black text-white font-mono tabular-nums">{entry.transactionNumber || entry.reference || entry.id}</td>
                      <td className="px-4 py-4 text-slate-300 font-mono tabular-nums">{entry.date}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-black ${typeMeta.color} ${typeMeta.bg} ${typeMeta.border}`}>
                          <typeMeta.icon size={10} />
                          {typeMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-400 text-xs">{entry.reference || "—"}</td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="font-bold text-white">{entry.description || "-"}</div>
                          <div className="text-[10px] text-slate-500 flex flex-wrap gap-2">
                            {entry.notes && <span>{entry.notes}</span>}
                            {entry.isReversal && <span className="text-rose-400">عكسي</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-300 text-xs">{entry.branchName || "—"}</td>
                      <td className="px-4 py-4 text-slate-300 text-xs font-mono">{entry.currency || "—"}</td>
                      <td className="px-4 py-4 font-black text-emerald-400 font-mono tabular-nums">{money(totalDebitValue)}</td>
                      <td className="px-4 py-4 font-black text-rose-400 font-mono tabular-nums">{money(totalCreditValue)}</td>
                      <td className="px-4 py-4 text-slate-300 text-xs">{lineCount}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTransactionId(Number(entry.id));
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-slate-300 text-[10px] font-black hover:bg-white/10 hover:text-white transition-all"
                          >
                            <Eye size={12} className="inline ml-1" />
                            عرض
                          </button>

                          {entry.isEditable && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(entry.raw);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-blue-600/15 border border-blue-500/20 text-blue-300 text-[10px] font-black hover:bg-blue-600/25 transition-all"
                            >
                              تعديل
                            </button>
                          )}

                          {entryStatus !== "posted" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handlePost(entry.raw);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600/15 border border-emerald-500/20 text-emerald-300 text-[10px] font-black hover:bg-emerald-600/25 transition-all disabled:opacity-50"
                              disabled={isBusy}
                            >
                              {isBusy ? "جارٍ..." : "ترحيل"}
                            </button>
                          )}

                          {entryStatus === "posted" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleCancel(entry.raw);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-rose-600/15 border border-rose-500/20 text-rose-300 text-[10px] font-black hover:bg-rose-600/25 transition-all disabled:opacity-50"
                              disabled={isBusy}
                            >
                              إلغاء
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDuplicate(entry.raw);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-slate-300 text-[10px] font-black hover:bg-white/10 transition-all"
                          >
                            <Copy size={12} className="inline ml-1" />
                            نسخ
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDelete(entry.raw);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 text-[10px] font-black hover:bg-rose-600/15 hover:text-rose-300 transition-all"
                          >
                            <Trash2 size={12} className="inline ml-1" />
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-white/5 flex items-center justify-between gap-4">
          <span className="text-[11px] text-slate-500 font-bold">
            عرض {Math.min((safePage - 1) * 10 + 1, filteredEntries.length)}–{Math.min(safePage * 10, filteredEntries.length)} من {filteredEntries.length} قيد
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <X size={14} className="rotate-45" />
            </button>
            <span className="text-[11px] text-slate-500 font-bold">
              صفحة {safePage} من {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <X size={14} className="-rotate-45" />
            </button>
          </div>
          <span className="text-[11px] text-slate-500 font-bold">
            إجمالي المدين {money(totalDebit)} · إجمالي الدائن {money(totalCredit)}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <FiltersModal
            filters={filters}
            typeOptions={filteredTypeOptions}
            branchOptions={filteredBranchOptions}
            userOptions={filteredUserOptions}
            currencyOptions={filteredCurrencyOptions}
            onClose={() => setShowFilters(false)}
            onApply={setFilters}
          />
        )}
      </AnimatePresence>

      <JournalEntryDialog
        open={dialog.open}
        mode={dialog.mode}
        initialEntry={dialog.entry}
        accounts={accounting.accounts}
        costCenters={accounting.costCenters}
        branches={branches.map(normalizeBranch)}
        subledgerOptions={subledgerOptions}
        loadingReferences={loadingEmployees}
        onClose={() => setDialog({ open: false, mode: "create", entry: null })}
        onSubmit={handleSubmit}
      />

      {selectedTransactionId && (
        <ViewJournalModal
          transactionId={selectedTransactionId}
          isOpen={true}
          onClose={() => setSelectedTransactionId(null)}
          initialData={
            selectedEntry
              ? {
                transaction_number: selectedEntry.transactionNumber ?? selectedEntry.reference ?? String(selectedTransactionId),
                date: selectedEntry.date ?? today,
                description: selectedEntry.description,
                status: selectedEntry.status,
              }
              : undefined
          }
        />
      )}
    </motion.div>
  );
};

const FiltersModal: React.FC<{
  filters: FilterState;
  typeOptions: string[];
  branchOptions: string[];
  userOptions: string[];
  currencyOptions: string[];
  onApply: (filters: FilterState) => void;
  onClose: () => void;
}> = ({ filters, typeOptions, branchOptions, userOptions, currencyOptions, onApply, onClose }) => {
  const [local, setLocal] = useState<FilterState>({ ...filters });
  void userOptions;
  void currencyOptions;

  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const hasActive = Object.entries(local).some(([, value]) => {
    if (typeof value === "boolean") return value;
    return value !== "";
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative w-full max-w-3xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/15 border border-red-500/25 flex items-center justify-center text-red-400">
              <Filter size={16} />
            </div>
            <div className="text-right">
              <h3 className="text-sm font-black text-white">فلاتر القيود</h3>
              <p className="text-[10px] text-slate-500 font-bold">ضبط معايير العرض</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">الحالة</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { val: "", label: "الكل" },
                  { val: "posted", label: "مرحّل" },
                  { val: "draft", label: "مسودة" },
                  { val: "cancelled", label: "ملغي" },
                ].map((option) => (
                  <button
                    key={option.val}
                    onClick={() => update("status", option.val)}
                    className={`py-2 rounded-xl text-[11px] font-black border transition-all ${local.status === option.val
                      ? option.val === "posted"
                        ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400"
                        : option.val === "draft"
                          ? "bg-amber-600/20 border-amber-500/40 text-amber-400"
                          : "bg-rose-600/20 border-rose-500/40 text-rose-400"
                      : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">نوع الحركة</label>
              <select
                value={local.type}
                onChange={(e) => update("type", e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
              >
                <option value="">الكل</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_META[type]?.label ?? type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">الفرع</label>
              <select
                value={local.branch}
                onChange={(e) => update("branch", e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
              >
                <option value="">الكل</option>
                {branchOptions.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">المرجع</label>
              <input
                value={local.reference}
                onChange={(e) => update("reference", e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
                placeholder="ابحث في المرجع..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">التاريخ من</label>
              <input
                type="date"
                value={local.dateFrom}
                onChange={(e) => update("dateFrom", e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">التاريخ إلى</label>
              <input
                type="date"
                value={local.dateTo}
                onChange={(e) => update("dateTo", e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">الحد الأدنى</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={local.minAmount}
                onChange={(e) => update("minAmount", e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 text-left"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">الحد الأعلى</label>
              <input
                type="number"
                min="0"
                placeholder="∞"
                value={local.maxAmount}
                onChange={(e) => update("maxAmount", e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 text-left"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "reversedOnly", label: "عكسي فقط" },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => update(option.key as keyof FilterState, !(local[option.key as keyof FilterState] as boolean) as never)}
                className={`py-2 rounded-xl text-[11px] font-black border transition-all ${local[option.key as keyof FilterState]
                  ? "bg-red-600/20 border-red-500/40 text-red-400"
                  : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {hasActive && (
            <div className="flex items-center gap-2 flex-wrap">
              {local.status && <FilterPill label={local.status === "posted" ? "مرحّل" : "مسودة"} onClear={() => update("status", "")} />}
              {local.type && <FilterPill label={TYPE_META[local.type]?.label ?? local.type} onClear={() => update("type", "")} />}
              {local.branch && <FilterPill label={local.branch} onClear={() => update("branch", "")} />}
              {local.reference && <FilterPill label={local.reference} onClear={() => update("reference", "")} />}
              {(local.dateFrom || local.dateTo) && (
                <FilterPill label={`${local.dateFrom || "..."} → ${local.dateTo || "..."}`} onClear={() => { update("dateFrom", ""); update("dateTo", ""); }} />
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/5 flex gap-3">
          <button
            onClick={() => {
              const reset = { ...DEFAULT_FILTERS };
              setLocal(reset);
              onApply(reset);
              onClose();
            }}
            className="px-4 py-2.5 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-xl font-black text-xs transition-all"
          >
            إعادة ضبط
          </button>
          <button
            onClick={() => {
              onApply(local);
              onClose();
            }}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-black text-xs hover:bg-red-700 shadow-lg shadow-red-900/20 active:scale-[0.98] transition-all"
          >
            تطبيق الفلاتر
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const FilterTag: React.FC<{ label: string; onClear: () => void }> = ({ label, onClear }) => (
  <span className="flex items-center gap-1 px-2.5 py-1 bg-red-600/10 border border-red-500/20 rounded-lg text-[10px] font-black text-red-400">
    {label}
    <button onClick={onClear}>
      <X size={9} />
    </button>
  </span>
);

const FilterPill: React.FC<{ label: string; onClear: () => void }> = ({ label, onClear }) => (
  <span className="flex items-center gap-1 px-2.5 py-1 bg-red-600/10 border border-red-500/20 rounded-lg text-[10px] font-black text-red-400">
    {label}
    <button onClick={onClear}>
      <X size={9} />
    </button>
  </span>
);

function accountMapping(transactions: Transaction[]) {
  return transactions.map((tx) => ({
    id: String(tx.id),
    raw: tx,
    date: tx.date,
    description: tx.description ?? tx.type_label,
    status: tx.status,
    reference: tx.reference ?? "",
    transactionNumber: tx.transaction_number,
    type: tx.type,
    typeLabel: tx.type_label,
    branchName: tx.branch?.name ?? undefined,
    userName: tx.user?.name ?? undefined,
    currency: (tx as any).currency ?? undefined,
    totalDebit: tx.total_debit,
    totalCredit: tx.total_credit,
    entriesCount: tx.entries_count,
    isBalanced: tx.is_balanced,
    approvedBy: (tx as any).approved_by?.name ?? (tx as any).approved_by ?? undefined,
    postedAt: tx.posted_at,
    createdAt: tx.created_at,
    notes: tx.notes,
    isReversal: Boolean((tx as any).is_reversal),
    isEditable: tx.is_editable !== false,
    lines: (tx.entries ?? []).map((entry) => ({
      id: entry.id,
      accountId: String(entry.account_id),
      accountName: entry.account?.name ?? null,
      accountCode: entry.account?.code ?? null,
      debit: entry.debit,
      credit: entry.credit,
      description: entry.description,
      costCenterName: entry.cost_center?.name ?? null,
      costCenterCode: entry.cost_center?.code ?? null,
      subledgerType: entry.subledger_type ?? null,
      subledgerId: entry.subledger_id ?? null,
      subledgerName: entry.subledger?.name ?? null,
    })),
  }));
}

export default JournalEntriesWorkspace;
