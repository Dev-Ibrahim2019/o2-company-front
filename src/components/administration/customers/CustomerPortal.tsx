// src/components/administration/customers/CustomerPortal.tsx
// Modern ERP Customer Center â€” Odoo/ERPNext Style with Real Analytics

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, FileText, LayoutDashboard, Wallet, Clock,
    AlertTriangle, TrendingUp, TrendingDown, DollarSign,
    CreditCard, ShieldAlert, BarChart3, PieChart,
    Search, X, RefreshCw, ChevronRight, Download, Printer, Calendar,
    ChevronDown, ChevronUp, Filter, Eye, UserPlus,
} from "lucide-react";
import { customerService, type Customer, type CustomerStatement, type CustomerAnalytics, type CustomerAging } from "../../../services/customerService";
import FinancialStatementTable from "../shared/FinancialStatementTable";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart as RPieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type CustomerView = "dashboard" | "directory" | "statements" | "payments" | "aging" | "new-customer";
type ModalType = "invoice" | "receipt" | null;

// â”€â”€â”€ Colors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#f97316", "#ef4444"];
const CHART_COLORS = { rose: "#f43f5e", emerald: "#10b981", blue: "#3b82f6", amber: "#f59e0b", violet: "#8b5cf6" };

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const money = (v: number) => v?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00";
const pct = (v: number) => `${(v || 0).toFixed(1)}%`;
const dateFmt = (d: string) => { try { return new Date(d).toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };

// â”€â”€â”€ KPI Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const KpiCard: React.FC<{ label: string; value: string; icon: React.ElementType; color: string; bg: string; subtitle?: string }> = ({ label, value, icon: Icon, color, bg, subtitle }) => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`${bg} border border-white/5 rounded-2xl p-4`}>
        <div className="flex items-center gap-2 mb-3">
            <div className={`w-9 h-9 rounded-xl ${bg} border border-white/5 flex items-center justify-center ${color}`}><Icon size={16} /></div>
            <span className="text-[10px] text-slate-500 font-bold">{label}</span>
        </div>
        <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
        {subtitle && <p className="text-[10px] text-slate-600 mt-1">{subtitle}</p>}
    </motion.div>
);

