import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Download,
  Filter,
  Layers,
  List,
  Plus,
  RefreshCw,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

type JournalStatus = "DRAFT" | "POSTED" | "CANCELLED";

type JournalLine = {
  id?: string | number;
  accountId?: string;
  accountName?: string | null;
  accountCode?: string | null;
  description?: string;
  debit?: number;
  credit?: number;
  costCenterName?: string | null;
  subledgerType?: string | null;
  subledgerName?: string | null;
};

export interface JournalEntryViewModel {
  id: string;
  date: string;
  description: string;
  status: string;
  lines: JournalLine[];
  reference?: string;
  transactionNumber?: string;
  type?: string;
  typeLabel?: string;
  branchName?: string;
  userName?: string;
  currency?: string;
  totalDebit?: number;
  totalCredit?: number;
  entriesCount?: number;
  isBalanced?: boolean;
  approvedBy?: string;
  postedAt?: string;
  createdAt?: string;
  notes?: string;
  isReversal?: boolean;
}

interface FilterState {
  status: string;
  type: string;
  branch: string;
  user: string;
  currency: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
  postedOnly: boolean;
  unapprovedOnly: boolean;
  reversedOnly: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  status: "",
  type: "",
  branch: "",
  user: "",
  currency: "",
  dateFrom: "",
  dateTo: "",
  minAmount: "",
  maxAmount: "",
  postedOnly: false,
  unapprovedOnly: false,
  reversedOnly: false,
};

const STATUS_META: Record<JournalStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  DRAFT: { label: "مسودة", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock },
  POSTED: { label: "مرحّل", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
  CANCELLED: { label: "ملغي", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: AlertCircle },
};

const TYPE_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  sale: { label: "مبيعات", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: TrendingUp },
  purchase: { label: "مشتريات", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Building2 },
  salary: { label: "رواتب", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", icon: List },
  expense: { label: "مصروف", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: TrendingDown },
  receipt: { label: "سند قبض", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", icon: CheckCircle2 },
  payment: { label: "سند صرف", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: Target },
  journal: { label: "قيد عام", color: "text-slate-300", bg: "bg-white/5", border: "border-white/10", icon: List },
  opening: { label: "افتتاحي", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", icon: Layers },
  adjustment: { label: "تسوية", color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20", icon: Zap },
};

const fmt = (value: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value || 0);

const statusKey = (status: string): JournalStatus => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "POSTED" || normalized === "CANCELLED" || normalized === "DRAFT") return normalized;
  return "DRAFT";
};

const typeKey = (type?: string) => String(type || "journal").toLowerCase();

const money = (value: number) => `₪${fmt(value)}`;

const optionize = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

const FilterModal: React.FC<{
  filters: FilterState;
  typeOptions: string[];
  branchOptions: string[];
  userOptions: string[];
  currencyOptions: string[];
  onApply: (filters: FilterState) => void;
  onClose: () => void;
}> = ({ filters, typeOptions, branchOptions, userOptions, currencyOptions, onApply, onClose }) => {
  const [local, setLocal] = useState<FilterState>({ ...filters });
  const update = (key: keyof FilterState, value: string | boolean) =>
    setLocal(prev => ({ ...prev, [key]: value }));
  const hasActive = Object.values(local).some(value => (typeof value === "boolean" ? value : value !== ""));

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
        className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/15 border border-red-500/25 flex items-center justify-center text-red-400">
              <Filter size={16} />
            </div>
            <div className="text-right">
              <h3 className="text-sm font-black text-white">فلترة القيود</h3>
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
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">حالة القيد</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: "", label: "الكل" },
                  { val: "POSTED", label: "مرحّل" },
                  { val: "DRAFT", label: "مسودة" },
                  { val: "CANCELLED", label: "ملغي" },
                ].map(option => (
                  <button
                    key={option.val}
                    onClick={() => update("status", option.val)}
                    className={`py-2 rounded-xl text-[11px] font-black border transition-all ${
                      local.status === option.val
                        ? option.val === "POSTED"
                          ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400"
                          : option.val === "DRAFT"
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
                onChange={e => update("type", e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
              >
                <option value="">الكل</option>
                {typeOptions.map(type => (
                  <option key={type} value={type}>{TYPE_META[typeKey(type)]?.label ?? type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">الفرع</label>
              <select
                value={local.branch}
                onChange={e => update("branch", e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
              >
                <option value="">الكل</option>
                {branchOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">المستخدم</label>
              <select
                value={local.user}
                onChange={e => update("user", e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
              >
                <option value="">الكل</option>
                {userOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">العملة</label>
              <select
                value={local.currency}
                onChange={e => update("currency", e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
              >
                <option value="">الكل</option>
                {currencyOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">نطاق التاريخ</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={local.dateFrom}
                  onChange={e => update("dateFrom", e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
                />
                <input
                  type="date"
                  value={local.dateTo}
                  onChange={e => update("dateTo", e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">نطاق المبلغ (₪)</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-600 font-bold mb-1">الحد الأدنى</p>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={local.minAmount}
                  onChange={e => update("minAmount", e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 text-left"
                />
              </div>
              <div>
                <p className="text-[10px] text-slate-600 font-bold mb-1">الحد الأعلى</p>
                <input
                  type="number"
                  min="0"
                  placeholder="∞"
                  value={local.maxAmount}
                  onChange={e => update("maxAmount", e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 text-left"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "postedOnly", label: "مرحّل فقط" },
              { key: "unapprovedOnly", label: "غير معتمد" },
              { key: "reversedOnly", label: "عكسي فقط" },
            ].map(option => (
              <button
                key={option.key}
                onClick={() => update(option.key as keyof FilterState, !(local[option.key as keyof FilterState] as boolean))}
                className={`py-2 rounded-xl text-[11px] font-black border transition-all ${
                  local[option.key as keyof FilterState]
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
              {local.status && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-red-600/10 border border-red-500/20 rounded-lg text-[10px] font-black text-red-400">
                  {STATUS_META[statusKey(local.status)]?.label}
                  <button onClick={() => update("status", "")}><X size={9} /></button>
                </span>
              )}
              {local.type && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-slate-300">
                  {TYPE_META[typeKey(local.type)]?.label ?? local.type}
                  <button onClick={() => update("type", "")}><X size={9} /></button>
                </span>
              )}
              {(local.branch || local.user || local.currency) && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-violet-600/10 border border-violet-500/20 rounded-lg text-[10px] font-black text-violet-300">
                  {local.branch || "فرع"}
                  {local.user ? ` · ${local.user}` : ""}
                  {local.currency ? ` · ${local.currency}` : ""}
                  <button onClick={() => { update("branch", ""); update("user", ""); update("currency", ""); }}><X size={9} /></button>
                </span>
              )}
              {(local.dateFrom || local.dateTo) && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/10 border border-blue-500/20 rounded-lg text-[10px] font-black text-blue-400">
                  {local.dateFrom || "..."} → {local.dateTo || "..."}
                  <button onClick={() => { update("dateFrom", ""); update("dateTo", ""); }}><X size={9} /></button>
                </span>
              )}
              {(local.minAmount || local.maxAmount) && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-600/10 border border-amber-500/20 rounded-lg text-[10px] font-black text-amber-400">
                  {money(Number(local.minAmount || 0))} - {local.maxAmount ? money(Number(local.maxAmount)) : "∞"}
                  <button onClick={() => { update("minAmount", ""); update("maxAmount", ""); }}><X size={9} /></button>
                </span>
              )}
              {local.postedOnly && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600/10 border border-emerald-500/20 rounded-lg text-[10px] font-black text-emerald-400">
                  مرحّل فقط
                  <button onClick={() => update("postedOnly", false)}><X size={9} /></button>
                </span>
              )}
              {local.unapprovedOnly && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-orange-600/10 border border-orange-500/20 rounded-lg text-[10px] font-black text-orange-400">
                  غير معتمد
                  <button onClick={() => update("unapprovedOnly", false)}><X size={9} /></button>
                </span>
              )}
              {local.reversedOnly && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-rose-600/10 border border-rose-500/20 rounded-lg text-[10px] font-black text-rose-400">
                  عكسي فقط
                  <button onClick={() => update("reversedOnly", false)}><X size={9} /></button>
                </span>
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
            onClick={() => { onApply(local); onClose(); }}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-black text-xs hover:bg-red-700 shadow-lg shadow-red-900/20 active:scale-[0.98] transition-all"
          >
            تطبيق الفلتر
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface EnterpriseJournalViewProps {
  journalEntries: JournalEntryViewModel[];
  onAddJournal: () => void;
  onAddPaymentVoucher?: () => void;
  onViewEntry: (id: string) => void;
  onRefresh?: () => void;
}

export const EnterpriseJournalView: React.FC<EnterpriseJournalViewProps> = ({
  journalEntries,
  onAddJournal,
  onAddPaymentVoucher,
  onViewEntry,
  onRefresh,
}) => {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const ITEMS_PER_PAGE = 10;

  const typeOptions = useMemo(() => optionize(journalEntries.map(entry => entry.type || "")), [journalEntries]);
  const branchOptions = useMemo(() => optionize(journalEntries.map(entry => entry.branchName || "")), [journalEntries]);
  const userOptions = useMemo(() => optionize(journalEntries.map(entry => entry.userName || "")), [journalEntries]);
  const currencyOptions = useMemo(() => optionize(journalEntries.map(entry => entry.currency || "")), [journalEntries]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(value => (typeof value === "boolean" ? value : value !== "")).length,
    [filters],
  );

  const filtered = useMemo(() => {
    return journalEntries.filter(entry => {
      const q = search.trim().toLowerCase();
      if (q) {
        const searchable = [
          entry.id,
          entry.description,
          entry.reference,
          entry.transactionNumber,
          entry.typeLabel,
          entry.branchName,
          entry.userName,
          entry.currency,
          entry.date,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      const entryStatus = statusKey(entry.status);
      if (filters.status && entryStatus !== filters.status) return false;
      if (filters.type && typeKey(entry.type) !== typeKey(filters.type)) return false;
      if (filters.branch && entry.branchName !== filters.branch) return false;
      if (filters.user && entry.userName !== filters.user) return false;
      if (filters.currency && entry.currency !== filters.currency) return false;
      if (filters.postedOnly && entryStatus !== "POSTED") return false;
      if (filters.unapprovedOnly && entryStatus !== "DRAFT") return false;
      if (filters.reversedOnly && !entry.isReversal) return false;
      if (filters.dateFrom && entry.date < filters.dateFrom) return false;
      if (filters.dateTo && entry.date > filters.dateTo) return false;

      const totalDebit = entry.totalDebit ?? entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      if (filters.minAmount && totalDebit < Number(filters.minAmount)) return false;
      if (filters.maxAmount && totalDebit > Number(filters.maxAmount)) return false;

      return true;
    });
  }, [journalEntries, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visibleEntries = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const totalDebit = journalEntries.reduce((sum, entry) => sum + (entry.totalDebit ?? entry.lines.reduce((acc, line) => acc + (line.debit || 0), 0)), 0);
  const totalCredit = journalEntries.reduce((sum, entry) => sum + (entry.totalCredit ?? entry.lines.reduce((acc, line) => acc + (line.credit || 0), 0)), 0);
  const posted = journalEntries.filter(entry => statusKey(entry.status) === "POSTED").length;
  const draft = journalEntries.filter(entry => statusKey(entry.status) === "DRAFT").length;
  const cancelled = journalEntries.filter(entry => statusKey(entry.status) === "CANCELLED").length;
  const todayEntries = journalEntries.filter(entry => entry.date === today).length;
  const needApproval = draft;
  const paginationItems = useMemo<Array<number | "...">>(() => {
    const numbers = Array.from({ length: totalPages }, (_, idx) => idx + 1).filter(
      item => totalPages <= 7 || item === 1 || item === totalPages || Math.abs(item - safePage) <= 1,
    );

    const result: Array<number | "..."> = [];
    numbers.forEach((item, idx) => {
      const previous = numbers[idx - 1];
      if (idx > 0 && previous !== undefined && item - previous > 1) {
        result.push("...");
      }
      result.push(item);
    });

    return result;
  }, [safePage, totalPages]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleApplyFilters = (nextFilters: FilterState) => {
    setFilters(nextFilters);
    setPage(1);
  };

  const printPage = () => window.print();
  const refresh = () => onRefresh?.();

  return (
    <motion.div
      key="journal"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="h-full overflow-y-auto custom-scrollbar pb-10 space-y-5"
      dir="rtl"
    >
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
        {[
          { label: "إجمالي المدين", value: money(totalDebit), color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: TrendingUp },
          { label: "إجمالي الدائن", value: money(totalCredit), color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: TrendingDown },
          { label: "إجمالي القيود", value: `${journalEntries.length}`, color: "text-white", bg: "bg-white/5", border: "border-white/10", icon: List },
          { label: "مرحلة", value: `${posted} قيد`, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
          { label: "مسودة", value: `${draft} قيد`, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock },
          { label: "ملغاة", value: `${cancelled} قيد`, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: AlertCircle },
          { label: "قيود اليوم", value: `${todayEntries} قيد`, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Target },
        ].map(card => (
          <div key={card.label} className={`bg-slate-900/60 border ${card.border} rounded-2xl p-4 flex items-center justify-between`}>
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{card.label}</p>
              <p className={`text-lg font-black font-mono ${card.color}`}>{card.value}</p>
            </div>
            <div className={`w-9 h-9 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center ${card.color}`}>
              <card.icon size={16} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white">قيود اليومية العامة</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {filtered.length} قيد
              {activeFilterCount > 0 && <span className="mr-1 text-red-400">(مفلتر من {journalEntries.length})</span>}
              <span className="mr-1 text-violet-400">(بحاجة لاعتماد: {needApproval})</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="بحث في رقم القيد، المرجع، الوصف..."
                className="bg-slate-950 border border-white/5 rounded-xl py-2 pr-9 pl-4 text-xs text-white outline-none focus:border-red-500/50 w-72"
              />
            </div>

            <button
              onClick={() => setShowFilters(true)}
              className={`relative p-2 rounded-xl border transition-all ${
                activeFilterCount > 0
                  ? "bg-red-600/20 border-red-500/40 text-red-400"
                  : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
              title="فلترة"
            >
              <Filter size={14} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -left-1 w-4 h-4 bg-red-600 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={() => handleApplyFilters({ ...DEFAULT_FILTERS })}
                className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-red-400 transition-all"
                title="مسح الفلاتر"
              >
                <X size={14} />
              </button>
            )}

            <button
              onClick={printPage}
              className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
              title="طباعة / PDF"
            >
              <Download size={14} />
            </button>

            <button
              onClick={refresh}
              disabled={!onRefresh}
              className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="تحديث"
            >
              <RefreshCw size={14} />
            </button>

            <button
              onClick={onAddJournal}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-all shadow-lg shadow-red-900/20"
            >
              <Plus size={14} /> قيد جديد
            </button>

            {onAddPaymentVoucher && (
              <button
                onClick={onAddPaymentVoucher}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-black hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-900/20"
              >
                <Plus size={14} /> سند صرف
              </button>
            )}
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">الفلاتر الفعالة:</span>
            {filters.status && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-red-600/10 border border-red-500/20 rounded-lg text-[10px] font-black text-red-400">
                {STATUS_META[statusKey(filters.status)]?.label ?? filters.status}
                <button onClick={() => handleApplyFilters({ ...filters, status: "" })} className="mr-0.5 hover:text-white"><X size={9} /></button>
              </span>
            )}
            {filters.type && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-slate-300">
                {TYPE_META[typeKey(filters.type)]?.label ?? filters.type}
                <button onClick={() => handleApplyFilters({ ...filters, type: "" })} className="mr-0.5 hover:text-white"><X size={9} /></button>
              </span>
            )}
            {(filters.branch || filters.user || filters.currency) && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-violet-600/10 border border-violet-500/20 rounded-lg text-[10px] font-black text-violet-300">
                {filters.branch || "فرع"}
                {filters.user ? ` · ${filters.user}` : ""}
                {filters.currency ? ` · ${filters.currency}` : ""}
                <button onClick={() => handleApplyFilters({ ...filters, branch: "", user: "", currency: "" })} className="mr-0.5 hover:text-white"><X size={9} /></button>
              </span>
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/10 border border-blue-500/20 rounded-lg text-[10px] font-black text-blue-400">
                {filters.dateFrom || "..."} → {filters.dateTo || "..."}
                <button onClick={() => handleApplyFilters({ ...filters, dateFrom: "", dateTo: "" })} className="mr-0.5 hover:text-white"><X size={9} /></button>
              </span>
            )}
            {(filters.minAmount || filters.maxAmount) && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-600/10 border border-amber-500/20 rounded-lg text-[10px] font-black text-amber-400">
                {money(Number(filters.minAmount || 0))} - {filters.maxAmount ? money(Number(filters.maxAmount)) : "∞"}
                <button onClick={() => handleApplyFilters({ ...filters, minAmount: "", maxAmount: "" })} className="mr-0.5 hover:text-white"><X size={9} /></button>
              </span>
            )}
            {filters.postedOnly && <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600/10 border border-emerald-500/20 rounded-lg text-[10px] font-black text-emerald-400">مرحّل فقط<button onClick={() => handleApplyFilters({ ...filters, postedOnly: false })} className="mr-0.5 hover:text-white"><X size={9} /></button></span>}
            {filters.unapprovedOnly && <span className="flex items-center gap-1 px-2.5 py-1 bg-orange-600/10 border border-orange-500/20 rounded-lg text-[10px] font-black text-orange-400">غير معتمد<button onClick={() => handleApplyFilters({ ...filters, unapprovedOnly: false })} className="mr-0.5 hover:text-white"><X size={9} /></button></span>}
            {filters.reversedOnly && <span className="flex items-center gap-1 px-2.5 py-1 bg-rose-600/10 border border-rose-500/20 rounded-lg text-[10px] font-black text-rose-400">عكسي فقط<button onClick={() => handleApplyFilters({ ...filters, reversedOnly: false })} className="mr-0.5 hover:text-white"><X size={9} /></button></span>}
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
                <th className="px-4 py-3">اعتماد</th>
                <th className="px-4 py-3">ترحيل</th>
                <th className="px-4 py-3">المستخدم</th>
                <th className="px-4 py-3">إجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {visibleEntries.map((entry, index) => {
                const entryStatus = statusKey(entry.status);
                const statusMeta = STATUS_META[entryStatus];
                const entryType = typeKey(entry.type);
                const typeMeta = TYPE_META[entryType] ?? TYPE_META.journal;
                const transactionNumber = entry.transactionNumber || entry.reference || entry.id;
                const totalDebit = entry.totalDebit ?? entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
                const totalCredit = entry.totalCredit ?? entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
                const isExpanded = expandedId === entry.id;

                return (
                  <React.Fragment key={entry.id}>
                    <tr
                      onClick={() => setExpandedId(prev => (prev === entry.id ? null : entry.id))}
                      className={`cursor-pointer transition-colors ${isExpanded ? "bg-red-500/5" : "hover:bg-white/[0.03]"}`}
                    >
                      <td className="px-4 py-4 text-slate-500 font-mono tabular-nums">{index + 1}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-black ${statusMeta.color} ${statusMeta.bg} ${statusMeta.border}`}>
                          <statusMeta.icon size={10} />
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-black text-white font-mono tabular-nums">{transactionNumber}</td>
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
                            {entry.entriesCount != null && <span>{entry.entriesCount} سطر</span>}
                            {entry.isBalanced === false && <span className="text-amber-400">غير متوازن</span>}
                            {entry.isReversal && <span className="text-rose-400">عكسي</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-300 text-xs">{entry.branchName || "—"}</td>
                      <td className="px-4 py-4 text-slate-300 text-xs font-mono">{entry.currency || "—"}</td>
                      <td className="px-4 py-4 font-black text-emerald-400 font-mono tabular-nums">{money(totalDebit)}</td>
                      <td className="px-4 py-4 font-black text-rose-400 font-mono tabular-nums">{money(totalCredit)}</td>
                      <td className="px-4 py-4 text-slate-300 text-xs">{entry.approvedBy || "—"}</td>
                      <td className="px-4 py-4 text-slate-300 text-xs font-mono">{entry.postedAt || "—"}</td>
                      <td className="px-4 py-4 text-slate-300 text-xs">{entry.userName || "—"}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onViewEntry(entry.id);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-slate-300 text-[10px] font-black hover:bg-white/10 hover:text-white transition-all"
                          >
                            عرض
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setExpandedId(prev => (prev === entry.id ? null : entry.id));
                            }}
                            className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                            title={isExpanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                          >
                            <ChevronLeft size={14} className={`transition-transform ${isExpanded ? "rotate-90" : "rotate-0"}`} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-950/80">
                        <td colSpan={15} className="px-4 pb-5 pt-0">
                          <div className="mt-3 rounded-3xl border border-white/5 bg-slate-900/80 p-5 shadow-2xl">
                            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-4">
                              <div>
                                <h4 className="text-sm font-black text-white">تفاصيل القيد {transactionNumber}</h4>
                                <p className="text-[11px] text-slate-500 mt-1">
                                  {entry.description || "-"} {entry.notes ? `· ${entry.notes}` : ""}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-black ${statusMeta.color} ${statusMeta.bg} ${statusMeta.border}`}>
                                  <statusMeta.icon size={10} />
                                  {statusMeta.label}
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-black ${typeMeta.color} ${typeMeta.bg} ${typeMeta.border}`}>
                                  <typeMeta.icon size={10} />
                                  {typeMeta.label}
                                </span>
                                {entry.isBalanced !== false ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px] font-black">
                                    <CheckCircle2 size={10} />
                                    متوازن
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 text-[10px] font-black">
                                    <AlertCircle size={10} />
                                    يحتاج مراجعة
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                              {[
                                { label: "المرجع", value: entry.reference || "—" },
                                { label: "الفرع", value: entry.branchName || "—" },
                                { label: "العملة", value: entry.currency || "—" },
                                { label: "عدد السطور", value: entry.entriesCount ?? entry.lines.length },
                              ].map(item => (
                                <div key={item.label} className="rounded-2xl border border-white/5 bg-white/5 p-3">
                                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">{item.label}</p>
                                  <p className="text-xs font-black text-white">{item.value}</p>
                                </div>
                              ))}
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-white/5">
                              <table className="min-w-full text-xs">
                                <thead className="bg-white/5">
                                  <tr className="text-right text-[10px] uppercase tracking-[0.18em] text-slate-500 font-black">
                                    <th className="px-4 py-3">الحساب</th>
                                    <th className="px-4 py-3">الوصف</th>
                                    <th className="px-4 py-3">مركز التكلفة</th>
                                    <th className="px-4 py-3">Subledger</th>
                                    <th className="px-4 py-3 text-left">مدين</th>
                                    <th className="px-4 py-3 text-left">دائن</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {entry.lines.map((line, lineIndex) => (
                                    <tr key={line.id ?? lineIndex} className="hover:bg-white/[0.02]">
                                      <td className="px-4 py-3">
                                        <div className="font-bold text-white">
                                          {line.accountCode ? `${line.accountCode} - ` : ""}
                                          {line.accountName || "—"}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-slate-400">{line.description || "—"}</td>
                                      <td className="px-4 py-3 text-slate-300">{line.costCenterName || "—"}</td>
                                      <td className="px-4 py-3 text-slate-300">
                                        {line.subledgerName || line.subledgerType || "—"}
                                      </td>
                                      <td className="px-4 py-3 text-left font-mono font-black text-emerald-400 tabular-nums">
                                        {line.debit && line.debit > 0 ? money(line.debit) : "—"}
                                      </td>
                                      <td className="px-4 py-3 text-left font-mono font-black text-rose-400 tabular-nums">
                                        {line.credit && line.credit > 0 ? money(line.credit) : "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-white/5">
                                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <td colSpan={4} className="px-4 py-3">الإجمالي</td>
                                    <td className="px-4 py-3 text-left font-mono text-emerald-400">{money(totalDebit)}</td>
                                    <td className="px-4 py-3 text-left font-mono text-rose-400">{money(totalCredit)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-bold">
              عرض {Math.min((safePage - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} من {filtered.length} قيد
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={safePage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={14} className="rotate-180" />
              </button>
              {paginationItems.map((item, idx) =>
                  item === "..."
                    ? <span key={`dots-${idx}`} className="w-8 text-center text-slate-600 text-xs font-black">…</span>
                    : (
                      <button
                        key={item}
                        onClick={() => setPage(item)}
                        className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black border transition-all ${
                          safePage === item
                            ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/20"
                            : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {item}
                      </button>
                    ),
                )}

              <button
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={safePage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-bold">صفحة {safePage} من {totalPages}</span>
            </div>
          </div>
        )}

        {totalPages <= 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-bold">{filtered.length} من {journalEntries.length} قيد</span>
            <button onClick={printPage} className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white font-black transition-colors">
              <Download size={12} /> تصدير PDF
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showFilters && (
          <FilterModal
            filters={filters}
            typeOptions={typeOptions}
            branchOptions={branchOptions}
            userOptions={userOptions}
            currencyOptions={currencyOptions}
            onApply={handleApplyFilters}
            onClose={() => setShowFilters(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
