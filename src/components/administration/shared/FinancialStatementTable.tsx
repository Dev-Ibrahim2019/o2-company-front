// src/components/administration/shared/FinancialStatementTable.tsx
// Reusable ERP-Grade Statement Component — Odoo/ERPNext Style

import React from "react";
import { Search, Download, Printer, RefreshCw } from "lucide-react";

const money = (v: number) => v?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00";
const dateFmt = (d: string) => { try { return new Date(d).toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };

export interface StatementLine {
    date: string;
    transaction_number: string;
    type: string;
    description: string | null;
    account_name?: string;
    account_code?: string;
    debit: number;
    credit: number;
    balance: number;
}

export interface StatementData {
    lines: StatementLine[];
    opening_balance: number;
    closing_balance: number;
    total_debit: number;
    total_credit: number;
}

interface FinancialStatementTableProps {
    statement: StatementData | null;
    loading: boolean;
    from: string;
    to: string;
    onFromChange: (v: string) => void;
    onToChange: (v: string) => void;
    onSearch: () => void;
    isSupplier?: boolean;
}

const typeBadge = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
        sale: { label: "فاتورة مبيعات", color: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
        purchase: { label: "فاتورة مشتريات", color: "bg-rose-500/15 text-rose-400 border-rose-500/25" },
        receipt: { label: "دفعة", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
        payment: { label: "دفعة", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
        adjustment: { label: "تسوية", color: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
        opening: { label: "رصيد افتتاحي", color: "bg-violet-500/15 text-violet-400 border-violet-500/25" },
        journal: { label: "قيد يومية", color: "bg-slate-500/15 text-slate-400 border-slate-500/25" },
        "write-off": { label: "شطب", color: "bg-red-500/15 text-red-400 border-red-500/25" },
        invoice: { label: "فاتورة", color: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
        bill: { label: "فاتورة", color: "bg-rose-500/15 text-rose-400 border-rose-500/25" },
    };
    const m = map[type] || { label: type, color: "bg-slate-500/15 text-slate-400 border-slate-500/25" };
    return <span className={`px-2 py-0.5 rounded text-[8px] font-black border ${m.color}`}>{m.label}</span>;
};

const FinancialStatementTable: React.FC<FinancialStatementTableProps> = ({
    statement, loading, from, to, onFromChange, onToChange, onSearch, isSupplier = false,
}) => {
    return (
        <div className="space-y-4">
            {/* Date Range & Actions */}
            <div className="flex flex-wrap items-center gap-3">
                <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)}
                    className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50" />
                <span className="text-slate-500 text-xs">إلى</span>
                <input type="date" value={to} onChange={(e) => onToChange(e.target.value)}
                    className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50" />
                <button onClick={onSearch} className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400 hover:bg-blue-600/20 transition-all">
                    <Search size={14} />
                </button>
                <button className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 hover:bg-amber-500/20 transition-all">
                    <Download size={14} />
                </button>
                <button className="p-2 bg-slate-500/10 border border-slate-500/20 rounded-xl text-slate-400 hover:bg-slate-500/20 transition-all">
                    <Printer size={14} />
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <RefreshCw size={24} className="animate-spin text-slate-600" />
                </div>
            ) : statement && statement.lines?.length > 0 ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-slate-950 border border-white/5 rounded-xl p-3">
                            <p className="text-[10px] text-slate-500 font-bold">الرصيد الافتتاحي</p>
                            <p className="text-sm font-black font-mono text-slate-300">₪{money(statement.opening_balance)}</p>
                        </div>
                        <div className="bg-slate-950 border border-white/5 rounded-xl p-3">
                            <p className="text-[10px] text-slate-500 font-bold">إجمالي المدين</p>
                            <p className={`text-sm font-black font-mono ${isSupplier ? "text-emerald-400" : "text-rose-400"}`}>₪{money(statement.total_debit)}</p>
                        </div>
                        <div className="bg-slate-950 border border-white/5 rounded-xl p-3">
                            <p className="text-[10px] text-slate-500 font-bold">إجمالي الدائن</p>
                            <p className={`text-sm font-black font-mono ${isSupplier ? "text-rose-400" : "text-emerald-400"}`}>₪{money(statement.total_credit)}</p>
                        </div>
                        <div className="bg-slate-950 border border-white/5 rounded-xl p-3">
                            <p className="text-[10px] text-slate-500 font-bold">الرصيد الختامي</p>
                            <p className={`text-sm font-black font-mono ${statement.closing_balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>₪{money(Math.abs(statement.closing_balance))}</p>
                        </div>
                    </div>

                    {/* Statement Table */}
                    <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-x-auto">
                        <div className="min-w-[1100px]">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-950/40 border-b border-white/5 sticky top-0 z-10">
                                    <tr className="text-slate-500 font-black text-[10px]">
                                        <th className="text-right px-4 py-3">التاريخ</th>
                                        <th className="text-right px-4 py-3">النوع</th>
                                        <th className="text-right px-4 py-3">البيان</th>
                                        <th className="text-right px-4 py-3">رقم المعاملة</th>
                                        <th className="text-right px-4 py-3">الحساب</th>
                                        <th className="text-right px-4 py-3">مدين</th>
                                        <th className="text-right px-4 py-3">دائن</th>
                                        <th className="text-right px-4 py-3">الرصيد</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {statement.lines.map((line, i) => {
                                        const isDebit = isSupplier ? line.debit > 0 : line.debit > 0;
                                        return (
                                            <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-4 py-3 text-slate-300 font-mono text-[10px]">{dateFmt(line.date)}</td>
                                                <td className="px-4 py-3">{typeBadge(line.type)}</td>
                                                <td className="px-4 py-3">
                                                    <p className="text-slate-300 text-[11px]">{line.description || line.type}</p>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 font-mono text-[9px]">{line.transaction_number || "—"}</td>
                                                <td className="px-4 py-3 text-slate-500 text-[9px]">{line.account_name || "—"}</td>
                                                <td className={`px-4 py-3 font-mono text-[11px] ${line.debit > 0 ? (isSupplier ? "text-emerald-400 font-bold" : "text-rose-400 font-bold") : "text-slate-600"}`}>
                                                    {line.debit > 0 ? money(line.debit) : "—"}
                                                </td>
                                                <td className={`px-4 py-3 font-mono text-[11px] ${line.credit > 0 ? (isSupplier ? "text-rose-400 font-bold" : "text-emerald-400 font-bold") : "text-slate-600"}`}>
                                                    {line.credit > 0 ? money(line.credit) : "—"}
                                                </td>
                                                <td className={`px-4 py-3 font-mono font-bold text-[11px] ${line.balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                                    ₪{money(Math.abs(line.balance))}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer Summary */}
                    <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-950/40 border border-white/5 rounded-xl px-4 py-3">
                        <span>{statement.lines.length} معاملة</span>
                        <span>الرصيد الختامي: <strong className="text-white font-black">₪{money(Math.abs(statement.closing_balance))}</strong></span>
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center h-64 text-slate-500 font-bold">
                    لا توجد حركات في هذه الفترة
                </div>
            )}
        </div>
    );
};

export default FinancialStatementTable;