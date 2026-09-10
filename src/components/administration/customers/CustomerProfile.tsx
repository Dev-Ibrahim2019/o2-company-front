// src/components/administration/customers/CustomerProfile.tsx
// ملف العميل — واجهة ERP حديثة مع تبويبات متكاملة

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    User,
    FileText,
    Receipt,
    CreditCard,
    ShieldAlert,
    Wallet,
    Phone,
    Mail,
    MapPin,
    Building2,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Calendar,
    Clock,
    Download,
    Printer,
    Search,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Eye,
    ChevronDown,
    ChevronUp,
    BarChart3,
} from "lucide-react";
import { customerService, type Customer, type CustomerStatement, type CustomerAnalytics } from "../../../services/customerService";

// ─── Helpers ───────────────────────────────────────────────

const money = (v: number) =>
    v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dateFmt = (d: string) => {
    try {
        return new Date(d).toLocaleDateString("ar-SA", {
            day: "numeric", month: "short", year: "numeric",
        });
    } catch { return d; }
};

const statusBadge = (status: string) => {
    const map: Record<string, string> = {
        active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
        inactive: "bg-slate-500/15 text-slate-400 border-slate-500/25",
        blocked: "bg-rose-500/15 text-rose-400 border-rose-500/25",
    };
    return map[status] || map.inactive;
};

const riskBadge = (risk: string) => {
    const map: Record<string, string> = {
        low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        high: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        critical: "bg-red-600/10 text-red-400 border-red-600/20",
    };
    return map[risk] || map.low;
};

const agingColor = (days: number) => {
    if (days <= 0) return "text-emerald-400";
    if (days <= 30) return "text-amber-400";
    if (days <= 60) return "text-orange-400";
    if (days <= 90) return "text-rose-400";
    return "text-red-500";
};

// ─── KPI Card ──────────────────────────────────────────────

const KpiCard: React.FC<{
    label: string; value: string; icon: React.ElementType;
    color: string; bg: string; subtitle?: string;
}> = ({ label, value, icon: Icon, color, bg, subtitle }) => (
    <div className={`${bg} border border-white/5 rounded-2xl p-4`}>
        <div className="flex items-center gap-3 mb-2">
            <div className={`w-9 h-9 rounded-xl ${bg} border border-white/5 flex items-center justify-center ${color}`}>
                <Icon size={16} />
            </div>
            <span className="text-[10px] text-slate-500 font-bold">{label}</span>
        </div>
        <p className={`text-lg font-black font-mono ${color}`}>{value}</p>
        {subtitle && <p className="text-[10px] text-slate-500 mt-1">{subtitle}</p>}
    </div>
);

// ─── Tabs ──────────────────────────────────────────────────

type Tab = "overview" | "statement" | "invoices" | "receipts" | "aging" | "collection";

interface CustomerProfileProps {
    customerId: number;
    onBack: () => void;
}

