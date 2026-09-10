import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, ChevronLeft, ChevronRight, FileText, Package, CreditCard,
    BookOpen, Percent, Box, Clock, Paperclip, MessageSquare,
    Building2, User, Phone, Hash, Calendar, Loader2, AlertTriangle,
    Banknote, ShoppingCart, Tag, Wallet, CheckCircle, ArrowUpRight,
    ArrowDownLeft, Landmark, Smartphone, DollarSign, TrendingUp,
    TrendingDown, Activity, Search, Download, Printer,
} from "lucide-react";
import { invoiceDetailsService } from "../../../services/invoiceDetailsService";
import type { InvoiceOverview, InvoiceProduct, InvoicePayment, AccountingEntry, InvoiceDiscount, InventoryMovement, TimelineEvent, InvoiceNote } from "../../../services/invoiceDetailsService";

const money = (v: number | undefined | null) => {
    if (v === undefined || v === null || isNaN(v)) return "0.00";
    return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const dateFmt = (d: string | null | undefined) => {
    try {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" });
    } catch { return d || "—"; }
};

const dateTimeFmt = (d: string | null | undefined) => {
    try {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return d || "—"; }
};

const formatStatus = (status: string | null): { label: string; bg: string; text: string } => {
    const map: Record<string, { label: string; bg: string; text: string }> = {
        paid: { label: "مدفوع", bg: "bg-emerald-500/15", text: "text-emerald-400" },
        unpaid: { label: "غير مدفوع", bg: "bg-amber-500/15", text: "text-amber-400" },
        partial: { label: "مدفوع جزئياً", bg: "bg-sky-500/15", text: "text-sky-400" },
        cancelled: { label: "ملغي", bg: "bg-rose-500/15", text: "text-rose-400" },
        pending: { label: "معلق", bg: "bg-amber-500/15", text: "text-amber-400" },
        confirmed: { label: "مؤكد", bg: "bg-blue-500/15", text: "text-blue-400" },
        in_progress: { label: "قيد التحضير", bg: "bg-sky-500/15", text: "text-sky-400" },
        ready: { label: "جاهز", bg: "bg-emerald-500/15", text: "text-emerald-400" },
        served: { label: "تم التقديم", bg: "bg-emerald-500/15", text: "text-emerald-400" },
        active: { label: "نشط", bg: "bg-emerald-500/15", text: "text-emerald-400" },
    };
    const s = (status || "").toLowerCase();
    return map[s] || { label: status || "—", bg: "bg-slate-500/15", text: "text-slate-400" };
};

const StatusBadge: React.FC<{ status: string | null }> = ({ status }) => {
    const f = formatStatus(status);
    return <span className={`px-2 py-0.5 rounded text-[9px] font-black ${f.bg} ${f.text}`}>{f.label}</span>;
};

const paymentMethodLabels: Record<string, string> = {
    cash: "نقداً", card: "بطاقة", bank: "تحويل بنكي", wallet: "محفظة",
    account: "حساب", customer: "عميل", employee: "موظف", supplier: "مورد",
    credit_card: "بطاقة ائتمان", mixed: "مختلط",
};

const paymentMethodIcons: Record<string, React.ElementType> = {
    cash: Banknote, card: CreditCard, bank: Landmark, wallet: Smartphone,
    account: User, credit_card: CreditCard,
};

interface TabDef {
    id: string;
    label: string;
    icon: React.ElementType;
}

const TABS: TabDef[] = [
    { id: "overview", label: "نظرة عامة", icon: FileText },
    { id: "products", label: "المنتجات", icon: Package },
    { id: "payments", label: "المدفوعات", icon: CreditCard },
    { id: "accounting", label: "المحاسبة", icon: BookOpen },
    { id: "discounts", label: "الخصومات", icon: Percent },
    { id: "inventory", label: "المخزون", icon: Box },
    { id: "timeline", label: "الجدول الزمني", icon: Clock },
    { id: "attachments", label: "المرفقات", icon: Paperclip },
    { id: "notes", label: "الملاحظات", icon: MessageSquare },
];

const SkeletonRow: React.FC<{ cols?: number }> = ({ cols = 4 }) => (
    <div className="grid grid-cols-4 gap-3 p-4">
        {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl h-20 animate-pulse" />
        ))}
    </div>
);

