// src/components/administration/GL/EmployeeStatement.tsx
//
// ✅ تم التحديث:
// 1. متوافق مع الـ dark theme الموجود في المشروع
// 2. استخدام النوع الصحيح ApiResponse<EmployeeStatementData> بدلاً من StatementEntry[]
// 3. دعم فلتر نوع الكشف: all / advance / salary
// 4. الأرصدة تُقرأ من الباك مباشرة — لا حساب يدوي
// 5. مكوّنات فرعية مُعاد استخدامها (StatSummaryCard, StatementTable)
// 6. RTL كامل

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw, TrendingUp, TrendingDown, Wallet, Activity } from 'lucide-react';
import { financeService } from '../../../services/financeService';
import type { StatementEntry, EmployeeStatementData } from '../../../services/financeService';

// ─── Types ─────────────────────────────────────────────────────────────────

type StatementType = 'all' | 'advance' | 'salary';

interface EmployeeStatementProps {
    employeeId: number;
    employeeName: string;
}

// ─── Helper: extract lines + closing balance from API response ─────────────

function extractLines(
    data: EmployeeStatementData,
    type: StatementType,
): { lines: StatementEntry[]; closingBalance: number } {
    const { accounts = {} } = data;

    if (type === 'advance' && accounts.advance) {
        return {
            lines: accounts.advance.lines ?? [],
            closingBalance: accounts.advance.closing_balance ?? 0,
        };
    }

    if (type === 'salary' && accounts.salary) {
        return {
            lines: accounts.salary.lines ?? [],
            closingBalance: accounts.salary.closing_balance ?? 0,
        };
    }

    // all: merge + sort by date
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

// ─── Sub-component: Summary Card ──────────────────────────────────────────

interface SummaryCardProps {
    label: string;
    value: number;
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    formatAsCurrency?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
    label, value, icon: Icon, color, bg, border, formatAsCurrency = true,
}) => (
    <div className={`${bg} border ${border} rounded-2xl p-4`}>
        <div className={`w-8 h-8 rounded-xl ${bg} border ${border} flex items-center justify-center ${color} mb-2`}>
            <Icon size={15} />
        </div>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-lg font-black font-mono ${color}`}>
            {formatAsCurrency
                ? `₪${Math.abs(value).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}`
                : value.toLocaleString('ar-SA')}
        </p>
    </div>
);

// ─── Sub-component: Statement Table ───────────────────────────────────────

const StatementTable: React.FC<{ entries: StatementEntry[] }> = ({ entries }) => (
    <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/60 border-b border-white/5">
                <tr className="text-slate-500 font-black uppercase tracking-wider">
                    <th className="px-4 py-3">التاريخ</th>
                    <th className="px-4 py-3">المرجع</th>
                    <th className="px-4 py-3">البيان</th>
                    <th className="px-4 py-3">الحساب</th>
                    <th className="px-4 py-3">المصدر</th>
                    <th className="px-4 py-3 text-center">مدين</th>
                    <th className="px-4 py-3 text-center">دائن</th>
                    <th className="px-4 py-3 text-center">الرصيد</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {entries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.025] transition-colors">
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                            {new Date(entry.date).toLocaleDateString('ar-SA')}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            {entry.transaction_number || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 max-w-[180px] truncate">
                            {entry.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 max-w-[140px] truncate">
                            {entry.account_name || '—'}
                        </td>
                        <td className="px-4 py-3">
                            {entry.transaction_source ? (
                                <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-white/5 text-slate-400 text-[10px] font-bold whitespace-nowrap">
                                    {entry.transaction_source}
                                </span>
                            ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                            {entry.debit > 0 ? (
                                <span className="text-emerald-400 font-bold">
                                    ₪{entry.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                                </span>
                            ) : <span className="text-slate-700">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                            {entry.credit > 0 ? (
                                <span className="text-rose-400 font-bold">
                                    ₪{entry.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                                </span>
                            ) : <span className="text-slate-700">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-black">
                            <span className={entry.running_balance >= 0 ? 'text-blue-400' : 'text-rose-400'}>
                                ₪{entry.running_balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// ─── Main Component ────────────────────────────────────────────────────────

const EmployeeStatement: React.FC<EmployeeStatementProps> = ({ employeeId, employeeName }) => {
    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString().split('T')[0];
    const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        .toISOString().split('T')[0];

    const [fromDate, setFromDate] = useState(defaultFrom);
    const [toDate, setToDate] = useState(defaultTo);
    const [statementType, setStatementType] = useState<StatementType>('all');

    const [lines, setLines] = useState<StatementEntry[]>([]);
    const [closingBalance, setClosingBalance] = useState(0);
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
                employeeId, fromDate, toDate, statementType,
            );
            if (!response.success) {
                setError(response.message || 'فشل جلب كشف الحساب');
                return;
            }
            const data = response.data as EmployeeStatementData;
            const extracted = extractLines(data, statementType);
            setLines(extracted.lines);
            setClosingBalance(extracted.closingBalance);
            setSummaryData({
                outstanding_advance: data.outstanding_advance,
                accrued_salary: data.accrued_salary,
                net_payable: data.net_payable,
            });
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'حدث خطأ غير متوقع');
        } finally {
            setIsLoading(false);
        }
    }, [employeeId, fromDate, toDate, statementType]);

    useEffect(() => {
        fetchStatement();
    }, [fetchStatement]);

    const totalDebit = lines.reduce((s, e) => s + e.debit, 0);
    const totalCredit = lines.reduce((s, e) => s + e.credit, 0);
    const openingBalance = lines.length > 0
        ? lines[0].running_balance - (lines[0].debit - lines[0].credit)
        : 0;

    const typeOptions: { value: StatementType; label: string }[] = [
        { value: 'all', label: 'الكل' },
        { value: 'advance', label: 'السلف' },
        { value: 'salary', label: 'الرواتب' },
    ];

    return (
        <div className="space-y-5" dir="rtl">

            {/* Filter Bar */}
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                <div className="flex flex-col md:flex-row md:items-end gap-4">

                    {/* Date Range */}
                    <div className="flex items-center gap-3 flex-1">
                        <div className="flex-1">
                            <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">
                                من التاريخ
                            </label>
                            <div className="relative">
                                <Calendar size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={e => setFromDate(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-2.5 pr-8 pl-3 text-xs text-white outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">
                                إلى التاريخ
                            </label>
                            <div className="relative">
                                <Calendar size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={e => setToDate(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-2.5 pr-8 pl-3 text-xs text-white outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Statement Type Filter */}
                    <div>
                        <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">
                            نوع الكشف
                        </label>
                        <div className="flex items-center bg-slate-950/50 border border-white/5 rounded-xl p-1 gap-1">
                            {typeOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setStatementType(opt.value)}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${statementType === opt.value
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={fetchStatement}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-black transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                        تحديث
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <SummaryCard
                    label="الرصيد الافتتاحي"
                    value={openingBalance}
                    icon={Activity}
                    color="text-slate-300"
                    bg="bg-slate-800/40"
                    border="border-white/5"
                />
                <SummaryCard
                    label="إجمالي مدين"
                    value={totalDebit}
                    icon={TrendingUp}
                    color="text-emerald-400"
                    bg="bg-emerald-500/10"
                    border="border-emerald-500/20"
                />
                <SummaryCard
                    label="إجمالي دائن"
                    value={totalCredit}
                    icon={TrendingDown}
                    color="text-rose-400"
                    bg="bg-rose-500/10"
                    border="border-rose-500/20"
                />
                <SummaryCard
                    label="الرصيد الختامي"
                    value={closingBalance}
                    icon={Wallet}
                    color={closingBalance >= 0 ? 'text-blue-400' : 'text-rose-400'}
                    bg={closingBalance >= 0 ? 'bg-blue-500/10' : 'bg-rose-500/10'}
                    border={closingBalance >= 0 ? 'border-blue-500/20' : 'border-rose-500/20'}
                />
            </div>

            {/* Employee-specific summary (advance/salary breakdown) */}
            {(summaryData.outstanding_advance !== undefined ||
                summaryData.accrued_salary !== undefined ||
                summaryData.net_payable !== undefined) && (
                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3">
                            ملخص الوضع المالي للموظف
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                            {summaryData.outstanding_advance !== undefined && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 font-black mb-1">سلف قائمة</p>
                                    <p className="text-sm font-black font-mono text-amber-400">
                                        ₪{summaryData.outstanding_advance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            )}
                            {summaryData.accrued_salary !== undefined && (
                                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 font-black mb-1">رواتب مستحقة</p>
                                    <p className="text-sm font-black font-mono text-purple-400">
                                        ₪{summaryData.accrued_salary.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            )}
                            {summaryData.net_payable !== undefined && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 font-black mb-1">صافي المستحق</p>
                                    <p className="text-sm font-black font-mono text-emerald-400">
                                        ₪{summaryData.net_payable.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            {/* Table / States */}
            {isLoading ? (
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl flex items-center justify-center h-40">
                    <div className="flex items-center gap-3 text-slate-500">
                        <RefreshCw size={16} className="animate-spin" />
                        <span className="text-sm font-bold">جاري تحميل البيانات...</span>
                    </div>
                </div>
            ) : error ? (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-400 text-sm font-bold">
                    {error}
                </div>
            ) : lines.length === 0 ? (
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl flex flex-col items-center justify-center h-40 gap-2">
                    <Activity size={28} className="text-slate-700" />
                    <p className="text-slate-600 font-black text-sm">لا توجد معاملات في هذه الفترة</p>
                </div>
            ) : (
                <StatementTable entries={lines} />
            )}

            {/* Row count footer */}
            {lines.length > 0 && (
                <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] text-slate-600 font-bold">
                        {lines.length} معاملة
                    </span>
                    <span className="text-[11px] text-slate-600 font-bold">
                        {fromDate} — {toDate}
                    </span>
                </div>
            )}
        </div>
    );
};

export default EmployeeStatement;