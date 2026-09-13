// src/components/administration/suppliers/SupplierPortal.tsx
// Modern ERP Supplier Center — Analytics, Performance, Real Data

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Truck, LayoutDashboard, Users, FileText, Wallet, Clock,
    TrendingUp, TrendingDown, AlertTriangle, DollarSign,
    ChevronRight, Eye, Search, X, RefreshCw,
    CreditCard, ShieldAlert, BarChart3, Calendar, UserPlus,
} from "lucide-react";
import { supplierService, type Supplier, type SupplierStatement } from "../../../services/supplierService";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import EmployeeStatement from "../GL/EmployeeStatement";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#f97316", "#ef4444"];
const money = (v: number) => v?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00";
const dateFmt = (d: string) => { try { return new Date(d).toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };

type SupplierView = "dashboard" | "directory" | "statements" | "payments" | "aging" | "new-supplier";
type ProfileTab = "overview" | "statement" | "aging";

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

const SupplierPortal: React.FC = () => {
    const [activeView, setActiveView] = useState<SupplierView>("dashboard");
    const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);

    // Form state for new supplier
    const [form, setForm] = useState({
        name: "", name_en: "", status: "active", category: "local",
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
            await supplierService.create({
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

    const tabs: { key: SupplierView; label: string; icon: React.ElementType }[] = [
        { key: "dashboard", label: "لوحة الموردين", icon: LayoutDashboard },
        { key: "directory", label: "دليل الموردين", icon: Users },
        { key: "statements", label: "كشوفات الحساب", icon: FileText },
        { key: "payments", label: "المدفوعات", icon: Wallet },
        { key: "aging", label: "تحليل الأعمار", icon: Clock },
        { key: "new-supplier", label: "إنشاء مورد", icon: UserPlus },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-1.5 flex gap-1 overflow-x-auto shrink-0 mb-4">
                {tabs.map((tab) => (
                    <button key={tab.key} onClick={() => { setActiveView(tab.key); setSelectedSupplierId(null); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeView === tab.key ? "bg-red-600 text-white shadow-lg shadow-red-900/30" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                    ><tab.icon size={14} /> {tab.label}</button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                {selectedSupplierId ? (
                    <SupplierProfile supplierId={selectedSupplierId} onBack={() => setSelectedSupplierId(null)} />
                ) : activeView === "dashboard" ? (
                    <SupplierDashboard onViewSupplier={(id) => setSelectedSupplierId(id)} />
                ) : activeView === "new-supplier" ? (
                    <SupplierCreateForm form={form} updateField={updateField} handleCreate={handleCreate} creating={creating} />
                ) : activeView === "directory" ? (
                    <SupplierIndex onViewSupplier={(id) => setSelectedSupplierId(id)} />
                ) : activeView === "statements" ? (
                    <SupplierStatements onViewSupplier={(id) => setSelectedSupplierId(id)} />
                ) : activeView === "payments" ? (
                    <SupplierPayments />
                ) : activeView === "aging" ? (
                    <SupplierAgingReport />
                ) : null}
            </div>
        </div>
    );
};

// ─── Supplier Dashboard ──────────────────────────────────────────────
const SupplierDashboard: React.FC<{ onViewSupplier: (id: number) => void }> = ({ onViewSupplier }) => {
    const [stats, setStats] = useState<any>(null);
    const [topSuppliers, setTopSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            supplierService.list({ per_page: 200, status: "active" }),
            supplierService.getAgingReport(),
        ]).then(([listRes, agingRes]) => {
            const items = Array.isArray(listRes.data) ? listRes.data : listRes.data?.data || [];
            const totalPayables = items.reduce((s: number, c: any) => s + Math.max(c.balance, 0), 0);
            const top = [...items].sort((a: any, b: any) => Math.abs(b.balance) - Math.abs(a.balance)).slice(0, 10);
            setTopSuppliers(top);
            setStats({
                total: items.length,
                total_payables: totalPayables,
                overdue_count: items.filter((c: any) => c.balance > 0).length,
                active: items.filter((c: any) => c.status === "active").length,
                aging_totals: agingRes.data?.totals,
            });
        }).finally(() => setLoading(false));
    }, []);

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
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <KpiCard label="إجمالي الموردين" value={stats?.total.toString() || "0"} icon={Truck} color="text-blue-400" bg="bg-blue-500/10" subtitle="مسجل في النظام" />
                <KpiCard label="المستحق للموردين" value={`₪${money(stats?.total_payables || 0)}`} icon={TrendingUp} color="text-rose-400" bg="bg-rose-500/10" subtitle="إجمالي الذمم الدائنة" />
                <KpiCard label="موردين نشطين" value={stats?.active.toString() || "0"} icon={ShieldAlert} color="text-emerald-400" bg="bg-emerald-500/10" />
                <KpiCard label="عليهم مستحقات" value={stats?.overdue_count.toString() || "0"} icon={AlertTriangle} color="text-amber-400" bg="bg-amber-500/10" subtitle="رصيد أكبر من صفر" />
                <KpiCard label="إجمالي الموردين" value={stats?.total.toString() || "0"} icon={Users} color="text-violet-400" bg="bg-violet-500/10" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {agingData.length > 0 && (
                    <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                        <h4 className="text-sm font-bold text-white mb-4">توزيع الأعمار — الموردين</h4>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={agingData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                                    {agingData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                                </Pie>
                                <Tooltip formatter={(v: any) => `₪${money(Number(v) || 0)}`} />
                            </PieChart>
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

                <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                    <h4 className="text-sm font-bold text-white mb-4">أكبر 10 موردين (رصيد)</h4>
                    <div className="space-y-2">
                        {topSuppliers.map((s: any, i: number) => (
                            <button key={s.id} onClick={() => onViewSupplier(s.id)} className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-white/5 transition-all">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-600 w-4">{i + 1}</span>
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center text-white font-bold text-[10px]">{s.name?.charAt(0)}</div>
                                    <div className="text-right"><p className="text-xs font-bold text-white truncate max-w-[120px]">{s.name}</p><p className="text-[8px] text-slate-500">{s.code}</p></div>
                                </div>
                                <span className={`text-xs font-black font-mono ${s.balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>₪{money(Math.abs(s.balance))}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Supplier Index ──────────────────────────────────────────────────
const SupplierIndex: React.FC<{ onViewSupplier: (id: number) => void }> = ({ onViewSupplier }) => {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        supplierService.list({ per_page: 200 }).then((res) => {
            const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
            setSuppliers(items);
        }).finally(() => setLoading(false));
    }, []);

    const filtered = suppliers.filter((s) => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.code?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-4">
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن مورد..." className="w-full bg-slate-950 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white outline-none" />
                    </div>
                    <span className="text-[10px] text-slate-500">{filtered.length} مورد</span>
                </div>
            </div>
            {loading ? (
                <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div>
            ) : (
                <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-x-auto">
                    <div className="min-w-[900px]">
                        <table className="w-full text-right text-xs">
                            <thead className="bg-slate-950/40 border-b border-white/5">
                                <tr className="text-slate-500 font-black text-[10px]">
                                    <th className="px-4 py-3">المورد</th>
                                    <th className="px-4 py-3">الكود</th>
                                    <th className="px-4 py-3">الهاتف</th>
                                    <th className="px-4 py-3 text-center">الحالة</th>
                                    <th className="px-4 py-3 text-center">الحد الائتماني</th>
                                    <th className="px-4 py-3 text-center">الرصيد</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filtered.map((s) => (
                                    <tr key={s.id} className="hover:bg-white/[0.02]">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center text-white font-bold text-xs">{s.name?.charAt(0)}</div>
                                                <p className="font-bold text-white text-xs">{s.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-slate-500 text-[10px]">{s.code}</td>
                                        <td className="px-4 py-3 text-slate-400">{s.phone || "—"}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black ${s.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>{s.status === "active" ? "نشط" : "غير نشط"}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono text-slate-300">₪{money(s.credit_limit)}</td>
                                        <td className={`px-4 py-3 text-center font-mono font-bold ${s.balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>₪{money(Math.abs(s.balance))}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => onViewSupplier(s.id)} className="p-1.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600 hover:text-white"><Eye size={12} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Supplier 360 Profile (with full Statement tab) ──────────────────
const SupplierProfile: React.FC<{ supplierId: number; onBack: () => void }> = ({ supplierId, onBack }) => {
    const [supplier, setSupplier] = useState<any>(null);
    const [analytics, setAnalytics] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadProfile(); }, [supplierId]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const res = await supplierService.get(supplierId);
            setSupplier(res.data);
        } catch { } finally { setLoading(false); }
    };

    const tabs: { key: ProfileTab; label: string; icon: React.ElementType }[] = [
        { key: "overview", label: "نظرة عامة", icon: LayoutDashboard },
        { key: "statement", label: "كشف حساب", icon: FileText },
        { key: "aging", label: "تحليل الأعمار", icon: Clock },
    ];

    if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div>;
    if (!supplier) return <div className="text-center py-16 text-slate-500">المورد غير موجود</div>;

    const s = supplier.supplier || {};

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white"><ChevronRight size={18} /></button>
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center text-white font-black text-xl shadow-lg">{s.name?.charAt(0)}</div>
                        <div>
                            <h3 className="text-lg font-black text-white">{s.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-500 font-mono">{s.code}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${s.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>{s.status === "active" ? "نشط" : "غير نشط"}</span>
                                <span className="text-[10px] text-slate-500">{s.category === "local" ? "محلي" : s.category === "international" ? "دولي" : "خدمي"}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] text-slate-500 font-bold">الرصيد الحالي</p>
                        <p className={`text-2xl font-black font-mono ${(s.balance || 0) > 0 ? "text-rose-400" : "text-emerald-400"}`}>₪{money(Math.abs(s.balance || 0))}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
                <div className="flex border-b border-white/5 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.key ? "text-blue-400 border-blue-500 bg-blue-500/5" : "text-slate-500 border-transparent hover:text-slate-300"}`}
                        ><tab.icon size={14} /> {tab.label}</button>
                    ))}
                </div>

                <div className="p-5">
                    {/* Overview Tab */}
                    {activeTab === "overview" && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <KpiCard label="الرصيد الحالي" value={`₪${money(Math.abs(s.balance || 0))}`} icon={DollarSign} color={(s.balance || 0) > 0 ? "text-rose-400" : "text-emerald-400"} bg={(s.balance || 0) > 0 ? "bg-rose-500/10" : "bg-emerald-500/10"} />
                                <KpiCard label="الحد الائتماني" value={`₪${money(s.credit_limit || 0)}`} icon={CreditCard} color="text-blue-400" bg="bg-blue-500/10" />
                                <KpiCard label="شروط الدفع" value={s.payment_terms === "net30" ? "30 يوم" : s.payment_terms === "net15" ? "15 يوم" : s.payment_terms === "immediate" ? "فوري" : s.payment_terms || "—"} icon={Calendar} color="text-amber-400" bg="bg-amber-500/10" />
                            </div>

                            {/* Aging Summary */}
                            {supplier.aging && (
                                <div className="bg-slate-950 border border-white/5 rounded-2xl p-4">
                                    <h4 className="text-xs font-bold text-slate-400 mb-3">تحليل الأعمار</h4>
                                    <div className="grid grid-cols-5 gap-2">
                                        {[
                                            { label: "حالي", key: "current", color: "text-emerald-400", bg: "bg-emerald-500/10" },
                                            { label: "1-30", key: "1_30", color: "text-blue-400", bg: "bg-blue-500/10" },
                                            { label: "31-60", key: "31_60", color: "text-amber-400", bg: "bg-amber-500/10" },
                                            { label: "61-90", key: "61_90", color: "text-orange-400", bg: "bg-orange-500/10" },
                                            { label: "90+", key: "over_90", color: "text-rose-400", bg: "bg-rose-500/10" },
                                        ].map((item) => (
                                            <div key={item.key} className={`${item.bg} border border-white/5 rounded-xl p-3 text-center`}>
                                                <p className="text-[8px] text-slate-500 font-bold mb-1">{item.label}</p>
                                                <p className={`text-xs font-black font-mono ${item.color}`}>₪{money(supplier.aging[item.key] || 0)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                                {s.phone && <p>📞 {s.phone}</p>}
                                {s.email && <p>📧 {s.email}</p>}
                                {s.city && <p>📍 {s.city}</p>}
                                {s.currency && <p>💱 {s.currency}</p>}
                            </div>
                        </div>
                    )}

                    {/* Statement Tab — الآن يستخدم EmployeeStatement المتطور بدلاً من FinancialStatementTable البسيط */}
                    {activeTab === "statement" && (
                        <EmployeeStatement
                            entityType="supplier"
                            entityId={supplierId}
                            entityName={s.name || `مورد #${supplierId}`}
                        />
                    )}

                    {/* Aging Tab */}
                    {activeTab === "aging" && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-5 gap-3">
                                {[
                                    { label: "حالي", key: "current", color: "text-emerald-400", bg: "bg-emerald-500/10" },
                                    { label: "1-30", key: "1_30", color: "text-blue-400", bg: "bg-blue-500/10" },
                                    { label: "31-60", key: "31_60", color: "text-amber-400", bg: "bg-amber-500/10" },
                                    { label: "61-90", key: "61_90", color: "text-orange-400", bg: "bg-orange-500/10" },
                                    { label: "90+", key: "over_90", color: "text-rose-400", bg: "bg-rose-500/10" },
                                ].map((item) => (
                                    <div key={item.key} className={`${item.bg} border border-white/5 rounded-2xl p-4 text-center`}>
                                        <p className="text-[10px] text-slate-500 font-bold mb-1">{item.label}</p>
                                        <p className={`text-lg font-black font-mono ${item.color}`}>₪{money(supplier.aging?.[item.key] || 0)}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-slate-950 border border-white/5 rounded-2xl p-4">
                                <p className="text-xs text-slate-500 font-bold mb-2">إجمالي الذمم</p>
                                <p className="text-2xl font-black font-mono text-rose-400">₪{money(supplier.aging?.total || 0)}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── SupplierStatements ──────────────────────────────────────────────
const SupplierStatements: React.FC<{ onViewSupplier: (id: number) => void }> = ({ onViewSupplier }) => {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);

    useEffect(() => {
        supplierService.list({ per_page: 200 }).then((res) => {
            const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
            setSuppliers(items);
        }).finally(() => setLoading(false));
    }, []);

    const handleBack = () => setSelectedSupplier(null);

    // إذا تم اختيار مورد، اعرض كشف الحساب المتطور (EmployeeStatement) مباشرة
    if (selectedSupplier) {
        return (
            <div className="space-y-4">
                <button onClick={handleBack}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/5 rounded-xl text-white text-xs font-bold hover:bg-slate-700 transition-all"
                >
                    <ChevronRight size={14} /> العودة للقائمة
                </button>
                <EmployeeStatement
                    entityType="supplier"
                    entityId={selectedSupplier.id}
                    entityName={selectedSupplier.name}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {loading ? <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {suppliers.map((s) => (
                        <button key={s.id} onClick={() => setSelectedSupplier(s)} className="flex items-center gap-3 p-4 bg-slate-800/50 border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all group text-right">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center text-white font-bold text-sm">{s.name?.charAt(0)}</div>
                            <div className="flex-1"><p className="text-sm font-bold text-white truncate">{s.name}</p><p className="text-[10px] text-slate-500">{s.code}</p></div>
                            <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── SupplierPayments ────────────────────────────────────────────────
const SupplierPayments: React.FC = () => {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        supplierService.list({ per_page: 200 }).then((res) => {
            const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
            setSuppliers(items.filter((s: any) => s.balance > 0));
        }).finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-4">
            {loading ? <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div> : (
                <div className="space-y-2">
                    {suppliers.map((s) => (
                        <div key={s.id} className="flex items-center justify-between p-4 bg-slate-800/30 border border-white/5 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center text-white font-bold text-sm">{s.name?.charAt(0)}</div>
                                <div><p className="text-sm font-bold text-white">{s.name}</p><p className="text-[10px] text-slate-500">{s.code}</p></div>
                            </div>
                            <div className="text-left"><p className="font-bold text-rose-400">₪{money(s.balance)}</p><p className="text-[10px] text-slate-500">مستحق</p></div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── SupplierAgingReport ─────────────────────────────────────────────
const SupplierAgingReport: React.FC = () => {
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        supplierService.getAgingReport().then((res) => setReport(res.data)).finally(() => setLoading(false));
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
                                <th className="px-4 py-3">المورد</th>
                                <th className="px-4 py-3 text-center">الرصيد</th>
                                <th className="px-4 py-3 text-center">حالي</th>
                                <th className="px-4 py-3 text-center">1-30</th>
                                <th className="px-4 py-3 text-center">31-60</th>
                                <th className="px-4 py-3 text-center">61-90</th>
                                <th className="px-4 py-3 text-center">90+</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {(report?.suppliers || []).map((s: any) => (
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

// ─── SupplierCreateForm (New Supplier Tab) ──────────────────────────
interface CreateFormProps {
    form: any;
    updateField: (f: string, v: any) => void;
    handleCreate: () => Promise<void>;
    creating: boolean;
}

const SupplierCreateForm: React.FC<CreateFormProps> = ({ form, updateField, handleCreate, creating }) => (
    <div className="max-w-3xl mx-auto bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 space-y-5">
            <h3 className="text-lg font-black text-white">إنشاء مورد جديد</h3>
            <p className="text-[10px] text-slate-500">جميع البيانات المالية تستخدم الـ Subledger — بدون إنشاء حسابات GL</p>

            <h4 className="text-xs font-bold text-rose-400 border-b border-rose-500/20 pb-2">معلومات أساسية</h4>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">اسم المورد *</label>
                    <input value={form.name} onChange={(e) => updateField("name", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/50" placeholder="أدخل اسم المورد" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الاسم بالإنجليزية</label>
                    <input value={form.name_en} onChange={(e) => updateField("name_en", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/50" placeholder="English name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الحالة</label>
                    <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                        <option value="active">نشط</option><option value="inactive">غير نشط</option><option value="blocked">محظور</option></select></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الفئة</label>
                    <select value={form.category} onChange={(e) => updateField("category", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                        <option value="local">محلي</option><option value="international">دولي</option><option value="service">خدمي</option></select></div>
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

            <div className="flex items-center gap-3 pt-2">
                <button onClick={handleCreate} disabled={creating || !form.name.trim()}
                    className="px-8 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all">
                    {creating ? <><RefreshCw size={14} className="animate-spin inline ml-1" /> جاري الإنشاء...</> : "إنشاء المورد"}
                </button>
                <p className="text-[10px] text-slate-500">سيظهر المورد فوراً في دليل الموردين</p>
            </div>
        </div>
    </div>
);

export default SupplierPortal;