const LoadingSpinner: React.FC<{ text?: string }> = ({ text = "جاري التحميل..." }) => (
    <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-xs font-bold">{text}</span>
    </div>
);

const tabContentHeight = "min-h-[400px]";

interface InvoiceDrawerProps {
    invoiceId: number | null;
    onClose: () => void;
    onPrev?: () => void;
    onNext?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
}

const InvoiceDrawer: React.FC<InvoiceDrawerProps> = ({ invoiceId, onClose, onPrev, onNext, hasPrev, hasNext }) => {
    const [activeTab, setActiveTab] = useState("overview");
    const [overview, setOverview] = useState<InvoiceOverview | null>(null);
    const [loadingOverview, setLoadingOverview] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const loadedTabs = useRef<Set<string>>(new Set());

    const fetchOverview = useCallback(async () => {
        if (!invoiceId) return;
        setLoadingOverview(true);
        setError(null);
        setOverview(null);
        setActiveTab("overview");
        loadedTabs.current.clear();
        try {
            const data = await invoiceDetailsService.getDetails(invoiceId);
            setOverview(data);
            loadedTabs.current.add("overview");
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || "فشل تحميل بيانات الفاتورة");
        } finally {
            setLoadingOverview(false);
        }
    }, [invoiceId]);

    useEffect(() => { fetchOverview(); }, [fetchOverview]);

    useEffect(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTop = 0;
    }, [invoiceId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowRight" && hasNext && onNext) onNext();
            if (e.key === "ArrowLeft" && hasPrev && onPrev) onPrev();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose, onPrev, onNext, hasPrev, hasNext]);

    const renderTabContent = () => {
        if (activeTab === "overview") return <OverviewTab overview={overview} loading={loadingOverview} invoiceId={invoiceId} />;
        if (activeTab === "products") return <ProductsTab invoiceId={invoiceId} />;
        if (activeTab === "payments") return <PaymentsTab invoiceId={invoiceId} />;
        if (activeTab === "accounting") return <AccountingTab invoiceId={invoiceId} />;
        if (activeTab === "discounts") return <DiscountsTab invoiceId={invoiceId} />;
        if (activeTab === "inventory") return <InventoryTab invoiceId={invoiceId} />;
        if (activeTab === "timeline") return <TimelineTab invoiceId={invoiceId} />;
        if (activeTab === "attachments") return <AttachmentsTab invoiceId={invoiceId} />;
        if (activeTab === "notes") return <NotesTab invoiceId={invoiceId} />;
        return null;
    };

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    };

    return (
        <AnimatePresence>
            {invoiceId !== null && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 28, stiffness: 280 }}
                        className="fixed top-0 left-auto right-0 bottom-0 z-50 bg-slate-900 border-l border-white/5 shadow-2xl overflow-hidden flex flex-col"
                        style={{ width: "min(900px, 100vw)" }}
                        dir="rtl"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-950/60 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 flex items-center justify-center shrink-0">
                                    <FileText size={18} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-black text-white truncate">
                                        {overview?.number ? `فاتورة ${overview.number}` : `فاتورة #${invoiceId}`}
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">
                                        {overview?.branch_name || overview?.customer_name || "تفاصيل الفاتورة"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {overview && <StatusBadge status={overview.status} />}
                                {overview?.order_status && <StatusBadge status={overview.order_status} />}
                                <div className="flex bg-slate-900 border border-white/5 rounded-xl p-0.5 gap-0.5">
                                    <button onClick={onPrev} disabled={!hasPrev} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="السابق (→)">
                                        <ChevronRight size={14} />
                                    </button>
                                    <button onClick={onNext} disabled={!hasNext} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="التالي (←)">
                                        <ChevronLeft size={14} />
                                    </button>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all" title="إغلاق (ESC)">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-stretch border-b border-white/5 bg-slate-950/40 overflow-x-auto shrink-0">
                            {TABS.map((tab) => {
                                const isActive = activeTab === tab.id;
                                const Icon = tab.icon;
                                return (
                                    <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-black whitespace-nowrap transition-all border-b-2 shrink-0 ${isActive ? "text-sky-400 border-sky-500 bg-sky-500/5" : "text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/[0.02]"}`}>
                                        <Icon size={12} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar" style={{ scrollBehavior: "smooth" }}>
                            {loadingOverview && activeTab === "overview" ? (
                                <LoadingSpinner text="جاري تحميل بيانات الفاتورة..." />
                            ) : error && activeTab === "overview" ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-3 text-rose-400 p-8 text-center">
                                    <AlertTriangle size={28} />
                                    <p className="text-sm font-bold">{error}</p>
                                    <button onClick={onClose} className="text-xs text-slate-500 hover:text-white underline">إغلاق</button>
                                </div>
                            ) : (
                                <div className={tabContentHeight}>
                                    {renderTabContent()}
                                </div>
                            )}
                        </div>

                        <div className="shrink-0 border-t border-white/5 p-3 bg-slate-950/50 flex items-center justify-between">
                            <span className="text-[10px] text-slate-600 font-bold">
                                {overview ? `₪${money(overview.total)} · ${overview.number || `#${invoiceId}`}` : `الفاتورة #${invoiceId}`}
                            </span>
                            <span className="text-[9px] text-slate-600 font-mono">
                                {overview?.created_at ? dateTimeFmt(overview.created_at) : ""}
                            </span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default InvoiceDrawer;

/* ── Tab Components ────────────────────────────────────────────────────────── */

const TabWrapper: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
    <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
            <Icon size={14} className="text-sky-400" />
            <span className="text-[10px] text-sky-400 font-black uppercase tracking-widest">{title}</span>
        </div>
        {children}
    </div>
);

const InfoRow: React.FC<{ label: string; value: string; icon: React.ElementType; valueClass?: string }> = ({ label, value, icon: Icon, valueClass }) => (
    <div className="flex items-center gap-2 text-xs py-1.5">
        <Icon size={11} className="text-slate-600 shrink-0" />
        <span className="text-slate-500 shrink-0">{label}:</span>
        <span className={`text-slate-300 font-bold truncate ${valueClass || ""}`}>{value}</span>
    </div>
);

/* 1. Overview Tab */
const OverviewTab: React.FC<{ overview: InvoiceOverview | null; loading: boolean; invoiceId: number | null }> = ({ overview, loading, invoiceId }) => {
    if (loading) return <LoadingSpinner text="جاري تحميل الفاتورة..." />;
    if (!overview) return <div className="p-8 text-center text-slate-600 text-sm font-bold">لا توجد بيانات</div>;

    const remaining = overview.remaining_amount;
    return (
        <TabWrapper title="نظرة عامة" icon={FileText}>
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3">
                    <p className="text-[9px] text-slate-600 font-black mb-1">الإجمالي</p>
                    <p className="text-lg font-black font-mono text-white">₪{money(overview.total)}</p>
                </div>
                <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3">
                    <p className="text-[9px] text-slate-600 font-black mb-1">المدفوع</p>
                    <p className="text-lg font-black font-mono text-emerald-400">₪{money(overview.paid_amount)}</p>
                </div>
                <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3">
                    <p className="text-[9px] text-slate-600 font-black mb-1">المتبقي</p>
                    <p className={`text-lg font-black font-mono ${remaining > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                        ₪{money(remaining)}
                    </p>
                </div>
                <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3">
                    <p className="text-[9px] text-slate-600 font-black mb-1">الخصم</p>
                    <p className="text-lg font-black font-mono text-rose-400">
                        {overview.discount > 0 ? `₪${money(overview.discount)}` : "—"}
                    </p>
                </div>
            </div>

            <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                    <InfoRow label="رقم الفاتورة" value={overview.number || "—"} icon={Hash} />
                    <InfoRow label="رقم الطلب" value={overview.order_number || "—"} icon={Hash} />
                    <InfoRow label="الفرع" value={overview.branch_name || "—"} icon={Building2} />
                    <InfoRow label="الكاشير" value={overview.cashier_name || "—"} icon={User} />
                    <InfoRow label="العميل" value={overview.customer_name || "—"} icon={User} />
                    <InfoRow label="الهاتف" value={overview.customer_phone || "—"} icon={Phone} />
                    <InfoRow label="طاولة" value={overview.table_number || "—"} icon={Hash} />
                    <InfoRow label="نوع الطلب" value={overview.order_type === "dine_in" ? "داخلي" : overview.order_type === "takeaway" ? "طلبات خارجية" : overview.order_type || "—"} icon={ShoppingCart} />
                    <InfoRow label="تاريخ الفاتورة" value={overview.invoice_date ? dateFmt(overview.invoice_date) : "—"} icon={Calendar} />
                    <InfoRow label="تاريخ الدفع" value={overview.paid_at ? dateTimeFmt(overview.paid_at) : "—"} icon={Clock} />
                    <InfoRow label="طريقة الدفع" value={paymentMethodLabels[overview.payment_method || ""] || overview.payment_method || "—"} icon={CreditCard} />
                    <InfoRow label="الحالة" value={formatStatus(overview.status).label} icon={Activity} />
                </div>
                {overview.notes && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-[10px] text-slate-500 font-bold mb-1">ملاحظات:</p>
                        <p className="text-xs text-slate-400 leading-relaxed">{overview.notes}</p>
                    </div>
                )}
            </div>
        </TabWrapper>
    );
};

/* 2. Products Tab */
const ProductsTab: React.FC<{ invoiceId: number | null }> = ({ invoiceId }) => {
    const [data, setData] = useState<{ items: InvoiceProduct[]; total_items: number; subtotal: number; total_discount: number; grand_total: number; tax_total: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const loaded = useRef(false);

    useEffect(() => {
        if (loaded.current || !invoiceId) return;
        loaded.current = true;
        setLoading(true);
        invoiceDetailsService.getProducts(invoiceId)
            .then(setData).catch((e) => setError(e?.response?.data?.message || e?.message || "فشل التحميل"))
            .finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="p-6 text-center text-rose-400 text-xs font-bold">{error}</div>;
    if (!data) return null;

    return (
        <TabWrapper title={`المنتجات (${data.items.length})`} icon={Package}>
            <div className="bg-slate-950/60 border border-white/5 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-[9px] text-slate-600 font-black border-b border-white/5">
                                <th className="px-3 py-2 text-right">المنتج</th>
                                <th className="px-3 py-2 text-center">الكمية</th>
                                <th className="px-3 py-2 text-center">السعر</th>
                                <th className="px-3 py-2 text-center">الإجمالي</th>
                                <th className="px-3 py-2 text-center">الخصم</th>
                                <th className="px-3 py-2 text-center">الضريبة</th>
                                <th className="px-3 py-2 text-center">الصافي</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {data.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-white/[0.02]">
                                    <td className="px-3 py-2 text-slate-300 font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <ShoppingCart size={10} className="text-slate-600 shrink-0" />
                                            <span>{item.item_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-center text-slate-400 font-mono">{item.quantity}</td>
                                    <td className="px-3 py-2 text-center text-slate-400 font-mono">₪{money(item.unit_price)}</td>
                                    <td className="px-3 py-2 text-center text-slate-400 font-mono">₪{money(item.subtotal)}</td>
                                    <td className="px-3 py-2 text-center">
                                        {item.discount_amount > 0 || item.discount_percent > 0 ? (
                                            <span className="text-rose-400 font-mono text-[9px]">
                                                {item.discount_percent > 0 && `${item.discount_percent}% `}
                                                ₪{money(item.discount_amount)}
                                            </span>
                                        ) : <span className="text-slate-700">—</span>}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {item.tax_amount > 0 ? (
                                            <span className="text-amber-400 font-mono text-[9px]">
                                                ₪{money(item.tax_amount)}
                                                {item.tax_rate > 0 && <span className="text-slate-600"> ({item.tax_rate}%)</span>}
                                            </span>
                                        ) : <span className="text-slate-700">—</span>}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sky-400 font-bold font-mono">₪{money(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="border-t border-white/5 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">المجموع الفرعي:</span>
                        <span className="text-[10px] text-slate-400 font-mono">₪{money(data.subtotal)}</span>
                    </div>
                    {data.total_discount > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-rose-400/70">الخصم:</span>
                            <span className="text-[10px] text-rose-400 font-mono">-₪{money(data.total_discount)}</span>
                        </div>
                    )}
                    {data.tax_total > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-amber-400/70">الضريبة:</span>
                            <span className="text-[10px] text-amber-400 font-mono">+₪{money(data.tax_total)}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <span className="text-xs text-white font-black">الإجمالي النهائي:</span>
                        <span className="text-xs text-white font-black font-mono">₪{money(data.grand_total)}</span>
                    </div>
                </div>
            </div>
        </TabWrapper>
    );
};

/* 3. Payments Tab */
const PaymentsTab: React.FC<{ invoiceId: number | null }> = ({ invoiceId }) => {
    const [data, setData] = useState<{ payments: InvoicePayment[]; total_paid: number; payment_count: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const loaded = useRef(false);

    useEffect(() => {
        if (loaded.current || !invoiceId) return;
        loaded.current = true;
        setLoading(true);
        invoiceDetailsService.getPayments(invoiceId)
            .then(setData).catch((e) => setError(e?.response?.data?.message || e?.message || "فشل التحميل"))
            .finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="p-6 text-center text-rose-400 text-xs font-bold">{error}</div>;
    if (!data) return null;

    return (
        <TabWrapper title={`المدفوعات (${data.payments.length})`} icon={CreditCard}>
            {data.payments.length === 0 ? (
                <div className="bg-slate-950/60 border border-white/5 rounded-xl p-8 text-center">
                    <CreditCard size={24} className="text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 font-bold">لا توجد مدفوعات</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {data.payments.map((p, idx) => {
                        const Icon = paymentMethodIcons[p.method?.toLowerCase()] || Wallet;
                        const label = paymentMethodLabels[p.method?.toLowerCase()] || p.method || "—";
                        return (
                            <div key={idx} className="flex items-center justify-between bg-slate-950/60 border border-white/5 rounded-xl p-3 hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                        <Icon size={14} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-slate-300 font-bold">{label}</p>
                                        <div className="flex items-center gap-2 text-[9px] text-slate-600 font-mono mt-0.5">
                                            {p.reference_number && <span>مرجع: {p.reference_number}</span>}
                                            {p.user_name && <span>بواسطة: {p.user_name}</span>}
                                            {p.paid_at && <span>{dateFmt(p.paid_at)}</span>}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-sm text-emerald-400 font-black font-mono">₪{money(p.amount)}</span>
                            </div>
                        );
                    })}
                </div>
            )}
            <div className="flex items-center justify-between bg-slate-950/60 border border-white/5 rounded-xl p-3">
                <span className="text-xs text-emerald-400 font-black">إجمالي المدفوعات ({data.payment_count} دفعة)</span>
                <span className="text-sm text-emerald-400 font-black font-mono">₪{money(data.total_paid)}</span>
            </div>
        </TabWrapper>
    );
};

/* 4. Accounting Tab */
const AccountingTab: React.FC<{ invoiceId: number | null }> = ({ invoiceId }) => {
    const [data, setData] = useState<{ entries: AccountingEntry[]; transaction_number: string; transaction_date: string; status: string; total_debit: number; total_credit: number; user_name: string | null; posted_at: string | null } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const loaded = useRef(false);

    useEffect(() => {
        if (loaded.current || !invoiceId) return;
        loaded.current = true;
        setLoading(true);
        invoiceDetailsService.getAccounting(invoiceId)
            .then(setData).catch((e) => setError(e?.response?.data?.message || e?.message || "فشل التحميل"))
            .finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="p-6 text-center text-rose-400 text-xs font-bold">{error}</div>;
    if (!data) return null;

    const balanced = Math.abs(data.total_debit - data.total_credit) < 0.01;

    return (
        <TabWrapper title="القيود المحاسبية" icon={BookOpen}>
            {data.entries.length === 0 ? (
                <div className="bg-slate-950/60 border border-white/5 rounded-xl p-8 text-center">
                    <BookOpen size={24} className="text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 font-bold">لا توجد قيود محاسبية لهذه الفاتورة</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3">
                            <p className="text-[9px] text-slate-600 font-black">رقم القيد</p>
                            <p className="text-xs font-black font-mono text-white mt-1 truncate">{data.transaction_number}</p>
                        </div>
                        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3">
                            <p className="text-[9px] text-slate-600 font-black">التاريخ</p>
                            <p className="text-xs font-black font-mono text-slate-300 mt-1">{data.transaction_date || "—"}</p>
                        </div>
                        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3">
                            <p className="text-[9px] text-slate-600 font-black">الحالة</p>
                            <p className="text-xs font-black font-mono mt-1">{data.user_name || "—"}</p>
                        </div>
                        <div className={`border rounded-xl p-3 ${balanced ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}>
                            <p className="text-[9px] text-slate-600 font-black">متزن</p>
                            <p className={`text-xs font-black mt-1 ${balanced ? "text-emerald-400" : "text-rose-400"}`}>{balanced ? "نعم ✓" : "غير متزن ✗"}</p>
                        </div>
                    </div>

                    <div className="bg-slate-950/60 border border-white/5 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-[9px] text-slate-600 font-black border-b border-white/5">
                                        <th className="px-3 py-2 text-right">الحساب</th>
                                        <th className="px-3 py-2 text-right">الوصف</th>
                                        <th className="px-3 py-2 text-center">مركز التكلفة</th>
                                        <th className="px-3 py-2 text-center">مدين</th>
                                        <th className="px-3 py-2 text-center">دائن</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {data.entries.map((entry, idx) => (
                                        <tr key={idx} className="hover:bg-white/[0.02]">
                                            <td className="px-3 py-2">
                                                <span className="text-slate-300 font-bold">{entry.account_name}</span>
                                                {entry.account_code && <span className="text-slate-600 font-mono text-[9px] mr-1">({entry.account_code})</span>}
                                            </td>
                                            <td className="px-3 py-2 text-slate-400">{entry.description || "—"}</td>
                                            <td className="px-3 py-2 text-center text-slate-500">{entry.cost_center_name || "—"}</td>
                                            <td className="px-3 py-2 text-center">
                                                {entry.debit > 0 ? <span className="text-emerald-400 font-bold font-mono">₪{money(entry.debit)}</span> : <span className="text-slate-700">—</span>}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {entry.credit > 0 ? <span className="text-rose-400 font-bold font-mono">₪{money(entry.credit)}</span> : <span className="text-slate-700">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="border-t border-white/5 p-3 flex items-center justify-between">
                            <span className="text-[10px] text-slate-600 font-bold">{data.entries.length} قيد</span>
                            <div className="flex items-center gap-4 text-[10px] font-black">
                                <span className="text-emerald-400 font-mono">مدين: ₪{money(data.total_debit)}</span>
                                <span className="text-rose-400 font-mono">دائن: ₪{money(data.total_credit)}</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </TabWrapper>
    );
};

/* 5. Discounts Tab */
const DiscountsTab: React.FC<{ invoiceId: number | null }> = ({ invoiceId }) => {
    const [data, setData] = useState<{ discounts: InvoiceDiscount[]; total_item_discount: number; total_invoice_discount: number; total_discount: number; discount_count: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const loaded = useRef(false);

    useEffect(() => {
        if (loaded.current || !invoiceId) return;
        loaded.current = true;
        setLoading(true);
        invoiceDetailsService.getDiscounts(invoiceId)
            .then(setData).catch((e) => setError(e?.response?.data?.message || e?.message || "فشل التحميل"))
            .finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="p-6 text-center text-rose-400 text-xs font-bold">{error}</div>;
    if (!data) return null;

    return (
        <TabWrapper title={`الخصومات (${data.discount_count})`} icon={Percent}>
            {data.discounts.length === 0 ? (
                <div className="bg-slate-950/60 border border-white/5 rounded-xl p-8 text-center">
                    <Percent size={24} className="text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 font-bold">لا توجد خصومات على هذه الفاتورة</p>
                </div>
            ) : (
                <div className="bg-slate-950/60 border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-[9px] text-slate-600 font-black border-b border-white/5">
                                <th className="px-3 py-2 text-right">المنتج</th>
                                <th className="px-3 py-2 text-center">الكمية</th>
                                <th className="px-3 py-2 text-center">السعر</th>
                                <th className="px-3 py-2 text-center">قبل الخصم</th>
                                <th className="px-3 py-2 text-center">الخصم</th>
                                <th className="px-3 py-2 text-center">النوع</th>
                                <th className="px-3 py-2 text-center">بعد الخصم</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {data.discounts.map((d, idx) => (
                                <tr key={idx} className="hover:bg-white/[0.02]">
                                    <td className="px-3 py-2 text-slate-300 font-medium">{d.item_name}</td>
                                    <td className="px-3 py-2 text-center text-slate-400 font-mono">{d.quantity}</td>
                                    <td className="px-3 py-2 text-center text-slate-400 font-mono">₪{money(d.unit_price)}</td>
                                    <td className="px-3 py-2 text-center text-slate-400 font-mono">₪{money(d.original_total)}</td>
                                    <td className="px-3 py-2 text-center">
                                        <span className="text-rose-400 font-bold font-mono">-₪{money(d.discount_amount)}</span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {d.discount_percent > 0 ? (
                                            <span className="text-amber-400 font-mono">{d.discount_percent}%</span>
                                        ) : (
                                            <span className="text-slate-600 text-[9px]">ثابت</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sky-400 font-bold font-mono">₪{money(d.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {data.total_discount > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                        <p className="text-[9px] text-slate-500 font-black">خصم الأصناف</p>
                        <p className="text-base font-black font-mono text-rose-400 mt-1">₪{money(data.total_item_discount)}</p>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                        <p className="text-[9px] text-slate-500 font-black">خصم الفاتورة</p>
                        <p className="text-base font-black font-mono text-rose-400 mt-1">₪{money(data.total_invoice_discount)}</p>
                    </div>
                    <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3">
                        <p className="text-[9px] text-slate-500 font-black">إجمالي الخصم</p>
                        <p className="text-base font-black font-mono text-white mt-1">₪{money(data.total_discount)}</p>
                    </div>
                </div>
            )}
        </TabWrapper>
    );
};

/* 6. Inventory Tab */
const InventoryTab: React.FC<{ invoiceId: number | null }> = ({ invoiceId }) => {
    const [data, setData] = useState<{ movements: InventoryMovement[]; total_qty: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const loaded = useRef(false);

    useEffect(() => {
        if (loaded.current || !invoiceId) return;
        loaded.current = true;
        setLoading(true);
        invoiceDetailsService.getInventory(invoiceId)
            .then(setData).catch((e) => setError(e?.response?.data?.message || e?.message || "فشل التحميل"))
            .finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="p-6 text-center text-rose-400 text-xs font-bold">{error}</div>;
    if (!data) return null;

    return (
        <TabWrapper title={`حركة المخزون (${data.movements.length})`} icon={Box}>
            {data.movements.length === 0 ? (
                <div className="bg-slate-950/60 border border-white/5 rounded-xl p-8 text-center">
                    <Box size={24} className="text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 font-bold">لا توجد حركات مخزون</p>
                </div>
            ) : (
                <div className="bg-slate-950/60 border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-[9px] text-slate-600 font-black border-b border-white/5">
                                <th className="px-3 py-2 text-right">المنتج</th>
                                <th className="px-3 py-2 text-center">الكمية</th>
                                <th className="px-3 py-2 text-center">سعر الوحدة</th>
                                <th className="px-3 py-2 text-center">التكلفة</th>
                                <th className="px-3 py-2 text-center">النوع</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {data.movements.map((m, idx) => (
                                <tr key={idx} className="hover:bg-white/[0.02]">
                                    <td className="px-3 py-2 text-slate-300 font-medium">{m.item_name}</td>
                                    <td className="px-3 py-2 text-center text-slate-400 font-mono">{m.quantity}</td>
                                    <td className="px-3 py-2 text-center text-slate-400 font-mono">₪{money(m.unit_price)}</td>
                                    <td className="px-3 py-2 text-center text-slate-400 font-mono">₪{money(m.total_cost)}</td>
                                    <td className="px-3 py-2 text-center">
                                        <span className={`${m.movement === "out" ? "text-rose-400" : "text-emerald-400"} font-bold text-[10px]`}>
                                            {m.movement === "out" ? "صادر" : "وارد"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </TabWrapper>
    );
};

/* 7. Timeline Tab */
const TimelineTab: React.FC<{ invoiceId: number | null }> = ({ invoiceId }) => {
    const [data, setData] = useState<{ events: TimelineEvent[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const loaded = useRef(false);

    useEffect(() => {
        if (loaded.current || !invoiceId) return;
        loaded.current = true;
        setLoading(true);
        invoiceDetailsService.getTimeline(invoiceId)
            .then(setData).catch((e) => setError(e?.response?.data?.message || e?.message || "فشل التحميل"))
            .finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="p-6 text-center text-rose-400 text-xs font-bold">{error}</div>;
    if (!data) return null;

    const eventColors: Record<string, string> = {
        created: "text-blue-400 bg-blue-500/15 border-blue-500/25",
        paid: "text-emerald-400 bg-emerald-500/15 border-emerald-500/25",
        posted: "text-violet-400 bg-violet-500/15 border-violet-500/25",
        cancelled: "text-rose-400 bg-rose-500/15 border-rose-500/25",
        active: "text-sky-400 bg-sky-500/15 border-sky-500/25",
    };

    const timelineIcons: Record<string, React.ElementType> = {
        created: FileText,
        paid: CheckCircle,
        posted: BookOpen,
        cancelled: AlertTriangle,
        active: Activity,
    };

    return (
        <TabWrapper title="الجدول الزمني" icon={Clock}>
            {data.events.length === 0 ? (
                <div className="bg-slate-950/60 border border-white/5 rounded-xl p-8 text-center">
                    <Clock size={24} className="text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 font-bold">لا توجد أحداث</p>
                </div>
            ) : (
                <div className="bg-slate-950/60 border border-white/5 rounded-xl p-5">
                    <div className="relative">
                        <div className="absolute right-[13px] top-2 bottom-2 w-px bg-slate-800" />
                        <div className="space-y-4">
                            {data.events.map((evt, idx) => {
                                const Icon = timelineIcons[evt.event] || Clock;
                                const colorClass = eventColors[evt.event] || "text-slate-400 bg-slate-500/15 border-slate-500/25";
                                return (
                                    <div key={idx} className="flex items-start gap-3">
                                        <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 relative z-10 ${colorClass} text-[10px]`}>
                                            <Icon size={12} />
                                        </div>
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <p className="text-[11px] text-slate-300 font-bold">{evt.label}</p>
                                            <div className="flex items-center gap-2 text-[9px] text-slate-600 font-mono mt-0.5">
                                                {evt.timestamp && <span>{dateTimeFmt(evt.timestamp)}</span>}
                                                {evt.user && <span>بواسطة: {evt.user}</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </TabWrapper>
    );
};

/* 8. Attachments Tab */
const AttachmentsTab: React.FC<{ invoiceId: number | null }> = ({ invoiceId }) => {
    const [data, setData] = useState<{ attachments: any[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const loaded = useRef(false);

    useEffect(() => {
        if (loaded.current || !invoiceId) return;
        loaded.current = true;
        setLoading(true);
        invoiceDetailsService.getAttachments(invoiceId)
            .then(setData).catch(() => null)
            .finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <LoadingSpinner />;
    return (
        <TabWrapper title="المرفقات" icon={Paperclip}>
            <div className="bg-slate-950/60 border border-white/5 rounded-xl p-8 text-center">
                <Paperclip size={24} className="text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-600 font-bold">لا توجد مرفقات</p>
                <p className="text-[10px] text-slate-700 mt-1">يمكن إضافة المرفقات من النظام المحاسبي</p>
            </div>
        </TabWrapper>
    );
};

/* 9. Notes Tab */
const NotesTab: React.FC<{ invoiceId: number | null }> = ({ invoiceId }) => {
    const [data, setData] = useState<{ notes: InvoiceNote[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const loaded = useRef(false);

    useEffect(() => {
        if (loaded.current || !invoiceId) return;
        loaded.current = true;
        setLoading(true);
        invoiceDetailsService.getNotes(invoiceId)
            .then(setData).catch((e) => setError(e?.response?.data?.message || e?.message || "فشل التحميل"))
            .finally(() => setLoading(false));
    }, [invoiceId]);

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="p-6 text-center text-rose-400 text-xs font-bold">{error}</div>;
    if (!data) return null;

    const sourceIcons: Record<string, React.ElementType> = {
        فاتورة: FileText,
        طلب: ShoppingCart,
    };

    return (
        <TabWrapper title="الملاحظات" icon={MessageSquare}>
            {data.notes.length === 0 ? (
                <div className="bg-slate-950/60 border border-white/5 rounded-xl p-8 text-center">
                    <MessageSquare size={24} className="text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 font-bold">لا توجد ملاحظات</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {data.notes.map((n, idx) => {
                        const Icon = sourceIcons[n.source] || FileText;
                        return (
                            <div key={idx} className="bg-slate-950/60 border border-white/5 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Icon size={11} className="text-slate-500" />
                                    <span className="text-[9px] text-slate-600 font-black">{n.source}</span>
                                    {n.created_at && <span className="text-[8px] text-slate-700 font-mono">{dateFmt(n.created_at)}</span>}
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">{n.note}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </TabWrapper>
    );
};
