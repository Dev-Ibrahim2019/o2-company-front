// src/components/administration/GL/ViewJournalModal.tsx
//
// Modal عرض تفاصيل القيد المحاسبي
// ✅ يعرض subledger badge بجانب كل سطر (من راحت السلفة / لمن)
// ✅ يجلب entries كاملة من الباك عند الفتح (مع subledger_type/id/name)
// ✅ زر "كشف حساب" يفتح AccountStatementModal مباشرة

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Download, RefreshCw, User, Building2, Briefcase,
    ChevronLeft, ExternalLink, CheckCircle2, Clock,
} from "lucide-react";
import { transactionService } from "../../../services/accountingService";
import type { Transaction, EntryLine, SubledgerType } from "../../../services/accountingService";
import AccountStatementModal from "./AccountStatementModal";

// ── Subledger Badge ───────────────────────────────────────────────────────────

const SUBLEDGER_META: Record<SubledgerType, {
    icon: React.ElementType;
    label: string;
    color: string;
    bg: string;
    border: string;
}> = {
    employee: {
        icon: User,
        label: "موظف",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
    },
    customer: {
        icon: Building2,
        label: "عميل",
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
    },
    supplier: {
        icon: Briefcase,
        label: "مورد",
        color: "text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-500/20",
    },
};

interface SubledgerBadgeProps {
    type: SubledgerType;
    id: number;
    name?: string | null;
    onViewStatement?: () => void;
}

const SubledgerBadge: React.FC<SubledgerBadgeProps> = ({ type, id, name, onViewStatement }) => {
    const meta = SUBLEDGER_META[type];
    const Icon = meta.icon;

    return (
        <button
            onClick={onViewStatement}
            title={onViewStatement ? "عرض كشف الحساب" : undefined}
            className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-black
        ${meta.color} ${meta.bg} ${meta.border}
        ${onViewStatement ? "hover:opacity-80 transition-opacity cursor-pointer" : "cursor-default"}
      `}
        >
            <Icon size={10} />
            <span>{name ?? `${meta.label} #${id}`}</span>
            {onViewStatement && <ExternalLink size={9} className="opacity-60" />}
        </button>
    );
};

// ── Main Modal ────────────────────────────────────────────────────────────────

interface ViewJournalModalProps {
    transactionId: number | string;
    isOpen: boolean;
    onClose: () => void;
    // بيانات أساسية للعرض الأولي (قبل جلب التفاصيل)
    initialData?: {
        transaction_number: string;
        date: string;
        description?: string;
        status: string;
    };
}

// حالة لتتبع أي subledger فُتح في AccountStatementModal
interface StatementTarget {
    type: "employee" | "customer" | "supplier";
    id: number;
    name: string;
}

const ViewJournalModal: React.FC<ViewJournalModalProps> = ({
    transactionId,
    isOpen,
    onClose,
    initialData,
}) => {
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statementTarget, setStatementTarget] = useState<StatementTarget | null>(null);

    // جلب التفاصيل الكاملة عند الفتح
    useEffect(() => {
        if (!isOpen || !transactionId) return;

        let cancelled = false;
        setLoading(true);
        setError(null);
        setTransaction(null);

        transactionService.getOne(Number(transactionId))
            .then(tx => {
                if (!cancelled) setTransaction(tx);
            })
            .catch(e => {
                if (!cancelled) setError(e?.response?.data?.message ?? "فشل جلب تفاصيل القيد");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [isOpen, transactionId]);

    if (!isOpen) return null;

    const tx = transaction;
    const entries: EntryLine[] = tx?.entries ?? [];
    const totalDebit = entries.reduce((s, e) => s + (e.debit ?? 0), 0);
    const totalCredit = entries.reduce((s, e) => s + (e.credit ?? 0), 0);
    const isPosted = tx?.status === "posted";

    const displayNumber = tx?.transaction_number ?? initialData?.transaction_number ?? "—";
    const displayDate = tx?.date ?? initialData?.date ?? "—";
    const displayDesc = tx?.description ?? initialData?.description ?? "—";
    const displayStatus = tx?.status ?? (initialData?.status === "POSTED" ? "posted" : "draft");

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 12 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                    className="relative w-full max-w-3xl bg-slate-900 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden text-right"
                >
                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="absolute top-5 left-5 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all z-10"
                    >
                        <X size={15} />
                    </button>

                    {/* Header */}
                    <div className="p-7 border-b border-white/5">
                        <div className="flex items-start justify-between gap-6">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-[11px] text-slate-500 bg-slate-950 px-2.5 py-1 rounded-lg border border-white/5">
                                        {displayNumber}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-black ${isPosted
                                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                            : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                                        }`}>
                                        {isPosted ? <><CheckCircle2 size={10} className="inline ml-1" />مرحَّل</> : <><Clock size={10} className="inline ml-1" />مسودة</>}
                                    </span>
                                    {tx?.type_label && (
                                        <span className="text-[10px] font-black text-slate-500 bg-white/5 border border-white/5 px-2 py-1 rounded-lg">
                                            {tx.type_label}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-xl font-black text-white">{displayDesc}</h3>
                                <p className="text-[11px] text-slate-500 font-mono">{displayDate}</p>
                            </div>

                            {tx && (
                                <div className="text-left shrink-0 space-y-1">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-0.5">مدين</p>
                                            <p className="text-base font-black font-mono text-emerald-400">₪{totalDebit.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-0.5">دائن</p>
                                            <p className="text-base font-black font-mono text-rose-400">₪{totalCredit.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {tx.branch && (
                                        <p className="text-[10px] text-slate-600 font-bold text-left">📍 {tx.branch.name}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-7 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {/* Loading */}
                        {loading && (
                            <div className="flex items-center justify-center py-16 text-slate-500 gap-3">
                                <RefreshCw size={18} className="animate-spin" />
                                <span className="text-xs font-bold">جاري جلب التفاصيل...</span>
                            </div>
                        )}

                        {/* Error */}
                        {error && !loading && (
                            <div className="py-8 text-center">
                                <p className="text-rose-400 text-sm font-bold">{error}</p>
                            </div>
                        )}

                        {/* Entries Table */}
                        {!loading && !error && tx && (
                            <table className="w-full text-right text-xs">
                                <thead>
                                    <tr className="text-slate-500 border-b border-white/5">
                                        <th className="pb-3 font-black uppercase tracking-widest text-[10px]">الحساب</th>
                                        <th className="pb-3 font-black uppercase tracking-widest text-[10px]">الكيان</th>
                                        <th className="pb-3 text-center font-black uppercase tracking-widest text-[10px]">مدين</th>
                                        <th className="pb-3 text-center font-black uppercase tracking-widest text-[10px]">دائن</th>
                                        <th className="pb-3 font-black uppercase tracking-widest text-[10px]">البيان</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {entries.map((entry, idx) => {
                                        const hasSubledger = entry.subledger_type && entry.subledger_id;
                                        const subledgerName = entry.subledger?.name ?? null;

                                        return (
                                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                                {/* الحساب */}
                                                <td className="py-4">
                                                    <div>
                                                        <span className="font-bold text-white text-sm">
                                                            {entry.account?.name ?? `حساب #${entry.account_id}`}
                                                        </span>
                                                        {entry.account?.code && (
                                                            <span className="text-[9px] text-slate-600 font-mono mr-2 bg-slate-950 px-1.5 py-0.5 rounded border border-white/5">
                                                                {entry.account.code}
                                                            </span>
                                                        )}
                                                        {entry.cost_center && (
                                                            <p className="text-[10px] text-slate-500 mt-0.5">
                                                                📊 {entry.cost_center.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Subledger Badge — من راحت السلفة */}
                                                <td className="py-4">
                                                    {hasSubledger ? (
                                                        <SubledgerBadge
                                                            type={entry.subledger_type!}
                                                            id={entry.subledger_id!}
                                                            name={subledgerName}
                                                            onViewStatement={() => {
                                                                setStatementTarget({
                                                                    type: entry.subledger_type!,
                                                                    id: entry.subledger_id!,
                                                                    name: subledgerName ?? `${entry.subledger_type} #${entry.subledger_id}`,
                                                                });
                                                            }}
                                                        />
                                                    ) : (
                                                        <span className="text-slate-700 text-[10px]">—</span>
                                                    )}
                                                </td>

                                                {/* مدين */}
                                                <td className="py-4 text-center">
                                                    {entry.debit > 0 ? (
                                                        <span className="font-black font-mono text-emerald-400">
                                                            ₪{Number(entry.debit).toLocaleString()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-700">—</span>
                                                    )}
                                                </td>

                                                {/* دائن */}
                                                <td className="py-4 text-center">
                                                    {entry.credit > 0 ? (
                                                        <span className="font-black font-mono text-rose-400">
                                                            ₪{Number(entry.credit).toLocaleString()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-700">—</span>
                                                    )}
                                                </td>

                                                {/* البيان */}
                                                <td className="py-4 text-slate-400 text-[11px] max-w-[180px] truncate">
                                                    {entry.description ?? "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {entries.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-600 font-bold italic">
                                                لا توجد سطور في هذا القيد
                                            </td>
                                        </tr>
                                    )}
                                </tbody>

                                {entries.length > 0 && (
                                    <tfoot className="border-t border-white/10">
                                        <tr>
                                            <td colSpan={2} className="pt-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                الإجماليات
                                            </td>
                                            <td className="pt-4 text-center font-black font-mono text-emerald-400">
                                                ₪{totalDebit.toLocaleString()}
                                            </td>
                                            <td className="pt-4 text-center font-black font-mono text-rose-400">
                                                ₪{totalCredit.toLocaleString()}
                                            </td>
                                            <td className="pt-4">
                                                {Math.abs(totalDebit - totalCredit) < 0.001 ? (
                                                    <span className="text-[10px] text-emerald-400 font-black flex items-center gap-1">
                                                        <CheckCircle2 size={11} /> متوازن
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-rose-400 font-black">
                                                        فرق: ₪{Math.abs(totalDebit - totalCredit).toFixed(3)}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {tx?.user && (
                                <p className="text-[10px] text-slate-600 font-bold">
                                    بواسطة: {tx.user.name}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-2xl font-black text-[11px] transition-all">
                                <Download size={13} /> تصدير PDF
                            </button>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-2xl font-black text-sm transition-all"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* AccountStatementModal — يُفتح عند الضغط على subledger badge */}
            {statementTarget && (
                <AccountStatementModal
                    isOpen={true}
                    onClose={() => setStatementTarget(null)}
                    entityType={statementTarget.type}
                    entityId={statementTarget.id}
                    entityName={statementTarget.name}
                />
            )}
        </>
    );
};

export default ViewJournalModal;