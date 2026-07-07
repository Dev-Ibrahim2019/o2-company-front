// src/components/administration/customers/CustomerPortal.tsx
// Modern ERP Customer Center — Odoo/ERPNext Style with Real Analytics

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
import EmployeeStatement from "../GL/EmployeeStatement";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart as RPieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";

// --- Types -------------------------------------------------------------
type CustomerView = "dashboard" | "directory" | "statements" | "payments" | "aging" | "new-customer";
type ModalType = "invoice" | "receipt" | null;

// --- Colors ------------------------------------------------------------
const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#f97316", "#ef4444"];
const CHART_COLORS = { rose: "#f43f5e", emerald: "#10b981", blue: "#3b82f6", amber: "#f59e0b", violet: "#8b5cf6" };

// --- Helpers ------------------------------------------------------------
const money = (v: number) => v?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00";
const pct = (v: number) => `${(v || 0).toFixed(1)}%`;
const dateFmt = (d: string) => { try { return new Date(d).toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };

// --- KPI Card ----------------------------------------------------------
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

// --- Main CustomerPortal ----------------------------------------------
const CustomerPortal: React.FC = () => {
    const [activeView, setActiveView] = useState<CustomerView>("dashboard");
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [modalType, setModalType] = useState<ModalType>(null);

    const tabs: { key: CustomerView; label: string; icon: React.ElementType }[] = [
        { key: "dashboard", label: "لوحة العملاء", icon: LayoutDashboard },
        { key: "directory", label: "دليل العملاء", icon: Users },
        { key: "statements", label: "كشوفات الحساب", icon: FileText },
        { key: "payments", label: "المدفوعات", icon: Wallet },
        { key: "aging", label: "تحليل الأعمار", icon: Clock },
        { key: "new-customer", label: "إنشاء عميل", icon: UserPlus },
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

// --- CustomerDashboard -------------------------------------------------
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
        { name: "حالي", value: stats.aging_totals.current, fill: COLORS[0] },
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
                <KpiCard label="إجمالي العملاء" value={stats?.total.toString() || "0"} icon={Users} color="text-blue-400" bg="bg-blue-500/10" subtitle="مسجل في النظام" />
                <KpiCard label="الذمم المدينة" value={`₪${money(stats?.total_receivables || 0)}`} icon={TrendingUp} color="text-rose-400" bg="bg-rose-500/10" subtitle="إجمالي المستحق" />
                <KpiCard label="عملاء نشطين" value={stats?.active.toString() || "0"} icon={ShieldAlert} color="text-emerald-400" bg="bg-emerald-500/10" subtitle={`من ${stats?.total || 0}`} />
                <KpiCard label="عليهم مستحقات" value={stats?.overdue_count.toString() || "0"} icon={AlertTriangle} color="text-amber-400" bg="bg-amber-500/10" subtitle="رصيد أكبر من صفر" />
                <KpiCard label="مخاطر عالية" value={stats?.at_risk.toString() || "0"} icon={AlertTriangle} color="text-rose-400" bg="bg-rose-500/10" subtitle="High + Critical" />
                <KpiCard label="التحصيل الشهري" value={`₪${money(stats?.total_collected || 0)}`} icon={Wallet} color="text-violet-400" bg="bg-violet-500/10" subtitle="هذا الشهر" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Aging Pie Chart */}
                {agingData.length > 0 && (
                    <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                        <h4 className="text-sm font-bold text-white mb-4">توزيع الأعمار</h4>
                        <ResponsiveContainer width="100%" height={220}>
                            <RPieChart>
                                <Pie data={agingData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                                    {agingData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                </Pie>
                                <Tooltip formatter={(v: any) => `₪${money(Number(v) || 0)}`} />
                            </RPieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-5 gap-2 mt-2">
                            {agingData.map((item) => (
                                <div key={item.name} className="text-center">
                                    <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: item.fill }} />
                                    <p className="text-[8px] text-slate-500">{item.name}</p>
                                    <p className="text-[9px] font-mono text-slate-300">₪{money(item.value)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Top Customers */}
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                    <h4 className="text-sm font-bold text-white mb-4">أكبر 10 عملاء (رصيد)</h4>
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
                                <span className={`text-xs font-black font-mono ${c.balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>₪{money(Math.abs(c.balance))}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Aging Summary */}
            {agingData.length > 0 && (
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                    <h4 className="text-sm font-bold text-white mb-4">ملخص الأعمار — جميع العملاء</h4>
                    <div className="grid grid-cols-5 gap-3">
                        {agingData.map((item) => (
                            <div key={item.name} className="text-center rounded-xl p-3" style={{ backgroundColor: `${item.fill}15`, border: `1px solid ${item.fill}30` }}>
                                <p className="text-[10px] text-slate-500 font-bold mb-1">{item.name}</p>
                                <p className="text-lg font-black font-mono" style={{ color: item.fill }}>₪{money(item.value)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- CustomerIndex (Modern Directory) ---------------------------------
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
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم، الرمز، الهاتف..." className="w-full bg-slate-950 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white outline-none focus:border-blue-500/50" />
                        {search && <button onClick={() => setSearch("")} className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white"><X size={12} /></button>}
                    </div>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                        <option value="">كل الحالات</option>
                        <option value="active">نشط</option>
                        <option value="inactive">غير نشط</option>
                        <option value="blocked">محظور</option>
                    </select>
                    <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                        <option value="">كل المخاطر</option>
                        <option value="low">منخفض</option>
                        <option value="medium">متوسط</option>
                        <option value="high">مرتفع</option>
                        <option value="critical">حرج</option>
                    </select>
                    <button onClick={loadData} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></button>
                    <span className="text-[10px] text-slate-500">{filtered.length} عميل</span>
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
                                        <th className="px-4 py-3">العميل</th>
                                        <th className="px-4 py-3">الكود</th>
                                        <th className="px-4 py-3">الهاتف</th>
                                        <th className="px-4 py-3 text-center">الحالة</th>
                                        <th className="px-4 py-3 text-center">المخاطرة</th>
                                        <th className="px-4 py-3 text-center">الحد الائتماني</th>
                                        <th className="px-4 py-3 text-center">الرصيد</th>
                                        <th className="px-4 py-3 text-center">الاستخدام</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">لا يوجد عملاء</td></tr>
                                    ) : filtered.map((c) => (
                                        <tr key={c.id} className="hover:bg-white/[0.02] transition-all">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-xs">{c.name?.charAt(0)}</div>
                                                    <p className="font-bold text-white text-xs">{c.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-slate-500 text-[10px]">{c.code}</td>
                                            <td className="px-4 py-3 text-slate-400">{c.phone || "—"}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${c.status === "active" ? "bg-emerald-500/15 text-emerald-400" : c.status === "inactive" ? "bg-slate-500/15 text-slate-400" : "bg-rose-500/15 text-rose-400"}`}>
                                                    {c.status === "active" ? "نشط" : c.status === "inactive" ? "غير نشط" : "محظور"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${c.risk_level === "low" ? "bg-emerald-500/15 text-emerald-400" : c.risk_level === "medium" ? "bg-amber-500/15 text-amber-400" : "bg-rose-500/15 text-rose-400"}`}>
                                                    {c.risk_level === "low" ? "منخفض" : c.risk_level === "medium" ? "متوسط" : c.risk_level === "high" ? "مرتفع" : "حرج"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-slate-300">₪{money(c.credit_limit)}</td>
                                            <td className={`px-4 py-3 text-center font-mono font-bold ${c.balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>₪{money(Math.abs(c.balance))}</td>
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

// --- Customer 360 Profile ----------------------------------------------
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
        { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
        { id: "statement", label: "كشف حساب", icon: FileText },
        { id: "aging", label: "تحليل الأعمار", icon: Clock },
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
    if (!customer) return <div className="text-slate-500 text-center py-16">العميل غير موجود</div>;

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
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${customer.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>{customer.status === "active" ? "نشط" : customer.status}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${customer.risk_level === "low" ? "bg-emerald-500/15 text-emerald-400" : customer.risk_level === "medium" ? "bg-amber-500/15 text-amber-400" : "bg-rose-500/15 text-rose-400"}`}>
                                {customer.risk_level === "low" ? "مخاطرة منخفضة" : customer.risk_level === "medium" ? "مخاطرة متوسطة" : customer.risk_level === "high" ? "مخاطرة مرتفعة" : "مخاطرة حرجة"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] text-slate-500 font-bold">الرصيد الحالي</p>
                        <p className={`text-2xl font-black font-mono ${customer.balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>₪{money(Math.abs(customer.balance))}</p>
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
                                <KpiCard label="إجمالي المبيعات" value={`₪${money(analytics.total_sales)}`} icon={TrendingUp} color="text-emerald-400" bg="bg-emerald-500/10" />
                                <KpiCard label="إجمالي المحصل" value={`₪${money(analytics.total_collected)}`} icon={TrendingDown} color="text-blue-400" bg="bg-blue-500/10" />
                                <KpiCard label="معدل التحصيل" value={pct(analytics.collection_rate)} icon={DollarSign} color="text-violet-400" bg="bg-violet-500/10" />
                                <KpiCard label="DSO" value={`${analytics.dso || 0} يوم`} icon={Calendar} color="text-amber-400" bg="bg-amber-500/10" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <KpiCard label="الحد الائتماني" value={`₪${money(customer.credit_limit)}`} icon={CreditCard} color="text-slate-400" bg="bg-slate-500/10" />
                                <KpiCard label="الائتمان المتاح" value={`₪${money(analytics.available_credit)}`} icon={Wallet} color="text-emerald-400" bg="bg-emerald-500/10" />
                                <KpiCard label="تحصيل الشهر" value={`₪${money(analytics.monthly_collections)}`} icon={BarChart3} color="text-cyan-400" bg="bg-cyan-500/10" />
                                <KpiCard label="استخدام الائتمان" value={pct(analytics.credit_usage)} icon={ShieldAlert} color={analytics.credit_usage > 80 ? "text-rose-400" : "text-emerald-400"} bg={analytics.credit_usage > 80 ? "bg-rose-500/10" : "bg-emerald-500/10"} />
                            </div>

                            {/* aging info */}
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
                                            const pctVal = analytics.aging.total > 0 ? (val / analytics.aging.total) * 100 : 0;
                                            return (
                                                <div key={bucket.key} className="flex items-center gap-3">
                                                    <span className="text-[10px] text-slate-500 w-20">{bucket.label}</span>
                                                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${bucket.color}`} style={{ width: `${pctVal}%` }} />
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-mono w-20 text-left">₪{money(val)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Statement Tab — الآن يستخدم EmployeeStatement المتطور بدلاً من FinancialStatementTable البسيط */}
                    {activeTab === "statement" && customer && (
                        <EmployeeStatement
                            entityType="customer"
                            entityId={customerId}
                            entityName={customer.name}
                        />
                    )}

                    {/* Aging Tab */}
                    {activeTab === "aging" && analytics?.aging && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {[
                                    { label: "حالي", key: "current", color: "text-emerald-400", bg: "bg-emerald-500/10" },
                                    { label: "1-30 يوم", key: "1_30", color: "text-amber-400", bg: "bg-amber-500/10" },
                                    { label: "31-60 يوم", key: "31_60", color: "text-orange-400", bg: "bg-orange-500/10" },
                                    { label: "61-90 يوم", key: "61_90", color: "text-rose-400", bg: "bg-rose-500/10" },
                                    { label: "أكثر من 90", key: "over_90", color: "text-red-500", bg: "bg-red-500/10" },
                                ].map((bucket) => (
                                    <div key={bucket.key} className={`${bucket.bg} border border-white/5 rounded-2xl p-4 text-center`}>
                                        <p className="text-[10px] text-slate-500 font-bold mb-1">{bucket.label}</p>
                                        <p className={`text-lg font-black font-mono ${bucket.color}`}>₪{money(analytics.aging[bucket.key])}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-slate-950 border border-white/5 rounded-2xl p-4">
                                <p className="text-xs text-slate-500 font-bold mb-2">إجمالي الذمم</p>
                                <p className="text-2xl font-black font-mono text-rose-400">₪{money(analytics.aging.total)}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- EnhancedStatementView — تم استبداله بـ EmployeeStatement مباشرة في الـ 360 Profile ↑ ↑
// لكن نحتفظ بهذا المكون للتوافق إن احتاجته جهة أخرى
const EnhancedStatementView: React.FC<{ customerId: number; customerName?: string }> = ({ customerId, customerName }) => {
    return (
        <EmployeeStatement
            entityType="customer"
            entityId={customerId}
            entityName={customerName || `عميل #${customerId}`}
        />
    );
};

// --- CustomerStatements ------------------------------------------------
const CustomerStatements: React.FC<{ onViewCustomer: (id: number) => void }> = ({ onViewCustomer }) => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

    useEffect(() => {
        customerService.list({ per_page: 200 }).then((res) => {
            const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
            setCustomers(items);
        }).finally(() => setLoading(false));
    }, []);

    const filtered = customers.filter((c) => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.code?.toLowerCase().includes(search.toLowerCase()));

    const handleBack = () => setSelectedCustomer(null);

    // إذا تم اختيار عميل، اعرض كشف الحساب المتطور (EmployeeStatement) مباشرة
    if (selectedCustomer) {
        return (
            <div className="space-y-4">
                <button onClick={handleBack}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/5 rounded-xl text-white text-xs font-bold hover:bg-slate-700 transition-all"
                >
                    <ChevronRight size={14} /> العودة للقائمة
                </button>
                <EmployeeStatement
                    entityType="customer"
                    entityId={selectedCustomer.id}
                    entityName={selectedCustomer.name}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
                <div className="relative flex-1">
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن عميل..." className="w-full bg-slate-950 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white outline-none" />
                </div>
            </div>
            {loading ? (
                <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map((c) => (
                        <button key={c.id} onClick={() => setSelectedCustomer(c)} className="flex items-center gap-3 p-4 bg-slate-800/50 border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all group text-right">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-sm">{c.name?.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{c.name}</p>
                                <p className="text-[10px] text-slate-500 font-mono">{c.code}</p>
                            </div>
                            <div className="text-left shrink-0">
                                <p className={`text-xs font-black font-mono ${c.balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>₪{money(Math.abs(c.balance))}</p>
                            </div>
                            <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- CustomerPayments --------------------------------------------------
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
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن عميل..." className="w-full bg-slate-950 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white outline-none" />
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
                            <div className="text-left"><p className="font-bold text-rose-400 font-mono">₪{money(c.balance)}</p><p className="text-[10px] text-slate-500">مستحق</p></div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- CustomerAgingReport (Enhanced) ----------------------------------
const CustomerAgingReport: React.FC = () => {
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        customerService.getAgingReport().then((res) => setReport(res.data)).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div>;

    const agingData = report?.totals ? [
        { name: "حالي", value: report.totals.current, fill: "#10b981" },
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
                            <p className="text-lg font-black font-mono" style={{ color: item.fill }}>₪{money(item.value)}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-x-auto">
                <div className="min-w-[900px]">
                    <table className="w-full text-right text-xs">
                        <thead className="bg-slate-950/40 border-b border-white/5">
                            <tr className="text-slate-500 font-black text-[10px]">
                                <th className="px-4 py-3">العميل</th>
                                <th className="px-4 py-3 text-center">الرصيد</th>
                                <th className="px-4 py-3 text-center">حالي</th>
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
                                    <td className="px-4 py-3 text-center font-mono text-rose-400">₪{money(s.balance)}</td>
                                    <td className="px-4 py-3 text-center font-mono" style={{ color: "#10b981" }}>₪{money(s.aging.current)}</td>
                                    <td className="px-4 py-3 text-center font-mono" style={{ color: "#3b82f6" }}>₪{money(s.aging["1_30"])}</td>
                                    <td className="px-4 py-3 text-center font-mono" style={{ color: "#f59e0b" }}>₪{money(s.aging["31_60"])}</td>
                                    <td className="px-4 py-3 text-center font-mono" style={{ color: "#f97316" }}>₪{money(s.aging["61_90"])}</td>
                                    <td className="px-4 py-3 text-center font-mono" style={{ color: "#ef4444" }}>₪{money(s.aging.over_90)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- CustomerCreateForm (New Customer Tab) --------------------------
interface CreateFormProps {
    form: any;
    updateField: (f: string, v: any) => void;
    handleCreate: () => Promise<void>;
    creating: boolean;
}

const CustomerCreateForm: React.FC<CreateFormProps> = ({ form, updateField, handleCreate, creating }) => (
    <div className="max-w-3xl mx-auto bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 space-y-5">
            <h3 className="text-lg font-black text-white">إنشاء عميل جديد</h3>
            <p className="text-[10px] text-slate-500">جميع البيانات المالية تستخدم Subledger — بدون إنشاء حسابات GL</p>

            {/* Basic Information */}
            <h4 className="text-xs font-bold text-cyan-400 border-b border-cyan-500/20 pb-2">معلومات أساسية</h4>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">اسم العميل *</label>
                    <input value={form.name} onChange={(e) => updateField("name", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/50" placeholder="أدخل اسم العميل" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الاسم بالإنجليزية</label>
                    <input value={form.name_en} onChange={(e) => updateField("name_en", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/50" placeholder="English name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الحالة</label>
                    <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                        <option value="active">نشط</option><option value="inactive">غير نشط</option><option value="blocked">محظور</option></select></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الفئة</label>
                    <select value={form.category} onChange={(e) => updateField("category", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                        <option value="retail">تجزئة</option><option value="wholesale">جملة</option><option value="corporate">شركة</option><option value="government">حكومي</option><option value="service">خدمي</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الهاتف</label>
                    <input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" placeholder="رقم الهاتف" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الجوال</label>
                    <input value={form.mobile} onChange={(e) => updateField("mobile", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" placeholder="رقم الجوال" /></div>
            </div>
            <div><label className="text-[10px] text-slate-500 font-bold block mb-1">البريد الإلكتروني</label>
                <input value={form.email} onChange={(e) => updateField("email", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" placeholder="email@example.com" /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">العنوان</label>
                    <input value={form.address} onChange={(e) => updateField("address", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" placeholder="العنوان" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">المدينة</label>
                    <input value={form.city} onChange={(e) => updateField("city", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" placeholder="المدينة" /></div>
            </div>

            {/* Financial Information */}
            <h4 className="text-xs font-bold text-emerald-400 border-b border-emerald-500/20 pb-2 pt-2">معلومات مالية</h4>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">العملة</label>
                    <select value={form.currency} onChange={(e) => updateField("currency", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                        <option value="ILS">شيكل (ILS)</option><option value="JOD">دينار (JOD)</option><option value="USD">دولار (USD)</option></select></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">شروط الدفع</label>
                    <select value={form.payment_terms} onChange={(e) => updateField("payment_terms", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                        <option value="immediate">فوري</option><option value="net15">15 يوم</option><option value="net30">30 يوم</option><option value="net60">60 يوم</option><option value="net90">90 يوم</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الحد الائتماني</label>
                    <input type="number" value={form.credit_limit} onChange={(e) => updateField("credit_limit", Number(e.target.value))} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" placeholder="0" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الرصيد الافتتاحي</label>
                    <input type="number" value={form.opening_balance} onChange={(e) => updateField("opening_balance", Number(e.target.value))} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" placeholder="0" />
                    <p className="text-[8px] text-amber-500 mt-1">سيتم إنشاء قيد افتتاحي تلقائي</p></div>
            </div>

            {/* Advanced Section */}
            <button onClick={() => updateField("advanced", !form.advanced)}
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-white font-bold">
                {form.advanced ? "▲" : "▼"} إعدادات متقدمة
            </button>
            {form.advanced && (
                <div className="space-y-4 pr-3 border-r border-white/5">
                    <div><label className="text-[10px] text-slate-500 font-bold block mb-1">ملاحظات</label>
                        <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none" rows={2} placeholder="ملاحظات..." /></div>
                    <div><label className="text-[10px] text-slate-500 font-bold block mb-1">رابط Google Maps</label>
                        <input value={form.gps_link} onChange={(e) => updateField("gps_link", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" placeholder="https://maps.google.com/..." /></div>
                </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-3 pt-2">
                <button onClick={handleCreate} disabled={creating || !form.name.trim()}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all">
                    {creating ? <><RefreshCw size={14} className="animate-spin inline ml-1" /> جاري الإنشاء...</> : "إنشاء العميل"}
                </button>
                <p className="text-[10px] text-slate-500">سيظهر العميل فوراً في دليل العملاء</p>
            </div>
        </div>
    </div>
);

export default CustomerPortal;