import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Package, Receipt, CreditCard, Clock, User, Phone,
    Hash, ShoppingCart, Tag, Building2, FileText, Calendar,
    ArrowUpRight, ArrowDownLeft, CheckCircle, AlertTriangle,
    Loader2, ChevronRight, Percent, Banknote, Wallet,
    Landmark, Smartphone,
} from "lucide-react";
import { orderService } from "../../../services/orderService";
import type { OrderFromApi, InvoicePaymentResponse } from "../../../services/orderService";

const money = (v: number | undefined | null) =>
    v?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00";

const dateFmt = (d: string | null | undefined) => {
    try {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return d || "—"; }
};

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-amber-500/15", text: "text-amber-400", label: "معلق" },
    confirmed: { bg: "bg-blue-500/15", text: "text-blue-400", label: "مؤكد" },
    in_progress: { bg: "bg-sky-500/15", text: "text-sky-400", label: "قيد التحضير" },
    ready: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "جاهز" },
    served: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "تم التقديم" },
    paid: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "مدفوع" },
    cancelled: { bg: "bg-rose-500/15", text: "text-rose-400", label: "ملغي" },
    partial: { bg: "bg-amber-500/15", text: "text-amber-400", label: "مدفوع جزئياً" },
};

const getStatusBadge = (status: string) => {
    const s = statusColors[status] || { bg: "bg-slate-500/15", text: "text-slate-400", label: status };
    return <span className={`px-2 py-0.5 rounded text-[9px] font-black ${s.bg} ${s.text}`}>{s.label}</span>;
};

const paymentIcons: Record<string, React.ElementType> = {
    cash: Banknote,
    card: CreditCard,
    bank: Landmark,
    wallet: Smartphone,
    account: User,
};

const paymentLabels: Record<string, string> = {
    cash: "نقداً",
    card: "بطاقة",
    bank: "تحويل بنكي",
    wallet: "محفظة",
    account: "حساب",
    customer: "عميل",
    employee: "موظف",
    supplier: "مورد",
};

interface InvoiceDetailsDrawerProps {
    orderId: number | null;
    onClose: () => void;
}

interface TimelineEvent {
    date: string;
    label: string;
    icon: React.ElementType;
    color: string;
}

