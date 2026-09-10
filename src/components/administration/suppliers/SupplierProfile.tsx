// src/components/administration/suppliers/SupplierProfile.tsx
// الملف التعريفي للمورد — تبويبات: نظرة عامة، كشف حساب، دفعات، أعمار

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    ChevronRight,
    User,
    Phone,
    Mail,
    MapPin,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Wallet,
    Activity,
    Calendar,
    RefreshCw,
    FileText,
    Download,
    Printer,
    Search,
    Truck,
    AlertTriangle,
    Building2,
    Clock,
    CreditCard,
} from "lucide-react";
import { supplierService, type Supplier, type SupplierAging, type SupplierStatement } from "../../../services/supplierService";

// ─── Helpers ───────────────────────────────────────────────────────────────

const money = (v: number) =>
    v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dateFmt = (d: string) => {
    try {
        return new Date(d).toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" });
    } catch { return d; }
};

type TabKey = "overview" | "statement" | "transactions" | "aging";

// ─── Overview Tab ──────────────────────────────────────────────────────────

const OverviewTab: React.FC<{ supplier: Supplier; aging: SupplierAging }> = ({ supplier, aging }) => (
    <div className="space-y-6">
        {/* Supplier Info */}
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                    {supplier.name.charAt(0)}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">{supplier.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{supplier.code} • {supplier.category === "local" ? "محلي" : supplier.category === "international" ? "دولي" : "خدمي"}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {supplier.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Phone size={14} className="text-emerald-400" /> {supplier.phone}
                    </div>
                )}
                {supplier.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Mail size={14} className="text-blue-400" /> {supplier.email}
                    </div>
                )}
                {supplier.city && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <MapPin size={14} className="text-rose-400" /> {supplier.city}
                    </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <DollarSign size={14} className="text-amber-400" /> {supplier.currency}
                </div>
            </div>
        </div>

        {/* Financial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5">
                <p className="text-[10px] text-slate-500 font-black mb-1">الرصيد الحالي</p>
                <p className="text-2xl font-black font-mono text-rose-400">₪{money(Math.abs(supplier.balance))}</p>
                <p className="text-xs text-slate-600 mt-1">المبلغ المستحق للمورد</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
                <p className="text-[10px] text-slate-500 font-black mb-1">الحد الائتماني</p>
                <p className="text-2xl font-black font-mono text-blue-400">₪{money(supplier.credit_limit)}</p>
                <p className="text-xs text-slate-600 mt-1">{supplier.payment_terms === "net30" ? "30 يوم" : supplier.payment_terms === "net15" ? "15 يوم" : supplier.payment_terms === "immediate" ? "فوري" : supplier.payment_terms}</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
                <p className="text-[10px] text-slate-500 font-black mb-1">إجمالي الأعمار</p>
                <p className="text-2xl font-black font-mono text-amber-400">₪{money(aging.total)}</p>
                <p className="text-xs text-slate-600 mt-1">آخر 90 يوم</p>
            </div>
        </div>

        {/* Aging Summary */}
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                <Clock size={16} className="text-slate-500" /> تحليل الأعمار
            </h4>
            <div className="space-y-3">
                {[
                    { label: "حالي", value: aging.current, color: "text-emerald-400", pct: aging.total > 0 ? (aging.current / aging.total) * 100 : 0 },
                    { label: "1-30 يوم", value: aging["1_30"], color: "text-blue-400", pct: aging.total > 0 ? (aging["1_30"] / aging.total) * 100 : 0 },
                    { label: "31-60 يوم", value: aging["31_60"], color: "text-amber-400", pct: aging.total > 0 ? (aging["31_60"] / aging.total) * 100 : 0 },
                    { label: "61-90 يوم", value: aging["61_90"], color: "text-orange-400", pct: aging.total > 0 ? (aging["61_90"] / aging.total) * 100 : 0 },
                    { label: "أكثر من 90 يوم", value: aging.over_90, color: "text-rose-400", pct: aging.total > 0 ? (aging.over_90 / aging.total) * 100 : 0 },
                ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 w-24">{item.label}</span>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${item.color.replace("text-", "bg-")}`} style={{ width: `${item.pct}%` }} />
                        </div>
                        <span className={`text-sm font-bold font-mono ${item.color} w-24 text-left`}>
                            ₪{money(item.value)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// ─── Statement Tab ─────────────────────────────────────────────────────────

const StatementTab: React.FC<{ supplierId: number }> = ({ supplierId }) => {
    const today = new Date();
    const [from, setFrom] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]);
    const [to, setTo] = useState(today.toISOString().split("T")[0]);
    const [statement, setStatement] = useState<SupplierStatement | null>(null);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await supplierService.getStatement(supplierId, from, to);
            setStatement(res.data.statement);
        } catch { } finally { setLoading(false); }
    }, [supplierId, from, to]);

    useEffect(() => { fetch(); }, [fetch]);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Calendar size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                        className="bg-slate-950 border border-white/5 rounded-xl py-2 pr-8 pl-3 text-xs text-white outline-none w-36" />
                </div>
                <span className="text-slate-600">—</span>
                <div className="relative">
                    <Calendar size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                        className="bg-slate-950 border border-white/5 rounded-xl py-2 pr-8 pl-3 text-xs text-white outline-none w-36" />
                </div>
                <button onClick={fetch} className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {loading ? (
                <div className="bg-slate-900 border border-white/5 rounded-2xl h-48 flex items-center justify-center">
                    <RefreshCw size={20} className="animate-spin text-slate-600" />
                </div>
            ) : !statement || statement.lines.length === 0 ? (
                <div className="bg-slate-900 border border-white/5 rounded-2xl h-48 flex flex-col items-center justify-center gap-2">
                    <FileText size={24} className="text-slate-700" />
                    <p className="text-slate-500 text-sm">لا توجد معاملات</p>
                </div>
            ) : (
                <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-x-auto">
                    <div className="min-w-[900px]">
                        <table className="w-full text-right text-xs">
                            <thead className="bg-slate-950/40 border-b border-white/5">
                                <tr className="text-slate-500 font-black text-[10px]">
                                    <th className="px-4 py-3">التاريخ</th>
                                    <th className="px-4 py-3">رقم القيد</th>
                                    <th className="px-4 py-3">البيان</th>
                                    <th className="px-4 py-3 text-center">مدين</th>
                                    <th className="px-4 py-3 text-center">دائن</th>
                                    <th className="px-4 py-3 text-center">الرصيد</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {statement.lines.map((line, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.02]">
                                        <td className="px-4 py-3 text-slate-300">{dateFmt(line.date)}</td>
                                        <td className="px-4 py-3 font-mono text-slate-500">{line.transaction_number}</td>
                                        <td className="px-4 py-3 text-slate-400">{line.description || "—"}</td>
                                        <td className="px-4 py-3 text-center font-mono">
                                            {line.debit > 0 ? <span className="text-emerald-400">₪{money(line.debit)}</span> : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono">
                                            {line.credit > 0 ? <span className="text-rose-400">₪{money(line.credit)}</span> : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono">
                                            <span className={line.balance >= 0 ? "text-blue-400" : "text-rose-400"}>
                                                ₪{money(Math.abs(line.balance))}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="px-4 py-3 border-t border-white/5 bg-slate-950/20 flex items-center justify-between text-xs">
                            <span className="text-slate-500">الرصيد الختامي: <strong className="text-white">₪{money(statement.closing_balance)}</strong></span>
                            <span className="text-slate-500">{statement.lines.length} معاملة</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Aging Tab ─────────────────────────────────────────────────────────────

const AgingTab: React.FC<{ supplierId: number }> = ({ supplierId }) => {
    const [aging, setAging] = useState<SupplierAging | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supplierService.getAging(supplierId).then((res) => {
            setAging(res.data.aging);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [supplierId]);

    if (loading) return <div className="h-48 flex items-center justify-center"><RefreshCw className="animate-spin text-slate-600" /></div>;
    if (!aging) return <div className="text-slate-500 text-center py-12">لا توجد بيانات</div>;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-5 gap-3">
                {[
                    { label: "حالي", value: aging.current, color: "emerald", max: aging.total },
                    { label: "1-30", value: aging["1_30"], color: "blue", max: aging.total },
                    { label: "31-60", value: aging["31_60"], color: "amber", max: aging.total },
                    { label: "61-90", value: aging["61_90"], color: "orange", max: aging.total },
                    { label: "90+", value: aging.over_90, color: "rose", max: aging.total },
                ].map((item) => (
                    <div key={item.label} className={`bg-${item.color}-500/10 border border-${item.color}-500/20 rounded-2xl p-4 text-center`}>
                        <p className="text-[10px] text-slate-500 font-black mb-2">{item.label}</p>
                        <p className={`text-xl font-black font-mono text-${item.color}-400`}>₪{money(item.value)}</p>
                        <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full bg-${item.color}-500 rounded-full`}
                                style={{ width: `${item.max > 0 ? (item.value / item.max) * 100 : 0}%` }} />
                        </div>
                    </div>
                ))}
            </div>
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                <p className="text-sm text-slate-400">إجمالي المستحق: <strong className="text-white font-black">₪{money(aging.total)}</strong></p>
            </div>
        </div>
    );
};

// ─── Main Supplier Profile ─────────────────────────────────────────────────

const SupplierProfile: React.FC<{
    supplierId: number;
    onBack: () => void;
}> = ({ supplierId, onBack }) => {
    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [aging, setAging] = useState<SupplierAging>({ current: 0, "1_30": 0, "31_60": 0, "61_90": 0, over_90: 0, total: 0 });
    const [activeTab, setActiveTab] = useState<TabKey>("overview");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supplierService.get(supplierId).then((res) => {
            setSupplier(res.data.supplier);
            setAging(res.data.aging);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [supplierId]);

    const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
        { key: "overview", label: "نظرة عامة", icon: User },
        { key: "statement", label: "كشف حساب", icon: FileText },
        { key: "transactions", label: "المعاملات", icon: Activity },
        { key: "aging", label: "تحليل الأعمار", icon: Clock },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <RefreshCw size={24} className="animate-spin text-slate-600" />
            </div>
        );
    }

    if (!supplier) {
        return <div className="text-slate-500 text-center py-20">المورد غير موجود</div>;
    }

    return (
        <div className="space-y-5" dir="rtl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white">
                    <ChevronRight size={20} />
                </button>
                <div>
                    <h2 className="text-lg font-bold text-white">{supplier.name}</h2>
                    <p className="text-xs text-slate-500">{supplier.code}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-2 flex gap-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeTab === tab.key
                            ? "bg-blue-600 text-white shadow-lg"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === "overview" && <OverviewTab supplier={supplier} aging={aging} />}
            {activeTab === "statement" && <StatementTab supplierId={supplierId} />}
            {activeTab === "aging" && <AgingTab supplierId={supplierId} />}
            {activeTab === "transactions" && <StatementTab supplierId={supplierId} />}
        </div>
    );
};

export default SupplierProfile;