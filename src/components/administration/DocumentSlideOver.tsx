import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Package, Tags, BookOpen, CreditCard, Box, Clock, Paperclip, MessageSquare,
    Loader2, Search, ChevronLeft, ChevronRight, ExternalLink
} from "lucide-react";
import { invoiceDetailsService, type InvoiceOverview, type InvoiceProduct, type InvoicePayment, type AccountingEntry, type InvoiceDiscount, type InventoryMovement, type TimelineEvent, type InvoiceNote } from "../../services/invoiceDetailsService";
import { type CustomerStatementLine } from "../../services/customerService";

// ─── Helpers ───────────────────────────────────────────────

const money = (v: number) =>
    v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dateFmt = (d: string | null) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return d; }
};

const timeFmt = (d: string | null) => {
    if (!d) return "";
    try { return new Date(d).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
};

// ─── Tab Configuration ─────────────────────────────────────

type TabId = "products" | "discounts" | "accounting" | "payments" | "inventory" | "timeline" | "attachments" | "notes";

interface TabConfig {
    id: TabId;
    label: string;
    icon: React.ElementType;
}

const TABS: TabConfig[] = [
    { id: "products", label: "المنتجات", icon: Package },
    { id: "discounts", label: "الخصومات", icon: Tags },
    { id: "accounting", label: "محاسبي", icon: BookOpen },
    { id: "payments", label: "الدفعات", icon: CreditCard },
    { id: "inventory", label: "المخزون", icon: Box },
    { id: "timeline", label: "الجدول الزمني", icon: Clock },
    { id: "attachments", label: "المرفقات", icon: Paperclip },
    { id: "notes", label: "ملاحظات", icon: MessageSquare },
];

// ─── Info Row ──────────────────────────────────────────────

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
        <span className="text-[10px] text-slate-500">{label}</span>
        <span className="text-[11px] text-slate-200 font-medium">{value || "—"}</span>
    </div>
);

// ─── Loading State ─────────────────────────────────────────

const TabLoading: React.FC = () => (
    <div className="flex items-center justify-center h-40">
        <Loader2 size={20} className="animate-spin text-slate-600" />
    </div>
);

// ─── Products Tab ──────────────────────────────────────────

const ProductsTab: React.FC<{ invoiceId: number }> = ({ invoiceId }) => {
    const [products, setProducts] = useState<InvoiceProduct[]>([]);
    const [totals, setTotals] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        invoiceDetailsService.getProducts(invoiceId).then(data => {
            setProducts(data.items || []);
            setTotals(data);
        }).finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <TabLoading />;

    const filtered = search ? products.filter(p =>
        p.item_name.toLowerCase().includes(search.toLowerCase())
    ) : products;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                    <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="بحث في المنتجات..."
                        className="w-full bg-slate-950 border border-white/5 rounded-xl pr-8 pl-3 py-1.5 text-[11px] text-white" />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="text-right p-2 text-slate-500">#</th>
                            <th className="text-right p-2 text-slate-500">المنتج</th>
                            <th className="text-right p-2 text-slate-500">الكمية</th>
                            <th className="text-right p-2 text-slate-500">السعر</th>
                            <th className="text-right p-2 text-slate-500">الخصم</th>
                            <th className="text-right p-2 text-slate-500">%</th>
                            <th className="text-right p-2 text-slate-500">صافي السعر</th>
                            <th className="text-right p-2 text-slate-500">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((p, i) => (
                            <tr key={p.id} className="border-b border-white/5">
                                <td className="p-2 text-slate-500">{i + 1}</td>
                                <td className="p-2 text-slate-200 font-medium">{p.item_name}</td>
                                <td className="p-2 text-slate-300">{p.quantity}</td>
                                <td className="p-2 text-slate-300 font-mono">₪{money(p.unit_price)}</td>
                                <td className="p-2 text-rose-400 font-mono">₪{money(p.discount_amount)}</td>
                                <td className="p-2 text-rose-400">{p.discount_percent > 0 ? `${p.discount_percent}%` : "—"}</td>
                                <td className="p-2 text-slate-300 font-mono">₪{money(p.final_price)}</td>
                                <td className="p-2 text-slate-200 font-mono font-bold">₪{money(p.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {totals && (
                <div className="border-t border-white/5 pt-2 space-y-1">
                    <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">الإجمالي الفرعي</span>
                        <span className="text-slate-300 font-mono">₪{money(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">إجمالي الخصم</span>
                        <span className="text-rose-400 font-mono">₪{money(totals.total_discount)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">الضريبة</span>
                        <span className="text-slate-300 font-mono">₪{money(totals.tax_total)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold pt-1 border-t border-white/5">
                        <span className="text-white">الإجمالي النهائي</span>
                        <span className="text-emerald-400 font-mono">₪{money(totals.grand_total)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Discounts Tab ─────────────────────────────────────────

const DiscountsTab: React.FC<{ invoiceId: number }> = ({ invoiceId }) => {
    const [discounts, setDiscounts] = useState<InvoiceDiscount[]>([]);
    const [totals, setTotals] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        invoiceDetailsService.getDiscounts(invoiceId).then(data => {
            setDiscounts(data.discounts || []);
            setTotals(data);
        }).finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <TabLoading />;

    if (discounts.length === 0) return <div className="text-center py-8 text-slate-500 text-[11px]">لا توجد خصومات</div>;

    return (
        <div className="space-y-3">
            {discounts.map((d, i) => (
                <div key={i} className="bg-slate-950 border border-white/5 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-slate-200">{d.item_name}</span>
                        <span className="text-[9px] text-slate-500">قاعدة: {d.discount_apply_strategy || "عام"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <p className="text-[8px] text-slate-500">السعر الأصلي</p>
                            <p className="text-[10px] font-mono text-slate-300">₪{money(d.original_total)}</p>
                        </div>
                        <div>
                            <p className="text-[8px] text-slate-500">قيمة الخصم</p>
                            <p className="text-[10px] font-mono text-rose-400">{d.discount_percent > 0 ? `${d.discount_percent}%` : `₪${money(d.discount_amount)}`}</p>
                        </div>
                        <div>
                            <p className="text-[8px] text-slate-500">السعر النهائي</p>
                            <p className="text-[10px] font-mono text-emerald-400">₪{money(d.total)}</p>
                        </div>
                        <div>
                            <p className="text-[8px] text-slate-500">السبب</p>
                            <p className="text-[10px] text-slate-300">{d.discount_name || "يدوي"}</p>
                        </div>
                    </div>
                </div>
            ))}
            {totals && (
                <div className="border-t border-white/5 pt-2 text-[10px] space-y-1">
                    <div className="flex justify-between">
                        <span className="text-slate-500">إجمالي خصم الأصناف</span>
                        <span className="text-rose-400 font-mono">₪{money(totals.total_item_discount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">خصم الفاتورة</span>
                        <span className="text-rose-400 font-mono">₪{money(totals.total_invoice_discount)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Accounting Tab ────────────────────────────────────────

const AccountingTab: React.FC<{ invoiceId: number }> = ({ invoiceId }) => {
    const [entries, setEntries] = useState<AccountingEntry[]>([]);
    const [meta, setMeta] = useState<any>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        invoiceDetailsService.getAccounting(invoiceId).then(data => {
            setEntries(data.entries || []);
            setMeta(data);
        }).finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <TabLoading />;

    return (
        <div className="space-y-3">
            {meta.transaction_number && (
                <div className="bg-slate-950 border border-white/5 rounded-xl p-3 grid grid-cols-2 gap-2">
                    <div>
                        <p className="text-[8px] text-slate-500">رقم القيد</p>
                        <p className="text-[11px] font-mono text-blue-400">{meta.transaction_number}</p>
                    </div>
                    <div>
                        <p className="text-[8px] text-slate-500">التاريخ</p>
                        <p className="text-[11px] text-slate-300">{dateFmt(meta.transaction_date)}</p>
                    </div>
                    <div>
                        <p className="text-[8px] text-slate-500">الحالة</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${meta.status === "posted" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                            {meta.status === "posted" ? "مرحل" : "مسودة"}
                        </span>
                    </div>
                    <div>
                        <p className="text-[8px] text-slate-500">بواسطة</p>
                        <p className="text-[11px] text-slate-300">{meta.user_name || "—"}</p>
                    </div>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="text-right p-2 text-slate-500">كود الحساب</th>
                            <th className="text-right p-2 text-slate-500">اسم الحساب</th>
                            <th className="text-right p-2 text-slate-500">مركز التكلفة</th>
                            <th className="text-right p-2 text-slate-500">مدين</th>
                            <th className="text-right p-2 text-slate-500">دائن</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((e, i) => (
                            <tr key={i} className="border-b border-white/5">
                                <td className="p-2 font-mono text-slate-400">{e.account_code || "—"}</td>
                                <td className="p-2 text-slate-200">{e.account_name || "—"}</td>
                                <td className="p-2 text-slate-500">{e.cost_center_name || "—"}</td>
                                <td className="p-2 text-rose-400 font-mono">{e.debit > 0 ? money(e.debit) : "—"}</td>
                                <td className="p-2 text-emerald-400 font-mono">{e.credit > 0 ? money(e.credit) : "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {meta.total_debit > 0 && (
                <div className="border-t border-white/5 pt-2 flex justify-between text-[10px]">
                    <span className="text-slate-500">المجموع</span>
                    <span className="text-slate-300 font-mono">₪{money(meta.total_debit)}</span>
                </div>
            )}
            <div className="flex gap-2 pt-2">
                <button className="px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-lg text-[9px] text-blue-400 hover:bg-blue-600/20 flex items-center gap-1">
                    <ExternalLink size={10} /> فتح القيد
                </button>
                <button className="px-3 py-1.5 bg-emerald-600/10 border border-emerald-500/20 rounded-lg text-[9px] text-emerald-400 hover:bg-emerald-600/20 flex items-center gap-1">
                    <ExternalLink size={10} /> فتح الأستاذ
                </button>
                <button className="px-3 py-1.5 bg-amber-600/10 border border-amber-500/20 rounded-lg text-[9px] text-amber-400 hover:bg-amber-600/20 flex items-center gap-1">
                    <ExternalLink size={10} /> ميزان المراجعة
                </button>
            </div>
        </div>
    );
};

// ─── Payments Tab ──────────────────────────────────────────

const PaymentsTab: React.FC<{ invoiceId: number }> = ({ invoiceId }) => {
    const [payments, setPayments] = useState<InvoicePayment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        invoiceDetailsService.getPayments(invoiceId).then(data => {
            setPayments(data.payments || []);
        }).finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <TabLoading />;

    if (payments.length === 0) return <div className="text-center py-8 text-slate-500 text-[11px]">لا توجد دفعات</div>;

    return (
        <div className="space-y-2">
            {payments.map((p) => (
                <div key={p.id} className="bg-slate-950 border border-white/5 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-slate-200">{p.method}</span>
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">₪{money(p.amount)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-500">
                        <span>المرجع: {p.reference_number || "—"}</span>
                        <span>التاريخ: {dateFmt(p.paid_at)}</span>
                        <span>الكاشير: {p.user_name || "—"}</span>
                        <span>الفرع: {p.branch_name || "—"}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─── Inventory Tab ─────────────────────────────────────────

const InventoryTab: React.FC<{ invoiceId: number }> = ({ invoiceId }) => {
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        invoiceDetailsService.getInventory(invoiceId).then(data => {
            setMovements(data.movements || []);
        }).finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <TabLoading />;

    if (movements.length === 0) return <div className="text-center py-8 text-slate-500 text-[11px]">لا توجد حركات مخزون</div>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
                <thead>
                    <tr className="border-b border-white/5">
                        <th className="text-right p-2 text-slate-500">المنتج</th>
                        <th className="text-right p-2 text-slate-500">الحركة</th>
                        <th className="text-right p-2 text-slate-500">الكمية</th>
                        <th className="text-right p-2 text-slate-500">التكلفة</th>
                        <th className="text-right p-2 text-slate-500">الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    {movements.map((m, i) => (
                        <tr key={i} className="border-b border-white/5">
                            <td className="p-2 text-slate-200">{m.item_name}</td>
                            <td className="p-2">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded ${m.movement === "out" ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                                    {m.movement === "out" ? "صادر" : "وارد"}
                                </span>
                            </td>
                            <td className="p-2 text-slate-300">{m.quantity}</td>
                            <td className="p-2 font-mono text-slate-400">₪{money(m.unit_price)}</td>
                            <td className="p-2 font-mono text-slate-200">₪{money(m.total_cost)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ─── Timeline Tab ──────────────────────────────────────────

const TimelineTab: React.FC<{ invoiceId: number }> = ({ invoiceId }) => {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        invoiceDetailsService.getTimeline(invoiceId).then(data => {
            setEvents(data.events || []);
        }).finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <TabLoading />;

    if (events.length === 0) return <div className="text-center py-8 text-slate-500 text-[11px]">لا توجد أحداث</div>;

    return (
        <div className="relative pr-6">
            <div className="absolute right-2 top-0 bottom-0 w-px bg-white/10" />
            <div className="space-y-4">
                {events.map((ev, i) => (
                    <div key={i} className="relative">
                        <div className={`absolute -right-[18px] top-1 w-2.5 h-2.5 rounded-full border-2 ${ev.event === "created" ? "bg-blue-500 border-blue-500" :
                            ev.event === "paid" ? "bg-emerald-500 border-emerald-500" :
                                ev.event === "posted" ? "bg-amber-500 border-amber-500" :
                                    "bg-slate-500 border-slate-500"
                            }`} />
                        <div className="bg-slate-950 border border-white/5 rounded-xl p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium text-slate-200">{ev.label}</span>
                                <span className="text-[9px] text-slate-500">{dateFmt(ev.timestamp)}</span>
                            </div>
                            {ev.user && <span className="text-[9px] text-slate-500 mt-1 block">بواسطة: {ev.user}</span>}
                            {ev.timestamp && <span className="text-[9px] text-slate-600 mt-0.5 block">{timeFmt(ev.timestamp)}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Attachments Tab ───────────────────────────────────────

const AttachmentsTab: React.FC<{ invoiceId: number }> = ({ invoiceId }) => {
    const [attachments, setAttachments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        invoiceDetailsService.getAttachments(invoiceId).then(data => {
            setAttachments(data.attachments || []);
        }).finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <TabLoading />;

    return (
        <div className="text-center py-8">
            <Paperclip size={24} className="mx-auto text-slate-700 mb-2" />
            <p className="text-slate-500 text-[11px]">لا توجد مرفقات</p>
        </div>
    );
};

// ─── Notes Tab ─────────────────────────────────────────────

const NotesTab: React.FC<{ invoiceId: number }> = ({ invoiceId }) => {
    const [notes, setNotes] = useState<InvoiceNote[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        invoiceDetailsService.getNotes(invoiceId).then(data => {
            setNotes(data.notes || []);
        }).finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <TabLoading />;

    if (notes.length === 0) return <div className="text-center py-8 text-slate-500 text-[11px]">لا توجد ملاحظات</div>;

    return (
        <div className="space-y-2">
            {notes.map((n, i) => (
                <div key={i} className="bg-slate-950 border border-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">{n.source}</span>
                        <span className="text-[9px] text-slate-500">{dateFmt(n.created_at)}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">{n.note}</p>
                </div>
            ))}
        </div>
    );
};

// ─── Tab Content Router ────────────────────────────────────

const TabContent: React.FC<{ tab: TabId; invoiceId: number }> = ({ tab, invoiceId }) => {
    const Components: Record<TabId, React.FC<{ invoiceId: number }>> = {
        products: ProductsTab,
        discounts: DiscountsTab,
        accounting: AccountingTab,
        payments: PaymentsTab,
        inventory: InventoryTab,
        timeline: TimelineTab,
        attachments: AttachmentsTab,
        notes: NotesTab,
    };
    const Component = Components[tab];
    return <Component invoiceId={invoiceId} />;
};

// ─── Main Component ────────────────────────────────────────

interface DocumentSlideOverProps {
    open: boolean;
    onClose: () => void;
    line: CustomerStatementLine | null;
    entityType?: "customer" | "supplier" | "employee";
}

export const DocumentSlideOver: React.FC<DocumentSlideOverProps> = ({ open, onClose, line, entityType = "customer" }) => {
    const [activeTab, setActiveTab] = useState<TabId>("products");
    const [overview, setOverview] = useState<InvoiceOverview | null>(null);
    const [loading, setLoading] = useState(false);

    // Look up invoice ID: prefer invoice_id, then source_id (which might be invoice or order)
    const invoiceId = (line as any)?.invoice_id || line?.source_id;

    useEffect(() => {
        if (open && invoiceId) {
            setLoading(true);
            setActiveTab("products");
            invoiceDetailsService.getDetails(invoiceId as number)
                .then(setOverview)
                .catch(() => setOverview(null))
                .finally(() => setLoading(false));
        }
    }, [open, invoiceId]);

    const invoiceSubtotal = (overview?.subtotal || 0);
    const invoiceDiscount = (overview?.discount || 0);
    const invoiceTax = 0; // would come from API
    const invoiceNetTotal = overview?.total || 0;
    const invoicePaid = overview?.paid_amount || 0;
    const invoiceRemaining = overview?.remaining_amount || 0;

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black z-40" />

                    {/* Slide Over */}
                    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        dir="rtl"
                        className="fixed top-0 left-0 h-full w-[950px] max-w-[95vw] bg-slate-900 border-l border-white/10 shadow-2xl z-50 overflow-hidden flex flex-col">

                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-900/95 backdrop-blur-xl">
                            <div>
                                <h3 className="text-sm font-black text-white">مستند {overview?.number || `#${invoiceId}`}</h3>
                                {overview?.order_number && (
                                    <p className="text-[10px] text-slate-500 font-mono">طلب #{overview.order_number}</p>
                                )}
                            </div>
                            <button onClick={onClose}
                                className="p-2 rounded-xl bg-slate-800 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Invoice Overview */}
                        {loading ? (
                            <div className="flex items-center justify-center h-40 p-4">
                                <Loader2 size={24} className="animate-spin text-slate-600" />
                            </div>
                        ) : overview && (
                            <div className="p-4 border-b border-white/5 bg-slate-950/50">
                                <div className="grid grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1 text-[10px]">
                                    <InfoRow label="رقم الفاتورة" value={overview.number} />
                                    <InfoRow label="رقم الطلب" value={overview.order_number} />
                                    <InfoRow label="العميل" value={overview.customer_name} />
                                    {overview.cashier_name && <InfoRow label="الكاشير" value={overview.cashier_name} />}
                                    <InfoRow label="الفرع" value={overview.branch_name} />
                                    <InfoRow label="طريقة الدفع" value={overview.payment_method} />
                                    <InfoRow label="الحالة" value={
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${overview.status === "paid" ? "bg-emerald-500/10 text-emerald-400" :
                                            overview.status === "cancelled" ? "bg-red-500/10 text-red-400" :
                                                "bg-amber-500/10 text-amber-400"
                                            }`}>{overview.status}</span>
                                    } />
                                    <InfoRow label="تاريخ الإنشاء" value={dateFmt(overview.created_at)} />
                                    <InfoRow label="الإجمالي" value={<span className="text-emerald-400 font-bold font-mono">₪{money(overview.total)}</span>} />
                                    <InfoRow label="قيمة الخصم" value={<span className="text-rose-400 font-mono">₪{money(overview.discount)}</span>} />
                                    <InfoRow label="المدفوع" value={<span className="text-blue-400 font-mono">₪{money(overview.paid_amount)}</span>} />
                                    <InfoRow label="المتبقي" value={<span className="text-rose-400 font-mono">₪{money(overview.remaining_amount)}</span>} />
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="flex overflow-x-auto border-b border-white/5 bg-slate-900/95 shrink-0">
                            {TABS.map((tab) => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                                        ? "text-blue-400 border-blue-500 bg-blue-500/5"
                                        : "text-slate-500 border-transparent hover:text-slate-300"
                                        }`}>
                                    <tab.icon size={12} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content (Scrollable) */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {invoiceId && <TabContent tab={activeTab} invoiceId={invoiceId as number} />}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};