const InvoiceDetailsDrawer: React.FC<InvoiceDetailsDrawerProps> = ({ orderId, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [order, setOrder] = useState<OrderFromApi | null>(null);

    useEffect(() => {
        if (!orderId) return;
        setLoading(true);
        setError(null);
        setOrder(null);
        orderService.getOne(orderId)
            .then(setOrder)
            .catch((err: any) => setError(err?.response?.data?.message || err?.message || "فشل تحميل تفاصيل الفاتورة"))
            .finally(() => setLoading(false));
    }, [orderId]);

    const invoice = order?.invoice;
    const payments = order?.payments || invoice?.payments || [];
    const items = order?.items || [];
    const tickets = order?.tickets || [];

    const totalPaid = payments.reduce((s: number, p: InvoicePaymentResponse) => s + p.amount, 0);
    const remaining = Math.max(0, (order?.total || 0) - totalPaid);
    const totalDiscount = (order?.total_discount ?? order?.discount_amount ?? 0);

    // Build timeline from order status, tickets, and payments
    const timeline: TimelineEvent[] = [];
    if (order?.created_at) {
        timeline.push({
            date: order.created_at,
            label: "تم إنشاء الطلب",
            icon: FileText,
            color: "text-blue-400",
        });
    }
    if (order?.status === "confirmed" || (order?.updated_at && order?.status !== "pending")) {
        timeline.push({
            date: order.updated_at,
            label: "تم تأكيد الطلب",
            icon: CheckCircle,
            color: "text-blue-500",
        });
    }
    tickets.forEach((t) => {
        if (t.started_at) {
            timeline.push({
                date: t.started_at,
                label: `بدأ تحضير ${t.department?.name || "قسم"}`,
                icon: Clock,
                color: "text-sky-400",
            });
        }
        if (t.completed_at) {
            timeline.push({
                date: t.completed_at,
                label: `انتهى تحضير ${t.department?.name || "قسم"}`,
                icon: CheckCircle,
                color: "text-emerald-400",
            });
        }
    });
    payments.forEach((p) => {
        timeline.push({
            date: p.created_at,
            label: `دفعة ${paymentLabels[p.method as keyof typeof paymentLabels] || p.payment_method || p.method || "—"} — ₪${money(p.amount)}`,
            icon: Wallet,
            color: "text-emerald-500",
        });
    });

    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <AnimatePresence>
            {orderId !== null && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed top-0 left-auto right-0 bottom-0 z-50 w-full max-w-2xl bg-slate-900 border-l border-white/5 shadow-2xl overflow-hidden flex flex-col"
                        dir="rtl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-950/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 flex items-center justify-center">
                                    <Receipt size={18} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white">
                                        {order?.order_number ? `فاتورة ${order.order_number}` : "تفاصيل الفاتورة"}
                                    </h3>
                                    {order?.invoice?.number && (
                                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                                            رقم القيد: {order.invoice.number}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {order && getStatusBadge(order.status)}
                                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
                                    <Loader2 size={24} className="animate-spin" />
                                    <span className="text-sm font-bold">جاري تحميل التفاصيل...</span>
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-3 text-rose-400 p-8 text-center">
                                    <AlertTriangle size={32} />
                                    <p className="text-sm font-bold">{error}</p>
                                    <button onClick={onClose} className="text-xs text-slate-500 hover:text-white underline">إغلاق</button>
                                </div>
                            ) : !order ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-600">
                                    <FileText size={32} />
                                    <p className="text-sm font-bold">لا توجد بيانات</p>
                                </div>
                            ) : (
                                <div className="p-4 space-y-4">
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3">
                                            <p className="text-[9px] text-slate-600 font-black mb-1">الإجمالي</p>
                                            <p className="text-sm font-black font-mono text-white">₪{money(order.total)}</p>
                                        </div>
                                        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3">
                                            <p className="text-[9px] text-slate-600 font-black mb-1">المدفوع</p>
                                            <p className="text-sm font-black font-mono text-emerald-400">₪{money(totalPaid)}</p>
                                        </div>
                                        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3">
                                            <p className="text-[9px] text-slate-600 font-black mb-1">المتبقي</p>
                                            <p className={`text-sm font-black font-mono ${remaining > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                                ₪{money(remaining)}
                                            </p>
                                        </div>
                                        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3">
                                            <p className="text-[9px] text-slate-600 font-black mb-1">الأصناف</p>
                                            <p className="text-sm font-black font-mono text-sky-400">{items.length}</p>
                                        </div>
                                    </div>

                                    {/* Info Section */}
                                    <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <FileText size={12} className="text-slate-500" />
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">معلومات الفاتورة</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div className="flex items-center gap-2">
                                                <Hash size={11} className="text-slate-600 shrink-0" />
                                                <span className="text-slate-500">رقم الطلب:</span>
                                                <span className="text-slate-300 font-bold">{order.order_number}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar size={11} className="text-slate-600 shrink-0" />
                                                <span className="text-slate-500">التاريخ:</span>
                                                <span className="text-slate-300 font-bold">{dateFmt(order.created_at)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Building2 size={11} className="text-slate-600 shrink-0" />
                                                <span className="text-slate-500">نوع الطلب:</span>
                                                <span className="text-slate-300 font-bold">{order.order_type === "dine_in" ? "داخلي" : "طلبات خارجية"}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User size={11} className="text-slate-600 shrink-0" />
                                                <span className="text-slate-500">الكاشير:</span>
                                                <span className="text-slate-300 font-bold">{order.cashier?.name || "—"}</span>
                                            </div>
                                            {order.table_number && (
                                                <div className="flex items-center gap-2">
                                                    <Hash size={11} className="text-slate-600 shrink-0" />
                                                    <span className="text-slate-500">طاولة:</span>
                                                    <span className="text-slate-300 font-bold">{order.table_number}</span>
                                                </div>
                                            )}
                                            {order.customer_name && (
                                                <div className="flex items-center gap-2">
                                                    <User size={11} className="text-slate-600 shrink-0" />
                                                    <span className="text-slate-500">العميل:</span>
                                                    <span className="text-slate-300 font-bold">{order.customer_name}</span>
                                                </div>
                                            )}
                                            {order.customer_phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone size={11} className="text-slate-600 shrink-0" />
                                                    <span className="text-slate-500">الهاتف:</span>
                                                    <span className="text-slate-300 font-bold" dir="ltr">{order.customer_phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div className="bg-slate-950/60 border border-white/5 rounded-xl overflow-hidden">
                                        <div className="flex items-center gap-2 p-3 border-b border-white/5">
                                            <Package size={12} className="text-sky-400" />
                                            <span className="text-[9px] text-sky-400 font-black uppercase tracking-widest">الأصناف — {items.length}</span>
                                        </div>
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="text-[9px] text-slate-600 font-black border-b border-white/5">
                                                    <th className="px-3 py-2 text-right">المنتج</th>
                                                    <th className="px-3 py-2 text-center">الكمية</th>
                                                    <th className="px-3 py-2 text-center">سعر الوحدة</th>
                                                    <th className="px-3 py-2 text-center">الإجمالي</th>
                                                    <th className="px-3 py-2 text-center">الخصم</th>
                                                    <th className="px-3 py-2 text-center">ضريبة</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {items.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-white/[0.02]">
                                                        <td className="px-3 py-2 text-slate-300 font-medium">
                                                            <div className="flex items-center gap-1.5">
                                                                <ShoppingCart size={10} className="text-slate-600 shrink-0" />
                                                                <span>{item.item_name_ar || item.item_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 text-center text-slate-400 font-mono">{item.quantity}</td>
                                                        <td className="px-3 py-2 text-center text-slate-400 font-mono">₪{money(item.unit_price)}</td>
                                                        <td className="px-3 py-2 text-center text-slate-300 font-mono font-bold">₪{money(item.total_price)}</td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className="text-rose-400 font-mono text-[9px]">
                                                                {order.discount_amount > 0 ? `-₪${money(order.discount_amount)}` : "—"}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            {item.tax_amount ? (
                                                                <span className="text-amber-400 font-mono text-[9px]">
                                                                    ₪{money(item.tax_amount)}
                                                                    {item.tax_rate ? <span className="text-slate-600"> ({item.tax_rate}%)</span> : null}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-700">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {/* Totals */}
                                        <div className="border-t border-white/5 p-3 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-slate-500">المجموع الفرعي:</span>
                                                <span className="text-[10px] text-slate-400 font-mono">₪{money(order.subtotal)}</span>
                                            </div>
                                            {totalDiscount > 0 && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-rose-400/70">الخصم:</span>
                                                    <span className="text-[10px] text-rose-400 font-mono">-₪{money(totalDiscount)}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between pt-1 border-t border-white/5">
                                                <span className="text-xs text-white font-black">الإجمالي النهائي:</span>
                                                <span className="text-xs text-white font-black font-mono">₪{money(order.total)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payments */}
                                    {payments.length > 0 && (
                                        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <CreditCard size={12} className="text-emerald-400" />
                                                <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">المدفوعات — {payments.length}</span>
                                            </div>
                                            <div className="space-y-2">
                                                {payments.map((p, idx) => {
                                                    const Icon = paymentIcons[p.method as keyof typeof paymentIcons] || Wallet;
                                                    const label = paymentLabels[p.method as keyof typeof paymentLabels] || p.payment_method || p.method || "—";
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between bg-slate-900/60 rounded-lg p-2.5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                                    <Icon size={12} className="text-emerald-400" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] text-slate-300 font-bold">{label}</p>
                                                                    {p.reference_number && (
                                                                        <p className="text-[8px] text-slate-600 font-mono">مرجع: {p.reference_number}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className="text-[11px] text-emerald-400 font-black font-mono">₪{money(p.amount)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                                                <span className="text-xs text-emerald-400 font-black">إجمالي المدفوعات:</span>
                                                <span className="text-xs text-emerald-400 font-black font-mono">₪{money(totalPaid)}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Timeline */}
                                    {timeline.length > 0 && (
                                        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Clock size={12} className="text-violet-400" />
                                                <span className="text-[9px] text-violet-400 font-black uppercase tracking-widest">الجدول الزمني</span>
                                            </div>
                                            <div className="relative">
                                                <div className="absolute right-[11px] top-2 bottom-2 w-px bg-slate-800" />
                                                <div className="space-y-3">
                                                    {timeline.map((evt, idx) => (
                                                        <div key={idx} className="flex items-start gap-3">
                                                            <div className={`w-6 h-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 relative z-10 ${evt.color}`}>
                                                                <evt.icon size={10} />
                                                            </div>
                                                            <div className="flex-1 min-w-0 pt-1">
                                                                <p className="text-[11px] text-slate-300 font-bold">{evt.label}</p>
                                                                <p className="text-[9px] text-slate-600 font-mono mt-0.5">{dateFmt(evt.date)}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Notes */}
                                    {order.note && (
                                        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <FileText size={12} className="text-slate-500" />
                                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">ملاحظات</span>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">{order.note}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {order && (
                            <div className="shrink-0 border-t border-white/5 p-3 bg-slate-950/50 flex items-center justify-between">
                                <span className="text-[10px] text-slate-600 font-bold">
                                    {items.length} صنف · {payments.length} دفعة
                                </span>
                                <span className="text-[10px] text-slate-600 font-mono">
                                    {dateFmt(order.created_at)}
                                </span>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default InvoiceDetailsDrawer;
