import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar, RefreshCw, Wallet, Activity, Printer, Search, FileText,
    LayoutDashboard, List, Download, ChevronDown, ChevronUp, Building2, Hash,
    Tag, Package, ExternalLink,
} from "lucide-react";
import { financeService } from "../../../services/financeService";
import { toast } from "../../shared/Toast";
import type {
    StatementEntry, StatementType, StatementFilters, SaleItem,
} from "../../../services/financeService";
import { MOVEMENT_LABELS, MOVEMENT_COLORS, MOVEMENT_ICONS } from "../../../services/financeService";
import { useAccountStatement } from "../../../hooks/useAccountStatement";
import InvoiceDrawer from "./InvoiceDrawer";
import { invoiceDetailsService } from "../../../services/invoiceDetailsService";

interface EmployeeStatementProps {
    entityType?: "employee" | "customer" | "supplier";
    entityId?: number;
    entityName?: string;
    employeeId?: number;
    employeeName?: string;
}

const money = (v: number | undefined | null) => {
    if (v === undefined || v === null || isNaN(v)) return "0.00";
    return Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const dateFmt = (d: string) => {
    try {
        return new Date(d).toLocaleDateString("ar-SA", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return d; }
};

type EntityType = "employee" | "customer" | "supplier";

type MovementFilterOption = {
    value: string;
    label: string;
    movementTypes: string[];
};

const TYPE_OPTIONS_BY_ENTITY: Record<EntityType, MovementFilterOption[]> = {
    employee: [
        { value: "all", label: "الكل", movementTypes: [] },
        { value: "sales", label: "المبيعات", movementTypes: ["sales"] },
        { value: "advance", label: "السلف", movementTypes: ["advance", "advance_repayment"] },
        { value: "salary", label: "الرواتب", movementTypes: ["salary", "salary_payment"] },
        { value: "loan", label: "القروض", movementTypes: ["loan", "loan_repayment"] },
        { value: "payment", label: "الدفعات", movementTypes: ["payment"] },
        { value: "journal", label: "القيود", movementTypes: ["journal", "adjustment", "settlement"] },
        { value: "return", label: "المرتجعات", movementTypes: ["return", "sales_return"] },
    ],
    customer: [
        { value: "all", label: "الكل", movementTypes: [] },
        { value: "sales", label: "المبيعات", movementTypes: ["sales", "sale", "invoice", "customer_invoice"] },
        { value: "receipts", label: "التحصيلات", movementTypes: ["receipt", "receipts", "collection", "customer_receipt", "customer_collection"] },
        { value: "payments", label: "الدفعات", movementTypes: ["payment", "payments", "customer_payment"] },
        { value: "returns", label: "المرتجعات", movementTypes: ["return", "returns", "sales_return", "customer_return"] },
        { value: "credit_note", label: "إشعار دائن", movementTypes: ["credit_note", "customer_credit_note", "discount"] },
        { value: "debit_note", label: "إشعار مدين", movementTypes: ["debit_note", "customer_debit_note"] },
        { value: "journal", label: "القيود", movementTypes: ["journal", "adjustment", "settlement"] },
    ],
    supplier: [
        { value: "all", label: "الكل", movementTypes: [] },
        { value: "purchases", label: "المشتريات", movementTypes: ["purchase", "purchases", "bill", "supplier_bill"] },
        { value: "payments", label: "الدفعات", movementTypes: ["payment", "payments", "supplier_payment"] },
        { value: "returns", label: "المرتجعات", movementTypes: ["return", "returns", "purchase_return", "supplier_return"] },
        { value: "credit_note", label: "إشعارات دائن", movementTypes: ["credit_note", "supplier_credit_note"] },
        { value: "debit_note", label: "إشعارات مدين", movementTypes: ["debit_note", "supplier_debit_note"] },
        { value: "journal", label: "القيود", movementTypes: ["journal", "adjustment", "settlement"] },
    ],
};

const STATEMENT_TYPES = new Set<string>([
    "all", "sales", "advance", "salary", "loan", "payment", "journal", "return",
    "settlement", "purchase", "transfer", "adjustment", "opening", "closing",
    "payments", "receipts", "returns", "purchases", "credit_note", "debit_note", "discount",
]);

const entityLabel = (type: EntityType) => {
    if (type === "customer") return "عميل";
    if (type === "supplier") return "مورد";
    return "موظف";
};
const MovementBadge: React.FC<{ type?: string | null; label?: string | null }> = ({ type, label }) => {
    const mt = type || "other";
    const colors = MOVEMENT_COLORS[mt] || "text-slate-400 bg-slate-500/10 border-slate-500/20";
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold whitespace-nowrap ${colors}`}>
            <span>{MOVEMENT_ICONS[mt] || "•"}</span>
            {label || MOVEMENT_LABELS[mt] || "أخرى"}
        </span>
    );
};

/* --- Inline expandable detail for detailed mode --- */
const RowDetailPanel: React.FC<{ entry: StatementEntry; onOpenInvoice?: () => void }> = ({ entry, onOpenInvoice }) => {
    const isSale = entry.movement_type === "sales" || entry.type === "sale";
    const isInvoiceMovement = isSale || Boolean(onOpenInvoice);
    const items: SaleItem[] = entry.items ?? [];

    return (
        <div className="bg-slate-950/80 border-t border-b border-white/5 px-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <InfoCell icon={Hash} label="رقم القيد" value={entry.transaction_number} />
                <InfoCell icon={FileText} label="نوع المستند" value={entry.document_type} />
                <InfoCell icon={Building2} label="الفرع" value={entry.branch_name} />
                <InfoCell icon={Tag} label="المرجع" value={entry.reference} />
            </div>

            {isInvoiceMovement && items.length > 0 && (
                <div className="rounded-xl border border-sky-500/20 overflow-hidden mb-3">
                    <div className="bg-sky-500/10 px-3 py-2 flex items-center justify-between">
                        <span className="text-[10px] font-black text-sky-400 flex items-center gap-1.5">
                            <Package size={12} /> المنتجات ({items.length})
                        </span>
                        {onOpenInvoice && (
                            <button onClick={onOpenInvoice} className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-bold">
                                <ExternalLink size={10} /> عرض الفاتورة كاملة
                            </button>
                        )}
                    </div>
                    <table className="w-full text-[11px]">
                        <thead>
                            <tr className="text-slate-500 border-b border-white/5 bg-slate-900/50">
                                <th className="text-right px-3 py-2 font-bold">الصنف</th>
                                <th className="text-center px-2 py-2 font-bold">كمية</th>
                                <th className="text-center px-2 py-2 font-bold">السعر</th>
                                <th className="text-center px-2 py-2 font-bold">خصم</th>
                                <th className="text-center px-2 py-2 font-bold">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {items.map((item, i) => (
                                <tr key={i} className="hover:bg-white/[0.02]">
                                    <td className="px-3 py-2 text-slate-300">{item.product_name_ar || item.product_name}</td>
                                    <td className="px-2 py-2 text-center font-mono text-slate-400">{item.quantity}</td>
                                    <td className="px-2 py-2 text-center font-mono text-slate-400">₪{money(item.unit_price)}</td>
                                    <td className="px-2 py-2 text-center font-mono text-rose-400">
                                        {item.discount_amount > 0 ? `-₪${money(item.discount_amount)}` : "—"}
                                    </td>
                                    <td className="px-2 py-2 text-center font-mono font-bold text-white">₪{money(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isInvoiceMovement && items.length === 0 && onOpenInvoice && (
                <button onClick={onOpenInvoice} className="w-full py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold hover:bg-sky-500/20 transition-all flex items-center justify-center gap-2">
                    <ExternalLink size={14} /> فتح تفاصيل الفاتورة كاملة
                </button>
            )}

            {!isInvoiceMovement && (
                <div className="rounded-xl bg-slate-900/60 border border-white/5 p-3">
                    <p className="text-[11px] text-slate-400 leading-relaxed">{entry.description || "—"}</p>
                    {entry.notes && <p className="text-[10px] text-slate-600 mt-2">{entry.notes}</p>}
                </div>
            )}
        </div>
    );
};

const InfoCell: React.FC<{ icon: React.ElementType; label: string; value?: string | null }> = ({ icon: Icon, label, value }) => (
    <div className="bg-slate-900/60 border border-white/5 rounded-lg p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
            <Icon size={10} className="text-slate-600" />
            <span className="text-[9px] text-slate-600 font-bold">{label}</span>
        </div>
        <p className="text-[11px] text-slate-200 font-bold truncate">{value || "—"}</p>
    </div>
);

/* --- Main Statement Table --- */
interface StatementTableProps {
    entries: StatementEntry[];
    openingBalance: number;
    closingBalance: number;
    viewMode: "simple" | "detailed";
    onOpenInvoice: (entry: StatementEntry) => void;
}

const StatementTable: React.FC<StatementTableProps> = ({ entries, openingBalance, closingBalance, viewMode, onOpenInvoice }) => {
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const [localSearch, setLocalSearch] = useState("");

    const filtered = useMemo(() => {
        const q = localSearch.trim().toLowerCase();
        if (!q) return entries;
        return entries.filter((e) =>
            [e.transaction_number, e.description, e.movement_label, e.document_type, e.branch_name, e.reference]
                .filter(Boolean).join(" ").toLowerCase().includes(q)
        );
    }, [entries, localSearch]);

    const totals = useMemo(() => ({
        debit: filtered.reduce((s, e) => s + (e.debit || 0), 0),
        credit: filtered.reduce((s, e) => s + (e.credit || 0), 0),
    }), [filtered]);

    const toggleExpand = (idx: number, entry: StatementEntry) => {
        const hasInvoiceLink = Boolean(
            (entry as StatementEntry & { invoice_id?: number | null; document_id?: number | null }).invoice_id
            || (entry as StatementEntry & { invoice_id?: number | null; document_id?: number | null }).document_id
            || entry.source_id
        );
        if (viewMode !== "detailed") {
            if (hasInvoiceLink) onOpenInvoice(entry);
            return;
        }
        setExpandedIdx(expandedIdx === idx ? null : idx);
    };

    return (
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden shadow-xl print:border print:border-gray-300 print:shadow-none print:bg-white">
            {/* Table toolbar */}
            <div className="px-4 py-3 border-b border-white/10 bg-slate-950/60 flex items-center justify-between gap-3 print:bg-gray-50 print:border-gray-200">
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-blue-400" />
                    <span className="text-xs font-black text-white print:text-gray-900">كشف حساب</span>
                    <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full print:text-gray-600 print:bg-gray-100">
                        {filtered.length} حركة
                    </span>
                </div>
                <div className="relative">
                    <Search size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        placeholder="بحث في الحركات..."
                        className="bg-slate-900 border border-white/10 rounded-lg py-1.5 pr-8 pl-3 text-[11px] text-white outline-none focus:border-blue-500/50 w-44 print:hidden"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right min-w-[900px] print:min-w-0">
                    <thead className="bg-slate-950/80 border-b-2 border-white/10 sticky top-0 z-10 print:bg-gray-100 print:border-gray-300">
                        <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 print:text-gray-600">
                            {viewMode === "detailed" && <th className="w-8 px-2 py-3" />}
                            <th className="px-3 py-3 whitespace-nowrap">التاريخ</th>
                            <th className="px-3 py-3 whitespace-nowrap">رقم القيد</th>
                            <th className="px-3 py-3 whitespace-nowrap">رقم المستند</th>
                            <th className="px-3 py-3 whitespace-nowrap">نوع الحركة</th>
                            <th className="px-3 py-3 min-w-[140px]">البيان</th>
                            <th className="px-3 py-3 text-center whitespace-nowrap">مدين</th>
                            <th className="px-3 py-3 text-center whitespace-nowrap">دائن</th>
                            <th className="px-3 py-3 text-center whitespace-nowrap">الرصيد</th>
                            <th className="px-3 py-3 whitespace-nowrap hidden lg:table-cell">الفرع</th>
                            <th className="px-3 py-3 whitespace-nowrap hidden xl:table-cell">الحالة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 print:divide-gray-200">
                        {/* Opening balance row */}
                        <tr className="bg-blue-500/[0.06] border-b border-blue-500/10 print:bg-blue-50">
                            <td colSpan={viewMode === "detailed" ? 8 : 7} className="px-3 py-2.5 text-[11px] font-black text-blue-400 print:text-blue-800">
                                ◆ الرصيد الافتتاحي
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-black text-blue-400 print:text-blue-800">
                                ₪{money(openingBalance)}
                            </td>
                            <td colSpan={2} className="hidden lg:table-cell" />
                        </tr>

                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={viewMode === "detailed" ? 11 : 10} className="px-4 py-16 text-center">
                                    <Wallet size={28} className="mx-auto mb-2 text-slate-700 opacity-50" />
                                    <p className="text-sm text-slate-500 font-bold">لا توجد حركات في هذه الفترة</p>
                                </td>
                            </tr>
                        ) : filtered.map((entry, idx) => {
                            const isExpanded = expandedIdx === idx;
                            const isSale = entry.movement_type === "sales" || entry.type === "sale";
                            const hasInvoiceLink = Boolean(
                                (entry as StatementEntry & { invoice_id?: number | null; document_id?: number | null }).invoice_id
                                || (entry as StatementEntry & { invoice_id?: number | null; document_id?: number | null }).document_id
                                || entry.source_id
                            );
                            const canExpand = viewMode === "detailed" || hasInvoiceLink;

                            return (
                                <React.Fragment key={`${entry.transaction_number}-${idx}`}>
                                    <tr
                                        onClick={() => canExpand && toggleExpand(idx, entry)}
                                        className={`group transition-colors ${canExpand ? "cursor-pointer" : ""} ${isExpanded ? "bg-white/[0.04]" : "hover:bg-white/[0.03]"} ${isSale ? "border-r-2 border-r-sky-500/40" : ""} print:hover:bg-transparent`}
                                    >
                                        {viewMode === "detailed" && (
                                            <td className="px-2 py-2.5 text-slate-600">
                                                {canExpand && (isExpanded
                                                    ? <ChevronUp size={14} className="text-blue-400" />
                                                    : <ChevronDown size={14} className="text-slate-600 group-hover:text-slate-400" />
                                                )}
                                            </td>
                                        )}
                                        <td className="px-3 py-2.5 text-[11px] text-slate-300 whitespace-nowrap font-medium print:text-gray-800">
                                            {dateFmt(entry.date)}
                                        </td>
                                        <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500 whitespace-nowrap print:text-gray-700">
                                            {entry.transaction_id ? `#${entry.transaction_id}` : "—"}
                                        </td>
                                        <td className="px-3 py-2.5 font-mono text-[10px] text-slate-400 whitespace-nowrap print:text-gray-700">
                                            {entry.transaction_number || "—"}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <MovementBadge type={entry.movement_type} label={entry.movement_label} />
                                        </td>
                                        <td className="px-3 py-2.5 max-w-[200px]">
                                            <p className={`text-[11px] truncate ${isSale ? "text-sky-300 font-medium" : "text-slate-400"}`}>
                                                {entry.description || entry.document_type || "—"}
                                            </p>
                                            {entry.reference && (
                                                <p className="text-[9px] text-slate-600 font-mono mt-0.5">{entry.reference}</p>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 text-center font-mono text-[11px]">
                                            {entry.debit > 0
                                                ? <span className="text-emerald-400 font-bold print:text-green-700">₪{money(entry.debit)}</span>
                                                : <span className="text-slate-700 print:text-gray-300">—</span>}
                                        </td>
                                        <td className="px-3 py-2.5 text-center font-mono text-[11px]">
                                            {entry.credit > 0
                                                ? <span className="text-rose-400 font-bold print:text-red-700">₪{money(entry.credit)}</span>
                                                : <span className="text-slate-700 print:text-gray-300">—</span>}
                                        </td>
                                        <td className="px-3 py-2.5 text-center font-mono text-[11px]">
                                            <span className={`font-black ${(entry.running_balance ?? 0) >= 0 ? "text-blue-400 print:text-blue-800" : "text-rose-400 print:text-red-700"}`}>
                                                ₪{money(entry.running_balance ?? 0)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-[10px] text-slate-500 hidden lg:table-cell print:text-gray-600">
                                            {entry.branch_name || "—"}
                                        </td>
                                        <td className="px-3 py-2.5 hidden xl:table-cell">
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                                                {entry.status || "مرحّل"}
                                            </span>
                                        </td>
                                    </tr>

                                    <AnimatePresence>
                                        {isExpanded && viewMode === "detailed" && (
                                            <tr>
                                                <td colSpan={11} className="p-0">
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <RowDetailPanel
                                                            entry={entry}
                                                            onOpenInvoice={hasInvoiceLink ? () => onOpenInvoice(entry) : undefined}
                                                        />
                                                    </motion.div>
                                                </td>
                                            </tr>
                                        )}
                                    </AnimatePresence>
                                </React.Fragment>
                            );
                        })}

                        {/* Closing balance row */}
                        {filtered.length > 0 && (
                            <tr className="bg-emerald-500/[0.06] border-t-2 border-emerald-500/20 print:bg-green-50">
                                <td colSpan={viewMode === "detailed" ? 8 : 7} className="px-3 py-2.5 text-[11px] font-black text-emerald-400 print:text-green-800">
                                    ◆ الرصيد الختامي
                                </td>
                                <td className="px-3 py-2.5 text-center font-mono font-black text-emerald-400 print:text-green-800">
                                    ₪{money(closingBalance)}
                                </td>
                                <td colSpan={2} className="hidden lg:table-cell" />
                            </tr>
                        )}
                    </tbody>
                    {filtered.length > 0 && (
                        <tfoot className="bg-slate-950/60 border-t border-white/10 print:bg-gray-100">
                            <tr className="text-[11px] font-black">
                                <td colSpan={viewMode === "detailed" ? 6 : 5} className="px-3 py-3 text-slate-500 print:text-gray-600">
                                    إجمالي الفترة ({filtered.length} حركة)
                                </td>
                                <td className="px-3 py-3 text-center font-mono text-emerald-400 print:text-green-700">
                                    ₪{money(totals.debit)}
                                </td>
                                <td className="px-3 py-3 text-center font-mono text-rose-400 print:text-red-700">
                                    ₪{money(totals.credit)}
                                </td>
                                <td colSpan={3} />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

/* --- Sticky Summary Bar --- */
const SummaryBar: React.FC<{
    closing: number;
    entityType: EntityType;
    movementTotals: Record<string, number>;
    outstandingAdvance?: number;
    outstandingLoan?: number;
    accruedSalary?: number;
    netPayable?: number;
}> = ({ closing, entityType, movementTotals, outstandingAdvance, outstandingLoan, accruedSalary, netPayable }) => {
    const summaryItems = entityType === "employee"
        ? [
            { label: "الرصيد الحالي", value: closing, color: "text-violet-400" },
            { label: "السلف المستحقة", value: outstandingAdvance ?? movementTotals.advance ?? 0, color: "text-amber-400" },
            { label: "القروض", value: outstandingLoan ?? movementTotals.loan ?? 0, color: "text-violet-400" },
            { label: "الرواتب", value: accruedSalary ?? movementTotals.salary ?? 0, color: "text-emerald-400" },
            { label: "صافي المستحق", value: netPayable ?? closing, color: "text-emerald-400" },
        ]
        : entityType === "customer"
            ? [
                { label: "الرصيد الحالي", value: closing, color: "text-violet-400" },
                { label: "إجمالي المبيعات", value: movementTotals.sales ?? 0, color: "text-sky-400" },
                { label: "إجمالي التحصيلات", value: movementTotals.receipts ?? 0, color: "text-blue-400" },
                { label: "إجمالي المرتجعات", value: movementTotals.returns ?? 0, color: "text-pink-400" },
                { label: "المستحق", value: closing, color: "text-emerald-400" },
            ]
            : [
                { label: "الرصيد الحالي", value: closing, color: "text-violet-400" },
                { label: "إجمالي المشتريات", value: movementTotals.purchases ?? 0, color: "text-sky-400" },
                { label: "إجمالي الدفعات", value: movementTotals.payments ?? 0, color: "text-blue-400" },
                { label: "إشعارات الخصم/الإضافة", value: (movementTotals.credit_note ?? 0) + (movementTotals.debit_note ?? 0), color: "text-amber-400" },
                { label: "المستحق", value: closing, color: "text-emerald-400" },
            ];

    return (
    <div className="sticky top-0 z-30 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-3 bg-slate-950/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg print:static print:bg-white print:border-gray-200">
        {summaryItems.map((item) => (
            <div key={item.label} className="text-center px-2 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 print:border-gray-200">
                <p className="text-[9px] text-slate-500 font-bold mb-0.5 print:text-gray-500">{item.label}</p>
                <p className={`text-sm font-black font-mono ${item.color} print:text-gray-900`}>₪{money(item.value)}</p>
            </div>
        ))}
    </div>
    );
};

/* --- Main Component --- */
const EmployeeStatement: React.FC<EmployeeStatementProps> = ({
    entityType: entityTypeProp = "employee",
    entityId,
    entityName,
    employeeId,
    employeeName,
}) => {
    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

    const resolvedEntityType = entityTypeProp;
    const resolvedEntityId = entityId ?? employeeId ?? null;
    const resolvedEntityName = entityName ?? employeeName ?? "";
    const typeOptions = TYPE_OPTIONS_BY_ENTITY[resolvedEntityType];

    const [fromDate, setFromDate] = useState(defaultFrom);
    const [toDate, setToDate] = useState(defaultTo);
    const [statementType, setStatementType] = useState("all");
    const [viewMode, setViewMode] = useState<"simple" | "detailed">("simple");
    const [searchQuery, setSearchQuery] = useState("");
    const [amountFrom, setAmountFrom] = useState("");
    const [amountTo, setAmountTo] = useState("");

    const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
    const [invoiceIds, setInvoiceIds] = useState<number[]>([]);
    const [currentInvoiceIdx, setCurrentInvoiceIdx] = useState(-1);

    useEffect(() => {
        setStatementType("all");
    }, [resolvedEntityType]);

    const extraFilters = useMemo<Omit<StatementFilters, "from" | "to" | "type">>(() => ({
        mode: viewMode === "detailed" ? "detailed" : "simple",
        search: searchQuery || undefined,
        amount_from: amountFrom ? Number(amountFrom) : undefined,
        amount_to: amountTo ? Number(amountTo) : undefined,
        limit: 500,
    }), [viewMode, searchQuery, amountFrom, amountTo]);

    const apiStatementType = STATEMENT_TYPES.has(statementType)
        ? statementType as StatementType
        : "all";

    const {
        lines: accountLines,
        openingBalance,
        closingBalance,
        outstandingAdvance,
        accruedSalary,
        netPayable,
        isLoading,
        error,
        refetch,
    } = useAccountStatement(
        resolvedEntityType,
        resolvedEntityId,
        fromDate,
        toDate,
        apiStatementType,
        extraFilters,
    );

    const selectedTypeOption = typeOptions.find((option) => option.value === statementType) ?? typeOptions[0];

    const lines = useMemo(() => {
        const movementTypes = selectedTypeOption.movementTypes;
        const query = searchQuery.trim().toLowerCase();
        const minAmount = amountFrom ? Number(amountFrom) : null;
        const maxAmount = amountTo ? Number(amountTo) : null;

        return accountLines.filter((entry) => {
            const movementType = (entry.movement_type || entry.type || "other").toLowerCase();
            if (movementTypes.length > 0 && !movementTypes.includes(movementType)) return false;

            if (query) {
                const haystack = [
                    entry.transaction_number,
                    entry.description,
                    entry.movement_label,
                    entry.document_type,
                    entry.branch_name,
                    entry.reference,
                    entry.account_name,
                    entry.transaction_source,
                ].filter(Boolean).join(" ").toLowerCase();
                if (!haystack.includes(query)) return false;
            }

            const amount = Math.max(Number(entry.debit) || 0, Number(entry.credit) || 0);
            if (minAmount !== null && amount < minAmount) return false;
            if (maxAmount !== null && amount > maxAmount) return false;
            return true;
        });
    }, [accountLines, selectedTypeOption, searchQuery, amountFrom, amountTo]);

    const totals = useMemo(() => ({
        debit: lines.reduce((s, e) => s + (e.debit || 0), 0),
        credit: lines.reduce((s, e) => s + (e.credit || 0), 0),
    }), [lines]);

    const movementTotals = useMemo(() => {
        const sums: Record<string, number> = {};
        for (const entry of accountLines) {
            const movementType = (entry.movement_type || entry.type || "other").toLowerCase();
            const amount = Math.max(Number(entry.debit) || 0, Number(entry.credit) || 0);
            sums[movementType] = (sums[movementType] || 0) + amount;
            const group = typeOptions.find((option) => option.movementTypes.includes(movementType));
            if (group) sums[group.value] = (sums[group.value] || 0) + amount;
        }
        return sums;
    }, [accountLines, typeOptions]);
    useEffect(() => {
        const orderIds = lines
            .filter((e) => e.movement_type === "sales" || e.source_type?.includes("Order"))
            .map((e) => e.source_id)
            .filter((id): id is number => id != null);
        const unique = [...new Set(orderIds)];
        if (unique.length > 0) {
            invoiceDetailsService.batchInvoiceIds(unique).then((map) => {
                setInvoiceIds(unique.map((oid) => map[oid]?.invoice_id).filter((id): id is number => id != null));
            }).catch(() => {});
        }
    }, [lines]);

    const handleOpenInvoice = useCallback(async (entry: StatementEntry) => {
        const directInvoiceId = (entry as StatementEntry & { invoice_id?: number | null; document_id?: number | null }).invoice_id
            ?? (entry as StatementEntry & { invoice_id?: number | null; document_id?: number | null }).document_id;
        if (directInvoiceId) {
            setSelectedInvoiceId(directInvoiceId);
            const idx = invoiceIds.indexOf(directInvoiceId);
            setCurrentInvoiceIdx(idx >= 0 ? idx : -1);
            return;
        }
        if (!entry.source_id) {
            if (resolvedEntityType === "supplier") {
                toast.info("تفاصيل مستند المورد غير متاحة حالياً");
            }
            return;
        }
        try {
            const result = await invoiceDetailsService.getInvoiceIdByOrder(entry.source_id);
            if (result?.invoice_id) {
                setSelectedInvoiceId(result.invoice_id);
                const idx = invoiceIds.indexOf(result.invoice_id);
                setCurrentInvoiceIdx(idx >= 0 ? idx : -1);
            }
        } catch { /* no invoice */ }
    }, [invoiceIds, resolvedEntityType]);

    const handleDownloadPdf = async (style: "simple" | "detailed" = "detailed") => {
        if (!resolvedEntityId) return;
        try {
            const pdfType = STATEMENT_TYPES.has(statementType) ? statementType as StatementType : "all";
            const blob = resolvedEntityType === "employee"
                ? await financeService.getEmployeeStatementPdf(resolvedEntityId, fromDate, toDate, pdfType, style)
                : resolvedEntityType === "customer"
                    ? await financeService.getCustomerStatementPdf(resolvedEntityId, fromDate, toDate, pdfType, style)
                    : await financeService.getSupplierStatementPdf(resolvedEntityId, fromDate, toDate, pdfType, style);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `statement_${resolvedEntityName}_${fromDate}_${toDate}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch { /* ignore */ }
    };

    const handleExport = async (format: "csv" | "excel") => {
        if (!resolvedEntityId) return;
        try {
            const exportType = STATEMENT_TYPES.has(statementType) ? statementType as StatementType : "all";
            const filters: StatementFilters = {
                from: fromDate, to: toDate, type: exportType, mode: "detailed", search: searchQuery || undefined,
            };
            const blob = resolvedEntityType === "employee"
                ? await financeService.exportEmployeeStatement(resolvedEntityId, filters, format)
                : resolvedEntityType === "customer"
                    ? await financeService.exportCustomerStatement(resolvedEntityId, filters, format)
                    : await financeService.exportSupplierStatement(resolvedEntityId, filters, format);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `statement_${resolvedEntityName}_${fromDate}_${toDate}.${format === "excel" ? "xls" : "csv"}`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch { /* ignore */ }
    };

    return (
        <div className="space-y-4 print:space-y-2" dir="rtl">
            {/* -- Letterhead Header -- */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30 border border-white/10 rounded-2xl overflow-hidden print:border-gray-300 print:bg-white">
                <div className="px-5 py-4 border-b border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg print:bg-blue-700">
                            <span className="text-white font-black text-lg">{resolvedEntityName.charAt(0)}</span>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest print:text-gray-500">كشف حساب {entityLabel(resolvedEntityType)}</p>
                            <h2 className="text-xl font-black text-white print:text-gray-900">{resolvedEntityName}</h2>
                            <p className="text-[11px] text-slate-400 mt-0.5 print:text-gray-600">
                                <Calendar size={10} className="inline ml-1" />
                                {dateFmt(fromDate)} — {dateFmt(toDate)}
                            </p>
                        </div>
                    </div>

                    {/* View mode toggle */}
                    <div className="flex items-center gap-2 print:hidden">
                        <div className="flex bg-slate-950/80 border border-white/10 rounded-xl p-1 gap-1">
                            <button onClick={() => setViewMode("simple")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-black transition-all ${viewMode === "simple" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}>
                                <LayoutDashboard size={13} /> بسيط
                            </button>
                            <button onClick={() => setViewMode("detailed")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-black transition-all ${viewMode === "detailed" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}>
                                <List size={13} /> مفصل
                            </button>
                        </div>
                    </div>
                </div>

                {/* Controls row */}
                <div className="px-5 py-3 flex flex-wrap items-center gap-2 bg-slate-950/40 print:hidden">
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-blue-500/50" />
                    <span className="text-slate-600 text-xs">→</span>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-blue-500/50" />

                    <select value={statementType} onChange={(e) => setStatementType(e.target.value as StatementType)}
                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white outline-none focus:border-blue-500/50">
                        {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    <div className="relative">
                        <Search size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
                        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث..."
                            className="bg-slate-900 border border-white/10 rounded-lg py-1.5 pr-8 pl-3 text-[11px] text-white outline-none w-36 focus:border-blue-500/50" />
                    </div>

                    <div className="mr-auto flex items-center gap-1.5">
                        <button onClick={refetch} disabled={isLoading} title="تحديث"
                            className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50">
                            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                        </button>
                        <button onClick={() => handleExport("csv")} title="CSV"
                            className="p-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all">
                            <Download size={13} />
                        </button>
                        <button onClick={() => handleDownloadPdf("simple")} title="PDF بسيط"
                            className="p-2 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-400 hover:bg-amber-600 hover:text-white transition-all">
                            <FileText size={13} />
                        </button>
                        <button onClick={() => handleDownloadPdf("detailed")} title="PDF مفصل"
                            className="p-2 rounded-lg bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:bg-orange-600 hover:text-white transition-all">
                            <FileText size={13} />
                        </button>
                        <button onClick={() => window.print()} title="طباعة"
                            className="p-2 rounded-lg bg-slate-700/40 border border-white/10 text-slate-400 hover:text-white transition-all">
                            <Printer size={13} />
                        </button>
                    </div>
                </div>
            </div>

            {/* -- Loading / Error -- */}
            {isLoading ? (
                <div className="space-y-3">
                    <div className="h-16 bg-slate-800/40 rounded-2xl animate-pulse" />
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-10 bg-slate-800/30 rounded-xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
                    ))}
                </div>
            ) : error ? (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 text-rose-400 text-sm font-bold flex items-center gap-3">
                    <Activity size={18} />{error}
                </div>
            ) : (
                <>
                    {/* Sticky summary */}
                    <SummaryBar
                        closing={closingBalance}
                        entityType={resolvedEntityType}
                        movementTotals={movementTotals}
                        outstandingAdvance={outstandingAdvance}
                        accruedSalary={accruedSalary}
                        netPayable={netPayable}
                    />

                    {/* Movement type quick filters */}
                    <div className="flex flex-wrap gap-1.5 print:hidden">
                        {typeOptions.map((opt) => (
                            <button key={opt.value} onClick={() => setStatementType(opt.value)}
                                className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all ${statementType === opt.value
                                    ? "bg-blue-600 border-blue-500 text-white shadow-md"
                                    : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                                }`}>
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Main statement table */}
                    <StatementTable
                        entries={lines}
                        openingBalance={openingBalance}
                        closingBalance={closingBalance}
                        viewMode={viewMode}
                        onOpenInvoice={handleOpenInvoice}
                    />

                    {/* Footer note */}
                    <p className="text-[10px] text-slate-600 text-center print:text-gray-500">
                        كشف حساب {resolvedEntityName} · {dateFmt(fromDate)} — {dateFmt(toDate)} · {lines.length} حركة · الرصيد ₪{money(closingBalance)}
                    </p>
                </>
            )}

            <InvoiceDrawer
                invoiceId={selectedInvoiceId}
                onClose={() => { setSelectedInvoiceId(null); setCurrentInvoiceIdx(-1); }}
                onPrev={() => { if (currentInvoiceIdx > 0) { const i = currentInvoiceIdx - 1; setCurrentInvoiceIdx(i); setSelectedInvoiceId(invoiceIds[i]); } }}
                onNext={() => { if (currentInvoiceIdx < invoiceIds.length - 1) { const i = currentInvoiceIdx + 1; setCurrentInvoiceIdx(i); setSelectedInvoiceId(invoiceIds[i]); } }}
                hasPrev={currentInvoiceIdx > 0}
                hasNext={currentInvoiceIdx < invoiceIds.length - 1}
            />
        </div>
    );
};

export default EmployeeStatement;