// â”€â”€â”€ Main CustomerPortal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CustomerPortal: React.FC = () => {
    const [activeView, setActiveView] = useState<CustomerView>("dashboard");
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [modalType, setModalType] = useState<ModalType>(null);

    const tabs: { key: CustomerView; label: string; icon: React.ElementType }[] = [
        { key: "dashboard", label: "ظ„ظˆط­ط© ط§ظ„ط¹ظ…ظ„ط§ط،", icon: LayoutDashboard },
        { key: "directory", label: "ط¯ظ„ظٹظ„ ط§ظ„ط¹ظ…ظ„ط§ط،", icon: Users },
        { key: "statements", label: "ظƒط´ظˆظپط§طھ ط§ظ„ط­ط³ط§ط¨", icon: FileText },
        { key: "payments", label: "ط§ظ„ظ…ط¯ظپظˆط¹ط§طھ", icon: Wallet },
        { key: "aging", label: "طھط­ظ„ظٹظ„ ط§ظ„ط£ط¹ظ…ط§ط±", icon: Clock },
        { key: "new-customer", label: "ط¥ظ†ط´ط§ط، ط¹ظ…ظٹظ„", icon: UserPlus },
    ];

    // Form state for new customer
    const [form, setForm] = useState({
        name: "", name_en: "", status: "active", category: "retail",
        phone: "", mobile: "", email: "", address: "", city: "",
        currency: "ILS", payment_terms: "net30", credit_limit: 0, opening_balance: 0,
        notes: "", gps_link: "", advanced: false,
    });
    const [creating, setCreating] = useState(false);
    const updateField = (f: string, v: any) => setForm(p => ({ ...p, [f]: v }));

    const handleCreate = async () => {
        if (!form.name.trim()) return;
        setCreating(true);
        try {
            await customerService.create({
                name: form.name, name_en: form.name_en || undefined,
                status: form.status, category: form.category,
                phone: form.phone || undefined, mobile: form.mobile || undefined,
                email: form.email || undefined, address: form.address || undefined,
                city: form.city || undefined,
                currency: form.currency, payment_terms: form.payment_terms,
                credit_limit: form.credit_limit || 0, opening_balance: form.opening_balance || 0,
                notes: form.notes || undefined, gps_link: form.gps_link || undefined,
            });
            setForm({ ...form, name: "", name_en: "", phone: "", mobile: "", email: "", address: "", city: "", notes: "", gps_link: "", credit_limit: 0, opening_balance: 0 });
            setActiveView("directory");
        } catch { } finally { setCreating(false); }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Sub-navigation */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-1.5 flex gap-1 overflow-x-auto shrink-0 mb-4">
                {tabs.map((tab) => (
                    <button key={tab.key} onClick={() => { setActiveView(tab.key); setSelectedCustomerId(null); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeView === tab.key ? "bg-red-600 text-white shadow-lg shadow-red-900/30" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                    >
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                {selectedCustomerId ? (
                    <Customer360Profile customerId={selectedCustomerId} onBack={() => setSelectedCustomerId(null)} onModalOpen={setModalType} />
                ) : activeView === "dashboard" ? (
                    <CustomerDashboard onViewCustomer={(id) => setSelectedCustomerId(id)} />
                ) : activeView === "new-customer" ? (
                    <CustomerCreateForm form={form} updateField={updateField} handleCreate={handleCreate} creating={creating} />
                ) : activeView === "directory" ? (
                    <CustomerIndex onViewCustomer={(id) => setSelectedCustomerId(id)} />
                ) : activeView === "statements" ? (
                    <CustomerStatements onViewCustomer={(id) => setSelectedCustomerId(id)} />
                ) : activeView === "payments" ? (
                    <CustomerPayments />
                ) : activeView === "aging" ? (
                    <CustomerAgingReport />
                ) : null}
            </div>
        </div>
    );
};

// â”€â”€â”€ CustomerDashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CustomerDashboard: React.FC<{ onViewCustomer: (id: number) => void }> = ({ onViewCustomer }) => {
    const [stats, setStats] = useState<any>(null);
    const [customers, setCustomers] = useState<any[]>([]);
    const [topCustomers, setTopCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const [listRes, agingRes, collectionRes] = await Promise.all([
                customerService.list({ per_page: 200, status: "active" }),
                customerService.getAgingReport(),
                customerService.getCollectionReport(),
            ]);
            const items = Array.isArray(listRes.data) ? listRes.data : listRes.data?.data || [];
            setCustomers(items);

            const totalReceivables = items.reduce((s: number, c: any) => s + Math.max(c.balance, 0), 0);
            const overdue = items.filter((c: any) => c.balance > 0);
            const top = [...items].sort((a: any, b: any) => Math.abs(b.balance) - Math.abs(a.balance)).slice(0, 10);
            setTopCustomers(top);

            setStats({
                total: items.length,
                total_receivables: totalReceivables,
                total_collected: collectionRes.data?.total_outstanding || 0,
                overdue_count: overdue.length,
                at_risk: items.filter((c: any) => c.risk_level === "high" || c.risk_level === "critical").length,
                active: items.filter((c: any) => c.status === "active").length,
                aging_totals: agingRes.data?.totals,
                active_customers: items.filter((c: any) => c.status === "active").length,
            });
        } catch { } finally { setLoading(false); }
    };

    const agingData = stats?.aging_totals ? [
        { name: "ط­ط§ظ„ظٹ", value: stats.aging_totals.current, fill: COLORS[0] },
        { name: "1-30", value: stats.aging_totals["1_30"], fill: COLORS[1] },
        { name: "31-60", value: stats.aging_totals["31_60"], fill: COLORS[2] },
        { name: "61-90", value: stats.aging_totals["61_90"], fill: COLORS[3] },
        { name: "90+", value: stats.aging_totals.over_90, fill: COLORS[4] },
    ] : [];

    if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div>;

    return (
        <div className="space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <KpiCard label="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط¹ظ…ظ„ط§ط،" value={stats?.total.toString() || "0"} icon={Users} color="text-blue-400" bg="bg-blue-500/10" subtitle="ظ…ط³ط¬ظ„ ظپظٹ ط§ظ„ظ†ط¸ط§ظ…" />
                <KpiCard label="ط§ظ„ط°ظ…ظ… ط§ظ„ظ…ط¯ظٹظ†ط©" value={`â‚ھ${money(stats?.total_receivables || 0)}`} icon={TrendingUp} color="text-rose-400" bg="bg-rose-500/10" subtitle="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط³طھط­ظ‚" />
                <KpiCard label="ط¹ظ…ظ„ط§ط، ظ†ط´ط·ظٹظ†" value={stats?.active.toString() || "0"} icon={ShieldAlert} color="text-emerald-400" bg="bg-emerald-500/10" subtitle={`ظ…ظ† ${stats?.total || 0}`} />
                <KpiCard label="ط¹ظ„ظٹظ‡ظ… ظ…ط³طھط­ظ‚ط§طھ" value={stats?.overdue_count.toString() || "0"} icon={AlertTriangle} color="text-amber-400" bg="bg-amber-500/10" subtitle="ط±طµظٹط¯ ط£ظƒط¨ط± ظ…ظ† طµظپط±" />
                <KpiCard label="ظ…ط®ط§ط·ط± ط¹ط§ظ„ظٹط©" value={stats?.at_risk.toString() || "0"} icon={AlertTriangle} color="text-rose-400" bg="bg-rose-500/10" subtitle="High + Critical" />
                <KpiCard label="ط§ظ„طھط­طµظٹظ„ ط§ظ„ط´ظ‡ط±ظٹ" value={`â‚ھ${money(stats?.total_collected || 0)}`} icon={Wallet} color="text-violet-400" bg="bg-violet-500/10" subtitle="ظ‡ط°ط§ ط§ظ„ط´ظ‡ط±" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Aging Pie Chart */}
                {agingData.length > 0 && (
                    <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                        <h4 className="text-sm font-bold text-white mb-4">طھظˆط²ظٹط¹ ط§ظ„ط£ط¹ظ…ط§ط±</h4>
                        <ResponsiveContainer width="100%" height={220}>
                            <RPieChart>
                                <Pie data={agingData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                                    {agingData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                </Pie>
                                <Tooltip formatter={(v: any) => `â‚ھ${money(Number(v) || 0)}`} />
                            </RPieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-5 gap-2 mt-2">
                            {agingData.map((item) => (
                                <div key={item.name} className="text-center">
                                    <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: item.fill }} />
                                    <p className="text-[8px] text-slate-500">{item.name}</p>
                                    <p className="text-[9px] font-mono text-slate-300">â‚ھ{money(item.value)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Top Customers */}
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                    <h4 className="text-sm font-bold text-white mb-4">ط£ظƒط¨ط± 10 ط¹ظ…ظ„ط§ط، (ط±طµظٹط¯)</h4>
                    <div className="space-y-2">
                        {topCustomers.map((c: any, i: number) => (
                            <button key={c.id} onClick={() => onViewCustomer(c.id)} className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-white/5 transition-all">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-600 w-4">{i + 1}</span>
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-[10px]">{c.name?.charAt(0)}</div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-white truncate max-w-[120px]">{c.name}</p>
                                        <p className="text-[8px] text-slate-500">{c.code}</p>
                                    </div>
                                </div>
                                <span className={`text-xs font-black font-mono ${c.balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>â‚ھ{money(Math.abs(c.balance))}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Aging Summary */}
            {agingData.length > 0 && (
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                    <h4 className="text-sm font-bold text-white mb-4">ظ…ظ„ط®طµ ط§ظ„ط£ط¹ظ…ط§ط± â€” ط¬ظ…ظٹط¹ ط§ظ„ط¹ظ…ظ„ط§ط،</h4>
                    <div className="grid grid-cols-5 gap-3">
                        {agingData.map((item) => (
                            <div key={item.name} className="text-center rounded-xl p-3" style={{ backgroundColor: `${item.fill}15`, border: `1px solid ${item.fill}30` }}>
                                <p className="text-[10px] text-slate-500 font-bold mb-1">{item.name}</p>
                                <p className="text-lg font-black font-mono" style={{ color: item.fill }}>â‚ھ{money(item.value)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// â”€â”€â”€ CustomerIndex (Modern Directory) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CustomerIndex: React.FC<{ onViewCustomer: (id: number) => void }> = ({ onViewCustomer }) => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("");
    const [filterRisk, setFilterRisk] = useState<string>("");

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await customerService.list({ per_page: 200 });
            const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
            setCustomers(items);
        } catch { } finally { setLoading(false); }
    };

    const filtered = customers.filter((c) => {
        if (search && !c.name?.toLowerCase().includes(search.toLowerCase()) && !c.code?.toLowerCase().includes(search.toLowerCase()) && !c.phone?.includes(search)) return false;
        if (filterStatus && c.status !== filterStatus) return false;
        if (filterRisk && c.risk_level !== filterRisk) return false;
        return true;
    });

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ط§ط¨ط­ط« ط¨ط§ظ„ط§ط³ظ…طŒ ط§ظ„ط±ظ…ط²طŒ ط§ظ„ظ‡ط§طھظپ..." className="w-full bg-slate-950 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white outline-none focus:border-blue-500/50" />
                        {search && <button onClick={() => setSearch("")} className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white"><X size={12} /></button>}
                    </div>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                        <option value="">ظƒظ„ ط§ظ„ط­ط§ظ„ط§طھ</option>
                        <option value="active">ظ†ط´ط·</option>
                        <option value="inactive">ط؛ظٹط± ظ†ط´ط·</option>
                        <option value="blocked">ظ…ط­ط¸ظˆط±</option>
                    </select>
                    <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                        <option value="">ظƒظ„ ط§ظ„ظ…ط®ط§ط·ط±</option>
                        <option value="low">ظ…ظ†ط®ظپط¶</option>
                        <option value="medium">ظ…طھظˆط³ط·</option>
                        <option value="high">ظ…ط±طھظپط¹</option>
                        <option value="critical">ط­ط±ط¬</option>
                    </select>
                    <button onClick={loadData} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></button>
                    <span className="text-[10px] text-slate-500">{filtered.length} ط¹ظ…ظٹظ„</span>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div>
            ) : (
                <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="min-w-[1000px]">
                            <table className="w-full text-right text-xs">
                                <thead className="bg-slate-950/40 border-b border-white/5">
                                    <tr className="text-slate-500 font-black text-[10px]">
                                        <th className="px-4 py-3">ط§ظ„ط¹ظ…ظٹظ„</th>
                                        <th className="px-4 py-3">ط§ظ„ظƒظˆط¯</th>
                                        <th className="px-4 py-3">ط§ظ„ظ‡ط§طھظپ</th>
                                        <th className="px-4 py-3 text-center">ط§ظ„ط­ط§ظ„ط©</th>
                                        <th className="px-4 py-3 text-center">ط§ظ„ظ…ط®ط§ط·ط±ط©</th>
                                        <th className="px-4 py-3 text-center">ط§ظ„ط­ط¯ ط§ظ„ط§ط¦طھظ…ط§ظ†ظٹ</th>
                                        <th className="px-4 py-3 text-center">ط§ظ„ط±طµظٹط¯</th>
                                        <th className="px-4 py-3 text-center">ط§ظ„ط§ط³طھط®ط¯ط§ظ…</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">ظ„ط§ ظٹظˆط¬ط¯ ط¹ظ…ظ„ط§ط،</td></tr>
                                    ) : filtered.map((c) => (
                                        <tr key={c.id} className="hover:bg-white/[0.02] transition-all">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-xs">{c.name?.charAt(0)}</div>
                                                    <p className="font-bold text-white text-xs">{c.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-slate-500 text-[10px]">{c.code}</td>
                                            <td className="px-4 py-3 text-slate-400">{c.phone || "â€”"}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${c.status === "active" ? "bg-emerald-500/15 text-emerald-400" : c.status === "inactive" ? "bg-slate-500/15 text-slate-400" : "bg-rose-500/15 text-rose-400"}`}>
                                                    {c.status === "active" ? "ظ†ط´ط·" : c.status === "inactive" ? "ط؛ظٹط± ظ†ط´ط·" : "ظ…ط­ط¸ظˆط±"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${c.risk_level === "low" ? "bg-emerald-500/15 text-emerald-400" : c.risk_level === "medium" ? "bg-amber-500/15 text-amber-400" : "bg-rose-500/15 text-rose-400"}`}>
                                                    {c.risk_level === "low" ? "ظ…ظ†ط®ظپط¶" : c.risk_level === "medium" ? "ظ…طھظˆط³ط·" : c.risk_level === "high" ? "ظ…ط±طھظپط¹" : "ط­ط±ط¬"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-slate-300">â‚ھ{money(c.credit_limit)}</td>
                                            <td className={`px-4 py-3 text-center font-mono font-bold ${c.balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>â‚ھ{money(Math.abs(c.balance))}</td>
                                            <td className="px-4 py-3">
                                                {c.credit_limit > 0 && (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${(c.credit_usage_percent || 0) > 80 ? "bg-rose-500" : (c.credit_usage_percent || 0) > 50 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(c.credit_usage_percent || 0, 100)}%` }} />
                                                        </div>
                                                        <span className="text-[9px] text-slate-500 w-8 text-left">{(c.credit_usage_percent || 0).toFixed(0)}%</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button onClick={() => onViewCustomer(c.id)} className="p-1.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all"><Eye size={12} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// â”€â”€â”€ Customer 360 Profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Customer360ProfileProps {
    customerId: number;
    onBack: () => void;
    onModalOpen: (type: ModalType) => void;
}

const Customer360Profile: React.FC<Customer360ProfileProps> = ({ customerId, onBack, onModalOpen }) => {
    const [customer, setCustomer] = useState<any>(null);
    const [analytics, setAnalytics] = useState<any>(null);
    const [statement, setStatement] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);

    const tabs = [
        { id: "overview", label: "ظ†ط¸ط±ط© ط¹ط§ظ…ط©", icon: LayoutDashboard },
        { id: "statement", label: "ظƒط´ظپ ط­ط³ط§ط¨", icon: FileText },
        { id: "aging", label: "طھط­ظ„ظٹظ„ ط§ظ„ط£ط¹ظ…ط§ط±", icon: Clock },
    ];

    useEffect(() => {
        Promise.all([
            customerService.get(customerId),
            customerService.getAnalytics(customerId),
            customerService.getStatement(customerId, new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0], new Date().toISOString().split("T")[0]),
        ]).then(([customerRes, analyticsRes, statementRes]) => {
            setCustomer(customerRes.data.customer);
            setAnalytics(analyticsRes.data);
            setStatement(statementRes.data.statement);
        }).finally(() => setLoading(false));
    }, [customerId]);

    if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div>;
    if (!customer) return <div className="text-slate-500 text-center py-16">ط§ظ„ط¹ظ…ظٹظ„ ط؛ظٹط± ظ…ظˆط¬ظˆط¯</div>;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white"><ChevronRight size={18} /></button>
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white font-black text-xl shadow-lg">{customer.name?.charAt(0)}</div>
                        <div>
                            <h3 className="text-lg font-black text-white">{customer.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-500 font-mono">{customer.code}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${customer.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>{customer.status === "active" ? "ظ†ط´ط·" : customer.status}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${customer.risk_level === "low" ? "bg-emerald-500/15 text-emerald-400" : customer.risk_level === "medium" ? "bg-amber-500/15 text-amber-400" : "bg-rose-500/15 text-rose-400"}`}>
                                    {customer.risk_level === "low" ? "ظ…ط®ط§ط·ط±ط© ظ…ظ†ط®ظپط¶ط©" : customer.risk_level === "medium" ? "ظ…ط®ط§ط·ط±ط© ظ…طھظˆط³ط·ط©" : customer.risk_level === "high" ? "ظ…ط®ط§ط·ط±ط© ظ…ط±طھظپط¹ط©" : "ظ…ط®ط§ط·ط±ط© ط­ط±ط¬ط©"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] text-slate-500 font-bold">ط§ظ„ط±طµظٹط¯ ط§ظ„ط­ط§ظ„ظٹ</p>
                        <p className={`text-2xl font-black font-mono ${customer.balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>â‚ھ{money(Math.abs(customer.balance))}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
                <div className="flex border-b border-white/5 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? "text-blue-400 border-blue-500 bg-blue-500/5" : "text-slate-500 border-transparent hover:text-slate-300"}`}
                        ><tab.icon size={14} /> {tab.label}</button>
                    ))}
                </div>

                <div className="p-5">
                    {/* Overview Tab */}
                    {activeTab === "overview" && analytics && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <KpiCard label="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط¨ظٹط¹ط§طھ" value={`â‚ھ${money(analytics.total_sales)}`} icon={TrendingUp} color="text-emerald-400" bg="bg-emerald-500/10" />
                                <KpiCard label="ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط­طµظ„" value={`â‚ھ${money(analytics.total_collected)}`} icon={TrendingDown} color="text-blue-400" bg="bg-blue-500/10" />
                                <KpiCard label="ظ…ط¹ط¯ظ„ ط§ظ„طھط­طµظٹظ„" value={pct(analytics.collection_rate)} icon={DollarSign} color="text-violet-400" bg="bg-violet-500/10" />
                                <KpiCard label="DSO" value={`${analytics.dso || 0} ظٹظˆظ…`} icon={Calendar} color="text-amber-400" bg="bg-amber-500/10" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <KpiCard label="ط§ظ„ط­ط¯ ط§ظ„ط§ط¦طھظ…ط§ظ†ظٹ" value={`â‚ھ${money(customer.credit_limit)}`} icon={CreditCard} color="text-slate-400" bg="bg-slate-500/10" />
                                <KpiCard label="ط§ظ„ط§ط¦طھظ…ط§ظ† ط§ظ„ظ…طھط§ط­" value={`â‚ھ${money(analytics.available_credit)}`} icon={Wallet} color="text-emerald-400" bg="bg-emerald-500/10" />
                                <KpiCard label="طھط­طµظٹظ„ ط§ظ„ط´ظ‡ط±" value={`â‚ھ${money(analytics.monthly_collections)}`} icon={BarChart3} color="text-cyan-400" bg="bg-cyan-500/10" />
                                <KpiCard label="ط§ط³طھط®ط¯ط§ظ… ط§ظ„ط§ط¦طھظ…ط§ظ†" value={pct(analytics.credit_usage)} icon={ShieldAlert} color={analytics.credit_usage > 80 ? "text-rose-400" : "text-emerald-400"} bg={analytics.credit_usage > 80 ? "bg-rose-500/10" : "bg-emerald-500/10"} />
                            </div>

                            {/* aging info */}
                            {analytics.aging && (
                                <div className="bg-slate-950 border border-white/5 rounded-2xl p-4">
                                    <h4 className="text-xs font-bold text-slate-400 mb-3">طھظˆط²ظٹط¹ ط§ظ„ط£ط¹ظ…ط§ط±</h4>
                                    <div className="space-y-2">
                                        {[
                                            { label: "ط­ط§ظ„ظٹ", key: "current" as const, color: "bg-emerald-500" },
                                            { label: "1-30 ظٹظˆظ…", key: "1_30" as const, color: "bg-amber-500" },
                                            { label: "31-60 ظٹظˆظ…", key: "31_60" as const, color: "bg-orange-500" },
                                            { label: "61-90 ظٹظˆظ…", key: "61_90" as const, color: "bg-rose-500" },
                                            { label: "ط£ظƒط«ط± ظ…ظ† 90", key: "over_90" as const, color: "bg-red-600" },
                                        ].map((bucket) => {
                                            const val = analytics.aging[bucket.key];
                                            const pctVal = analytics.aging.total > 0 ? (val / analytics.aging.total) * 100 : 0;
                                            return (
                                                <div key={bucket.key} className="flex items-center gap-3">
                                                    <span className="text-[10px] text-slate-500 w-20">{bucket.label}</span>
                                                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${bucket.color}`} style={{ width: `${pctVal}%` }} />
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-mono w-20 text-left">â‚ھ{money(val)}</span>
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
                        <EnhancedStatementView customerId={customerId} />
                    )}

                    {/* Aging Tab */}
                    {activeTab === "aging" && analytics?.aging && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {[
                                    { label: "ط­ط§ظ„ظٹ", key: "current", color: "text-emerald-400", bg: "bg-emerald-500/10" },
                                    { label: "1-30 ظٹظˆظ…", key: "1_30", color: "text-amber-400", bg: "bg-amber-500/10" },
                                    { label: "31-60 ظٹظˆظ…", key: "31_60", color: "text-orange-400", bg: "bg-orange-500/10" },
                                    { label: "61-90 ظٹظˆظ…", key: "61_90", color: "text-rose-400", bg: "bg-rose-500/10" },
                                    { label: "ط£ظƒط«ط± ظ…ظ† 90", key: "over_90", color: "text-red-500", bg: "bg-red-500/10" },
                                ].map((bucket) => (
                                    <div key={bucket.key} className={`${bucket.bg} border border-white/5 rounded-2xl p-4 text-center`}>
                                        <p className="text-[10px] text-slate-500 font-bold mb-1">{bucket.label}</p>
                                        <p className={`text-lg font-black font-mono ${bucket.color}`}>â‚ھ{money(analytics.aging[bucket.key])}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-slate-950 border border-white/5 rounded-2xl p-4">
                                <p className="text-xs text-slate-500 font-bold mb-2">ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط°ظ…ظ…</p>
                                <p className="text-2xl font-black font-mono text-rose-400">â‚ھ{money(analytics.aging.total)}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// â”€â”€â”€ StatementView â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const StatementView: React.FC<{ customerId: number }> = ({ customerId }) => {
    const [statement, setStatement] = useState<any>(null);
    const [from, setFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]);
    const [to, setTo] = useState(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(false);

    const load = async () => { setLoading(true); try { const res = await customerService.getStatement(customerId, from, to); setStatement(res.data.statement); } catch { } finally { setLoading(false); } };
    useEffect(() => { load(); }, [customerId]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <span className="text-slate-500 text-xs">ط¥ظ„ظ‰</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <button onClick={load} className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400"><Search size={14} /></button>
                <button className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400"><Download size={14} /></button>
                <button className="p-2 bg-slate-500/10 border border-slate-500/20 rounded-xl text-slate-400"><Printer size={14} /></button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48"><RefreshCw size={20} className="animate-spin text-slate-600" /></div>
            ) : statement && statement.lines?.length > 0 ? (
                <>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-950 border border-white/5 rounded-xl p-3">
                            <p className="text-[10px] text-slate-500">ط§ظ„ط±طµظٹط¯ ط§ظ„ط§ظپطھطھط§ط­ظٹ</p>
                            <p className="text-sm font-black font-mono text-slate-300">â‚ھ{money(statement.opening_balance)}</p>
                        </div>
                        <div className="bg-slate-950 border border-white/5 rounded-xl p-3">
                            <p className="text-[10px] text-slate-500">ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط¯ظٹظ†</p>
                            <p className="text-sm font-black font-mono text-rose-400">â‚ھ{money(statement.total_debit)}</p>
                        </div>
                        <div className="bg-slate-950 border border-white/5 rounded-xl p-3">
                            <p className="text-[10px] text-slate-500">ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط¯ط§ط¦ظ†</p>
                            <p className="text-sm font-black font-mono text-emerald-400">â‚ھ{money(statement.total_credit)}</p>
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-x-auto">
                        <div className="min-w-[900px]">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-950/40 border-b border-white/5">
                                    <tr className="text-slate-500 font-black text-[10px]">
                                        <th className="text-right px-4 py-3">ط§ظ„طھط§ط±ظٹط®</th>
                                        <th className="text-right px-4 py-3">ط§ظ„ط¨ظٹط§ظ†</th>
                                        <th className="text-right px-4 py-3">ط±ظ‚ظ… ط§ظ„ظ…ط¹ط§ظ…ظ„ط©</th>
                                        <th className="text-right px-4 py-3">ظ…ط¯ظٹظ†</th>
                                        <th className="text-right px-4 py-3">ط¯ط§ط¦ظ†</th>
                                        <th className="text-right px-4 py-3">ط§ظ„ط±طµظٹط¯</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {statement.lines.map((line: any, i: number) => (
                                        <tr key={i} className="hover:bg-white/[0.02]">
                                            <td className="px-4 py-3 text-slate-300 font-mono">{dateFmt(line.date)}</td>
                                            <td className="px-4 py-3"><p className="text-slate-300">{line.description || line.type}</p></td>
                                            <td className="px-4 py-3 text-slate-500 font-mono text-[9px]">{line.transaction_number}</td>
                                            <td className="px-4 py-3 text-rose-400 font-mono">{line.debit > 0 ? money(line.debit) : "â€”"}</td>
                                            <td className="px-4 py-3 text-emerald-400 font-mono">{line.credit > 0 ? money(line.credit) : "â€”"}</td>
                                            <td className={`px-4 py-3 font-mono font-bold ${line.balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>â‚ھ{money(line.balance)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center h-48 text-slate-500 font-bold">ط§ط®طھط± ط§ظ„ظپطھط±ط© ط«ظ… ط§ط¶ط؛ط· ط¨ط­ط«</div>
            )}
        </div>
    );
};

const EnhancedStatementView: React.FC<{ customerId: number }> = ({ customerId }) => {
    const [statement, setStatement] = useState<any>(null);
    const [from, setFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]);
    const [to, setTo] = useState(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await customerService.getStatement(customerId, from, to);
            setStatement(res.data.statement);
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [customerId]);

    return (
        <FinancialStatementTable
            statement={statement}
            loading={loading}
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
            onSearch={load}
        />
    );
};

// â”€â”€â”€ CustomerStatements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CustomerStatements: React.FC<{ onViewCustomer: (id: number) => void }> = ({ onViewCustomer }) => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        customerService.list({ per_page: 200 }).then((res) => {
            const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
            setCustomers(items);
        }).finally(() => setLoading(false));
    }, []);

    const filtered = customers.filter((c) => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.code?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-4">
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
                <div className="relative flex-1">
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ط§ط¨ط­ط« ط¹ظ† ط¹ظ…ظٹظ„..." className="w-full bg-slate-950 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white outline-none" />
                </div>
            </div>
            {loading ? (
                <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map((c) => (
                        <button key={c.id} onClick={() => onViewCustomer(c.id)} className="flex items-center gap-3 p-4 bg-slate-800/50 border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all group text-right">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-sm">{c.name?.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{c.name}</p>
                                <p className="text-[10px] text-slate-500 font-mono">{c.code}</p>
                            </div>
                            <div className="text-left shrink-0">
                                <p className={`text-xs font-black font-mono ${c.balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>â‚ھ{money(Math.abs(c.balance))}</p>
                            </div>
                            <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// â”€â”€â”€ CustomerPayments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CustomerPayments: React.FC = () => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        customerService.list({ per_page: 200 }).then((res) => {
            const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
            setCustomers(items.filter((c: any) => c.balance > 0));
        }).finally(() => setLoading(false));
    }, []);

    const filtered = customers.filter((c) => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.code?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-4">
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
                <div className="relative">
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ط§ط¨ط­ط« ط¹ظ† ط¹ظ…ظٹظ„..." className="w-full bg-slate-950 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white outline-none" />
                </div>
            </div>
            {loading ? (
                <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-4 bg-slate-800/30 border border-white/5 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-sm">{c.name?.charAt(0)}</div>
                                <div><p className="text-sm font-bold text-white">{c.name}</p><p className="text-[10px] text-slate-500 font-mono">{c.code}</p></div>
                            </div>
                            <div className="text-left"><p className="font-bold text-rose-400 font-mono">â‚ھ{money(c.balance)}</p><p className="text-[10px] text-slate-500">ظ…ط³طھط­ظ‚</p></div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// â”€â”€â”€ CustomerAgingReport (Enhanced) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CustomerAgingReport: React.FC = () => {
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        customerService.getAgingReport().then((res) => setReport(res.data)).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div>;

    const agingData = report?.totals ? [
        { name: "ط­ط§ظ„ظٹ", value: report.totals.current, fill: "#10b981" },
        { name: "1-30", value: report.totals["1_30"], fill: "#3b82f6" },
        { name: "31-60", value: report.totals["31_60"], fill: "#f59e0b" },
        { name: "61-90", value: report.totals["61_90"], fill: "#f97316" },
        { name: "90+", value: report.totals.over_90, fill: "#ef4444" },
    ] : [];

    return (
        <div className="space-y-5">
            {agingData.length > 0 && (
                <div className="grid grid-cols-5 gap-3">
                    {agingData.map((item) => (
                        <div key={item.name} className="text-center rounded-2xl p-4" style={{ backgroundColor: `${item.fill}15`, border: `1px solid ${item.fill}30` }}>
                            <p className="text-[10px] text-slate-500 font-black mb-1">{item.name}</p>
                            <p className="text-lg font-black font-mono" style={{ color: item.fill }}>â‚ھ{money(item.value)}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-x-auto">
                <div className="min-w-[900px]">
                    <table className="w-full text-right text-xs">
                        <thead className="bg-slate-950/40 border-b border-white/5">
                            <tr className="text-slate-500 font-black text-[10px]">
                                <th className="px-4 py-3">ط§ظ„ط¹ظ…ظٹظ„</th>
                                <th className="px-4 py-3 text-center">ط§ظ„ط±طµظٹط¯</th>
                                <th className="px-4 py-3 text-center">ط­ط§ظ„ظٹ</th>
                                <th className="px-4 py-3 text-center">1-30</th>
                                <th className="px-4 py-3 text-center">31-60</th>
                                <th className="px-4 py-3 text-center">61-90</th>
                                <th className="px-4 py-3 text-center">90+</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {(report?.customers || []).map((s: any) => (
                                <tr key={s.id} className="hover:bg-white/[0.02]">
                                    <td className="px-4 py-3 font-bold text-white">{s.name}</td>
                                    <td className="px-4 py-3 text-center font-mono text-rose-400">â‚ھ{money(s.balance)}</td>
                                    <td className="px-4 py-3 text-center font-mono" style={{ color: "#10b981" }}>â‚ھ{money(s.aging.current)}</td>
                                    <td className="px-4 py-3 text-center font-mono" style={{ color: "#3b82f6" }}>â‚ھ{money(s.aging["1_30"])}</td>
                                    <td className="px-4 py-3 text-center font-mono" style={{ color: "#f59e0b" }}>â‚ھ{money(s.aging["31_60"])}</td>
                                    <td className="px-4 py-3 text-center font-mono" style={{ color: "#f97316" }}>â‚ھ{money(s.aging["61_90"])}</td>
                                    <td className="px-4 py-3 text-center font-mono" style={{ color: "#ef4444" }}>â‚ھ{money(s.aging.over_90)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// â”€â”€â”€ CustomerCreateForm (New Customer Tab) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface CreateFormProps {
    form: any;
    updateField: (f: string, v: any) => void;
    handleCreate: () => Promise<void>;
    creating: boolean;
}

const CustomerCreateForm: React.FC<CreateFormProps> = ({ form, updateField, handleCreate, creating }) => (
    <div className="max-w-3xl mx-auto bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 space-y-5">
            <h3 className="text-lg font-black text-white">ط¥ظ†ط´ط§ط، ط¹ظ…ظٹظ„ ط¬ط¯ظٹط¯</h3>
            <p className="text-[10px] text-slate-500">ط¬ظ…ظٹط¹ ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط§ظ„ظٹط© طھط³طھط®ط¯ظ… ط§ظ„ظ€ Subledger â€” ط¨ط¯ظˆظ† ط¥ظ†ط´ط§ط، ط­ط³ط§ط¨ط§طھ GL</p>

            {/* Basic Information */}
            <h4 className="text-xs font-bold text-cyan-400 border-b border-cyan-500/20 pb-2">ظ…ط¹ظ„ظˆظ…ط§طھ ط£ط³ط§ط³ظٹط©</h4>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ط§ط³ظ… ط§ظ„ط¹ظ…ظٹظ„ *</label>
                    <input value={form.name} onChange={(e) => updateField("name", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/50" placeholder="ط£ط¯ط®ظ„ ط§ط³ظ… ط§ظ„ط¹ظ…ظٹظ„" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ط§ظ„ط§ط³ظ… ط¨ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط©</label>
                    <input value={form.name_en} onChange={(e) => updateField("name_en", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/50" placeholder="English name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ط§ظ„ط­ط§ظ„ط©</label>
                    <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                        <option value="active">ظ†ط´ط·</option><option value="inactive">ط؛ظٹط± ظ†ط´ط·</option><option value="blocked">ظ…ط­ط¸ظˆط±</option></select></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ط§ظ„ظپط¦ط©</label>
                    <select value={form.category} onChange={(e) => updateField("category", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                        <option value="retail">طھط¬ط²ط¦ط©</option><option value="wholesale">ط¬ظ…ظ„ط©</option><option value="corporate">ط´ط±ظƒط©</option><option value="government">ط­ظƒظˆظ…ظٹ</option><option value="service">ط®ط¯ظ…ظٹ</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ط§ظ„ظ‡ط§طھظپ</label>
                    <input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" placeholder="ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ط§ظ„ط¬ظˆط§ظ„</label>
                    <input value={form.mobile} onChange={(e) => updateField("mobile", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" placeholder="ط±ظ‚ظ… ط§ظ„ط¬ظˆط§ظ„" /></div>
            </div>
            <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ</label>
                <input value={form.email} onChange={(e) => updateField("email", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" placeholder="email@example.com" /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ط§ظ„ط¹ظ†ظˆط§ظ†</label>
                    <input value={form.address} onChange={(e) => updateField("address", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" placeholder="ط§ظ„ط¹ظ†ظˆط§ظ†" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ط§ظ„ظ…ط¯ظٹظ†ط©</label>
                    <input value={form.city} onChange={(e) => updateField("city", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" placeholder="ط§ظ„ظ…ط¯ظٹظ†ط©" /></div>
            </div>

            {/* Financial Information */}
            <h4 className="text-xs font-bold text-emerald-400 border-b border-emerald-500/20 pb-2 pt-2">ظ…ط¹ظ„ظˆظ…ط§طھ ظ…ط§ظ„ظٹط©</h4>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ط§ظ„ط¹ظ…ظ„ط©</label>
                    <select value={form.currency} onChange={(e) => updateField("currency", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                        <option value="ILS">ط´ظٹظƒظ„ (ILS)</option><option value="JOD">ط¯ظٹظ†ط§ط± (JOD)</option><option value="USD">ط¯ظˆظ„ط§ط± (USD)</option></select></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ط´ط±ظˆط· ط§ظ„ط¯ظپط¹</label>
                    <select value={form.payment_terms} onChange={(e) => updateField("payment_terms", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                        <option value="immediate">ظپظˆط±ظٹ</option><option value="net15">15 ظٹظˆظ…</option><option value="net30">30 ظٹظˆظ…</option><option value="net60">60 ظٹظˆظ…</option><option value="net90">90 ظٹظˆظ…</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ط§ظ„ط­ط¯ ط§ظ„ط§ط¦طھظ…ط§ظ†ظٹ</label>
                    <input type="number" value={form.credit_limit} onChange={(e) => updateField("credit_limit", Number(e.target.value))} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" placeholder="0" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ط§ظ„ط±طµظٹط¯ ط§ظ„ط§ظپطھطھط§ط­ظٹ</label>
                    <input type="number" value={form.opening_balance} onChange={(e) => updateField("opening_balance", Number(e.target.value))} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" placeholder="0" />
                    <p className="text-[8px] text-amber-500 mt-1">ط³ظٹطھظ… ط¥ظ†ط´ط§ط، ظ‚ظٹط¯ ط§ظپطھطھط§ط­ظٹ طھظ„ظ‚ط§ط¦ظٹ</p></div>
            </div>

            {/* Advanced Section */}
            <button onClick={() => updateField("advanced", !form.advanced)}
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-white font-bold">
                {form.advanced ? "â–²" : "â–¼"} ط¥ط¹ط¯ط§ط¯ط§طھ ظ…طھظ‚ط¯ظ…ط©
            </button>
            {form.advanced && (
                <div className="space-y-4 pr-3 border-r border-white/5">
                    <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ظ…ظ„ط§ط­ط¸ط§طھ</label>
                        <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none" rows={2} placeholder="ظ…ظ„ط§ط­ط¸ط§طھ..." /></div>
                    <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ط±ط§ط¨ط· Google Maps</label>
                        <input value={form.gps_link} onChange={(e) => updateField("gps_link", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" placeholder="https://maps.google.com/..." /></div>
                </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-3 pt-2">
                <button onClick={handleCreate} disabled={creating || !form.name.trim()}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all">
                    {creating ? <><RefreshCw size={14} className="animate-spin inline ml-1" /> ط¬ط§ط±ظٹ ط§ظ„ط¥ظ†ط´ط§ط،...</> : "ط¥ظ†ط´ط§ط، ط§ظ„ط¹ظ…ظٹظ„"}
                </button>
                <p className="text-[10px] text-slate-500">ط³ظٹط¸ظ‡ط± ط§ظ„ط¹ظ…ظٹظ„ ظپظˆط±ط§ظ‹ ظپظٹ ط¯ظ„ظٹظ„ ط§ظ„ط¹ظ…ظ„ط§ط،</p>
            </div>
        </div>
    </div>
);

export default CustomerPortal;


