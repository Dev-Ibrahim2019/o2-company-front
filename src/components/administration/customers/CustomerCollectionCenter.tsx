// src/components/administration/customers/CustomerCollectionCenter.tsx
// مركز التحصيل — متابعة تحصيل الذمم المدينة

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    CreditCard,
    TrendingUp,
    Users,
    DollarSign,
    RefreshCw,
    Search,
    Phone,
    Mail,
    ShieldAlert,
    Clock,
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { customerService, type CollectionReportItem } from "../../../services/customerService";

const money = (v: number) =>
    v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const riskColor = (level: string) => {
    const map: Record<string, string> = {
        low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        high: "text-rose-400 bg-rose-500/10 border-rose-500/20",
        critical: "text-red-400 bg-red-500/10 border-red-500/20",
    };
    return map[level] || map.low;
};

const CustomerCollectionCenter: React.FC = () => {
    const [customers, setCustomers] = useState<CollectionReportItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [totals, setTotals] = useState({ outstanding: 0, count: 0 });

    const loadReport = async () => {
        setLoading(true);
        try {
            const res = await customerService.getCollectionReport();
            setCustomers(res.data.customers);
            setTotals({
                outstanding: res.data.total_outstanding,
                count: res.data.total_customers,
            });
        } catch (err) {
            console.error("Failed to load collection report", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadReport(); }, []);

    const toggleRow = (id: number) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedRows(newSet);
    };

    const filtered = customers.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    );

    const getPriorityColor = (days: number) => {
        if (days >= 90) return "text-red-400 bg-red-500/10 border-red-500/20";
        if (days >= 60) return "text-rose-400 bg-rose-500/10 border-rose-500/20";
        if (days >= 30) return "text-orange-400 bg-orange-500/10 border-orange-500/20";
        if (days >= 15) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    };

    return (
        <div className="space-y-5" dir="rtl">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                            <DollarSign size={18} />
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold">إجمالي الذمم</span>
                    </div>
                    <p className="text-2xl font-black font-mono text-rose-400">
                        ₪{money(totals.outstanding)}
                    </p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <Users size={18} />
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold">عملاء عليهم مستحقات</span>
                    </div>
                    <p className="text-2xl font-black font-mono text-amber-400">
                        {totals.count}
                    </p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <TrendingUp size={18} />
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold">متوسط الذمم لكل عميل</span>
                    </div>
                    <p className="text-2xl font-black font-mono text-emerald-400">
                        ₪{money(totals.count > 0 ? totals.outstanding / totals.count : 0)}
                    </p>
                </motion.div>
            </div>

            {/* Filter */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="بحث عن عميل..."
                            className="w-full bg-slate-950 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white outline-none focus:border-blue-500/50"
                        />
                    </div>
                    <button onClick={loadReport} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white">
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Collection List */}
            {loading ? (
                <div className="bg-slate-900 border border-white/5 rounded-3xl flex items-center justify-center h-64">
                    <RefreshCw size={24} className="animate-spin text-slate-600" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-slate-900 border border-white/5 rounded-3xl flex flex-col items-center justify-center h-64 gap-3">
                    <CreditCard size={40} className="text-slate-700" />
                    <p className="text-slate-500 font-bold">لا توجد ذمم للتحصيل</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((item, idx) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all"
                        >
                            <div
                                className="p-4 cursor-pointer"
                                onClick={() => toggleRow(item.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center text-white font-black">
                                            {item.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">{item.name}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] text-slate-500 font-mono">{item.code}</span>
                                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black border ${riskColor(item.risk_level)}`}>
                                                    {item.risk_level === "low" ? "منخفض" :
                                                        item.risk_level === "medium" ? "متوسط" :
                                                            item.risk_level === "high" ? "مرتفع" : "حرج"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-left">
                                            <p className="text-[9px] text-slate-500 font-bold">الرصيد</p>
                                            <p className="text-sm font-black font-mono text-rose-400">
                                                ₪{money(item.balance)}
                                            </p>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[9px] text-slate-500 font-bold">أيام التأخير</p>
                                            <p className={`text-sm font-black font-mono ${item.days_past_due >= 90 ? "text-red-400" :
                                                    item.days_past_due >= 60 ? "text-rose-400" :
                                                        item.days_past_due >= 30 ? "text-orange-400" :
                                                            item.days_past_due >= 15 ? "text-amber-400" : "text-emerald-400"
                                                }`}>
                                                {item.days_past_due > 0 ? `${item.days_past_due} يوم` : "حالي"}
                                            </p>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[9px] text-slate-500 font-bold">تحصيل الشهر</p>
                                            <p className="text-sm font-black font-mono text-emerald-400">
                                                ₪{money(item.monthly_collections)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Aging Mini Bars */}
                                <div className="flex gap-1 mt-3 h-2">
                                    {[
                                        { key: "current" as const, color: "bg-emerald-500" },
                                        { key: "1_30" as const, color: "bg-amber-500" },
                                        { key: "31_60" as const, color: "bg-orange-500" },
                                        { key: "61_90" as const, color: "bg-rose-500" },
                                        { key: "over_90" as const, color: "bg-red-600" },
                                    ].map((bucket) => {
                                        const pct = item.aging.total > 0
                                            ? (item.aging[bucket.key] / item.aging.total) * 100 : 0;
                                        return (
                                            <div
                                                key={bucket.key}
                                                className={`${bucket.color} rounded-full`}
                                                style={{ width: `${pct}%`, height: "100%" }}
                                                title={`${bucket.key}: ₪${money(item.aging[bucket.key])}`}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Overdue indicators */}
                                {item.days_past_due >= 30 && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <AlertTriangle size={10} className="text-rose-400" />
                                        <span className="text-[9px] text-rose-400 font-bold">
                                            {item.days_past_due >= 90 ? "متأخر جداً - يحتاج متابعة فورية" :
                                                item.days_past_due >= 60 ? "متأخر - يحتاج متابعة عاجلة" :
                                                    "متأخر - يحتاج متابعة"}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Expanded Details */}
                            {expandedRows.has(item.id) && (
                                <div className="px-4 pb-4 border-t border-white/5 pt-3">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-[9px] text-slate-500 font-bold mb-1">الحد الائتماني</p>
                                            <p className="text-xs font-black font-mono text-slate-300">
                                                ₪{money(item.credit_limit)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-500 font-bold mb-1">استخدام الائتمان</p>
                                            <p className="text-xs font-black font-mono text-amber-400">
                                                {item.credit_usage}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-500 font-bold mb-1">هاتف</p>
                                            <p className="text-xs font-black text-slate-300" dir="ltr">
                                                {item.phone || "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-500 font-bold mb-1">الإجراء الموصى به</p>
                                            <p className="text-xs font-black text-slate-300">
                                                {item.days_past_due >= 90 ? "اتصال هاتفي فوري + إنذار رسمي" :
                                                    item.days_past_due >= 60 ? "اتصال هاتفي + إشعار خطي" :
                                                        item.days_past_due >= 30 ? "إشعار تذكير" :
                                                            item.days_past_due >= 15 ? "متابعة هاتفية" : "لا يوجد إجراء"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomerCollectionCenter;