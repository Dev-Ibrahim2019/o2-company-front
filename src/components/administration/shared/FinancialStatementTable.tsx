// src/components/administration/shared/FinancialStatementTable.tsx
// ERP-grade statement explorer with row details, timeline, and document drill-down

import React, { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, FileText, Printer, RefreshCw, Search } from "lucide-react";
import { MOVEMENT_COLORS, MOVEMENT_LABELS } from "../../../services/financeService";
import { transactionService } from "../../../services/accounting/transactions";
import { orderService, type InvoiceFromApi } from "../../../services/orderService";

const money = (v: number) => v?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00";
const dateFmt = (d: string) => { try { return new Date(d).toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };

const getTypeMeta = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
        sale: { label: "فاتورة بيع", color: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
        purchase: { label: "فاتورة شراء", color: "bg-rose-500/15 text-rose-400 border-rose-500/25" },
        receipt: { label: "قبض", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
        payment: { label: "دفع", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
        adjustment: { label: "تسوية", color: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
        opening: { label: "رصيد افتتاحي", color: "bg-violet-500/15 text-violet-400 border-violet-500/25" },
        journal: { label: "قيد يومية", color: "bg-slate-500/15 text-slate-400 border-slate-500/25" },
        expense: { label: "مصروف", color: "bg-orange-500/15 text-orange-400 border-orange-500/25" },
    };
    return map[type] ?? { label: type || "حركة", color: "bg-slate-500/15 text-slate-400 border-slate-500/25" };
};

export interface StatementLine {
    date: string;
    transaction_number: string;
    transaction_id?: number;
    reference?: string | null;
    type: string;
    description: string | null;
    account_name?: string;
    account_code?: string;
    debit: number;
    credit: number;
    balance: number;
    source_type?: string | null;
    source_id?: number | null;
    source_label?: string | null;
    branch_id?: number | null;
    branch_name?: string | null;
    notes?: string | null;
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

const FinancialStatementTable: React.FC<FinancialStatementTableProps> = ({ statement, loading, from, to, onFromChange, onToChange, onSearch, isSupplier = false }) => {
    const [search, setSearch] = useState("");
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceFromApi | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    const visibleLines = useMemo(() => {
        const query = search.trim().toLowerCase();
        const base = statement?.lines ?? [];
        if (!query) return base;
        return base.filter((line) => {
            const haystack = [line.transaction_number, line.reference ?? "", line.description ?? "", line.account_name ?? "", line.account_code ?? "", line.source_label ?? "", line.branch_name ?? "", line.notes ?? ""].join(" ").toLowerCase();
            return haystack.includes(query);
        });
    }, [statement, search]);

    const selectedLine = selectedIndex !== null ? visibleLines[selectedIndex] ?? null : null;

    const timeline = useMemo(() => {
        const buckets = new Map<string, { date: string; count: number; debit: number; credit: number; balance: number }>();
        for (const line of visibleLines) {
            const current = buckets.get(line.date) ?? { date: line.date, count: 0, debit: 0, credit: 0, balance: 0 };
            current.count += 1;
            current.debit += Number(line.debit) || 0;
            current.credit += Number(line.credit) || 0;
            current.balance = Number(line.balance) || 0;
            buckets.set(line.date, current);
        }
        return [...buckets.values()].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [visibleLines]);

    useEffect(() => {
        if (selectedIndex !== null && selectedIndex >= visibleLines.length) setSelectedIndex(null);
    }, [visibleLines.length, selectedIndex]);

    useEffect(() => {
        let cancelled = false;
        const loadDetails = async () => {
            if (!selectedLine) {
                setSelectedTransaction(null);
                setSelectedInvoice(null);
                setDetailError(null);
                return;
            }
            setDetailLoading(true);
            setDetailError(null);
            try {
                let transactionId = selectedLine.transaction_id ?? null;
                if (!transactionId && selectedLine.transaction_number) {
                    const result = await transactionService.getAll({ search: selectedLine.transaction_number, per_page: 10 });
                    const candidates = Array.isArray(result?.data)
                        ? result.data
                        : Array.isArray(result?.data?.data)
                            ? result.data.data
                            : [];
                    const matched = candidates.find((item: any) => item.transaction_number === selectedLine.transaction_number) ?? candidates[0];
                    transactionId = matched?.id ?? null;
                }

                if (!transactionId) {
                    setSelectedTransaction(null);
                    setSelectedInvoice(null);
                    setDetailError("Could not resolve the document for this row.");
                    return;
                }

                const transaction = await transactionService.getOne(transactionId);
                if (cancelled) return;
                setSelectedTransaction(transaction);
                const sourceType = transaction?.source?.type ?? transaction?.source_label ?? transaction?.source_type;
                const sourceId = transaction?.source?.id ?? transaction?.source_id;
                if (sourceType === "Order" && sourceId) {
                    const invoice = await orderService.getInvoiceForOrder(sourceId);
                    if (!cancelled) setSelectedInvoice(invoice);
                } else {
                    setSelectedInvoice(null);
                }
            } catch (error: any) {
                if (!cancelled) {
                    setDetailError(error?.response?.data?.message ?? error?.message ?? "Failed to load document details");
                    setSelectedTransaction(null);
                    setSelectedInvoice(null);
                }
            } finally {
                if (!cancelled) setDetailLoading(false);
            }
        };
        void loadDetails();
        return () => { cancelled = true; };
    }, [selectedLine]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50" />
                <span className="text-slate-500 text-xs">إلى</span>
                <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50" />
                <div className="relative flex-1 min-w-[220px]">
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث داخل السطور..." className="w-full bg-slate-950 border border-white/5 rounded-xl pr-9 pl-3 py-2 text-xs text-white outline-none focus:border-blue-500/50" />
                </div>
                <button onClick={onSearch} className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400 hover:bg-blue-600/20 transition-all" type="button"><Search size={14} /></button>
                <button className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 hover:bg-amber-500/20 transition-all" type="button"><Download size={14} /></button>
                <button className="p-2 bg-slate-500/10 border border-slate-500/20 rounded-xl text-slate-400 hover:bg-slate-500/20 transition-all" type="button"><Printer size={14} /></button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div>
            ) : statement && visibleLines.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-slate-950 border border-white/5 rounded-xl p-3"><p className="text-[10px] text-slate-500 font-bold">الرصيد الافتتاحي</p><p className="text-sm font-black font-mono text-slate-300">₪{money(statement.opening_balance)}</p></div>
                            <div className="bg-slate-950 border border-white/5 rounded-xl p-3"><p className="text-[10px] text-slate-500 font-bold">إجمالي المدين</p><p className={`text-sm font-black font-mono ${isSupplier ? "text-emerald-400" : "text-rose-400"}`}>₪{money(statement.total_debit)}</p></div>
                            <div className="bg-slate-950 border border-white/5 rounded-xl p-3"><p className="text-[10px] text-slate-500 font-bold">إجمالي الدائن</p><p className={`text-sm font-black font-mono ${isSupplier ? "text-rose-400" : "text-emerald-400"}`}>₪{money(statement.total_credit)}</p></div>
                            <div className="bg-slate-950 border border-white/5 rounded-xl p-3"><p className="text-[10px] text-slate-500 font-bold">الرصيد الختامي</p><p className={`text-sm font-black font-mono ${statement.closing_balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>₪{money(Math.abs(statement.closing_balance))}</p></div>
                        </div>

                        <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs min-w-[1000px]">
                                    <thead className="bg-slate-950/40 border-b border-white/5 sticky top-0 z-10">
                                        <tr className="text-slate-500 font-black text-[10px]">
                                            <th className="text-right px-4 py-3">التاريخ</th><th className="text-right px-4 py-3">النوع</th><th className="text-right px-4 py-3">البيان</th><th className="text-right px-4 py-3">رقم المستند</th><th className="text-right px-4 py-3">الحساب</th><th className="text-right px-4 py-3">مدين</th><th className="text-right px-4 py-3">دائن</th><th className="text-right px-4 py-3">الرصيد</th><th className="text-right px-4 py-3">المرجع</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {visibleLines.map((line, index) => {
                                            const meta = line.movement_type
                                                ? { label: MOVEMENT_LABELS[line.movement_type] ?? line.movement_label ?? line.movement_type, color: MOVEMENT_COLORS[line.movement_type] ?? "bg-slate-500/15 text-slate-400 border-slate-500/25" }
                                                : getTypeMeta(line.type);
                                            const isSelected = selectedIndex === index;
                                            return (
                                                <React.Fragment key={`${line.transaction_number}-${index}`}>
                                                    <tr onClick={() => setSelectedIndex(index)} className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-500/10" : "hover:bg-white/[0.02]"}`}>
                                                        <td className="px-4 py-3 text-slate-300 font-mono text-[10px]">{dateFmt(line.date)}</td>
                                                        <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black ${meta.color}`}>{meta.label}</span></td>
                                                        <td className="px-4 py-3 text-slate-300 text-[11px]"><p className="font-semibold text-slate-200 leading-snug">{line.description || line.type}</p><p className="text-[9px] text-slate-500 mt-1">{line.source_label ? `${line.source_label}${line.source_id ? ` #${line.source_id}` : ""}` : "—"}</p></td>
                                                        <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{line.transaction_number}</td>
                                                        <td className="px-4 py-3 text-slate-500 text-[10px]"><p>{line.account_name || "—"}</p>{line.account_code ? <p className="font-mono text-[9px] text-slate-600">{line.account_code}</p> : null}</td>
                                                        <td className="px-4 py-3 font-mono text-[11px] text-emerald-400">{line.debit > 0 ? money(line.debit) : "—"}</td>
                                                        <td className="px-4 py-3 font-mono text-[11px] text-rose-400">{line.credit > 0 ? money(line.credit) : "—"}</td>
                                                        <td className="px-4 py-3 font-mono text-[11px] text-blue-400">₪{money(line.balance)}</td>
                                                        <td className="px-4 py-3 text-slate-500 text-[10px]">{line.reference || "—"}</td>
                                                    </tr>
                                                    {isSelected ? (
                                                        <tr className="bg-white/[0.02] border-t border-white/5"><td colSpan={9} className="px-4 py-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                                            <div className="rounded-xl border border-white/5 bg-slate-950 p-3"><p className="text-[10px] text-slate-500 mb-1">معلومات السطر</p><p className="text-sm font-black text-white">{line.description || line.type}</p><p className="text-[10px] text-slate-500 mt-1">{line.transaction_number}{line.reference ? ` · ${line.reference}` : ""}</p></div>
                                                            <div className="rounded-xl border border-white/5 bg-slate-950 p-3"><p className="text-[10px] text-slate-500 mb-1">الربط المستندي</p><p className="text-sm font-black text-white">{line.source_label || "Transaction"}</p><p className="text-[10px] text-slate-500 mt-1">{line.source_type || "—"}{line.source_id ? ` #${line.source_id}` : ""}</p></div>
                                                            <div className="rounded-xl border border-white/5 bg-slate-950 p-3"><p className="text-[10px] text-slate-500 mb-1">الحساب</p><p className="text-sm font-black text-white">{line.account_name || "—"}</p><p className="text-[10px] text-slate-500 mt-1">{line.account_code || "—"}</p></div>
                                                            <div className="rounded-xl border border-white/5 bg-slate-950 p-3"><p className="text-[10px] text-slate-500 mb-1">الفرع / الملاحظات</p><p className="text-sm font-black text-white">{line.branch_name || "—"}</p><p className="text-[10px] text-slate-500 mt-1">{line.notes || "—"}</p></div>
                                                        </div></td></tr>
                                                    ) : null}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-4 py-3 border-t border-white/5 bg-slate-950/20 flex items-center justify-between text-xs"><span className="text-slate-500">الرصيد الختامي: <strong className="text-white">₪{money(Math.abs(statement.closing_balance))}</strong></span><span className="text-slate-500">{visibleLines.length} معاملة</span></div>
                        </div>
                    </div>

                    <aside className="space-y-4 lg:sticky lg:top-4 self-start">
                        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3"><div><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">الخط الزمني</p><p className="text-sm font-black text-white">{timeline.length} يوم</p></div><FileText size={16} className="text-slate-500" /></div>
                            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">{timeline.map((item) => (<div key={item.date} className="rounded-xl border border-white/5 bg-slate-950 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black text-white">{dateFmt(item.date)}</p><p className="text-[10px] text-slate-500">{item.count} حركة</p></div><div className="text-left"><p className={`text-xs font-black ${item.balance >= 0 ? "text-rose-400" : "text-emerald-400"}`}>₪{money(Math.abs(item.balance))}</p><p className="text-[10px] text-slate-500">+{money(item.debit)} / -{money(item.credit)}</p></div></div></div>))}</div>
                        </div>
                        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between"><div><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">تفاصيل المستند</p><p className="text-sm font-black text-white">فتح القيد</p></div><ExternalLink size={16} className="text-slate-500" /></div>
                            {detailLoading ? <div className="rounded-xl border border-white/5 bg-slate-950 p-4 text-center text-slate-500 text-xs"><RefreshCw size={16} className="mx-auto mb-2 animate-spin" />جار تحميل تفاصيل المستند...</div> : detailError ? <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-300 text-xs">{detailError}</div> : selectedLine ? (<div className="space-y-3">
                                <div className="rounded-xl border border-white/5 bg-slate-950 p-3"><p className="text-[10px] text-slate-500">المعاملة</p><p className="text-sm font-black text-white">{selectedLine.transaction_number}</p><p className="text-[10px] text-slate-500 mt-1">{selectedLine.type}</p></div>
                                <div className="rounded-xl border border-white/5 bg-slate-950 p-3"><p className="text-[10px] text-slate-500">المصدر</p><p className="text-sm font-black text-white">{selectedTransaction?.source?.type ?? selectedLine.source_label ?? "—"}</p><p className="text-[10px] text-slate-500 mt-1">{selectedTransaction?.source?.order_number ? `Order ${selectedTransaction.source.order_number}` : selectedTransaction?.source?.name ?? selectedLine.source_id ?? "—"}</p></div>
                                <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/5 bg-slate-950 p-3"><p className="text-[10px] text-slate-500">مدين</p><p className="text-sm font-black text-emerald-400">₪{money(selectedLine.debit)}</p></div><div className="rounded-xl border border-white/5 bg-slate-950 p-3"><p className="text-[10px] text-slate-500">دائن</p><p className="text-sm font-black text-rose-400">₪{money(selectedLine.credit)}</p></div></div>
                                {selectedTransaction?.entries?.length ? <div className="rounded-xl border border-white/5 bg-slate-950 p-3"><p className="text-[10px] text-slate-500 mb-2">قيود المستند</p><div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">{selectedTransaction.entries.map((entry: any, index: number) => (<div key={entry.id ?? index} className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2"><div className="min-w-0"><p className="text-xs font-black text-white truncate">{entry.account?.name ?? "—"}</p><p className="text-[10px] text-slate-500 truncate">{entry.description || "—"}</p></div><div className="text-left font-mono text-[10px]"><p className="text-emerald-400">{entry.debit > 0 ? money(entry.debit) : "—"}</p><p className="text-rose-400">{entry.credit > 0 ? money(entry.credit) : "—"}</p></div></div>))}</div></div> : null}
                                {selectedInvoice ? <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 space-y-3"><div><p className="text-[10px] text-blue-300 font-black uppercase tracking-widest">فاتورة البيع</p><p className="text-sm font-black text-white">{selectedInvoice.number}</p><p className="text-[10px] text-slate-300">{selectedInvoice.status} · ₪{money(selectedInvoice.total)}</p></div><div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">{(selectedInvoice.items ?? selectedInvoice.invoice_items ?? []).map((item: any) => (<div key={item.id} className="rounded-lg border border-white/5 bg-slate-950 p-2"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-black text-white truncate">{item.item_name}</p><p className="text-[10px] text-slate-500">{item.quantity} x ₪{money(item.price)}</p></div><div className="text-left font-mono text-[10px]"><p className="text-white">₪{money(item.total)}</p>{item.discount_amount ? <p className="text-emerald-400">خصم ₪{money(item.discount_amount)}</p> : null}</div></div></div>))}</div></div> : null}
                            </div>) : <div className="rounded-xl border border-white/5 bg-slate-950 p-4 text-xs text-slate-500">اختر سطرًا من الجدول لعرض القيد والمستند المرتبط به.</div>}
                        </div>
                    </aside>
                </div>
            ) : <div className="flex items-center justify-center h-64 text-slate-500 font-bold">لا توجد حركات في هذه الفترة</div>}
        </div>
    );
};

export default FinancialStatementTable;
