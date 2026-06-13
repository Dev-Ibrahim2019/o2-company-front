// src/components/administration/GL/EmployeeStatement.tsx
//
// ✅ كشف حساب الموظف — تصميم احترافي بمستوى ERP متكامل
// ✅ دعم كامل لـ: السلف، استحقاق الرواتب، صرف الرواتب
// ✅ عرض كروت ملخص مالي متكامل
// ✅ جدول معاملات احترافي مع تلوين حسب النوع
// ✅ رسم بياني زمني للرصيد (timeline)
// ✅ دعم أنواع الرواتب الثلاثة (hourly, daily, monthly)

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Wallet,
    Activity,
    Filter,
    ArrowUpRight,
    ArrowDownLeft,
    DollarSign,
    Clock,
    Users,
    BanknoteIcon,
    Receipt,
    PieChart,
    Download,
    Printer,
    Search,
    FileText,
} from "lucide-react";
import { financeService } from "../../../services/financeService";
import type {
    StatementEntry,
    EmployeeStatementData,
} from "../../../services/financeService";

// ─── Types ─────────────────────────────────────────────────────────────────

type StatementType = "all" | "advance" | "salary";

interface EmployeeStatementProps {
    employeeId: number;
    employeeName: string;
}

// ─── Helper ────────────────────────────────────────────────────────────────

function extractLines(
    data: EmployeeStatementData,
    type: StatementType,
): { lines: StatementEntry[]; closingBalance: number } {
    const { accounts = {} } = data;

    if (type === "advance" && accounts.advance) {
        return {
            lines: accounts.advance.lines ?? [],
            closingBalance: accounts.advance.closing_balance ?? 0,
        };
    }

    if (type === "salary" && accounts.salary) {
        return {
            lines: accounts.salary.lines ?? [],
            closingBalance: accounts.salary.closing_balance ?? 0,
        };
    }

    const advanceLines: StatementEntry[] = accounts.advance?.lines ?? [];
    const salaryLines: StatementEntry[] = accounts.salary?.lines ?? [];

    const combined = [...advanceLines, ...salaryLines].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const closingBalance =
        (accounts.advance?.closing_balance ?? 0) +
        (accounts.salary?.closing_balance ?? 0);

    return { lines: combined, closingBalance };
}

/**
 * Rebuild a unified running_balance for a statement by ignoring the API's
 * running_balance when we merge multiple blocks (type=all).
 *
 * Strategy:
 * - Compute net movement within period: sum(debit - credit)
 * - Derive opening so that last running matches provided closingBalance
 *   opening = closingBalance - netMovement
 * - Build running cumulatively
 */
function rebuildUnifiedRunningBalance(
    entries: StatementEntry[],
    closingBalance: number,
): { entries: StatementEntry[]; openingBalance: number } {
    const sorted = [...entries].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const netMovement = sorted.reduce((sum, e) => {
        const debit = Number(e.debit || 0);
        const credit = Number(e.credit || 0);
        return sum + (debit - credit);
    }, 0);

    // opening is derived to keep closing consistent with backend closingBalance
    const openingBalance = closingBalance - netMovement;

    let running = openingBalance;
    const rebuilt = sorted.map((e) => {
        const debit = Number(e.debit || 0);
        const credit = Number(e.credit || 0);
        running += debit;
        running -= credit;

        return {
            ...e,
            running_balance: running,
        };
    });

    return { entries: rebuilt, openingBalance };
}

// ─── Format helpers ────────────────────────────────────────────────────────

const money = (v: number) => {
    if (v === undefined || v === null || isNaN(v)) return "0.00";
    return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const dateFmt = (d: string) => {
    try {
        return new Date(d).toLocaleDateString("ar-SA", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    } catch {
        return d;
    }
};

// ─── كارت الملخص ──────────────────────────────────────────────────────────

interface SummaryCardProps {
    label: string;
    value: number;
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    trend?: "up" | "down" | "neutral";
    subtitle?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
    label,
    value,
    icon: Icon,
    color,
    bg,
    border,
    trend,
    subtitle,
}) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${bg} border ${border} rounded-2xl p-4 hover:scale-[1.02] transition-all duration-300`}
    >
        <div className="flex items-start justify-between mb-3">
            <div
                className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center ${color}`}
            >
                <Icon size={18} />
            </div>
            {trend && (
                <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${trend === "up"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : trend === "down"
                            ? "bg-rose-500/15 text-rose-400"
                            : "bg-slate-500/15 text-slate-400"
                        }`}
                >
                    {trend === "up" ? "↑" : trend === "down" ? "↓" : "—"}
                </span>
            )}
        </div>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">
            {label}
        </p>
        <p className={`text-xl font-black font-mono ${color} leading-tight`}>
            ₪{money(Math.abs(value))}
        </p>
        {subtitle && (
            <p className="text-[10px] text-slate-600 font-bold mt-1">{subtitle}</p>
        )}
    </motion.div>
);

// ─── Transaction Type Badge ────────────────────────────────────────────────

const TypeBadge: React.FC<{ description: string | null }> = ({
    description,
}) => {
    const desc = (description ?? "").toLowerCase();
    let cls = "bg-slate-800 border-white/10 text-slate-400";
    let icon = <FileText size={10} />;

    if (desc.includes("سلف") || desc.includes("advance")) {
        cls = "bg-amber-500/15 border-amber-500/25 text-amber-400";
        icon = <ArrowUpRight size={10} />;
    } else if (desc.includes("راتب") || desc.includes("salary")) {
        cls = "bg-emerald-500/15 border-emerald-500/25 text-emerald-400";
        icon = <DollarSign size={10} />;
    } else if (desc.includes("سداد") || desc.includes("repay")) {
        cls = "bg-blue-500/15 border-blue-500/25 text-blue-400";
        icon = <ArrowDownLeft size={10} />;
    } else if (desc.includes("صرف") || desc.includes("pay")) {
        cls = "bg-rose-500/15 border-rose-500/25 text-rose-400";
        icon = <BanknoteIcon size={10} />;
    }

    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black ${cls}`}
        >
            {icon}
            {description?.slice(0, 40) || "—"}
        </span>
    );
};

// ─── Timeline Visual ───────────────────────────────────────────────────────

const BalanceTimeline: React.FC<{ entries: StatementEntry[] }> = ({
    entries,
}) => {
    if (entries.length === 0) return null;

    const maxBal = Math.max(
        ...entries.map((e) => Math.abs(e.running_balance)),
        1,
    );
    const minBal = Math.min(
        ...entries.map((e) => e.running_balance),
        0,
    );
    const range = Math.max(maxBal - minBal, 1);

    return (
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
                <Activity size={14} className="text-slate-500" />
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                    الخط الزمني للرصيد
                </span>
            </div>

            <div className="relative h-24">
                {/* Y-axis label */}
                <div className="absolute -right-1 top-0 text-[8px] text-slate-600 font-mono">
                    ₪{money(maxBal)}
                </div>
                <div className="absolute -right-1 bottom-0 text-[8px] text-slate-600 font-mono">
                    ₪{money(minBal)}
                </div>

                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pr-10">
                    <div className="border-t border-white/5" />
                    <div className="border-t border-white/5" />
                    <div className="border-t border-white/5" />
                    <div className="border-t border-white/5" />
                </div>

                {/* Bars */}
                <div className="absolute inset-0 flex items-end gap-1 pr-10 pb-1">
                    {entries.slice(-30).map((entry, idx) => {
                        const isPositive = entry.running_balance >= 0;
                        const heightPct = Math.abs(entry.running_balance) / range;
                        return (
                            <div
                                key={idx}
                                className="flex-1 flex flex-col items-center justify-end group"
                            >
                                <div
                                    className={`w-full rounded-t-sm transition-all duration-300 ${isPositive
                                        ? "bg-emerald-500/40 hover:bg-emerald-500/70"
                                        : "bg-rose-500/40 hover:bg-rose-500/70"
                                        }`}
                                    style={{ height: `${Math.max(heightPct * 100, 2)}%` }}
                                />
                                {/* Tooltip */}
                                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold whitespace-nowrap z-10 shadow-2xl transition-opacity">
                                    <p className="text-slate-400">{dateFmt(entry.date)}</p>
                                    <p
                                        className={
                                            isPositive ? "text-emerald-400" : "text-rose-400"
                                        }
                                    >
                                        ₪{money(entry.running_balance)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ─── جدول المعاملات المحسّن ──────────────────────────────────────────────

const TransactionTable: React.FC<{ entries: StatementEntry[] }> = ({
    entries,
}) => {
    const [searchTerm, setSearchTerm] = useState("");

    const filtered = searchTerm
        ? entries.filter(
            (e) =>
                (e.description ?? "")
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                (e.transaction_number ?? "")
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()),
        )
        : entries;

    return (
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden">
            {/* Header with search */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-slate-500" />
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                        سجل المعاملات ({entries.length})
                    </span>
                </div>
                <div className="relative">
                    <Search
                        size={12}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600"
                    />
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="بحث..."
                        className="bg-slate-950 border border-white/5 rounded-lg py-1.5 pr-8 pl-3 text-[11px] text-white outline-none focus:border-blue-500/40 w-40"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950/40 border-b border-white/5">
                        <tr className="text-slate-500 font-black uppercase tracking-wider text-[10px]">
                            <th className="px-4 py-3">التاريخ</th>
                            <th className="px-4 py-3">رقم القيد</th>
                            <th className="px-4 py-3">البيان</th>
                            <th className="px-4 py-3">الحساب</th>
                            <th className="px-4 py-3">المصدر</th>
                            <th className="px-4 py-3 text-center">مدين</th>
                            <th className="px-4 py-3 text-center">دائن</th>
                            <th className="px-4 py-3 text-center">الرصيد</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filtered.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-4 py-12 text-center text-slate-600 text-sm"
                                >
                                    <Search size={24} className="mx-auto mb-2 opacity-50" />
                                    لا توجد معاملات مطابقة
                                </td>
                            </tr>
                        ) : (
                            filtered.map((entry, idx) => {
                                const isAdvance =
                                    (entry.description ?? "")
                                        .toLowerCase()
                                        .includes("سلف") ||
                                    (entry.transaction_source ?? "")
                                        .toLowerCase()
                                        .includes("advance");
                                const isSalary =
                                    (entry.description ?? "")
                                        .toLowerCase()
                                        .includes("راتب") ||
                                    (entry.transaction_source ?? "")
                                        .toLowerCase()
                                        .includes("salary");

                                return (
                                    <motion.tr
                                        key={idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: Math.min(idx * 0.02, 0.4) }}
                                        className={`hover:bg-white/[0.02] transition-colors ${isAdvance
                                            ? "border-r-2 border-r-amber-500/30"
                                            : isSalary
                                                ? "border-r-2 border-r-emerald-500/30"
                                                : ""
                                            }`}
                                    >
                                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap font-medium">
                                            {dateFmt(entry.date)}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                                            {entry.transaction_number || "—"}
                                        </td>
                                        <td className="px-4 py-3 max-w-[200px]">
                                            <TypeBadge description={entry.description} />
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 max-w-[140px] truncate">
                                            {entry.account_name || "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {entry.transaction_source ? (
                                                <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-white/5 text-slate-400 text-[10px] font-bold whitespace-nowrap">
                                                    {entry.transaction_source}
                                                </span>
                                            ) : (
                                                <span className="text-slate-700">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono">
                                            {entry.debit > 0 ? (
                                                <span className="text-emerald-400 font-bold text-[11px]">
                                                    ₪{money(entry.debit)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-700">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono">
                                            {entry.credit > 0 ? (
                                                <span className="text-rose-400 font-bold text-[11px]">
                                                    ₪{money(entry.credit)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-700">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono">
                                            <span
                                                className={`font-black text-[12px] ${entry.running_balance >= 0
                                                    ? "text-blue-400"
                                                    : "text-rose-400"
                                                    }`}
                                            >
                                                ₪{money(entry.running_balance)}
                                            </span>
                                        </td>
                                    </motion.tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            {filtered.length > 0 && (
                <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between bg-slate-950/20">
                    <span className="text-[11px] text-slate-600 font-bold">
                        {filtered.length} معاملة
                    </span>
                    <div className="flex items-center gap-3 text-[11px] font-bold">
                        <span className="text-emerald-400">
                            مدين: ₪
                            {money(
                                filtered.reduce((s, e) => s + e.debit, 0),
                            )}
                        </span>
                        <span className="text-rose-400">
                            دائن: ₪
                            {money(
                                filtered.reduce((s, e) => s + e.credit, 0),
                            )}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── المكون الرئيسي ────────────────────────────────────────────────────────

const EmployeeStatement: React.FC<EmployeeStatementProps> = ({
    employeeId,
    employeeName,
}) => {
    const today = new Date();
    const defaultFrom = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
    )
        .toISOString()
        .split("T")[0];
    const defaultTo = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
    )
        .toISOString()
        .split("T")[0];

    const [fromDate, setFromDate] = useState(defaultFrom);
    const [toDate, setToDate] = useState(defaultTo);
    const [statementType, setStatementType] = useState<StatementType>("all");

    const [lines, setLines] = useState<StatementEntry[]>([]);
    const [closingBalance, setClosingBalance] = useState(0);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [summaryData, setSummaryData] = useState<{
        outstanding_advance?: number;
        accrued_salary?: number;
        net_payable?: number;
    }>({});

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStatement = useCallback(async () => {
        if (!fromDate || !toDate) return;
        try {
            setIsLoading(true);
            setError(null);
            const response = await financeService.getEmployeeStatement(
                employeeId,
                fromDate,
                toDate,
                statementType,
            );
            if (!response.success) {
                setError(response.message || "فشل جلب كشف الحساب");
                return;
            }
            const data = response.data as EmployeeStatementData;
            const extracted = extractLines(data, statementType);

            if (statementType === "all") {
                const rebuilt = rebuildUnifiedRunningBalance(
                    extracted.lines,
                    extracted.closingBalance,
                );
                setLines(rebuilt.entries);
                setClosingBalance(extracted.closingBalance);
            } catch (err: any) {
                setError(
                    err?.response?.data?.message ||
                    err?.message ||
                    "حدث خطأ غير متوقع",
                );
            } finally {
                setIsLoading(false);
            }
        }, [employeeId, fromDate, toDate, statementType]);

    useEffect(() => {
        fetchStatement();
    }, [fetchStatement]);

    const totalDebit = lines.reduce((s, e) => s + e.debit, 0);
    const totalCredit = lines.reduce((s, e) => s + e.credit, 0);
    const openingBalance =
        lines.length > 0
            ? lines[0].running_balance - (lines[0].debit - lines[0].credit)
            : 0;

    const typeOptions: { value: StatementType; label: string; icon: React.ElementType }[] =
        [
            { value: "all", label: "الكل", icon: PieChart },
            { value: "advance", label: "السلف", icon: ArrowUpRight },
            { value: "salary", label: "الرواتب", icon: DollarSign },
        ];

    return (
        <div className="space-y-5" dir="rtl">
            {/* ── Header / Filters ───────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-l from-slate-900 to-slate-950 border border-white/5 rounded-3xl p-5"
            >
                <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                    {/* Employee info */}
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-black text-lg shadow-xl">
                            {employeeName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                        </div>
                        <div className="text-right">
                            <h3 className="text-lg font-black text-white">
                                كشف حساب {employeeName}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                                من {dateFmt(fromDate)} إلى {dateFmt(toDate)}
                            </p>
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Calendar
                                size={12}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                            />
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="bg-slate-950 border border-white/5 rounded-xl py-2 pr-8 pl-3 text-[11px] text-white outline-none focus:border-blue-500/50 w-36"
                            />
                        </div>
                        <span className="text-slate-600 text-[10px]">—</span>
                        <div className="relative">
                            <Calendar
                                size={12}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                            />
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="bg-slate-950 border border-white/5 rounded-xl py-2 pr-8 pl-3 text-[11px] text-white outline-none focus:border-blue-500/50 w-36"
                            />
                        </div>
                    </div>

                    {/* Type Filter + Refresh */}
                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-950 border border-white/5 rounded-xl p-0.5 gap-0.5">
                            {typeOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setStatementType(opt.value)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${statementType === opt.value
                                        ? "bg-blue-600 text-white shadow-lg"
                                        : "text-slate-400 hover:text-white"
                                        }`}
                                >
                                    <opt.icon size={12} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={fetchStatement}
                            disabled={isLoading}
                            className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                        >
                            <RefreshCw
                                size={14}
                                className={isLoading ? "animate-spin" : ""}
                            />
                        </button>

                        <button className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all">
                            <Printer size={14} />
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* ── Summary Cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <SummaryCard
                    label="الرصيد الافتتاحي"
                    value={openingBalance}
                    icon={Activity}
                    color="text-slate-300"
                    bg="bg-slate-800/40"
                    border="border-white/5"
                    trend={openingBalance >= 0 ? "up" : "down"}
                />
                <SummaryCard
                    label="إجمالي مدين"
                    value={totalDebit}
                    icon={TrendingUp}
                    color="text-emerald-400"
                    bg="bg-emerald-500/10"
                    border="border-emerald-500/20"
                    trend="up"
                    subtitle={`${lines.filter((l) => l.debit > 0).length} معاملة`}
                />
                <SummaryCard
                    label="إجمالي دائن"
                    value={totalCredit}
                    icon={TrendingDown}
                    color="text-rose-400"
                    bg="bg-rose-500/10"
                    border="border-rose-500/20"
                    trend="down"
                    subtitle={`${lines.filter((l) => l.credit > 0).length} معاملة`}
                />
                <SummaryCard
                    label="الرصيد الختامي"
                    value={closingBalance}
                    icon={Wallet}
                    color={
                        closingBalance >= 0 ? "text-blue-400" : "text-rose-400"
                    }
                    bg={
                        closingBalance >= 0
                            ? "bg-blue-500/10"
                            : "bg-rose-500/10"
                    }
                    border={
                        closingBalance >= 0
                            ? "border-blue-500/20"
                            : "border-rose-500/20"
                    }
                    trend={closingBalance >= 0 ? "up" : "down"}
                />
            </div>

            {/* ── Employee Financial Summary ──────────────────────────── */}
            {(summaryData.outstanding_advance !== undefined ||
                summaryData.accrued_salary !== undefined ||
                summaryData.net_payable !== undefined) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-l from-slate-900 to-slate-950 border border-white/5 rounded-2xl p-5"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Wallet size={14} className="text-slate-500" />
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                الملخص المالي للموظف
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {summaryData.outstanding_advance !== undefined && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                                        السلف القائمة
                                    </p>
                                    <p className="text-xl font-black font-mono text-amber-400">
                                        ₪{money(summaryData.outstanding_advance)}
                                    </p>
                                    <p className="text-[10px] text-slate-600 font-bold mt-1">
                                        إجمالي السلف غير المسددة
                                    </p>
                                </div>
                            )}

                            {summaryData.accrued_salary !== undefined && (
                                <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                                        الرواتب المستحقة
                                    </p>
                                    <p className="text-xl font-black font-mono text-purple-400">
                                        ₪{money(summaryData.accrued_salary)}
                                    </p>
                                    <p className="text-[10px] text-slate-600 font-bold mt-1">
                                        إجمالي الرواتب غير المدفوعة
                                    </p>
                                </div>
                            )}

                            {summaryData.net_payable !== undefined && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                                        صافي المستحق
                                    </p>
                                    <p className="text-xl font-black font-mono text-emerald-400">
                                        ₪{money(summaryData.net_payable)}
                                    </p>
                                    <p className="text-[10px] text-slate-600 font-bold mt-1">
                                        {summaryData.outstanding_advance && summaryData.outstanding_advance > 0
                                            ? `بعد خصم السلف (₪${money(summaryData.outstanding_advance)})`
                                            : "صافي الراتب المستحق"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

            {/* ── Timeline ───────────────────────────────────────────── */}
            {!isLoading && lines.length > 0 && (
                <BalanceTimeline entries={lines} />
            )}

            {/* ── Table / States ─────────────────────────────────────── */}
            {isLoading ? (
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl flex items-center justify-center h-48">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                        <RefreshCw size={20} className="animate-spin" />
                        <span className="text-sm font-bold">
                            جاري تحميل كشف الحساب...
                        </span>
                    </div>
                </div>
            ) : error ? (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 text-rose-400 text-sm font-bold flex items-center gap-3">
                    <Activity size={18} />
                    {error}
                </div>
            ) : lines.length === 0 ? (
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl flex flex-col items-center justify-center h-48 gap-3">
                    <Wallet size={32} className="text-slate-700" />
                    <p className="text-slate-600 font-black text-sm">
                        لا توجد معاملات مالية في هذه الفترة
                    </p>
                    <p className="text-[11px] text-slate-700 font-bold">
                        قم بتغيير نطاق التاريخ أو نوع المعاملات
                    </p>
                </div>
            ) : (
                <>
                    <TransactionTable entries={lines} />

                    {/* Footer info */}
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] text-slate-600 font-bold">
                            {lines.length} معاملة مالية
                        </span>
                        <span className="text-[11px] text-slate-600 font-bold font-mono">
                            {fromDate} — {toDate}
                        </span>
                    </div>
                </>
            )}
        </div>
    );
};

export default EmployeeStatement;