const CustomerProfile: React.FC<CustomerProfileProps> = ({ customerId, onBack }) => {
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null);
    const [statement, setStatement] = useState<CustomerStatement | null>(null);
    const [loading, setLoading] = useState(true);
    const [statementFrom, setStatementFrom] = useState(
        new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
    );
    const [statementTo, setStatementTo] = useState(
        new Date().toISOString().split("T")[0]
    );

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: "overview", label: "نظرة عامة", icon: User },
        { id: "statement", label: "كشف حساب", icon: FileText },
        { id: "invoices", label: "فواتير", icon: Receipt },
        { id: "receipts", label: "مقبوضات", icon: Wallet },
        { id: "aging", label: "تحليل الأعمار", icon: ShieldAlert },
        { id: "collection", label: "تحصيل", icon: CreditCard },
    ];

    useEffect(() => {
        loadCustomer();
    }, [customerId]);

    const loadCustomer = async () => {
        setLoading(true);
        try {
            const [customerRes, analyticsRes, statementRes] = await Promise.all([
                customerService.get(customerId),
                customerService.getAnalytics(customerId),
                customerService.getStatement(customerId, statementFrom, statementTo),
            ]);
            setCustomer(customerRes.data.customer);
            setAnalytics(analyticsRes.data);
            setStatement(statementRes.data.statement);
        } catch (err) {
            console.error("Failed to load customer", err);
        } finally {
            setLoading(false);
        }
    };

    const loadStatement = async () => {
        try {
            const res = await customerService.getStatement(customerId, statementFrom, statementTo);
            setStatement(res.data.statement);
        } catch { }
    };

    if (loading) {
        return (
            <div className="bg-slate-900 border border-white/5 rounded-3xl flex items-center justify-center h-96">
                <RefreshCw size={32} className="animate-spin text-slate-600" />
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="bg-slate-900 border border-white/5 rounded-3xl flex flex-col items-center justify-center h-96 gap-3">
                <AlertTriangle size={40} className="text-slate-700" />
                <p className="text-slate-500 font-bold">العميل غير موجود</p>
                <button onClick={onBack} className="text-blue-400 text-sm hover:underline">العودة</button>
            </div>
        );
    }

    return (
        <div className="space-y-5" dir="rtl">
            {/* Customer Header */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                            {customer.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">{customer.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] text-slate-500 font-mono">{customer.code}</span>
                                <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black border ${statusBadge(customer.status)}`}>
                                    {customer.status === "active" ? "نشط" : customer.status === "inactive" ? "غير نشط" : "محظور"}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black border ${riskBadge(customer.risk_level)}`}>
                                    {customer.risk_level === "low" ? "مخاطرة منخفضة" :
                                        customer.risk_level === "medium" ? "مخاطرة متوسطة" :
                                            customer.risk_level === "high" ? "مخاطرة مرتفعة" : "مخاطرة حرجة"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-left">
                            <p className="text-[10px] text-slate-500 font-bold">الرصيد الحالي</p>
                            <p className={`text-2xl font-black font-mono ${customer.balance > 0 ? "text-rose-400" : "text-emerald-400"
                                }`}>
                                ₪{money(Math.abs(customer.balance))}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
                    {customer.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Phone size={12} className="text-slate-500" /> {customer.phone}
                        </div>
                    )}
                    {customer.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Mail size={12} className="text-slate-500" /> {customer.email}
                        </div>
                    )}
                    {customer.city && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <MapPin size={12} className="text-slate-500" /> {customer.city}
                        </div>
                    )}
                    {customer.branch && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Building2 size={12} className="text-slate-500" /> {customer.branch.name}
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden">
                <div className="flex overflow-x-auto border-b border-white/5">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                                ? "text-blue-400 border-blue-500 bg-blue-500/5"
                                : "text-slate-500 border-transparent hover:text-slate-300"
                                }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* Overview Tab */}
                    {activeTab === "overview" && analytics && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <KpiCard
                                    label="إجمالي المبيعات"
                                    value={`₪${money(analytics.total_sales)}`}
                                    icon={TrendingUp}
                                    color="text-emerald-400" bg="bg-emerald-500/10"
                                />
                                <KpiCard
                                    label="إجمالي المحصل"
                                    value={`₪${money(analytics.total_collected)}`}
                                    icon={TrendingDown}
                                    color="text-blue-400" bg="bg-blue-500/10"
                                />
                                <KpiCard
                                    label="معدل التحصيل"
                                    value={`${analytics.collection_rate}%`}
                                    icon={CheckCircle}
                                    color="text-violet-400" bg="bg-violet-500/10"
                                />
                                <KpiCard
                                    label="DSO"
                                    value={`${analytics.dso} يوم`}
                                    icon={Calendar}
                                    color="text-amber-400" bg="bg-amber-500/10"
                                />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <KpiCard
                                    label="الرصيد الحالي"
                                    value={`₪${money(analytics.current_balance)}`}
                                    icon={DollarSign}
                                    color="text-rose-400" bg="bg-rose-500/10"
                                />
                                <KpiCard
                                    label="الحد الائتماني"
                                    value={`₪${money(customer.credit_limit)}`}
                                    icon={CreditCard}
                                    color="text-slate-400" bg="bg-slate-500/10"
                                />
                                <KpiCard
                                    label="الائتمان المتاح"
                                    value={`₪${money(analytics.available_credit)}`}
                                    icon={Wallet}
                                    color="text-emerald-400" bg="bg-emerald-500/10"
                                />
                                <KpiCard
                                    label="تحصيل الشهر"
                                    value={`₪${money(analytics.monthly_collections)}`}
                                    icon={BarChart3}
                                    color="text-cyan-400" bg="bg-cyan-500/10"
                                />
                            </div>

                            {/* Credit Usage Bar */}
                            {customer.credit_limit > 0 && (
                                <div className="bg-slate-950 border border-white/5 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-slate-500 font-bold">استخدام الائتمان</span>
                                        <span className="text-sm font-black font-mono text-slate-300">
                                            {analytics.credit_usage}%
                                        </span>
                                    </div>
                                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${analytics.credit_usage > 80 ? "bg-rose-500" :
                                                analytics.credit_usage > 50 ? "bg-amber-500" : "bg-emerald-500"
                                                }`}
                                            style={{ width: `${Math.min(analytics.credit_usage, 100)}%` }}
                                        />
                                    </div>
                                    {analytics.is_over_limit && (
                                        <div className="flex items-center gap-2 mt-2 text-rose-400 text-xs">
                                            <AlertTriangle size={12} /> تجاوز الحد الائتماني!
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Aging Summary */}
                            {analytics.aging && (
                                <div className="bg-slate-950 border border-white/5 rounded-2xl p-4">
                                    <h4 className="text-xs font-bold text-slate-400 mb-3">توزيع الأعمار</h4>
                                    <div className="space-y-2">
                                        {[
                                            { label: "حالي", key: "current" as const, color: "bg-emerald-500" },
                                            { label: "1-30 يوم", key: "1_30" as const, color: "bg-amber-500" },
                                            { label: "31-60 يوم", key: "31_60" as const, color: "bg-orange-500" },
                                            { label: "61-90 يوم", key: "61_90" as const, color: "bg-rose-500" },
                                            { label: "أكثر من 90", key: "over_90" as const, color: "bg-red-600" },
                                        ].map((bucket) => {
                                            const val = analytics.aging[bucket.key];
                                            const pct = analytics.aging.total > 0
                                                ? (val / analytics.aging.total) * 100 : 0;
                                            return (
                                                <div key={bucket.key} className="flex items-center gap-3">
                                                    <span className="text-[10px] text-slate-500 w-20">{bucket.label}</span>
                                                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${bucket.color}`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-mono w-20 text-left">
                                                        ₪{money(val)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Statement Tab */}
                    {activeTab === "statement" && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="date"
                                    value={statementFrom}
                                    onChange={(e) => setStatementFrom(e.target.value)}
                                    className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white"
                                />
                                <span className="text-slate-500 text-xs">إلى</span>
                                <input
                                    type="date"
                                    value={statementTo}
                                    onChange={(e) => setStatementTo(e.target.value)}
                                    className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white"
                                />
                                <button onClick={loadStatement} className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400">
                                    <Search size={14} />
                                </button>
                                <button className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                                    <Download size={14} />
                                </button>
                                <button className="p-2 bg-slate-500/10 border border-slate-500/20 rounded-xl text-slate-400">
                                    <Printer size={14} />
                                </button>
                            </div>

                            {statement && (
                                <>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-slate-950 border border-white/5 rounded-xl p-3">
                                            <p className="text-[10px] text-slate-500">الرصيد الافتتاحي</p>
                                            <p className="text-sm font-black font-mono text-slate-300">
                                                ₪{money(statement.opening_balance)}
                                            </p>
                                        </div>
                                        <div className="bg-slate-950 border border-white/5 rounded-xl p-3">
                                            <p className="text-[10px] text-slate-500">إجمالي المدين</p>
                                            <p className="text-sm font-black font-mono text-rose-400">
                                                ₪{money(statement.total_debit)}
                                            </p>
                                        </div>
                                        <div className="bg-slate-950 border border-white/5 rounded-xl p-3">
                                            <p className="text-[10px] text-slate-500">إجمالي الدائن</p>
                                            <p className="text-sm font-black font-mono text-emerald-400">
                                                ₪{money(statement.total_credit)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-x-auto">
                                        <div className="min-w-[900px]">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-white/5">
                                                        <th className="text-right p-3 text-slate-500 font-bold">التاريخ</th>
                                                        <th className="text-right p-3 text-slate-500 font-bold">البيان</th>
                                                        <th className="text-right p-3 text-slate-500 font-bold">مدين</th>
                                                        <th className="text-right p-3 text-slate-500 font-bold">دائن</th>
                                                        <th className="text-right p-3 text-slate-500 font-bold">الرصيد</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {statement.lines.map((line, i) => (
                                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                                            <td className="p-3 text-slate-300">{dateFmt(line.date)}</td>
                                                            <td className="p-3">
                                                                <p className="text-slate-300">{line.description || line.type}</p>
                                                                <p className="text-[9px] text-slate-500 font-mono">{line.transaction_number}</p>
                                                            </td>
                                                            <td className="p-3 text-rose-400 font-mono">
                                                                {line.debit > 0 ? money(line.debit) : "—"}
                                                            </td>
                                                            <td className="p-3 text-emerald-400 font-mono">
                                                                {line.credit > 0 ? money(line.credit) : "—"}
                                                            </td>
                                                            <td className={`p-3 font-mono font-bold ${line.balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                                                {money(line.balance)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Invoices Tab */}
                    {activeTab === "invoices" && (
                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                            <Receipt size={32} className="text-slate-700" />
                            <p className="text-slate-500 font-bold">فواتير العميل</p>
                            <p className="text-xs text-slate-600">سيتم عرض فواتير المبيعات هنا</p>
                        </div>
                    )}

                    {/* Receipts Tab */}
                    {activeTab === "receipts" && (
                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                            <Wallet size={32} className="text-slate-700" />
                            <p className="text-slate-500 font-bold">مقبوضات العميل</p>
                            <p className="text-xs text-slate-600">سيتم عرض سندات القبض هنا</p>
                        </div>
                    )}

                    {/* Aging Tab */}
                    {activeTab === "aging" && analytics && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-white">تحليل أعمار الذمم المدينة</h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {[
                                    { label: "حالي", key: "current" as const, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                                    { label: "1-30 يوم", key: "1_30" as const, color: "text-amber-400", bg: "bg-amber-500/10" },
                                    { label: "31-60 يوم", key: "31_60" as const, color: "text-orange-400", bg: "bg-orange-500/10" },
                                    { label: "61-90 يوم", key: "61_90" as const, color: "text-rose-400", bg: "bg-rose-500/10" },
                                    { label: "أكثر من 90", key: "over_90" as const, color: "text-red-500", bg: "bg-red-500/10" },
                                ].map((bucket) => (
                                    <div key={bucket.key} className={`${bucket.bg} border border-white/5 rounded-2xl p-4`}>
                                        <p className="text-[10px] text-slate-500 font-bold mb-1">{bucket.label}</p>
                                        <p className={`text-lg font-black font-mono ${bucket.color}`}>
                                            ₪{money(analytics.aging[bucket.key])}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-slate-950 border border-white/5 rounded-2xl p-4">
                                <p className="text-xs text-slate-500 font-bold mb-2">إجمالي الذمم</p>
                                <p className="text-2xl font-black font-mono text-rose-400">
                                    ₪{money(analytics.aging.total)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Collection Tab */}
                    {activeTab === "collection" && (
                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                            <CreditCard size={32} className="text-slate-700" />
                            <p className="text-slate-500 font-bold">مركز التحصيل</p>
                            <p className="text-xs text-slate-600">سيتم عرض أنشطة التحصيل هنا</p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default CustomerProfile;