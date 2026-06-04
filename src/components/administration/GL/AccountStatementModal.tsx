// src/components/administration/GL/AccountStatementModal.tsx
//
// إصلاحات:
// 1. استخدام الحقول الصحيحة من الباك (transaction_number, balance)
// 2. عرض ملخص مالي للموظفين (سلف + رواتب)
// 3. دعم نوع الكشف للموظفين (all/advance/salary)
// 4. تحسين UX وتصميم متوافق مع باقي الواجهات

import React, { useState, useEffect } from "react";
import { useAccountStatement } from "../../../hooks/useAccountStatement";
import type { StatementEntry } from "../../../services/financeService";

interface AccountStatementModalProps {
    entityType: "employee" | "customer" | "supplier";
    entityId: number | null;
    entityName: string;
    isOpen: boolean;
    onClose: () => void;
}

const AccountStatementModal: React.FC<AccountStatementModalProps> = ({
    entityType,
    entityId,
    entityName,
    isOpen,
    onClose,
}) => {
    const defaultFrom = new Date(
        new Date().setMonth(new Date().getMonth() - 1),
    )
        .toISOString()
        .split("T")[0];

    const [fromDate, setFromDate] = useState(defaultFrom);
    const [toDate, setToDate] = useState(
        new Date().toISOString().split("T")[0],
    );
    const [empType, setEmpType] = useState<"all" | "advance" | "salary">("all");

    const {
        lines,
        closingBalance,
        outstandingAdvance,
        accruedSalary,
        netPayable,
        isLoading,
        error,
        refetch,
    } = useAccountStatement(
        entityType,
        entityId,
        fromDate,
        toDate,
        empType,
    );

    // إعادة الجلب عند تغيير الفترة
    useEffect(() => {
        if (isOpen && entityId) refetch();
    }, [fromDate, toDate, empType, isOpen, entityId]);

    const handleExportCsv = () => {
        if (!lines.length) return;
        const headers = [
            "التاريخ",
            "رقم القيد",
            "البيان",
            "مدين",
            "دائن",
            "الرصيد",
        ];
        const rows = lines.map((l) => [
            l.date,
            l.transaction_number,
            l.description ?? "",
            l.debit,
            l.credit,
            l.balance,
        ]);
        const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${entityName}-statement-${fromDate}-${toDate}.csv`;
        link.click();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            dir="rtl"
        >
            <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div>
                        <h3 className="text-lg font-black text-white">
                            كشف حساب — {entityName}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-bold uppercase tracking-widest">
                            {entityType === "employee"
                                ? "موظف"
                                : entityType === "customer"
                                    ? "عميل"
                                    : "مورد"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                    >
                        ✕
                    </button>
                </div>

                {/* Filters */}
                <div className="p-5 border-b border-white/5 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-[11px] text-slate-500 font-black uppercase">
                            من
                        </label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-[11px] text-slate-500 font-black uppercase">
                            إلى
                        </label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500/40"
                        />
                    </div>

                    {/* فلتر نوع الكشف للموظفين فقط */}
                    {entityType === "employee" && (
                        <div className="flex items-center gap-1 bg-slate-950 border border-white/5 rounded-xl p-1">
                            {(["all", "advance", "salary"] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setEmpType(t)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${empType === t
                                        ? "bg-red-600 text-white"
                                        : "text-slate-400 hover:text-white"
                                        }`}
                                >
                                    {t === "all"
                                        ? "الكل"
                                        : t === "advance"
                                            ? "السلف"
                                            : "الرواتب"}
                                </button>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={refetch}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-all disabled:opacity-50"
                    >
                        {isLoading ? "جاري التحميل..." : "تحديث"}
                    </button>
                </div>

                {/* ملخص للموظفين */}
                {entityType === "employee" &&
                    (outstandingAdvance !== undefined ||
                        accruedSalary !== undefined) && (
                        <div className="px-5 py-3 border-b border-white/5 grid grid-cols-3 gap-3">
                            <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3 text-right">
                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                                    سلف مستحقة
                                </p>
                                <p className="text-sm font-black font-mono text-amber-400">
                                    ₪{(outstandingAdvance ?? 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3 text-right">
                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                                    رواتب مستحقة
                                </p>
                                <p className="text-sm font-black font-mono text-blue-400">
                                    ₪{(accruedSalary ?? 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3 text-right">
                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                                    صافي مستحق
                                </p>
                                <p
                                    className={`text-sm font-black font-mono ${(netPayable ?? 0) >= 0
                                        ? "text-emerald-400"
                                        : "text-red-400"
                                        }`}
                                >
                                    ₪{Math.abs(netPayable ?? 0).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    )}

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="p-12 text-center text-slate-500">
                            <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-3" />
                            <p className="text-xs font-bold">جاري تحميل الكشف...</p>
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-400 text-sm font-bold">
                            {error}
                        </div>
                    ) : lines.length === 0 ? (
                        <div className="p-12 text-center text-slate-600 text-sm font-black italic">
                            لا توجد حركات في هذه الفترة
                        </div>
                    ) : (
                        <table className="w-full text-right text-xs">
                            <thead className="bg-slate-950/40 border-b border-white/5 sticky top-0">
                                <tr className="text-slate-500 font-black uppercase tracking-wider">
                                    <th className="px-4 py-3">التاريخ</th>
                                    <th className="px-4 py-3">رقم القيد</th>
                                    <th className="px-4 py-3">البيان</th>
                                    <th className="px-4 py-3 text-center">مدين</th>
                                    <th className="px-4 py-3 text-center">دائن</th>
                                    <th className="px-4 py-3 text-center">الرصيد</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {lines.map((line, i) => (
                                    <tr
                                        key={i}
                                        className="hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="px-4 py-3 font-mono text-slate-400">
                                            {line.date}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                                            {line.transaction_number}
                                        </td>
                                        <td className="px-4 py-3 text-slate-300 font-bold max-w-[200px] truncate">
                                            {line.description || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-center font-black font-mono text-red-400">
                                            {line.debit > 0
                                                ? `₪${Number(line.debit).toLocaleString()}`
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-center font-black font-mono text-emerald-400">
                                            {line.credit > 0
                                                ? `₪${Number(line.credit).toLocaleString()}`
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-center font-black font-mono text-white">
                                            ₪{Math.abs(Number(line.balance)).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t border-white/10 bg-slate-950/40">
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase"
                                    >
                                        الرصيد الختامي
                                    </td>
                                    <td className="px-4 py-3 text-center font-black font-mono text-red-400">
                                        ₪
                                        {lines
                                            .reduce((s, l) => s + l.debit, 0)
                                            .toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-center font-black font-mono text-emerald-400">
                                        ₪
                                        {lines
                                            .reduce((s, l) => s + l.credit, 0)
                                            .toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-center font-black font-mono text-white">
                                        ₪{Math.abs(closingBalance).toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 flex justify-end gap-3">
                    <button
                        onClick={handleExportCsv}
                        disabled={!lines.length}
                        className="px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-black rounded-xl hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-40"
                    >
                        تصدير CSV
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white/5 border border-white/5 text-slate-400 text-xs font-black rounded-xl hover:text-white transition-all"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountStatementModal;