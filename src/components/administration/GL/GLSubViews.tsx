import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Eye, ChevronRight, Layers, Activity,
  Zap, Target, Search, Download, Filter,
  CheckCircle2, Clock, AlertCircle, X,
  ChevronLeft, Settings, Building2,
  TrendingUp, TrendingDown, BarChart3, Info,
  Tag, ToggleLeft, ToggleRight,
  List, LayoutGrid,
} from "lucide-react";

// ─────────────────────────────────────────────
// JournalView
// ─────────────────────────────────────────────

interface JournalEntry {
  id: string;
  date: string;
  description: string;
  status: string;
  lines: any[];
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

interface JournalViewProps {
  journalEntries: JournalEntry[];
  onAddJournal: () => void;
  onAddPaymentVoucher?: () => void;
  onRefresh?: () => void;
}

// ─── Filter Modal ────────────────────────────────────────────────────────────

interface FilterState {
  status: string;        // '' | 'POSTED' | 'DRAFT' | 'CANCELLED'
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
  status: '',
  type: '',
  branch: '',
  user: '',
  currency: '',
  dateFrom: '',
  dateTo: '',
  minAmount: '',
  maxAmount: '',
  postedOnly: false,
  unapprovedOnly: false,
  reversedOnly: false,
};

const FilterModal: React.FC<{
  filters: FilterState;
  onApply: (f: FilterState) => void;
  onClose: () => void;
}> = ({ filters, onApply, onClose }) => {
  const [local, setLocal] = useState<FilterState>({ ...filters });

  const set = (k: keyof FilterState, v: string) =>
    setLocal(prev => ({ ...prev, [k]: v }));

  const hasActive = Object.values(local).some(v => v !== '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
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

        {/* Body */}
        <div className="p-6 space-y-5">

          {/* Status */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              حالة القيد
            </label>
            <div className="flex gap-2">
              {[
                { val: '', label: 'الكل' },
                { val: 'POSTED', label: 'مُرحَّل' },
                { val: 'DRAFT', label: 'مسودة' },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => set('status', opt.val)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${local.status === opt.val
                    ? opt.val === 'POSTED'
                      ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                      : opt.val === 'DRAFT'
                        ? 'bg-amber-600/20 border-amber-500/40 text-amber-400'
                        : 'bg-red-600/20 border-red-500/40 text-red-400'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              نطاق التاريخ
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-600 font-bold mb-1">من</p>
                <input
                  type="date"
                  value={local.dateFrom}
                  onChange={e => set('dateFrom', e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
                />
              </div>
              <div>
                <p className="text-[10px] text-slate-600 font-bold mb-1">إلى</p>
                <input
                  type="date"
                  value={local.dateTo}
                  onChange={e => set('dateTo', e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
                />
              </div>
            </div>
          </div>

          {/* Amount Range */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              نطاق المبلغ (₪)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-600 font-bold mb-1">الحد الأدنى</p>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={local.minAmount}
                  onChange={e => set('minAmount', e.target.value)}
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
                  onChange={e => set('maxAmount', e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 text-left"
                />
              </div>
            </div>
          </div>

          {/* Active filters badge */}
          {hasActive && (
            <div className="flex items-center gap-2 flex-wrap">
              {local.status && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-red-600/10 border border-red-500/20 rounded-lg text-[10px] font-black text-red-400">
                  {local.status === 'POSTED' ? 'مُرحَّل' : 'مسودة'}
                  <button onClick={() => set('status', '')}><X size={9} /></button>
                </span>
              )}
              {(local.dateFrom || local.dateTo) && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/10 border border-blue-500/20 rounded-lg text-[10px] font-black text-blue-400">
                  {local.dateFrom || '...'} → {local.dateTo || '...'}
                  <button onClick={() => { set('dateFrom', ''); set('dateTo', ''); }}><X size={9} /></button>
                </span>
              )}
              {(local.minAmount || local.maxAmount) && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-600/10 border border-amber-500/20 rounded-lg text-[10px] font-black text-amber-400">
                  ₪{local.minAmount || '0'} – ₪{local.maxAmount || '∞'}
                  <button onClick={() => { set('minAmount', ''); set('maxAmount', ''); }}><X size={9} /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
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

// ─── Today helper ─────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;

// ─── JournalView ─────────────────────────────────────────────────────────────

export const JournalView: React.FC<JournalViewProps> = ({
  journalEntries,
  onAddJournal,
  onAddPaymentVoucher,
}) => {
  const [search, setSearch] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });
  const [page, setPage] = useState(1);

  // ── active filter count ───────────────────────────────────────────────────
  const activeFilterCount = useMemo(() =>
    Object.values(filters).filter(v => v !== '').length,
    [filters]
  );

  // ── apply all filters + search ────────────────────────────────────────────
  const filtered = useMemo(() => {
    return journalEntries.filter(je => {
      // text search
      if (search) {
        const q = search.toLowerCase();
        if (
          !je.description.toLowerCase().includes(q) &&
          !je.id.toLowerCase().includes(q) &&
          !je.date.includes(q)
        ) return false;
      }

      // status
      if (filters.status) {
        const jeStatus = je.status === 'POSTED' ? 'POSTED' : 'DRAFT';
        if (jeStatus !== filters.status) return false;
      }

      // date from
      if (filters.dateFrom && je.date < filters.dateFrom) return false;

      // date to
      if (filters.dateTo && je.date > filters.dateTo) return false;

      // amount
      const debit = je.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
      if (filters.minAmount && debit < parseFloat(filters.minAmount)) return false;
      if (filters.maxAmount && debit > parseFloat(filters.maxAmount)) return false;

      return true;
    });
  }, [journalEntries, search, filters]);

  // ── pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const visibleEntries = paginated;

  // reset to page 1 when filters/search change
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleApplyFilters = (f: FilterState) => { setFilters(f); setPage(1); };

  // ── summary stats (full list, not filtered) ───────────────────────────────
  const totalDebit = journalEntries.flatMap(je => je.lines).reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = journalEntries.flatMap(je => je.lines).reduce((s, l) => s + (l.credit || 0), 0);
  const posted = journalEntries.filter(je => je.status === 'POSTED').length;
  const draft = journalEntries.filter(je => je.status !== 'POSTED').length;

  return (
    <motion.div
      key="journal"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="h-full overflow-y-auto custom-scrollbar pb-10 space-y-5"
      dir="rtl"
    >
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي المدين', value: `₪${totalDebit.toLocaleString()}`, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
          { label: 'إجمالي الدائن', value: `₪${totalCredit.toLocaleString()}`, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: CheckCircle2 },
          { label: 'قيود مُرحَّلة', value: `${posted} قيد`, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: CheckCircle2 },
          { label: 'قيود مسودة', value: `${draft} قيد`, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock },
        ].map((k, i) => (
          <div key={i} className={`bg-slate-900/60 border ${k.border} rounded-2xl p-4 flex items-center justify-between`}>
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{k.label}</p>
              <p className={`text-lg font-black font-mono ${k.color}`}>{k.value}</p>
            </div>
            <div className={`w-9 h-9 rounded-xl ${k.bg} border ${k.border} flex items-center justify-center ${k.color}`}>
              <k.icon size={16} />
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden">

        {/* Toolbar */}
        <div className="p-5 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white">قيود اليومية العامة</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {filtered.length} قيد
              {activeFilterCount > 0 && (
                <span className="mr-1 text-red-400">(مفلتر من {journalEntries.length})</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="بحث في القيود..."
                className="bg-slate-950 border border-white/5 rounded-xl py-2 pr-9 pl-4 text-xs text-white outline-none focus:border-red-500/50 w-56"
              />
            </div>

            {/* Filter button */}
            <button
              onClick={() => setShowFilterModal(true)}
              className={`relative p-2 rounded-xl border transition-all ${activeFilterCount > 0
                ? 'bg-red-600/20 border-red-500/40 text-red-400'
                : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
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

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => handleApplyFilters({ ...DEFAULT_FILTERS })}
                className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-red-400 transition-all"
                title="مسح الفلاتر"
              >
                <X size={14} />
              </button>
            )}

            <button className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all">
              <Download size={14} />
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

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">الفلاتر الفعالة:</span>
            {filters.status && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-red-600/10 border border-red-500/20 rounded-lg text-[10px] font-black text-red-400">
                {filters.status === 'POSTED' ? 'مُرحَّل' : 'مسودة'}
                <button onClick={() => handleApplyFilters({ ...filters, status: '' })} className="mr-0.5 hover:text-white"><X size={9} /></button>
              </span>
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/10 border border-blue-500/20 rounded-lg text-[10px] font-black text-blue-400">
                {filters.dateFrom || '...'} ← {filters.dateTo || '...'}
                <button onClick={() => handleApplyFilters({ ...filters, dateFrom: '', dateTo: '' })} className="mr-0.5 hover:text-white"><X size={9} /></button>
              </span>
            )}
            {(filters.minAmount || filters.maxAmount) && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-600/10 border border-amber-500/20 rounded-lg text-[10px] font-black text-amber-400">
                ₪{filters.minAmount || '0'} – ₪{filters.maxAmount || '∞'}
                <button onClick={() => handleApplyFilters({ ...filters, minAmount: '', maxAmount: '' })} className="mr-0.5 hover:text-white"><X size={9} /></button>
              </span>
            )}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-100">
              <tr className="text-right">
                <th className="px-4 py-3 font-semibold">#</th>

                <th className="px-4 py-3 font-semibold">
                  رقم القيد
                </th>

                <th className="px-4 py-3 font-semibold">
                  التاريخ
                </th>

                <th className="px-4 py-3 font-semibold">
                  الوصف
                </th>

                <th className="px-4 py-3 font-semibold">
                  الحسابات
                </th>

                <th className="px-4 py-3 font-semibold">
                  مدين
                </th>

                <th className="px-4 py-3 font-semibold">
                  دائن
                </th>

                <th className="px-4 py-3 font-semibold">
                  الحالة
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleEntries.map((trx: any, index: number) => {
                const transactionNumber = trx.transaction_number ?? trx.reference ?? trx.id;
                const normalizedStatus = String(trx.status ?? "").toUpperCase();
        const statusLabel = trx.status_label ?? (normalizedStatus === "POSTED" ? "مرحلة" : "مسودة");
                const lineTotals = (trx.lines ?? []).reduce(
                  (totals: { debit: number; credit: number }, line: any) => ({
                    debit: totals.debit + (line.debit || 0),
                    credit: totals.credit + (line.credit || 0),
                  }),
                  { debit: 0, credit: 0 },
                );
                const totalDebit = trx.total_debit ?? lineTotals.debit;
                const totalCredit = trx.total_credit ?? lineTotals.credit;

                return (
                <tr
                  key={trx.id}
                  className="border-t hover:bg-zinc-50"
                >
                  <td className="px-4 py-4">
                    {index + 1}
                  </td>

                  <td className="px-4 py-4 font-semibold">
                    {transactionNumber}
                  </td>

                  <td className="px-4 py-4">
                    {trx.date}
                  </td>

                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {trx.description || "-"}
                      </div>

                      {trx.reference && (
                        <div className="text-xs text-zinc-500">
                          Ref: {trx.reference}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      {(trx.lines ?? trx.entries ?? []).map((entry: any) => (
                        <div
                          key={entry.id}
                          className="rounded-lg border border-zinc-200 p-2"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                {entry.account?.code} -{" "}
                                {entry.account?.name}
                              </div>

                              {entry.subledger && (
                                <div className="mt-1 text-xs text-blue-600">
                                  {entry.subledger.type} :
                                  {" "}
                                  {entry.subledger.name}
                                </div>
                              )}

                              {entry.cost_center && (
                                <div className="text-xs text-zinc-500">
                                  مركز تكلفة:
                                  {" "}
                                  {entry.cost_center.name}
                                </div>
                              )}
                            </div>

                            <div className="text-left text-xs">
                              {entry.debit > 0 && (
                                <div className="text-emerald-600">
                                  Dr: {entry.debit}
                                </div>
                              )}

                              {entry.credit > 0 && (
                                <div className="text-red-600">
                                  Cr: {entry.credit}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="px-4 py-4 font-semibold text-emerald-600">
                    {totalDebit}
                  </td>

                  <td className="px-4 py-4 font-semibold text-red-600">
                    {totalCredit}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${normalizedStatus === "POSTED"
                        ? "bg-emerald-100 text-emerald-700"
                        : normalizedStatus === "DRAFT"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                        }`}
                    >
                      {statusLabel}
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-bold">
              عرض {Math.min((safePage - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} من {filtered.length} قيد
            </span>

            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={14} />
              </button>

              {/* Page buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => {
                  if (totalPages <= 7) return true;
                  return p === 1 || p === totalPages || Math.abs(p - safePage) <= 1;
                })
                .reduce<(number | '...')[]>((acc, p, i, arr) => {
                  if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) {
                    acc.push('...');
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...'
                    ? <span key={`dots-${i}`} className="w-8 text-center text-slate-600 text-xs font-black">…</span>
                    : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black border transition-all ${safePage === p
                          ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/20'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                          }`}
                      >
                        {p}
                      </button>
                    )
                )
              }

              {/* Next */}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-bold">صفحة {safePage} من {totalPages}</span>
              <button className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white font-black transition-colors">
                <Download size={12} /> PDF
              </button>
            </div>
          </div>
        )}

        {/* Footer when single page */}
        {totalPages <= 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-bold">{filtered.length} من {journalEntries.length} قيد</span>
            <button className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white font-black transition-colors">
              <Download size={12} /> تصدير PDF
            </button>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      <AnimatePresence>
        {showFilterModal && (
          <FilterModal
            filters={filters}
            onApply={handleApplyFilters}
            onClose={() => setShowFilterModal(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
// FiscalYearsView — Self-contained with API
// ─────────────────────────────────────────────

import { useEffect } from "react";
import { fiscalYearService } from "../../../services/fiscalYearService";
import { toast } from "../../shared/Toast";
import type { FiscalYearFromApi } from "../../../services/fiscalYearService";

const FY_STATUS_CONFIG = {
  active: { label: "مفتوحة", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
  closed: { label: "مغلقة", color: "text-slate-500", bg: "bg-white/5", border: "border-white/10", icon: AlertCircle },
};

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === undefined) return "0";
  return amount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const FiscalYearsView: React.FC = () => {
  const navigate = useNavigate();
  const [fiscalYears, setFiscalYears] = useState<FiscalYearFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState<FiscalYearFromApi | null>(null);
  const [closingId, setClosingId] = useState<number | null>(null);

  const fetchFiscalYears = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fiscalYearService.getAll();
      setFiscalYears(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "فشل جلب السنوات المالية";
      setError(msg);
      toast.error("خطأ", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiscalYears();
  }, []);

  const handleClose = async (fy: FiscalYearFromApi) => {
    try {
      setClosingId(fy.id);
      await fiscalYearService.close(fy.id);
      toast.success("تم الإغلاق", `تم إغلاق "${fy.name}" بنجاح`);
      await fetchFiscalYears();
      setShowCloseConfirm(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "فشل الإغلاق";
      toast.error("خطأ", msg);
    } finally {
      setClosingId(null);
    }
  };

  const handleCreate = async (data: { name: string; start_date: string; end_date: string }) => {
    await fiscalYearService.create(data);
    toast.success("تم الإنشاء", `تم إنشاء "${data.name}" بنجاح`);
    await fetchFiscalYears();
    setShowCreateModal(false);
  };

  const openCount = fiscalYears.filter((f) => f.status === "active").length;
  const closedCount = fiscalYears.filter((f) => f.status === "closed").length;

  return (
    <motion.div
      key="years"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="h-full overflow-y-auto custom-scrollbar pb-10 space-y-5"
      dir="rtl"
    >
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'السنوات الإجمالية', value: fiscalYears.length, color: 'text-white', bg: 'bg-white/5', border: 'border-white/10' },
          { label: 'مفتوحة / جارية', value: openCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'مغلقة / مؤرشفة', value: closedCount, color: 'text-slate-400', bg: 'bg-white/5', border: 'border-white/10' },
        ].map((k, i) => (
          <div key={i} className={`bg-slate-900/60 border ${k.border} rounded-2xl p-5 text-right`}>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{k.label}</p>
            <p className={`text-2xl font-black font-mono ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-white">السنوات المالية</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">إدارة الفترات المحاسبية والإقفالات</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-all"
          >
            <Plus size={14} /> سنة مالية جديدة
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500 font-black">جاري التحميل...</div>
        ) : error ? (
          <div className="py-20 text-center text-rose-400 font-black">{error}</div>
        ) : (
          <div className="divide-y divide-white/5">
            {fiscalYears.map((fy, i) => {
              const start = new Date(fy.start_date);
              const end = new Date(fy.end_date);
              const nowDate = new Date();
              const total = end.getTime() - start.getTime();
              const elapsed = Math.min(nowDate.getTime() - start.getTime(), total);
              const progress = fy.status === 'active' ? Math.max(0, Math.min((elapsed / total) * 100, 100)) : 100;
              const cfg = FY_STATUS_CONFIG[fy.status];
              const StatusIcon = cfg.icon;

              return (
                <motion.div key={fy.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.07 }}
                  className="p-5 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${fy.status === 'active' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-white/5 border border-white/10 text-slate-500'}`}>
                        <StatusIcon size={18} />
                      </div>
                      <div className="text-right">
                        <h4 className="text-sm font-black text-white">{fy.name}</h4>
                        <p className="text-[11px] font-mono text-slate-500">{fy.start_date} — {fy.end_date}</p>
                        {fy.creator && (
                          <p className="text-[10px] text-slate-600 mt-0.5">أنشأه: {fy.creator.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <p className="text-[10px] text-slate-500">{fy.shifts_count} وردية</p>
                        <p className="text-[10px] text-emerald-400/70 font-mono">{formatCurrency(fy.shifts_total_sales_sum)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-xl border text-[10px] font-black ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                      <button
                        onClick={() => navigate(`/admin/fiscal-years/${fy.id}`)}
                        className="px-3 py-1 bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[10px] font-black rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1"
                      >
                        <Eye size={12} />
                        استعراض
                      </button>
                      {fy.status === 'active' && (
                        <button
                          onClick={() => setShowCloseConfirm(fy)}
                          className="px-3 py-1 bg-rose-600/10 border border-rose-500/20 text-rose-400 text-[10px] font-black rounded-xl hover:bg-rose-600 hover:text-white transition-all"
                        >
                          إقفال السنة
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${fy.status === 'active' ? 'bg-emerald-500' : 'bg-slate-600'}`}
                    />
                  </div>
                  <p className="text-[10px] text-slate-600 font-bold mt-1.5">
                    {fy.status === 'active' ? `${progress.toFixed(0)}% من السنة منقضي` : 'السنة مغلقة ومؤرشفة'}
                  </p>
                </motion.div>
              );
            })}
            {fiscalYears.length === 0 && (
              <div className="py-20 text-center text-slate-600 font-black italic">لا توجد سنوات مالية مسجلة</div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <FYCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Close Confirm Modal */}
      {showCloseConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowCloseConfirm(null)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
              <AlertCircle size={22} className="text-rose-400" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">إقفال السنة المالية</h3>
            <p className="text-sm text-slate-400 mb-1">
              هل أنت متأكد من إقفال <strong className="text-white">{showCloseConfirm.name}</strong>؟
            </p>
            <p className="text-xs text-rose-400 mb-6">لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowCloseConfirm(null)}
                disabled={closingId === showCloseConfirm.id}
                className="px-4 py-2 text-sm font-black text-slate-400 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleClose(showCloseConfirm)}
                disabled={closingId === showCloseConfirm.id}
                className="px-4 py-2 text-sm font-black text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-all flex items-center gap-2"
              >
                {closingId === showCloseConfirm.id && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                نعم، إقفال
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ── Create Modal (inside GL dark theme) ──

const FYCreateModal = ({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: { name: string; start_date: string; end_date: string }) => Promise<void>;
}) => {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;
    setLoading(true);
    setError(null);
    try {
      await onCreate({ name, start_date: startDate, end_date: endDate });
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل الإنشاء");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-base font-black text-white">سنة مالية جديدة</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-400">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-bold">
              {error}
            </div>
          )}
          <div>
            <label className="block text-[11px] text-slate-500 font-black uppercase tracking-widest mb-1.5">الاسم</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: 2026"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-red-500/50"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-slate-500 font-black uppercase tracking-widest mb-1.5">من تاريخ</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/50"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-black uppercase tracking-widest mb-1.5">إلى تاريخ</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/50"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-black text-slate-400 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || !name || !startDate || !endDate}
              className="px-4 py-2 text-sm font-black text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-40 transition-all flex items-center gap-2"
            >
              {loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              إنشاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// CostCentersView — Enhanced Full Version
// ─────────────────────────────────────────────

interface CostCenter {
  id: string;
  nameAr: string;
  code: string;
  type?: string;
  type_label?: string;
  parentId?: string;
  is_active?: boolean;
  notes?: string;
  budget?: number | null;
}

interface CCTransaction {
  id: string | number;
  date: string;
  description?: string;
  type?: string;
  type_label?: string;
  total_debit?: number;
  total_credit?: number;
  entries?: Array<{
    cost_center_id?: number | string;
    account?: { name: string; code: string };
    debit?: number;
    credit?: number;
    description?: string;
  }>;
}

interface CostCentersViewProps {
  costCenters: CostCenter[];
  onAdd: () => void;
  transactions?: CCTransaction[];
  setCostCenterForm?: (data: any) => void;
  setModalType?: (type: string) => void;
  setIsModalOpen?: (v: boolean) => void;
}

// نوع حقيقي من الـ API — lowercase من الـ backend
const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType; kpiColor: string }> = {
  // lowercase (كما يأتي من backend)
  operational: { label: 'تشغيلي', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Activity, kpiColor: 'text-red-400' },
  administrative: { label: 'إداري', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Building2, kpiColor: 'text-blue-400' },
  service: { label: 'خدمي', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Zap, kpiColor: 'text-purple-400' },
  production: { label: 'إنتاجي', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Target, kpiColor: 'text-emerald-400' },
  // UPPERCASE fallback (legacy)
  OPERATIONAL: { label: 'تشغيلي', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Activity, kpiColor: 'text-red-400' },
  ADMINISTRATIVE: { label: 'إداري', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Building2, kpiColor: 'text-blue-400' },
  SERVICE: { label: 'خدمي', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Zap, kpiColor: 'text-purple-400' },
  PRODUCTION: { label: 'إنتاجي', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Target, kpiColor: 'text-emerald-400' },
};

const getTypeCfg = (type?: string) =>
  TYPE_CONFIG[type ?? ''] ?? { label: type ?? '—', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: Layers, kpiColor: 'text-slate-400' };

// ── Cost Center Detail Drawer ────────────────────────────────────────────────

interface CCDetailDrawerProps {
  cc: CostCenter;
  costCenters: CostCenter[];
  transactions: CCTransaction[];
  onClose: () => void;
  onEdit: () => void;
}

const CCDetailDrawer: React.FC<CCDetailDrawerProps> = ({ cc, costCenters, transactions, onClose, onEdit }) => {
  const cfg = getTypeCfg(cc.type);
  const IconComp = cfg.icon;
  const parent = cc.parentId ? costCenters.find(p => p.id === cc.parentId) : null;

  // حركات مرتبطة بهذا المركز
  const relatedEntries = useMemo(() => {
    const rows: Array<{ date: string; type_label: string; description: string; account: string; amount: number; side: 'debit' | 'credit' }> = [];
    transactions.forEach(tx => {
      (tx.entries ?? []).forEach(entry => {
        if (String(entry.cost_center_id) === String(cc.id)) {
          rows.push({
            date: tx.date,
            type_label: tx.type_label ?? tx.type ?? '—',
            description: entry.description ?? tx.description ?? '—',
            account: entry.account ? `${entry.account.code} - ${entry.account.name}` : '—',
            amount: (entry.debit ?? 0) > 0 ? (entry.debit ?? 0) : (entry.credit ?? 0),
            side: (entry.debit ?? 0) > 0 ? 'debit' : 'credit',
          });
        }
      });
    });
    return rows;
  }, [cc.id, transactions]);

  const totalExpenses = relatedEntries.filter(e => e.side === 'debit').reduce((s, e) => s + e.amount, 0);
  const totalRevenue = relatedEntries.filter(e => e.side === 'credit').reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  return (
    <AnimatePresence>
      <motion.div
        key="drawer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"
      />
      <motion.div
        key="drawer-panel"
        initial={{ x: '-100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '-100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 h-full z-50 w-full md:w-[520px] lg:w-[600px] bg-slate-900 border-l border-white/5 flex flex-col shadow-2xl overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className={`p-6 border-b border-white/5 bg-gradient-to-l from-transparent to-${cfg.bg.replace('bg-', '')}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${cfg.bg} border ${cfg.border} flex items-center justify-center ${cfg.color} shrink-0`}>
                <IconComp size={26} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white leading-tight">{cc.nameAr}</h2>
                <div className="flex items-center flex-wrap gap-2 mt-1.5">
                  <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-black ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                    {cfg.label}
                  </span>
                  {cc.code && (
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-lg border border-white/5">
                      {cc.code}
                    </span>
                  )}
                  <span className={`flex items-center gap-1 text-[10px] font-black ${cc.is_active !== false ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {cc.is_active !== false ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                    {cc.is_active !== false ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onEdit}
                className="p-2 bg-white/5 hover:bg-blue-600 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5"
                title="تعديل"
              >
                <Settings size={15} />
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-white/5 hover:bg-red-600/20 rounded-xl text-slate-400 hover:text-red-400 transition-all border border-white/5"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* Basic Info */}
          <div className="p-6 space-y-4 border-b border-white/5">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Info size={12} /> معلومات أساسية
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'المركز الأب', value: parent ? parent.nameAr : 'مركز رئيسي', icon: Building2 },
                { label: 'الكود', value: cc.code || 'غير محدد', icon: Tag },
                { label: 'النوع', value: cfg.label, icon: Layers },
                { label: 'الحالة', value: cc.is_active !== false ? 'نشط' : 'غير نشط', icon: CheckCircle2 },
              ].map((item, i) => (
                <div key={i} className="bg-slate-950/40 border border-white/5 rounded-2xl p-3.5 text-right">
                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                    <item.icon size={9} /> {item.label}
                  </p>
                  <p className="text-xs font-black text-white">{item.value}</p>
                </div>
              ))}
            </div>
            {cc.notes && (
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 text-right">
                <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">ملاحظات</p>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">{cc.notes}</p>
              </div>
            )}
          </div>

          {/* Financial Summary */}
          <div className="p-6 space-y-4 border-b border-white/5">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={12} /> ملخص مالي
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 text-right">
                <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">الميزانية المعتمدة</p>
                <p className="text-base font-black font-mono text-white">
                  {cc.budget != null ? `₪${Number(cc.budget).toLocaleString()}` : 'غير محدد'}
                </p>
              </div>
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 text-right">
                <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                  <TrendingDown size={9} /> إجمالي المصروفات
                </p>
                <p className={`text-base font-black font-mono ${totalExpenses > 0 ? 'text-rose-400' : 'text-slate-600'}`}>
                  {totalExpenses > 0 ? `₪${totalExpenses.toLocaleString()}` : 'لا توجد بيانات'}
                </p>
              </div>
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 text-right">
                <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                  <TrendingUp size={9} /> إجمالي الإيرادات
                </p>
                <p className={`text-base font-black font-mono ${totalRevenue > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {totalRevenue > 0 ? `₪${totalRevenue.toLocaleString()}` : 'لا توجد بيانات'}
                </p>
              </div>
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 text-right">
                <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">صافي الربح / الخسارة</p>
                {relatedEntries.length === 0 ? (
                  <p className="text-base font-black font-mono text-slate-600">لا توجد بيانات</p>
                ) : (
                  <p className={`text-base font-black font-mono ${netProfit > 0 ? 'text-emerald-400' : netProfit < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {netProfit >= 0 ? '+' : ''}₪{netProfit.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Related Transactions */}
          <div className="p-6 space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <List size={12} /> الحركات المرتبطة
              {relatedEntries.length > 0 && (
                <span className="px-2 py-0.5 bg-red-600/20 border border-red-500/20 rounded-lg text-red-400 text-[10px]">
                  {relatedEntries.length}
                </span>
              )}
            </h3>

            {relatedEntries.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-slate-700">
                  <BarChart3 size={24} />
                </div>
                <p className="text-xs font-black text-slate-600">لا توجد حركات مرتبطة بهذا المركز حتى الآن</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/5">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/40 border-b border-white/5">
                    <tr className="text-slate-500 font-black uppercase tracking-wider">
                      <th className="px-4 py-3">التاريخ</th>
                      <th className="px-4 py-3">النوع</th>
                      <th className="px-4 py-3">البيان</th>
                      <th className="px-4 py-3">الحساب</th>
                      <th className="px-4 py-3 text-center">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {relatedEntries.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">{row.date}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-slate-800 border border-white/5 rounded-lg text-[10px] font-black text-slate-400">
                            {row.type_label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 font-bold max-w-[140px] truncate">{row.description}</td>
                        <td className="px-4 py-3 text-slate-500 text-[10px] font-mono max-w-[120px] truncate">{row.account}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-black font-mono text-xs ${row.side === 'debit' ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {row.side === 'debit' ? '-' : '+'}₪{row.amount.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ── Main CostCentersView ─────────────────────────────────────────────────────

export const CostCentersView: React.FC<CostCentersViewProps> = ({
  costCenters,
  transactions = [],
  setCostCenterForm,
  setModalType,
  setIsModalOpen,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [selectedCC, setSelectedCC] = useState<CostCenter | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ── KPI Stats — computed directly from real data ────────────────────────
  const stats = useMemo(() => ({
    total: costCenters.length,
    operational: costCenters.filter(c => (c.type ?? '').toLowerCase() === 'operational').length,
    administrative: costCenters.filter(c => (c.type ?? '').toLowerCase() === 'administrative').length,
    service: costCenters.filter(c => (c.type ?? '').toLowerCase() === 'service').length,
    production: costCenters.filter(c => (c.type ?? '').toLowerCase() === 'production').length,
  }), [costCenters]);

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return costCenters.filter(cc => {
      const matchSearch = !search || cc.nameAr.includes(search) || (cc.code ?? '').includes(search);
      const matchType = !filterType || (cc.type ?? '').toLowerCase() === filterType;
      const matchActive = !filterActive || String(cc.is_active !== false) === filterActive;
      return matchSearch && matchType && matchActive;
    });
  }, [costCenters, search, filterType, filterActive]);

  const handleOpenDrawer = (cc: CostCenter) => {
    setSelectedCC(cc);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedCC(null), 300);
  };

  const handleEditFromDrawer = () => {
    if (!selectedCC) return;
    setCostCenterForm?.({
      id: selectedCC.id,
      nameAr: selectedCC.nameAr,
      code: selectedCC.code,
      type: selectedCC.type,
      is_active: selectedCC.is_active,
      notes: selectedCC.notes,
      parentId: selectedCC.parentId,
    });
    setModalType?.('EDIT_COST_CENTER');
    setIsModalOpen?.(true);
    handleCloseDrawer();
  };

  return (
    <motion.div
      key="costs"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="h-full overflow-y-auto custom-scrollbar pb-10 space-y-5"
      dir="rtl"
    >
      {/* ── KPI Cards — real data, auto-updated ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'إجمالي المراكز', value: stats.total, color: 'text-white', bg: 'bg-white/5', border: 'border-white/10', icon: Layers },
          { label: 'تشغيلية', value: stats.operational, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Activity },
          { label: 'إدارية', value: stats.administrative, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Building2 },
          { label: 'خدمية', value: stats.service, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Zap },
          { label: 'إنتاجية', value: stats.production, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Target },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-slate-900/60 border ${s.border} rounded-2xl p-4 flex items-center justify-between`}
          >
            <div className="text-right">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">{s.label}</p>
              <p className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</p>
            </div>
            <div className={`w-9 h-9 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center ${s.color}`}>
              <s.icon size={17} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الكود..."
              className="bg-slate-900 border border-white/5 rounded-xl py-2 pr-9 pl-4 text-xs text-white outline-none focus:border-red-500/50 w-56"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-red-500/50"
          >
            <option value="">كل الأنواع</option>
            <option value="operational">تشغيلي</option>
            <option value="administrative">إداري</option>
            <option value="service">خدمي</option>
            <option value="production">إنتاجي</option>
          </select>

          {/* Active Filter */}
          <select
            value={filterActive}
            onChange={e => setFilterActive(e.target.value)}
            className="bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-red-500/50"
          >
            <option value="">كل الحالات</option>
            <option value="true">نشط</option>
            <option value="false">غير نشط</option>
          </select>

          {(search || filterType || filterActive) && (
            <button
              onClick={() => { setSearch(''); setFilterType(''); setFilterActive(''); }}
              className="flex items-center gap-1 px-2.5 py-2 bg-red-600/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-black hover:bg-red-600/20 transition-all"
            >
              <X size={11} /> مسح الفلاتر
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-900 border border-white/5 rounded-xl p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <List size={14} />
            </button>
          </div>

          <button className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-xl text-xs font-black transition-all">
            <Download size={13} /> تصدير
          </button>

          <button
            onClick={() => {
              setCostCenterForm?.({ type: 'operational', is_active: true });
              setModalType?.('ADD_COST_CENTER');
              setIsModalOpen?.(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-all shadow-lg shadow-red-900/20"
          >
            <Plus size={14} /> مركز تكلفة جديد
          </button>
        </div>
      </div>

      {/* ── Cards View ───────────────────────────────────────────────────────── */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {filtered.map((cc, i) => {
              const cfg = getTypeCfg(cc.type);
              const IconComp = cfg.icon;
              const parent = cc.parentId ? costCenters.find(p => p.id === cc.parentId) : null;

              // حساب الحركات لهذا المركز
              const ccEntries = transactions.flatMap(tx =>
                (tx.entries ?? []).filter(e => String(e.cost_center_id) === String(cc.id))
              );
              const hasMovements = ccEntries.length > 0;

              return (
                <motion.div
                  key={cc.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 200 }}
                  className="bg-slate-900/60 border border-white/5 rounded-3xl p-6 hover:border-white/15 transition-all group flex flex-col"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-12 h-12 rounded-2xl ${cfg.bg} border ${cfg.border} flex items-center justify-center ${cfg.color} group-hover:scale-105 transition-transform shrink-0`}>
                      <IconComp size={22} />
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {/* النوع — Badge ملون من البيانات الحقيقية */}
                      <span className={`px-3 py-1 rounded-xl border text-[10px] font-black ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                      {/* الحالة */}
                      <span className={`text-[10px] font-black ${cc.is_active !== false ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {cc.is_active !== false ? '● نشط' : '○ غير نشط'}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="mb-4 text-right flex-1">
                    <h4 className="text-base font-black text-white mb-1 leading-tight">{cc.nameAr}</h4>
                    {parent && (
                      <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1 justify-end">
                        <ChevronLeft size={10} /> تابع لـ: {parent.nameAr}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 justify-end">
                      {cc.code && (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-lg border border-white/5">
                          {cc.code}
                        </span>
                      )}
                    </div>
                    {cc.notes && (
                      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed line-clamp-2">{cc.notes}</p>
                    )}
                  </div>

                  {/* Financial Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-3 text-right">
                      <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">الميزانية</p>
                      <p className="text-sm font-black font-mono text-white">
                        {cc.budget != null ? `₪${Number(cc.budget).toLocaleString()}` : 'غير محدد'}
                      </p>
                    </div>
                    <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-3 text-right">
                      <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">الحركات</p>
                      <p className={`text-sm font-black font-mono ${hasMovements ? 'text-blue-400' : 'text-slate-600'}`}>
                        {hasMovements ? `${ccEntries.length} حركة` : 'لا توجد بيانات'}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className={`text-[10px] font-bold ${hasMovements ? 'text-blue-400' : 'text-slate-600'}`}>
                      {hasMovements ? `${ccEntries.length} حركة مرتبطة` : 'لا توجد حركات'}
                    </span>
                    <button
                      onClick={() => handleOpenDrawer(cc)}
                      className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 border border-white/5 px-3 py-1.5 rounded-xl"
                    >
                      <Eye size={12} /> عرض التفاصيل
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Add Button */}
          <motion.button
            layout
            onClick={() => {
              setCostCenterForm?.({ type: 'operational', is_active: true });
              setModalType?.('ADD_COST_CENTER');
              setIsModalOpen?.(true);
            }}
            className="rounded-3xl border-2 border-dashed border-white/5 p-8 flex flex-col items-center justify-center gap-4 text-slate-600 hover:border-red-500/30 hover:text-slate-400 hover:bg-red-500/5 transition-all group min-h-[240px]"
          >
            <div className="w-14 h-14 rounded-3xl bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:rotate-90 transition-all duration-500">
              <Plus size={28} />
            </div>
            <div className="text-center">
              <span className="text-sm font-black block">إضافة مركز تكلفة</span>
              <p className="text-[11px] font-medium opacity-60 mt-1">إنشاء سجل تتبع مالي منفصل</p>
            </div>
          </motion.button>

          {/* Empty State */}
          {filtered.length === 0 && costCenters.length > 0 && (
            <div className="col-span-full py-16 text-center">
              <p className="text-slate-600 font-black text-sm">لا توجد نتائج مطابقة للفلاتر المحددة</p>
            </div>
          )}
        </div>
      )}

      {/* ── List View ────────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/40 border-b border-white/5">
                <tr className="text-slate-500 font-black uppercase tracking-wider">
                  <th className="px-5 py-3">المركز</th>
                  <th className="px-5 py-3">الكود</th>
                  <th className="px-5 py-3">النوع</th>
                  <th className="px-5 py-3">المركز الأب</th>
                  <th className="px-5 py-3 text-center">الحالة</th>
                  <th className="px-5 py-3 text-center">الحركات</th>
                  <th className="px-5 py-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((cc) => {
                  const cfg = getTypeCfg(cc.type);
                  const parent = cc.parentId ? costCenters.find(p => p.id === cc.parentId) : null;
                  const ccEntries = transactions.flatMap(tx =>
                    (tx.entries ?? []).filter(e => String(e.cost_center_id) === String(cc.id))
                  );
                  return (
                    <tr key={cc.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center ${cfg.color} shrink-0`}>
                            <cfg.icon size={14} />
                          </div>
                          <span className="font-bold text-white">{cc.nameAr}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-500 text-[11px]">{cc.code || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-black ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400 font-bold text-[11px]">{parent ? parent.nameAr : '—'}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`text-[10px] font-black ${cc.is_active !== false ? 'text-emerald-400' : 'text-slate-600'}`}>
                          {cc.is_active !== false ? '● نشط' : '○ غير نشط'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center font-mono text-[11px] text-blue-400 font-black">
                        {ccEntries.length > 0 ? ccEntries.length : '—'}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => handleOpenDrawer(cc)}
                          className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black rounded-xl hover:bg-blue-600/20 hover:text-blue-400 hover:border-blue-500/30 transition-all inline-flex items-center gap-1"
                        >
                          <Eye size={11} /> تفاصيل
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-slate-600 font-black text-sm">
                لا توجد نتائج مطابقة
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Detail Drawer ─────────────────────────────────────────────────────── */}
      {isDrawerOpen && selectedCC && (
        <CCDetailDrawer
          cc={selectedCC}
          costCenters={costCenters}
          transactions={transactions}
          onClose={handleCloseDrawer}
          onEdit={handleEditFromDrawer}
        />
      )}
    </motion.div>
  );
};
