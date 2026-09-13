// src/components/administration/GL/JournalEntriesView.tsx

import React, { useState, useCallback, useEffect } from 'react';
import {
    ChevronDown, Eye, Search, RefreshCw,
    CheckCircle2, Clock, XCircle, User, Building2, Briefcase, Plus,
    AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { transactionService } from '../../../services/accountingService';
import type { Transaction, EntryLine } from '../../../services/accountingService';

// ─── Props ────────────────────────────────────────────────────────────────────

interface JournalEntriesViewProps {
    transactions: Transaction[];
    loading: boolean;
    onRefresh: () => void;
    onAddJournal: () => void;
    onViewTransaction?: (tx: Transaction) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_CONFIG = {
    posted: { label: 'مُرحَّل', Icon: CheckCircle2, cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    draft: { label: 'مسودة', Icon: Clock, cls: 'bg-amber-500/15  text-amber-400  border-amber-500/30' },
    cancelled: { label: 'ملغي', Icon: XCircle, cls: 'bg-red-500/15    text-red-400    border-red-500/30' },
} as const;

const SUBLEDGER_META = {
    employee: { label: 'موظف', Icon: User, cls: 'bg-blue-500/10 border-blue-500/25 text-blue-300' },
    customer: { label: 'عميل', Icon: Briefcase, cls: 'bg-cyan-500/10 border-cyan-500/25 text-cyan-300' },
    supplier: { label: 'مورد', Icon: Building2, cls: 'bg-purple-500/10 border-purple-500/25 text-purple-300' },
} as const;

// ─── StatusBadge ──────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black ${cfg.cls}`}>
            <cfg.Icon size={10} />
            {cfg.label}
        </span>
    );
};

// ─── EntryRow ─────────────────────────────────────────────────────────────────

const EntryRow: React.FC<{ entry: EntryLine; index: number; total: number }> = ({ entry, index, total }) => {
    const sub = entry.subledger;
    const subMeta = sub ? SUBLEDGER_META[sub.type as keyof typeof SUBLEDGER_META] : null;
    const isDebit = entry.debit > 0;

    return (
        <tr className={`group transition-colors hover:bg-white/[0.02] ${index < total - 1 ? 'border-b border-white/[0.04]' : ''}`}>
            {/* Indent + account */}
            <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                    {/* Debit/Credit indicator stripe */}
                    <div className={`w-0.5 h-8 rounded-full shrink-0 ${isDebit ? 'bg-emerald-500/60' : 'bg-rose-500/60'}`} />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-500 tabular-nums tracking-wider">
                                {entry.account?.code ?? '—'}
                            </span>
                            <span className="text-[11px] text-slate-200 font-semibold">
                                {entry.account?.name ?? '—'}
                            </span>
                        </div>
                        {entry.description && (
                            <p className="text-[10px] text-slate-600 mt-0.5 truncate max-w-[280px]">
                                {entry.description}
                            </p>
                        )}
                    </div>
                </div>
            </td>

            {/* Subledger */}
            <td className="px-4 py-3">
                {subMeta && sub ? (
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold ${subMeta.cls}`}>
                        <subMeta.Icon size={10} />
                        {subMeta.label}
                        {sub.name && <span className="opacity-80">· {sub.name}</span>}
                    </span>
                ) : <span className="text-slate-700 text-[10px]">—</span>}
            </td>

            {/* Cost center */}
            <td className="px-4 py-3">
                {entry.cost_center ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-violet-500/25 bg-violet-500/10 text-violet-300 text-[10px] font-bold">
                        <Building2 size={9} />
                        {entry.cost_center.name}
                    </span>
                ) : <span className="text-slate-700 text-[10px]">—</span>}
            </td>

            {/* Debit */}
            <td className="px-5 py-3 text-right tabular-nums">
                {entry.debit > 0
                    ? <span className="text-emerald-400 font-black font-mono text-[12px]">{fmt(entry.debit)}</span>
                    : <span className="text-slate-800 text-[11px]">—</span>
                }
            </td>

            {/* Credit */}
            <td className="px-5 py-3 text-right tabular-nums">
                {entry.credit > 0
                    ? <span className="text-rose-400 font-black font-mono text-[12px]">{fmt(entry.credit)}</span>
                    : <span className="text-slate-800 text-[11px]">—</span>
                }
            </td>
        </tr>
    );
};

// ─── ExpandedEntries — جلب lazy عند التوسع ───────────────────────────────────

const ExpandedEntries: React.FC<{ tx: Transaction }> = ({ tx }) => {
    const [entries, setEntries] = useState<EntryLine[] | null>(
        // إذا الـ entries موجودة مباشرة في الـ transaction لا تجلب مرة ثانية
        tx.entries && tx.entries.length > 0
            ? [...tx.entries].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            : null
    );
    const [loading, setLoading] = useState(entries === null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // إذا عندنا entries مسبقاً لا نجلب
        if (entries !== null) return;

        let cancelled = false;
        setLoading(true);

        transactionService.getOne(tx.id)
            .then((detail) => {
                if (cancelled) return;
                // defensive: handle both response shapes
                const raw: any = detail;
                const entriesData =
                    raw?.entries ??
                    raw?.data?.entries ??
                    raw?.data?.transaction?.entries ??
                    [];
                const sorted = [...entriesData].sort(
                    (a: EntryLine, b: EntryLine) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
                );
                setEntries(sorted);
            })
            .catch((e) => {
                if (!cancelled) setError(e?.response?.data?.message ?? e?.message ?? 'فشل تحميل الأسطر');
            })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [tx.id]);  // eslint-disable-line react-hooks/exhaustive-deps

    if (loading) return (
        <div className="flex items-center justify-center gap-2.5 py-10 text-slate-500 text-xs font-bold">
            <RefreshCw size={14} className="animate-spin" /> جاري تحميل الأسطر...
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center gap-2 py-8 text-rose-400 text-xs font-bold">
            <AlertTriangle size={14} /> {error}
        </div>
    );

    if (!entries?.length) return (
        <div className="py-8 text-center text-slate-700 text-xs">لا توجد أسطر لهذا القيد</div>
    );

    const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
    const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

    return (
        <div className="mx-3 mb-3 rounded-2xl overflow-hidden border border-white/[0.07] bg-slate-950/70">
            {/* sub-header */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.06] bg-white/[0.015]">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.18em]">
                    {entries.length} سطر · {tx.type_label}
                </span>
                <span className={`text-[9px] font-black ${balanced ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {balanced ? '✓ القيد متوازن' : '⚠ غير متوازن'}
                </span>
            </div>

            <table className="w-full" dir="rtl">
                <thead>
                    <tr className="text-[9px] font-black text-slate-700 uppercase tracking-[0.14em] border-b border-white/[0.04]">
                        <th className="px-5 py-2.5 text-right">الحساب</th>
                        <th className="px-4 py-2.5 text-right">الجهة</th>
                        <th className="px-4 py-2.5 text-right">مركز التكلفة</th>
                        <th className="px-5 py-2.5 text-right">مدين ₪</th>
                        <th className="px-5 py-2.5 text-right">دائن ₪</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry, idx) => (
                        <EntryRow key={entry.id ?? idx} entry={entry} index={idx} total={entries.length} />
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t border-white/[0.07] bg-white/[0.025]">
                        <td colSpan={3} className="px-5 py-2.5 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                            الإجمالي
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono font-black text-emerald-400 text-[12px] tabular-nums">
                            {fmt(totalDebit)}
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono font-black text-rose-400 text-[12px] tabular-nums">
                            {fmt(totalCredit)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

// ─── TransactionRow ───────────────────────────────────────────────────────────

const TransactionRow: React.FC<{
    tx: Transaction;
    isExpanded: boolean;
    onToggle: () => void;
    onView?: (tx: Transaction) => void;
}> = ({ tx, isExpanded, onToggle, onView }) => (
    <>
        <tr
            onClick={onToggle}
            className={`border-b cursor-pointer select-none transition-colors
                ${isExpanded
                    ? 'bg-blue-500/[0.04] border-blue-500/[0.12]'
                    : 'border-white/[0.04] hover:bg-white/[0.025]'}`}
        >
            {/* chevron */}
            <td className="pl-4 pr-2 py-3.5 w-9">
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.18 }}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors
                        ${isExpanded ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.04] text-slate-600'}`}
                >
                    <ChevronDown size={13} />
                </motion.div>
            </td>

            {/* transaction number */}
            <td className="px-4 py-3.5">
                <span className="font-mono text-[11px] font-black text-slate-300 tabular-nums">
                    {tx.transaction_number}
                </span>
            </td>

            {/* date */}
            <td className="px-4 py-3.5">
                <span className="text-[11px] text-slate-400 tabular-nums">{tx.date}</span>
            </td>

            {/* description */}
            <td className="px-4 py-3.5 max-w-[240px]">
                <p className="text-[12px] text-slate-100 font-medium truncate leading-tight">
                    {tx.description || tx.type_label || '—'}
                </p>
                {tx.reference && (
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5 truncate">{tx.reference}</p>
                )}
            </td>

            {/* type */}
            <td className="px-4 py-3.5">
                <span className="text-[10px] text-slate-500 font-bold">{tx.type_label}</span>
            </td>

            {/* status */}
            <td className="px-4 py-3.5"><StatusBadge status={tx.status} /></td>

            {/* debit */}
            <td className="px-5 py-3.5 text-right tabular-nums">
                <span className="text-emerald-400 font-black font-mono text-[12px]">{fmt(tx.total_debit)}</span>
            </td>

            {/* credit */}
            <td className="px-5 py-3.5 text-right tabular-nums">
                <span className="text-rose-400 font-black font-mono text-[12px]">{fmt(tx.total_credit)}</span>
            </td>

            {/* entries count */}
            <td className="px-4 py-3.5">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.05] text-slate-400 text-[10px] font-black">
                    {tx.entries_count}
                </span>
            </td>

            {/* branch */}
            <td className="px-4 py-3.5">
                <span className="text-[10px] text-slate-600">{tx.branch?.name ?? '—'}</span>
            </td>

            {/* view button */}
            <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                {onView && (
                    <button
                        onClick={() => onView(tx)}
                        className="w-7 h-7 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                        <Eye size={12} />
                    </button>
                )}
            </td>
        </tr>

        {/* expanded entries */}
        <AnimatePresence>
            {isExpanded && (
                <tr key={`exp-${tx.id}`}>
                    <td colSpan={11} className="p-0 bg-slate-950/30">
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                            className="overflow-hidden"
                        >
                            <ExpandedEntries tx={tx} />
                        </motion.div>
                    </td>
                </tr>
            )}
        </AnimatePresence>
    </>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const RowSkeleton = () => (
    <>
        {Array.from({ length: 7 }).map((_, i) => (
            <tr key={i} className="border-b border-white/[0.03] animate-pulse">
                {[9, 14, 10, 28, 10, 12, 14, 14, 6, 10, 6].map((w, j) => (
                    <td key={j} className="px-4 py-3.5">
                        <div className={`h-2.5 bg-slate-800/80 rounded-md w-${w}`} />
                    </td>
                ))}
            </tr>
        ))}
    </>
);

// ─── KPI Strip ────────────────────────────────────────────────────────────────

const KpiStrip: React.FC<{ txs: Transaction[] }> = ({ txs }) => {
    const posted = txs.filter(t => t.status === 'posted').length;
    const draft = txs.filter(t => t.status === 'draft').length;
    const totalDebit = txs.reduce((s, t) => s + t.total_debit, 0);
    const totalCredit = txs.reduce((s, t) => s + t.total_credit, 0);

    return (
        <div className="grid grid-cols-5 gap-2.5 mb-5">
            {[
                { label: 'إجمالي القيود', val: String(txs.length), color: 'text-white' },
                { label: 'مُرحَّل', val: String(posted), color: 'text-emerald-400' },
                { label: 'مسودة', val: String(draft), color: 'text-amber-400' },
                { label: 'مجموع المدين', val: `₪${fmt(totalDebit)}`, color: 'text-emerald-400' },
                { label: 'مجموع الدائن', val: `₪${fmt(totalCredit)}`, color: 'text-rose-400' },
            ].map(({ label, val, color }) => (
                <div key={label} className="bg-slate-900/60 border border-white/[0.06] rounded-2xl px-4 py-3">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.16em] mb-1.5">{label}</p>
                    <p className={`text-[15px] font-black font-mono leading-none ${color}`}>{val}</p>
                </div>
            ))}
        </div>
    );
};

// ─── Main Export ──────────────────────────────────────────────────────────────

export const JournalEntriesView: React.FC<JournalEntriesViewProps> = ({
    transactions, loading, onRefresh, onAddJournal, onViewTransaction,
}) => {
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatus] = useState('');

    const toggle = useCallback((id: number) =>
        setExpandedId(prev => prev === id ? null : id), []);

    const filtered = React.useMemo(() =>
        transactions.filter(tx => {
            if (statusFilter && tx.status !== statusFilter) return false;
            const q = search.trim().toLowerCase();
            if (!q) return true;
            return [tx.transaction_number, tx.description, tx.reference, tx.type_label]
                .some(v => v?.toLowerCase().includes(q));
        }),
        [transactions, search, statusFilter]
    );

    return (
        <div dir="rtl" className="space-y-3">
            {!loading && <KpiStrip txs={transactions} />}

            {/* toolbar */}
            <div className="flex items-center gap-2.5">
                <div className="relative">
                    <Search size={13} className="absolute top-1/2 -translate-y-1/2 right-3.5 text-slate-600 pointer-events-none" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="بحث..."
                        className="bg-slate-900/70 border border-white/[0.07] rounded-xl pr-9 pl-4 py-2 text-[12px] text-white placeholder:text-slate-600 w-52 outline-none focus:border-blue-500/40 focus:w-72 transition-all"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={e => setStatus(e.target.value)}
                    className="bg-slate-900/70 border border-white/[0.07] rounded-xl px-3 py-2 text-[12px] text-slate-300 outline-none focus:border-blue-500/40 transition-all cursor-pointer"
                >
                    <option value="">كل الحالات</option>
                    <option value="posted">مُرحَّل</option>
                    <option value="draft">مسودة</option>
                    <option value="cancelled">ملغي</option>
                </select>

                <div className="flex-1" />

                <button onClick={onRefresh}
                    className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>

                <button onClick={onAddJournal}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-[12px] font-black transition-colors shadow-lg shadow-blue-900/30">
                    <Plus size={13} />
                    قيد جديد
                </button>
            </div>

            {/* table */}
            <div className="rounded-2xl border border-white/[0.07] bg-slate-900/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right" dir="rtl">
                        <thead>
                            <tr className="border-b border-white/[0.07] bg-white/[0.018]">
                                <th className="w-9" />
                                {['رقم القيد', 'التاريخ', 'البيان', 'النوع', 'الحالة', 'مدين ₪', 'دائن ₪', 'الأسطر', 'الفرع', ''].map(h => (
                                    <th key={h} className="px-4 py-3 text-[9px] font-black text-slate-600 uppercase tracking-[0.16em]">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <RowSkeleton /> :
                                filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="py-20 text-center text-slate-600 text-sm">
                                            {search || statusFilter ? 'لا توجد قيود تطابق البحث' : 'لا توجد قيود محاسبية'}
                                        </td>
                                    </tr>
                                ) : filtered.map(tx => (
                                    <TransactionRow
                                        key={tx.id}
                                        tx={tx}
                                        isExpanded={expandedId === tx.id}
                                        onToggle={() => toggle(tx.id)}
                                        onView={onViewTransaction}
                                    />
                                ))}
                        </tbody>
                    </table>
                </div>

                {!loading && filtered.length > 0 && (
                    <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center justify-between">
                        <span className="text-[10px] text-slate-600 font-bold">
                            {filtered.length} قيد{filtered.length !== transactions.length && ` (مفلتر من ${transactions.length})`}
                        </span>
                        <span className="text-[10px] text-slate-700">اضغط على أي صف لعرض أسطره</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JournalEntriesView;