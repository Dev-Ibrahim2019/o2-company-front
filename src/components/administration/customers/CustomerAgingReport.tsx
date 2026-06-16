// src/components/administration/customers/CustomerAgingReport.tsx
// تقرير تحليل أعمار العملاء

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    ShieldAlert,
    TrendingUp,
    Users,
    DollarSign,
    RefreshCw,
    Search,
    Download,
    ChevronDown,
    ChevronUp,
    Phone,
    Mail,
} from "lucide-react";
import { customerService, type AgingReportItem } from "../../../services/customerService";

const money = (v: number) =>
    v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const agingBgColor = (bucket: string, val: number, total: number) => {
    const pct = total > 0 ? (val / total) * 100 : 0;
    if (bucket === "current") return pct > 50 ? "bg-emerald-500/20" : "bg-emerald-500/10";
    if (bucket === "1_30") return pct > 30 ? "bg-amber-500/20" : "bg-amber-500/10";
    if (bucket === "31_60") return pct > 20 ? "bg-orange-500/20" : "bg-orange-500/10";
    if (bucket === "61_90") return pct > 15 ? "bg-rose-500/20" : "bg-rose-500/10";
    return pct > 10 ? "bg-red-500/20" : "bg-red-500/10";
};

const CustomerAgingReport: React.FC = () => {
    const [report, setReport] = useState<AgingReportItem[]>([]);
    const [totals, setTotals] = useState({
        current: 0, "1_30": 0, "31_60": 0, "61_90": 0, over_90: 0, total: 0,
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    const loadReport = async () => {
        setLoading(true);
        try {
            const res = await customerService.getAgingReport();
            setReport(res.data.customers);
            setTotals(res.data.totals);
        } catch (err) {
            console.error("Failed to load aging report", err);
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

    const filtered = report.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-5" dir="rtl">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {[
                    { label: "حالي", key: "current" as const, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "1-30 يوم", key: "1_30" as const, color: "text-amber-400", bg: "bg-amber-500/10" },
                    { label: "31-60 يوم", key: "31_60" as const, color: "text-orange-400", bg: "bg-orange-500/10" },
                    { label: "61-90 يوم", key: "61_90" as const, color: "text-rose-400", bg: "bg-rose-500/10" },
                    { label: "أكثر من 90", key: "over_90" as const, color: "text-red-500", bg: "bg-red-500/10" },
                    { label: "الإجمالي", key: "total" as const, color: "text-slate-300", bg: "bg-slate-500/10" },
                ].map((bucket) => (
                    <motion.div
                        key={bucket.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`${bucket.bg} border border-white/5 rounded-2xl p-4`}
                    >
                        <p className="text-[10px] text-slate-500 font-bold mb-1">{bucket.label}</p>
                        <p className={`text-lg font-black font-mono ${bucket.color}`}>
                            ₪{money(totals[bucket.key])}
                        </p>
                    </motion.div>
                ))}
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
                    <button className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        <Download size={14} />
                    </button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="bg-slate-900 border border-white/5 rounded-3xl flex items-center justify-center h-64">
                    <RefreshCw size={24} className="animate-spin text-slate-600" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-slate-900 border border-white/5 rounded-3xl flex flex-col items-center justify-center h-64 gap-3">
                    <ShieldAlert size={40} className="text-slate-700" />
                    <p className="text-slate-500 font-bold">لا توجد ذمم مدينة</p>
                </div>
            ) : (
                <div className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-white/5 bg-slate-950/50">
                                    <th className="text-right p-3 text-slate-500 font-bold">العميل</th>
                                    <th className="text-right p-3 text-slate-500 font-bold">حالي</th>
                                    <th className="text-right p-3 text-slate-500 font-bold">1-30</th>
                                    <th className="text-right p-3 text-slate-500 font-bold">31-60</th>
                                    <th className="text-right p-3 text-slate-500 font-bold">61-90</th>
                                    <th className="text-right p-3 text-slate-500 font-bold">+90</th>
                                    <th className="text-right p-3 text-slate-500 font-bold">الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((item, idx) => (
                                    <React.Fragment key={item.id}>
                                        <tr
                                            className={`border-b border-white/5 hover:bg-white/5 cursor-pointer ${idx % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"
                                                }`}
                                            onClick={() => toggleRow(item.id)}
                                        >
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-black text-xs">
                                                        {item.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-200 font-bold text-xs">{item.name}</p>
                                                        <p className="text-[9px] text-slate-500 font-mono">{item.code}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {["current", "1_30", "31_60", "61_90", "over_90"].map((bucket) => (
                                                <td key={bucket} className="p-3">
                                                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black font-mono ${agingBgColor(bucket, item.aging[bucket as keyof typeof item.aging], item.aging.total)
                                                        } ${bucket === "current" ? "text-emerald-400" :
                                                            bucket === "1_30" ? "text-amber-400" :
                                                                bucket === "31_60" ? "text-orange-400" :
                                                                    bucket === "61_90" ? "text-rose-400" : "text-red-400"
                                                        }`}>
                                                        ₪{money(item.aging[bucket as keyof typeof item.aging])}
                                                    </span>
                                                </td>
                                            ))}
                                            <td className="p-3">
                                                <span className="font-black font-mono text-slate-200">
                                                    ₪{money(item.aging.total)}
                                                </span>
                                            </td>
                                        </tr>
                                        {expandedRows.has(item.id) && (
                                            <tr className="bg-white/[0.02]">
                                                <td colSpan={7} className="p-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        <div>
                                                            <p className="text-[9px] text-slate-500 font-bold mb-1">الرصيد الحالي</p>
                                                            <p className="text-sm font-black font-mono text-slate-300">
                                                                ₪{money(item.balance)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] text-slate-500 font-bold mb-1">نسبة الحالي</p>
                                                            <p className="text-sm font-black font-mono text-emerald-400">
                                                                {item.aging.total > 0
                                                                    ? ((item.aging.current / item.aging.total) * 100).toFixed(1)
                                                                    : 0}%
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] text-slate-500 font-bold mb-1">نسبة المتأخر</p>
                                                            <p className="text-sm font-black font-mono text-rose-400">
                                                                {item.aging.total > 0
                                                                    ? (((item.aging["1_30"] + item.aging["31_60"] + item.aging["61_90"] + item.aging["over_90"]) / item.aging.total) * 100).toFixed(1)
                                                                    : 0}%
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] text-slate-500 font-bold mb-1">حالة المخاطرة</p>
                                                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black border bg-amber-500/10 text-amber-400 border-amber-500/20">
                                                                {item.aging.over_90 > 0 ? "حرجة" :
                                                                    item.aging["61_90"] > 0 ? "مرتفعة" :
                                                                        item.aging["31_60"] > 0 ? "متوسطة" : "منخفضة"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerAgingReport;