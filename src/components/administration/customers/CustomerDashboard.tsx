// src/components/administration/customers/CustomerDashboard.tsx
// لوحة العملاء — مؤشرات الأداء والتحليلات

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    CreditCard,
    AlertTriangle,
    ShieldCheck,
    Calendar,
    Clock,
    RefreshCw,
} from "lucide-react";
import { customerService, type AgingReportItem, type CollectionReportItem } from "../../../services/customerService";

const money = (v: number) =>
    v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const KpiCard: React.FC<{
    label: string; value: string; icon: React.ElementType;
    color: string; bg: string; subtitle?: string;
}> = ({ label, value, icon: Icon, color, bg, subtitle }) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${bg} border border-white/5 rounded-2xl p-4 hover:scale-[1.02] transition-all`}
    >
        <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl ${bg} border border-white/5 flex items-center justify-center ${color}`}>
                <Icon size={18} />
            </div>
        </div>
        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">{label}</p>
        <p className={`text-2xl font-black font-mono ${color}`}>{value}</p>
        {subtitle && <p className="text-[10px] text-slate-500 mt-1">{subtitle}</p>}
    </motion.div>
);

const CustomerDashboard: React.FC = () => {
    const [agingReport, setAgingReport] = useState<AgingReportItem[]>([]);
    const [agingTotals, setAgingTotals] = useState({
        current: 0, "1_30": 0, "31_60": 0, "61_90": 0, over_90: 0, total: 0,
    });
    const [collectionReport, setCollectionReport] = useState<CollectionReportItem[]>([]);
    const [collectionTotals, setCollectionTotals] = useState({ outstanding: 0, count: 0 });
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [agingRes, collectionRes] = await Promise.all([
                customerService.getAgingReport(),
                customerService.getCollectionReport(),
            ]);
            setAgingReport(agingRes.data.customers);
            setAgingTotals(agingRes.data.totals);
            setCollectionReport(collectionRes.data.customers);
            setCollectionTotals({
                outstanding: collectionRes.data.total_outstanding,
                count: collectionRes.data.total_customers,
            });
        } catch (err) {
            console.error("Failed to load dashboard data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // Compute KPIs
    const totalCustomers = agingReport.length;
    const totalReceivables = agingTotals.total;
    const overdueAmount = agingTotals["1_30"] + agingTotals["31_60"] + agingTotals["61_90"] + agingTotals["over_90"];
    const overdueRate = totalReceivables > 0 ? (overdueAmount / totalReceivables) * 100 : 0;
    const currentRate = totalReceivables > 0 ? (agingTotals.current / totalReceivables) * 100 : 0;
    const criticalCount = collectionReport.filter((c) => c.days_past_due >= 90).length;
    const highRiskCount = collectionReport.filter((c) => c.risk_level === "high" || c.risk_level === "critical").length;

    return (
        <div className="space-y-5" dir="rtl">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                    label="إجمالي الذمم"
                    value={`₪${money(totalReceivables)}`}
                    icon={DollarSign}
                    color="text-rose-400" bg="bg-rose-500/10"
                    subtitle={`${totalCustomers} عميل`}
                />
                <KpiCard
                    label="الذمم المتأخرة"
                    value={`₪${money(overdueAmount)}`}
                    icon={AlertTriangle}
                    color="text-amber-400" bg="bg-amber-500/10"
                    subtitle={`${overdueRate.toFixed(1)}% من الإجمالي`}
                />
                <KpiCard
                    label="حالة حرجة (+90 يوم)"
                    value={criticalCount.toString()}
                    icon={ShieldCheck}
                    color="text-red-400" bg="bg-red-500/10"
                    subtitle="عميل بحاجة متابعة فورية"
                />
                <KpiCard
                    label="مخاطرة مرتفعة"
                    value={highRiskCount.toString()}
                    icon={AlertTriangle}
                    color="text-rose-400" bg="bg-rose-500/10"
                    subtitle="عميل يحتاج مراقبة"
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                    label="الذمم الحالية"
                    value={`₪${money(agingTotals.current)}`}
                    icon={TrendingUp}
                    color="text-emerald-400" bg="bg-emerald-500/10"
                    subtitle={`${currentRate.toFixed(1)}% من الإجمالي`}
                />
                <KpiCard
                    label="1-30 يوم"
                    value={`₪${money(agingTotals["1_30"])}`}
                    icon={Calendar}
                    color="text-amber-400" bg="bg-amber-500/10"
                />
                <KpiCard
                    label="31-60 يوم"
                    value={`₪${money(agingTotals["31_60"])}`}
                    icon={Clock}
                    color="text-orange-400" bg="bg-orange-500/10"
                />
                <KpiCard
                    label="61-90 يوم"
                    value={`₪${money(agingTotals["61_90"])}`}
                    icon={AlertTriangle}
                    color="text-rose-400" bg="bg-rose-500/10"
                />
            </div>

            {/* Aging Distribution */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">توزيع أعمار الذمم</h3>
                {totalReceivables > 0 ? (
                    <div className="space-y-3">
                        {[
                            { label: "حالي", key: "current" as const, value: agingTotals.current, color: "bg-emerald-500" },
                            { label: "1-30 يوم", key: "1_30" as const, value: agingTotals["1_30"], color: "bg-amber-500" },
                            { label: "31-60 يوم", key: "31_60" as const, value: agingTotals["31_60"], color: "bg-orange-500" },
                            { label: "61-90 يوم", key: "61_90" as const, value: agingTotals["61_90"], color: "bg-rose-500" },
                            { label: "أكثر من 90", key: "over_90" as const, value: agingTotals["over_90"], color: "bg-red-600" },
                        ].map((bucket) => {
                            const pct = (bucket.value / totalReceivables) * 100;
                            return (
                                <div key={bucket.key} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 font-bold">{bucket.label}</span>
                                        <span className="text-slate-300 font-mono">
                                            ₪{money(bucket.value)} ({pct.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${bucket.color} transition-all`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
                        لا توجد ذمم مدينة
                    </div>
                )}
            </div>

            {/* Top Debtors */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">أكبر المدينين</h3>
                {collectionReport.length > 0 ? (
                    <div className="space-y-2">
                        {collectionReport
                            .sort((a, b) => b.balance - a.balance)
                            .slice(0, 5)
                            .map((item, idx) => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] text-slate-500 font-black w-5">{idx + 1}</span>
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center text-white font-black text-xs">
                                            {item.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">{item.name}</p>
                                            <p className="text-[9px] text-slate-500">{item.code}</p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-black font-mono text-rose-400">
                                            ₪{money(item.balance)}
                                        </p>
                                        <p className="text-[9px] text-slate-500">
                                            {item.days_past_due > 0 ? `${item.days_past_due} يوم تأخير` : "حالي"}
                                        </p>
                                    </div>
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
                        لا توجد بيانات
                    </div>
                )}
            </div>

            {/* Loading State */}
            {loading && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <RefreshCw size={32} className="animate-spin text-blue-400" />
                </div>
            )}
        </div>
    );
};

export default CustomerDashboard;