import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, FileText, RefreshCw, Wallet, X } from "lucide-react";
import EmployeeStatement from "./EmployeeStatement";
import { useAccountStatement } from "../../../hooks/useAccountStatement";

interface AccountStatementModalProps {
    entityType: "employee" | "customer" | "supplier";
    entityId: number | null;
    entityName: string;
    isOpen: boolean;
    onClose: () => void;
}

const money = (value: number) =>
    (value || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const dateFmt = (value: string) => {
    try {
        return new Date(value).toLocaleDateString("ar-SA", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    } catch {
        return value;
    }
};

const SubledgerStatementView: React.FC<{
    entityType: "customer" | "supplier";
    entityId: number;
    entityName: string;
}> = ({ entityType, entityId, entityName }) => {
    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
    const defaultTo = today.toISOString().slice(0, 10);

    const [from, setFrom] = useState(defaultFrom);
    const [to, setTo] = useState(defaultTo);
    const { lines, closingBalance, openingBalance, isLoading, error, refetch } =
        useAccountStatement(entityType, entityId, from, to);

    const totals = useMemo(
        () => ({
            debit: lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0),
            credit: lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0),
        }),
        [lines],
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                    <Calendar
                        size={12}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                    />
                    <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
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
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="bg-slate-950 border border-white/5 rounded-xl py-2 pr-8 pl-3 text-[11px] text-white outline-none focus:border-blue-500/50 w-36"
                    />
                </div>
                <button
                    onClick={refetch}
                    className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white transition-all"
                    type="button"
                >
                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                </button>
            </div>

            {error ? (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-400 text-sm font-bold">
                    {error}
                </div>
            ) : null}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-950 border border-white/5 rounded-2xl p-4">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                        الرصيد الافتتاحي
                    </p>
                    <p className="text-sm font-black font-mono text-slate-300">
                        ₪{money(openingBalance)}
                    </p>
                </div>
                <div className="bg-slate-950 border border-white/5 rounded-2xl p-4">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                        إجمالي مدين
                    </p>
                    <p className="text-sm font-black font-mono text-emerald-400">
                        ₪{money(totals.debit)}
                    </p>
                </div>
                <div className="bg-slate-950 border border-white/5 rounded-2xl p-4">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                        إجمالي دائن
                    </p>
                    <p className="text-sm font-black font-mono text-rose-400">
                        ₪{money(totals.credit)}
                    </p>
                </div>
                <div className="bg-slate-950 border border-white/5 rounded-2xl p-4">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                        الرصيد الختامي
                    </p>
                    <p className="text-sm font-black font-mono text-blue-400">
                        ₪{money(closingBalance)}
                    </p>
                </div>
            </div>

            <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-x-auto">
                <table className="w-full text-xs min-w-[900px]">
                    <thead className="bg-slate-950/40 border-b border-white/5">
                        <tr className="text-slate-500 font-black text-[10px]">
                            <th className="text-right px-4 py-3">التاريخ</th>
                            <th className="text-right px-4 py-3">رقم القيد</th>
                            <th className="text-right px-4 py-3">البيان</th>
                            <th className="text-right px-4 py-3">الحساب</th>
                            <th className="text-right px-4 py-3">المصدر</th>
                            <th className="text-right px-4 py-3">مدين</th>
                            <th className="text-right px-4 py-3">دائن</th>
                            <th className="text-right px-4 py-3">الرصيد</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {isLoading ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-16 text-center text-slate-500">
                                    <RefreshCw size={20} className="mx-auto mb-2 animate-spin" />
                                    جاري تحميل كشف حساب {entityName}
                                </td>
                            </tr>
                        ) : lines.length ? (
                            lines.map((line, index) => (
                                <tr key={`${line.transaction_number}-${index}`} className="hover:bg-white/[0.02]">
                                    <td className="px-4 py-3 text-slate-300 font-mono text-[10px]">
                                        {dateFmt(line.date)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">
                                        {line.transaction_number}
                                    </td>
                                    <td className="px-4 py-3 text-slate-300 text-[11px]">
                                        {line.description || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-[10px]">
                                        {line.account_name || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-[10px]">
                                        {line.transaction_source || "—"}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-emerald-400">
                                        {line.debit > 0 ? money(line.debit) : "—"}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-rose-400">
                                        {line.credit > 0 ? money(line.credit) : "—"}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-blue-400">
                                        ₪{money(line.running_balance)}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="px-4 py-16 text-center text-slate-500">
                                    لا توجد حركات خلال هذه الفترة
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AccountStatementModal: React.FC<AccountStatementModalProps> = ({
    entityType,
    entityId,
    entityName,
    isOpen,
    onClose,
}) => {
    const [activeTab, setActiveTab] = React.useState<"statement" | "loans">("statement");

    if (!isOpen || !entityId) return null;

    return (
        <AnimatePresence>
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
                    className="relative w-full max-w-5xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
                >
                    <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.07] bg-gradient-to-l from-red-950/25 to-transparent">
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                            type="button"
                        >
                            <X size={15} />
                        </button>
                        <div className="text-right">
                            <h3 className="text-[17px] font-black text-white leading-tight">
                                {entityType === "employee" ? "السجل المالي للموظف" : "كشف الحساب"}
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{entityName}</p>
                        </div>
                    </div>

                    {entityType === "employee" && (
                        <div className="px-7 border-b border-white/[0.06] flex gap-1 bg-slate-950/30">
                            <button
                                onClick={() => setActiveTab("statement")}
                                className={`flex items-center gap-2 px-5 py-3.5 text-[12px] font-black border-b-2 transition-all ${activeTab === "statement"
                                    ? "border-red-500 text-white"
                                    : "border-transparent text-slate-500 hover:text-slate-300"
                                    }`}
                            >
                                <FileText size={14} />
                                كشف الحساب العام
                            </button>
                            <button
                                onClick={() => setActiveTab("loans")}
                                className={`flex items-center gap-2 px-5 py-3.5 text-[12px] font-black border-b-2 transition-all ${activeTab === "loans"
                                    ? "border-red-500 text-white"
                                    : "border-transparent text-slate-500 hover:text-slate-300"
                                    }`}
                            >
                                <Wallet size={14} />
                                سجل السلف والقروض
                            </button>
                        </div>
                    )}

                    <div className="flex-grow overflow-y-auto custom-scrollbar p-6">
                        {entityType === "employee" ? (
                            activeTab === "statement" ? (
                                <EmployeeStatement employeeId={entityId} employeeName={entityName} />
                            ) : (
                                <div className="text-center py-20 text-slate-600 font-bold">
                                    <Wallet size={40} className="mx-auto mb-3 text-slate-700" />
                                    سجل السلف والقروض متاح من شاشة الموظف
                                </div>
                            )
                        ) : (
                            <SubledgerStatementView
                                entityType={entityType}
                                entityId={entityId}
                                entityName={entityName}
                            />
                        )}
                    </div>

                    <div className="px-7 py-4 border-t border-white/[0.07] bg-slate-950/50 flex justify-start">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl font-black text-xs transition-all"
                        >
                            إغلاق
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AccountStatementModal;
