// src/components/administration/GL/EmployeeLoansList.tsx
//
// ✅ إعادة تصميم متوافق مع Dark Theme
// ✅ استخدام كشف حساب الموظف من API بدلاً من loans API المنفصل
// ✅ عرض السلف والرواتب في جدول واحد

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Wallet, RefreshCw, ArrowUpRight, ArrowDownLeft,
    DollarSign, AlertCircle, FileText,
} from 'lucide-react';
import { financeService } from '../../../services/financeService';
import type { StatementEntry } from '../../../services/financeService';

interface EmployeeLoansListProps {
    employeeId: number;
}

const money = (v: number) =>
    new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2 }).format(v);

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

const EmployeeLoansList: React.FC<EmployeeLoansListProps> = ({ employeeId }) => {
    const [transactions, setTransactions] = useState<StatementEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<{
        outstanding_advance?: number;
        accrued_salary?: number;
        net_payable?: number;
    }>({});

    useEffect(() => {
        fetchData();
    }, [employeeId]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // جلب كشف حساب الموظف بالكامل
            const today = new Date();
            const from = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
            const to = today.toISOString().split('T')[0];

            const response = await financeService.getEmployeeStatement(employeeId, {
                from,
                to,
                type: "all",
            });

            if (!response.success) {
                setError(response.message || 'فشل جلب البيانات');
                return;
            }

            const data = response.data as any;
            const allTransactions: StatementEntry[] = [];

            // جمع كل المعاملات من advance و salary
            if (data.accounts?.advance?.lines) {
                allTransactions.push(...data.accounts.advance.lines);
            }
            if (data.accounts?.salary?.lines) {
                allTransactions.push(...data.accounts.salary.lines);
            }

            // ترتيب حسب التاريخ
            allTransactions.sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            );

            setTransactions(allTransactions);
            setSummary({
                outstanding_advance: data.outstanding_advance,
                accrued_salary: data.accrued_salary,
                net_payable: data.net_payable,
            });
        } catch (err: any) {
            setError(err?.response?.data?.message || err.message || 'فشل في جلب السلف');
        } finally {
            setIsLoading(false);
        }
    };

    // تجميع حسب النوع
    const advanceTotal = transactions
        .filter(t => t.transaction_source?.toLowerCase().includes('advance') ||
            t.description?.toLowerCase().includes('سلف'))
        .reduce((s, t) => s + t.debit, 0);

    const repaymentTotal = transactions
        .filter(t => t.description?.toLowerCase().includes('سداد'))
        .reduce((s, t) => s + t.credit, 0);

    if (isLoading) {
        return (
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl flex items-center justify-center h-40">
                <div className="flex items-center gap-3 text-slate-500">
                    <RefreshCw size={18} className="animate-spin" />
                    <span className="text-sm font-bold">جاري تحميل السلف...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 text-rose-400 text-sm font-bold flex items-center gap-3">
                <AlertCircle size={18} />
                {error}
                <button
                    onClick={fetchData}
                    className="mr-auto px-4 py-1.5 bg-rose-600/20 border border-rose-500/30 rounded-xl text-[11px] hover:bg-rose-600/40 transition-all"
                >
                    إعادة المحاولة
                </button>
            </div>
        );
    }

    // استخراج السلف (debit = سحب/سلفة)
    const advances = transactions.filter(t => t.debit > 0 && (
        t.transaction_source?.toLowerCase().includes('advance') ||
        t.description?.toLowerCase().includes('سلف')
    ));
    const repayments = transactions.filter(t => t.credit > 0 && (
        t.description?.toLowerCase().includes('سداد')
    ));

    return (
        <div className="space-y-4" dir="rtl">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4"
                >
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                        إجمالي السلف
                    </p>
                    <p className="text-lg font-black font-mono text-amber-400">
                        ₪{money(advanceTotal)}
                    </p>
                    <p className="text-[10px] text-slate-600 font-bold mt-1">
                        {advances.length} سلفة
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4"
                >
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                        إجمالي المسدد
                    </p>
                    <p className="text-lg font-black font-mono text-emerald-400">
                        ₪{money(repaymentTotal)}
                    </p>
                    <p className="text-[10px] text-slate-600 font-bold mt-1">
                        {repayments.length} دفعة
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4"
                >
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                        السلف القائمة
                    </p>
                    <p className="text-lg font-black font-mono text-blue-400">
                        ₪{money(summary.outstanding_advance ?? 0)}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4"
                >
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                        صافي المستحق
                    </p>
                    <p className="text-lg font-black font-mono text-purple-400">
                        ₪{money(summary.net_payable ?? 0)}
                    </p>
                </motion.div>
            </div>

            {/* Transaction Log */}
            {transactions.length === 0 ? (
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl flex flex-col items-center justify-center h-40 gap-2">
                    <Wallet size={32} className="text-slate-700" />
                    <p className="text-slate-600 font-black text-sm">لا توجد سلف أو قروض للموظف</p>
                </div>
            ) : (
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <FileText size={14} className="text-slate-500" />
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                سجل السلف والمدفوعات ({transactions.length})
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead className="bg-slate-950/40 border-b border-white/5">
                                <tr className="text-slate-500 font-black uppercase tracking-wider text-[10px]">
                                    <th className="px-4 py-3">التاريخ</th>
                                    <th className="px-4 py-3">البيان</th>
                                    <th className="px-4 py-3">المصدر</th>
                                    <th className="px-4 py-3 text-center">سحب (سلفة)</th>
                                    <th className="px-4 py-3 text-center">دفع (تسديد)</th>
                                    <th className="px-4 py-3 text-center">الرصيد</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {transactions.map((t, idx) => {
                                    const isAdvance = t.debit > 0;
                                    return (
                                        <motion.tr
                                            key={idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: Math.min(idx * 0.03, 0.4) }}
                                            className={`hover:bg-white/[0.02] transition-colors ${isAdvance ? 'border-r-2 border-r-amber-500/30' : 'border-r-2 border-r-emerald-500/30'
                                                }`}
                                        >
                                            <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                                                {dateFmt(t.date)}
                                            </td>
                                            <td className="px-4 py-3 max-w-[180px]">
                                                <span className="text-slate-400">{t.description || '—'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {t.transaction_source ? (
                                                    <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-white/5 text-slate-400 text-[10px] font-bold">
                                                        {t.transaction_source}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-700">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono">
                                                {t.debit > 0 ? (
                                                    <span className="text-amber-400 font-bold flex items-center justify-center gap-1">
                                                        <ArrowUpRight size={11} />
                                                        ₪{money(t.debit)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-700">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono">
                                                {t.credit > 0 ? (
                                                    <span className="text-emerald-400 font-bold flex items-center justify-center gap-1">
                                                        <ArrowDownLeft size={11} />
                                                        ₪{money(t.credit)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-700">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono">
                                                <span className={`font-black ${t.running_balance >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                                                    ₪{money(t.running_balance)}
                                                </span>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary Footer */}
                    <div className="px-4 py-3 border-t border-white/5 bg-slate-950/20 grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-[10px] text-slate-600 font-bold">إجمالي السلف: </span>
                            <span className="text-[11px] font-black font-mono text-amber-400">
                                ₪{money(advanceTotal)}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-600 font-bold">إجمالي المسدد: </span>
                            <span className="text-[11px] font-black font-mono text-emerald-400">
                                ₪{money(repaymentTotal)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeLoansList;