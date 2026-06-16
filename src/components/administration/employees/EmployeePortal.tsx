// src/components/administration/employees/EmployeePortal.tsx
// ERP-Grade Employee Module — Matching Customer/Supplier Architecture
// ALL DATA FROM SUBLEDGER — NO LOCAL CALCULATIONS

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, LayoutDashboard, FileText, Wallet, BarChart3,
    AlertTriangle, TrendingUp, TrendingDown, DollarSign,
    CreditCard, Search, X, RefreshCw, ChevronRight, Eye,
    Calendar, Briefcase, Percent, ShieldAlert, Filter,
    ChevronDown, ChevronUp, Download, Printer, Plus,
    Banknote, Landmark, Receipt, Settings, ArrowUpRight,
    ArrowDownLeft, UserCheck, Clock, Building2, Hash,
    Phone, Mail, Save,
} from "lucide-react";
import { employeeService, type EmployeeFromApi, type FinancialBatchEmployee, type FinancialBatchResponse, type AccountStatementResponse } from "../../../services/employeeService";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, AreaChart, Area } from "recharts";
import FinancialStatementTable from "../shared/FinancialStatementTable";

// ─── Constants & Helpers ───────────────────────────────────────
const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#f97316", "#ef4444", "#8b5cf6", "#06b6d4", "#d946ef"];
const CHART_COLORS = { rose: "#f43f5e", emerald: "#10b981", blue: "#3b82f6", amber: "#f59e0b", violet: "#8b5cf6", cyan: "#06b6d4" };
const money = (v: number | undefined | null) => v?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00";
const pct = (v: number) => `${(v || 0).toFixed(1)}%`;
const dateFmt = (d: string | null | undefined) => { try { if (!d) return "—"; return new Date(d).toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" }); } catch { return d || "—"; } };
const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

type EmployeeView = "dashboard" | "directory" | "statements" | "analytics";
type ProfileTab = "overview" | "statement" | "salary";
interface Account { id: number; code: string; name: string; }

// ─── KpiCard ──────────────────────────────────────────────────
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

// ─── Type Badge ───────────────────────────────────────────────
const typeBadge = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
        advance: { label: "سلفة", color: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
        salary: { label: "راتب", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
        payment: { label: "دفعة", color: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
        receipt: { label: "مقبوضات", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
        adjustment: { label: "تسوية", color: "bg-violet-500/15 text-violet-400 border-violet-500/25" },
        settlement: { label: "تسوية", color: "bg-violet-500/15 text-violet-400 border-violet-500/25" },
        opening: { label: "رصيد افتتاحي", color: "bg-slate-500/15 text-slate-400 border-slate-500/25" },
        journal: { label: "قيد يومية", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25" },
        loan: { label: "قرض", color: "bg-rose-500/15 text-rose-400 border-rose-500/25" },
    };
    const m = map[type] || { label: type, color: "bg-slate-500/15 text-slate-400 border-slate-500/25" };
    return <span className={`px-2 py-0.5 rounded text-[8px] font-black border ${m.color}`}>{m.label}</span>;
};

// ─── Modal Wrapper ────────────────────────────────────────────
const ModalOverlay: React.FC<{ onClose: () => void; title: string; children: React.ReactNode }> = ({ onClose, title, children }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-slate-900 z-10">
                <h3 className="text-sm font-black text-white">{title}</h3>
                <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="p-5">{children}</div>
        </motion.div>
    </motion.div>
);

// ─── Main EmployeePortal ──────────────────────────────────────
const EmployeePortal: React.FC = () => {
    const [activeView, setActiveView] = useState<EmployeeView>("dashboard");
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

    const tabs: { key: EmployeeView; label: string; icon: React.ElementType }[] = [
        { key: "dashboard", label: "لوحة الموظفين", icon: LayoutDashboard },
        { key: "directory", label: "دليل الموظفين", icon: Users },
        { key: "statements", label: "كشوفات الحساب", icon: FileText },
        { key: "analytics", label: "تحليلات", icon: BarChart3 },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden" dir="rtl">
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-1.5 flex gap-1 overflow-x-auto shrink-0 mb-4">
                {tabs.map((tab) => (
                    <button key={tab.key} onClick={() => { setActiveView(tab.key); setSelectedEmployeeId(null); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeView === tab.key ? "bg-red-600 text-white shadow-lg shadow-red-900/30" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                    ><tab.icon size={14} /> {tab.label}</button>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                {selectedEmployeeId ? (
                    <EmployeeProfile employeeId={selectedEmployeeId} onBack={() => setSelectedEmployeeId(null)} />
                ) : activeView === "dashboard" ? (
                    <EmployeeDashboard />
                ) : activeView === "directory" ? (
                    <EmployeeDirectory onViewEmployee={(id) => setSelectedEmployeeId(id)} />
                ) : activeView === "statements" ? (
                    <EmployeeStatements onViewEmployee={(id) => setSelectedEmployeeId(id)} />
                ) : activeView === "analytics" ? (
                    <EmployeeAnalytics />
                ) : null}
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════
// 1. EMPLOYEE DASHBOARD
// ══════════════════════════════════════════════════════════════
const EmployeeDashboard: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        setLoading(true);
        employeeService.getDashboard({ month, year })
            .then(res => { if (res?.data) setStats(res.data); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [month, year]);

    if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div>;
    if (!stats) return <div className="text-center py-16 text-slate-500">لا توجد بيانات</div>;

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3 bg-slate-900 border border-white/5 rounded-2xl p-3">
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                    className="bg-slate-950 border border-white/5 rounded-lg px-3 py-1.5 text-[11px] text-white outline-none">
                    {monthNames.map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
                </select>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                    className="bg-slate-950 border border-white/5 rounded-lg px-3 py-1.5 text-[11px] text-white outline-none">
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                <KpiCard label="إجمالي الموظفين" value={stats.total_employees.toString()} icon={Users} color="text-blue-400" bg="bg-blue-500/10" subtitle={`${stats.active_employees} نشط`} />
                <KpiCard label="رواتب الشهر" value={`₪${money(stats.monthly_salary_expense)}`} icon={TrendingUp} color="text-rose-400" bg="bg-rose-500/10" subtitle={`${monthNames[month - 1]} ${year}`} />
                <KpiCard label="سلف مستحقة" value={`₪${money(stats.outstanding_advances)}`} icon={Wallet} color="text-amber-400" bg="bg-amber-500/10" subtitle="من القيود المحاسبية" />
                <KpiCard label="المدفوعات" value={`₪${money(stats.total_payments)}`} icon={DollarSign} color="text-emerald-400" bg="bg-emerald-500/10" subtitle="صافي المستحق" />
                <KpiCard label="متوسط الراتب" value={`₪${money(stats.average_salary)}`} icon={BarChart3} color="text-violet-400" bg="bg-violet-500/10" subtitle="للموظف النشط" />
                <KpiCard label={stats.pending_salary_employees > 0 ? "⚠️ متأخر صرف" : "مسدد"} value={stats.pending_salary_employees.toString()} icon={AlertTriangle} color={stats.pending_salary_employees > 0 ? "text-rose-400" : "text-emerald-400"} bg={stats.pending_salary_employees > 0 ? "bg-rose-500/10" : "bg-emerald-500/10"} subtitle="باقي صرف راتب" />
            </div>

            <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                <h4 className="text-sm font-bold text-white mb-4">الرواتب حسب القسم</h4>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats.department_breakdown?.filter((d: any) => d.count > 0).slice(0, 10) || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="department" tick={{ fill: "#94a3b8", fontSize: 9 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} />
                        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="salary" name="الرواتب" fill={CHART_COLORS.rose} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="advances" name="السلف" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════
// 2. EMPLOYEE DIRECTORY with ERP Actions
// ══════════════════════════════════════════════════════════════
const EmployeeDirectory: React.FC<{ onViewEmployee: (id: number) => void }> = ({ onViewEmployee }) => {
    const [batch, setBatch] = useState<FinancialBatchResponse | null>(null);
    const [departments, setDepartments] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState<number | "">("");
    const [statusFilter, setStatusFilter] = useState("");
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [actionModal, setActionModal] = useState<{ type: "payroll" | "advance" | "settle-advance" | "settlement"; employee: FinancialBatchEmployee } | null>(null);

    const loadData = useCallback(() => {
        setLoading(true);
        Promise.all([
            employeeService.getFinancialBatch(),
            fetch("/api/departments").then(r => r.json()).then(d => Array.isArray(d) ? d : d?.data || []).catch(() => []),
            fetch("/api/accounting/accounts?type=asset")
                .then(r => r.json())
                .then(d => {
                    const accs = Array.isArray(d) ? d : d?.data || [];
                    return accs.filter((a: any) => a.code?.startsWith("111") || a.code?.startsWith("112"));
                }).catch(() => []),
        ]).then(([b, depts, accs]) => {
            setBatch(b.data);
            setDepartments(depts);
            setAccounts(accs);
        }).finally(() => setLoading(false));
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const employees = batch?.employees || [];
    const totals = batch?.totals;

    const filtered = employees.filter((e) => {
        if (statusFilter && e.status !== statusFilter) return false;
        if (deptFilter !== "" && e.department_id !== deptFilter) return false;
        if (search && !e.name?.toLowerCase().includes(search.toLowerCase()) && !e.phone?.includes(search) && !e.employeeId?.includes(search)) return false;
        return true;
    });

    if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div>;

    return (
        <div className="space-y-4">
            {/* Totals Cards */}
            {totals && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-900 border border-white/5 rounded-xl p-3">
                        <p className="text-[9px] text-slate-500 font-bold">إجمالي الموظفين</p>
                        <p className="text-sm font-black text-white">{totals.total_employees} <span className="text-[10px] text-slate-500">({totals.active_employees} نشط)</span></p>
                    </div>
                    <div className="bg-slate-900 border border-white/5 rounded-xl p-3">
                        <p className="text-[9px] text-slate-500 font-bold">إجمالي الرواتب</p>
                        <p className="text-sm font-black text-rose-400">₪{money(totals.total_salaries)}</p>
                    </div>
                    <div className="bg-slate-900 border border-white/5 rounded-xl p-3">
                        <p className="text-[9px] text-slate-500 font-bold">السلف المستحقة</p>
                        <p className="text-sm font-black text-amber-400">₪{money(totals.total_outstanding_advances)}</p>
                    </div>
                    <div className="bg-slate-900 border border-white/5 rounded-xl p-3">
                        <p className="text-[9px] text-slate-500 font-bold">صافي المستحق</p>
                        <p className="text-sm font-black text-emerald-400">₪{money(totals.total_net_payable)}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-white/5 rounded-2xl p-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم / الهاتف / الكود..."
                        className="w-full bg-slate-950 border border-white/5 rounded-lg py-1.5 pr-8 pl-3 text-[11px] text-white outline-none" />
                </div>
                <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value ? Number(e.target.value) : "")}
                    className="bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none">
                    <option value="">كل الأقسام</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none">
                    <option value="">كل الحالات</option>
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                </select>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                    className="bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none">
                    {monthNames.map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
                </select>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                    className="bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none">
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <span className="text-[10px] text-slate-500">{filtered.length} موظف</span>
            </div>

            {/* Employee Table */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-x-auto">
                <div className="min-w-[1200px]">
                    <table className="w-full text-right text-xs">
                        <thead className="bg-slate-950/40 border-b border-white/5 sticky top-0 z-10">
                            <tr className="text-slate-500 font-black text-[10px]">
                                <th className="px-4 py-3">الموظف</th>
                                <th className="px-4 py-3">القسم</th>
                                <th className="px-4 py-3">الحالة</th>
                                <th className="px-4 py-3 text-center">الراتب</th>
                                <th className="px-4 py-3 text-center">سلفة مستحقة</th>
                                <th className="px-4 py-3 text-center">راتب مستحق</th>
                                <th className="px-4 py-3 text-center">صافي</th>
                                <th className="px-4 py-3 text-center">آخر حركة</th>
                                <th className="px-4 py-3 text-center">الإجراءات</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.map((e) => (
                                <tr key={e.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-cyan-800 flex items-center justify-center text-white font-bold text-xs">{e.name?.charAt(0)}</div>
                                            <div>
                                                <p className="font-bold text-white text-xs">{e.name}</p>
                                                <p className="text-[8px] text-slate-500 font-mono">{e.employeeId || `#${e.id}`}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 text-[10px]">{e.department || "—"}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black ${e.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>
                                            {e.status === "active" ? "نشط" : "غير نشط"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono text-slate-300">₪{money(e.salary)}</td>
                                    <td className="px-4 py-3 text-center font-mono text-amber-400">₪{money(e.outstanding_advance)}</td>
                                    <td className="px-4 py-3 text-center font-mono text-rose-400">₪{money(e.accrued_salary)}</td>
                                    <td className="px-4 py-3 text-center font-mono text-emerald-400 font-bold">₪{money(e.net_payable)}</td>
                                    <td className="px-4 py-3 text-center text-[9px] text-slate-500">{e.last_transaction_date ? dateFmt(e.last_transaction_date) : "—"}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setActionModal({ type: "payroll", employee: e })}
                                                className="p-1.5 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/30 transition-all" title="صرف راتب"><DollarSign size={11} /></button>
                                            <button onClick={() => setActionModal({ type: "advance", employee: e })}
                                                className="p-1.5 rounded-lg bg-amber-600/10 border border-amber-500/20 text-amber-400 hover:bg-amber-600/30 transition-all" title="سلفة"><Wallet size={11} /></button>
                                            <button onClick={() => setActionModal({ type: "settle-advance", employee: e })}
                                                className="p-1.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/30 transition-all" title="تسديد سلفة"><Receipt size={11} /></button>
                                            <button onClick={() => setActionModal({ type: "settlement", employee: e })}
                                                className="p-1.5 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 hover:bg-violet-600/30 transition-all" title="تسوية"><Settings size={11} /></button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => onViewEmployee(e.id)} className="p-1.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/30"><Eye size={12} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Modals */}
            <AnimatePresence>
                {actionModal?.type === "payroll" && <PayrollModal employee={actionModal.employee} accounts={accounts} onClose={() => setActionModal(null)} onSuccess={() => { setActionModal(null); loadData(); }} />}
                {actionModal?.type === "advance" && <AdvanceModal employee={actionModal.employee} accounts={accounts} onClose={() => setActionModal(null)} onSuccess={() => { setActionModal(null); loadData(); }} />}
                {actionModal?.type === "settle-advance" && <AdvanceSettlementModal employee={actionModal.employee} accounts={accounts} onClose={() => setActionModal(null)} onSuccess={() => { setActionModal(null); loadData(); }} />}
                {actionModal?.type === "settlement" && <SettlementModal employee={actionModal.employee} accounts={accounts} onClose={() => setActionModal(null)} onSuccess={() => { setActionModal(null); loadData(); }} />}
            </AnimatePresence>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════════════════════════
interface ModalProps { employee: FinancialBatchEmployee; accounts: Account[]; onClose: () => void; onSuccess: () => void; }

const PayrollModal: React.FC<ModalProps> = ({ employee, accounts, onClose, onSuccess }) => {
    const [amount, setAmount] = useState(employee.salary || 0);
    const [allowances, setAllowances] = useState(0);
    const [deductions, setDeductions] = useState(0);
    const [advanceDeduction, setAdvanceDeduction] = useState(Math.min(employee.outstanding_advance || 0, employee.salary || 0));
    const [cashAccountId, setCashAccountId] = useState<number | "">("");
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const grossAmount = amount + allowances;
    const netPay = grossAmount - deductions - advanceDeduction;

    const handleSubmit = async () => {
        if (!cashAccountId) { setError("يرجى اختيار الحساب"); return; }
        if (grossAmount <= 0) { setError("المبلغ يجب أن يكون أكبر من صفر"); return; }
        setSubmitting(true); setError("");
        try {
            await employeeService.accrualSalary(employee.id, { amount: grossAmount, date: `${year}-${String(month).padStart(2, "0")}-01` }).catch(() => { });
            const res = await employeeService.paySalary(employee.id, {
                gross_amount: grossAmount, cash_account_id: Number(cashAccountId),
                date: `${year}-${String(month).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
                month, year, allowances, deductions,
                advance_deduction: advanceDeduction,
                description: description || `راتب شهر ${monthNames[month - 1]} ${year}`,
            });
            if (res.success) onSuccess();
            else setError(res.message);
        } catch (err: any) { setError(err?.response?.data?.message || "فشل"); } finally { setSubmitting(false); }
    };

    return (
        <ModalOverlay onClose={onClose} title={`صرف راتب — ${employee.name}`}>
            <div className="space-y-4">
                {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-400">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الشهر</label>
                        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none">
                            {monthNames.map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}</select></div>
                    <div><label className="text-[10px] text-slate-500 font-bold block mb-1">السنة</label>
                        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none">
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                </div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الحساب المالي</label>
                    <select value={cashAccountId} onChange={(e) => setCashAccountId(e.target.value ? Number(e.target.value) : "")} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none">
                        <option value="">اختر الحساب</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الراتب</label>
                        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none" /></div>
                    <div><label className="text-[10px] text-slate-500 font-bold block mb-1">البدلات</label>
                        <input type="number" value={allowances} onChange={(e) => setAllowances(Number(e.target.value))} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الخصومات</label>
                        <input type="number" value={deductions} onChange={(e) => setDeductions(Number(e.target.value))} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none" /></div>
                    <div><label className="text-[10px] text-slate-500 font-bold block mb-1">خصم السلفة</label>
                        <input type="number" value={advanceDeduction} onChange={(e) => setAdvanceDeduction(Math.min(Number(e.target.value), employee.outstanding_advance || 0))} max={employee.outstanding_advance || 0}
                            className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none" /></div>
                </div>
                <div className="bg-slate-950 border border-white/5 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-slate-500">الإجمالي</span><span className="text-white font-bold">₪{money(grossAmount)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-slate-500">الخصومات</span><span className="text-rose-400 font-bold">₪{money(deductions + advanceDeduction)}</span></div>
                    <div className="border-t border-white/5 pt-2 flex justify-between text-xs"><span className="text-slate-400 font-bold">صافي الدفع</span><span className="text-emerald-400 font-black text-sm">₪{money(Math.max(0, netPay))}</span></div>
                </div>
                <button onClick={handleSubmit} disabled={submitting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2">
                    {submitting ? <RefreshCw size={14} className="animate-spin" /> : <DollarSign size={14} />}
                    {submitting ? "جاري الصرف..." : "تأكيد صرف الراتب"}
                </button>
            </div>
        </ModalOverlay>
    );
};

const AdvanceModal: React.FC<ModalProps> = ({ employee, accounts, onClose, onSuccess }) => {
    const [amount, setAmount] = useState(0);
    const [cashAccountId, setCashAccountId] = useState<number | "">("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (!cashAccountId) { setError("يرجى اختيار الحساب"); return; }
        if (amount <= 0) { setError("المبلغ يجب أن يكون أكبر من صفر"); return; }
        setSubmitting(true); setError("");
        try {
            const res = await employeeService.recordAdvance(employee.id, { amount, cash_account_id: Number(cashAccountId), date, description: description || `سلفة: ${employee.name}` });
            if (res.success) onSuccess(); else setError(res.message);
        } catch (err: any) { setError(err?.response?.data?.message || "فشل"); } finally { setSubmitting(false); }
    };

    return (
        <ModalOverlay onClose={onClose} title={`منح سلفة — ${employee.name}`}>
            <div className="space-y-4">
                {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-400">{error}</div>}
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">المبلغ</label><input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الحساب المالي</label>
                    <select value={cashAccountId} onChange={(e) => setCashAccountId(e.target.value ? Number(e.target.value) : "")} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none">
                        <option value="">اختر الحساب</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">التاريخ</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الوصف</label><input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none" /></div>
                <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2">
                    {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Wallet size={14} />}{submitting ? "جاري..." : "تأكيد منح السلفة"}</button>
            </div>
        </ModalOverlay>
    );
};

const AdvanceSettlementModal: React.FC<ModalProps> = ({ employee, accounts, onClose, onSuccess }) => {
    const [amount, setAmount] = useState(employee.outstanding_advance || 0);
    const [cashAccountId, setCashAccountId] = useState<number | "">("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (!cashAccountId) { setError("يرجى اختيار الحساب"); return; }
        if (amount <= 0) { setError("المبلغ يجب أن يكون أكبر من صفر"); return; }
        if (amount > (employee.outstanding_advance || 0)) { setError(`السلفة المستحقة هي ₪${money(employee.outstanding_advance)} فقط`); return; }
        setSubmitting(true); setError("");
        try {
            const res = await employeeService.recordAdvanceRepayment(employee.id, { amount, cash_account_id: Number(cashAccountId), date, description: description || `تسديد سلفة: ${employee.name}` });
            if (res.success) onSuccess(); else setError(res.message);
        } catch (err: any) { setError(err?.response?.data?.message || "فشل"); } finally { setSubmitting(false); }
    };

    return (
        <ModalOverlay onClose={onClose} title={`تسديد سلفة — ${employee.name}`}>
            <div className="space-y-4">
                {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-400">{error}</div>}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3"><p className="text-[9px] text-amber-500 font-bold">السلفة المستحقة (من القيود)</p><p className="text-lg font-black text-amber-400">₪{money(employee.outstanding_advance)}</p></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">مبلغ السداد</label><input type="number" value={amount} onChange={(e) => setAmount(Math.min(Number(e.target.value), employee.outstanding_advance || 0))} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الحساب المالي</label>
                    <select value={cashAccountId} onChange={(e) => setCashAccountId(e.target.value ? Number(e.target.value) : "")} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none">
                        <option value="">اختر الحساب</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">التاريخ</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none" /></div>
                <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2">
                    {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Receipt size={14} />}{submitting ? "جاري..." : "تأكيد تسديد السلفة"}</button>
            </div>
        </ModalOverlay>
    );
};

const SettlementModal: React.FC<ModalProps> = ({ employee, accounts, onClose, onSuccess }) => {
    const [amount, setAmount] = useState(0);
    const [cashAccountId, setCashAccountId] = useState<number | "">("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [type, setType] = useState<"debit" | "credit">("debit");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (!cashAccountId) { setError("يرجى اختيار الحساب"); return; }
        if (amount <= 0) { setError("المبلغ يجب أن يكون أكبر من صفر"); return; }
        setSubmitting(true); setError("");
        try {
            const res = await employeeService.recordSettlement(employee.id, { amount, cash_account_id: Number(cashAccountId), date, type, description: description || `تسوية: ${employee.name}` });
            if (res.success) onSuccess(); else setError(res.message);
        } catch (err: any) { setError(err?.response?.data?.message || "فشل"); } finally { setSubmitting(false); }
    };

    return (
        <ModalOverlay onClose={onClose} title={`تسوية مالية — ${employee.name}`}>
            <div className="space-y-4">
                {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-400">{error}</div>}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-950 border border-white/5 rounded-xl p-3 text-center"><p className="text-[8px] text-slate-500">سلفة</p><p className="text-xs font-black text-amber-400">₪{money(employee.outstanding_advance)}</p></div>
                    <div className="bg-slate-950 border border-white/5 rounded-xl p-3 text-center"><p className="text-[8px] text-slate-500">راتب مستحق</p><p className="text-xs font-black text-rose-400">₪{money(employee.accrued_salary)}</p></div>
                    <div className="bg-slate-950 border border-white/5 rounded-xl p-3 text-center"><p className="text-[8px] text-slate-500">صافي</p><p className="text-xs font-black text-emerald-400">₪{money(employee.net_payable)}</p></div>
                </div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">نوع التسوية</label>
                    <div className="flex gap-2">
                        <button onClick={() => setType("debit")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${type === "debit" ? "bg-rose-600/20 border-rose-500/30 text-rose-400" : "bg-slate-950 border-white/5 text-slate-500"}`}>مدين (زيادة)</button>
                        <button onClick={() => setType("credit")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${type === "credit" ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-400" : "bg-slate-950 border-white/5 text-slate-500"}`}>دائن (نقص)</button>
                    </div>
                </div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">المبلغ</label><input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الحساب المالي</label>
                    <select value={cashAccountId} onChange={(e) => setCashAccountId(e.target.value ? Number(e.target.value) : "")} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none">
                        <option value="">اختر الحساب</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">التاريخ</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">الوصف</label><input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none" /></div>
                <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2">
                    {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Settings size={14} />}{submitting ? "جاري..." : "تأكيد التسوية"}</button>
            </div>
        </ModalOverlay>
    );
};

// ══════════════════════════════════════════════════════════════
// 3. EMPLOYEE PROFILE (360°)
// ══════════════════════════════════════════════════════════════
const EmployeeProfile: React.FC<{ employeeId: number; onBack: () => void }> = ({ employeeId, onBack }) => {
    const [employee, setEmployee] = useState<EmployeeFromApi | null>(null);
    const [statement, setStatement] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
    const [loading, setLoading] = useState(true);
    const [statementLoading, setStatementLoading] = useState(false);
    const [from, setFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]);
    const [to, setTo] = useState(new Date().toISOString().split("T")[0]);

    useEffect(() => {
        employeeService.getOne(employeeId).then((data) => { setEmployee(data); }).finally(() => setLoading(false));
    }, [employeeId]);

    const loadStatement = useCallback(async () => {
        setStatementLoading(true);
        try {
            const res = await employeeService.getAccountStatement(employeeId, from, to, "all");
            const accounts = res.data.accounts;
            const allLines: any[] = [];
            let totalDebit = 0, totalCredit = 0, balance = 0;
            Object.entries(accounts || {}).forEach(([type, stmt]: [string, any]) => {
                if (stmt?.lines) {
                    stmt.lines.forEach((line: any) => allLines.push({ ...line, account_name: type === "advance" ? "سلفة" : type === "salary" ? "راتب" : "قرض" }));
                    totalDebit += stmt.total_debit || 0;
                    totalCredit += stmt.total_credit || 0;
                }
            });
            allLines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            allLines.forEach((line) => { balance += (line.debit || 0) - (line.credit || 0); line.balance = balance; });
            setStatement({ lines: allLines, opening_balance: 0, closing_balance: balance, total_debit: totalDebit, total_credit: totalCredit });
        } catch { } finally { setStatementLoading(false); }
    }, [employeeId, from, to]);

    const tabs: { key: ProfileTab; label: string; icon: React.ElementType }[] = [
        { key: "overview", label: "نظرة عامة", icon: LayoutDashboard },
        { key: "statement", label: "كشف حساب", icon: FileText },
        { key: "salary", label: "الراتب", icon: DollarSign },
    ];

    if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div>;
    if (!employee) return <div className="text-center py-16 text-slate-500">الموظف غير موجود</div>;

    const transactionCount = statement?.lines?.length || 0;
    const lastTransactionDate = statement?.lines?.[statement.lines.length - 1]?.date || "—";

    return (
        <div className="space-y-4">
            {/* Header — status from DB */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white"><ChevronRight size={18} /></button>
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-cyan-800 flex items-center justify-center text-white font-black text-xl shadow-lg">{employee.name?.charAt(0)}</div>
                        <div>
                            <h3 className="text-lg font-black text-white">{employee.name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[10px] text-slate-500 font-mono">{employee.employeeId || `#${employee.id}`}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${employee.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>{employee.status === "active" ? "نشط" : "غير نشط"}</span>
                                <span className="text-[10px] text-slate-500">{employee.department?.name || "—"}</span>
                                {employee.branch?.name && <span className="text-[10px] text-slate-600">| {employee.branch.name}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] text-slate-500 font-bold">الرصيد الحالي</p>
                        <p className="text-2xl font-black font-mono text-emerald-400">₪{money(employee.net_payable)}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
                <div className="flex border-b border-white/5 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.key ? "text-cyan-400 border-cyan-500 bg-cyan-500/5" : "text-slate-500 border-transparent hover:text-slate-300"}`}
                        ><tab.icon size={14} /> {tab.label}</button>
                    ))}
                </div>

                <div className="p-5">
                    {activeTab === "overview" && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-slate-950 border border-white/5 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2"><Briefcase size={14} className="text-blue-400" /><span className="text-[9px] text-slate-500 font-bold">الوظيفة</span></div>
                                    <p className="text-xs font-bold text-white">{employee.job_title?.name || "—"}</p>
                                </div>
                                <div className="bg-slate-950 border border-white/5 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2"><Building2 size={14} className="text-violet-400" /><span className="text-[9px] text-slate-500 font-bold">القسم</span></div>
                                    <p className="text-xs font-bold text-white">{employee.department?.name || "—"}</p>
                                </div>
                                <div className="bg-slate-950 border border-white/5 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2"><Calendar size={14} className="text-emerald-400" /><span className="text-[9px] text-slate-500 font-bold">تاريخ التوظيف</span></div>
                                    <p className="text-xs font-bold text-white">{employee.hireDate ? dateFmt(employee.hireDate) : "—"}</p>
                                </div>
                                <div className="bg-slate-950 border border-white/5 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2"><ShieldAlert size={14} className="text-amber-400" /><span className="text-[9px] text-slate-500 font-bold">الحالة</span></div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${employee.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>{employee.status === "active" ? "نشط" : "غير نشط"}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-slate-950 border border-white/5 rounded-xl p-4"><p className="text-[9px] text-slate-500 font-bold mb-1">آخر راتب</p><p className="text-sm font-black font-mono text-emerald-400">₪{money(employee.salary)}</p></div>
                                <div className="bg-slate-950 border border-white/5 rounded-xl p-4"><p className="text-[9px] text-slate-500 font-bold mb-1">آخر سلفة (من القيود)</p><p className="text-sm font-black font-mono text-amber-400">₪{money(employee.outstanding_advance)}</p></div>
                                <div className="bg-slate-950 border border-white/5 rounded-xl p-4"><p className="text-[9px] text-slate-500 font-bold mb-1">إجمالي المدفوعات</p><p className="text-sm font-black font-mono text-blue-400">₪{money(employee.net_payable)}</p></div>
                                <div className="bg-slate-950 border border-white/5 rounded-xl p-4"><p className="text-[9px] text-slate-500 font-bold mb-1">عدد العمليات</p><p className="text-sm font-black font-mono text-violet-400">{transactionCount}</p></div>
                            </div>
                            {lastTransactionDate !== "—" && (
                                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3 flex items-center gap-2"><Clock size={12} className="text-cyan-400" /><span className="text-[10px] text-cyan-400">آخر حركة مالية: {dateFmt(lastTransactionDate)}</span></div>
                            )}
                            <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                                {employee.phone && <p className="flex items-center gap-1"><Phone size={12} /> {employee.phone}</p>}
                                {employee.email && <p className="flex items-center gap-1"><Mail size={12} /> {employee.email}</p>}
                                {employee.nationalId && <p className="flex items-center gap-1"><Hash size={12} /> {employee.nationalId}</p>}
                                {employee.salary_type && <p className="flex items-center gap-1"><Wallet size={12} /> {employee.salary_type === "monthly" ? "شهري" : employee.salary_type === "daily" ? "يومي" : "ساعي"}</p>}
                            </div>
                        </div>
                    )}

                    {activeTab === "statement" && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50" />
                                <span className="text-slate-500 text-xs">إلى</span>
                                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50" />
                                <button onClick={loadStatement} className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400 hover:bg-blue-600/20 transition-all"><Search size={14} /></button>
                                <button onClick={() => { }} className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 hover:bg-amber-500/20 transition-all"><Download size={14} /></button>
                                <button onClick={() => { }} className="p-2 bg-slate-500/10 border border-slate-500/20 rounded-xl text-slate-400 hover:bg-slate-500/20 transition-all"><Printer size={14} /></button>
                            </div>
                            <EmployeeStatementTable statement={statement} loading={statementLoading} />
                        </div>
                    )}

                    {activeTab === "salary" && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-white">تفاصيل الراتب</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-slate-950 border border-white/5 rounded-xl p-4"><p className="text-[10px] text-slate-500 font-bold mb-1">الراتب الأساسي</p><p className="text-lg font-black font-mono text-emerald-400">₪{money(employee.salary)}</p></div>
                                <div className="bg-slate-950 border border-white/5 rounded-xl p-4"><p className="text-[10px] text-slate-500 font-bold mb-1">نوع الراتب</p><p className="text-lg font-black font-mono text-blue-400">{employee.salary_type === "monthly" ? "شهري" : employee.salary_type === "daily" ? "يومي" : employee.salary_type === "hourly" ? "ساعي" : "—"}</p></div>
                                <div className="bg-slate-950 border border-white/5 rounded-xl p-4"><p className="text-[10px] text-slate-500 font-bold mb-1">سلفة مستحقة (من القيود)</p><p className="text-lg font-black font-mono text-amber-400">₪{money(employee.outstanding_advance)}</p></div>
                                <div className="bg-slate-950 border border-white/5 rounded-xl p-4"><p className="text-[10px] text-slate-500 font-bold mb-1">صافي الاستلام</p><p className="text-lg font-black font-mono text-emerald-400">₪{money(employee.net_payable)}</p></div>
                            </div>
                            {employee.hourly_rate && <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-950 border border-white/5 rounded-xl p-4"><p className="text-[10px] text-slate-500 font-bold mb-1">الساعة</p><p className="text-sm font-black font-mono text-blue-400">₪{money(employee.hourly_rate)}</p></div>
                                <div className="bg-slate-950 border border-white/5 rounded-xl p-4"><p className="text-[10px] text-slate-500 font-bold mb-1">ساعات العمل</p><p className="text-sm font-black font-mono text-blue-400">{employee.working_hours || 0} ساعة</p></div>
                            </div>}
                            {employee.daily_rate && <div className="bg-slate-950 border border-white/5 rounded-xl p-4"><p className="text-[10px] text-slate-500 font-bold mb-1">المعدل اليومي</p><p className="text-sm font-black font-mono text-blue-400">₪{money(employee.daily_rate)}</p></div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Employee Statement Table (Using FinancialStatementTable pattern)
const EmployeeStatementTable: React.FC<{ statement: any; loading: boolean }> = ({ statement, loading }) => {
    if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div>;
    if (!statement || !statement.lines?.length) {
        return <div className="flex items-center justify-center h-64 text-slate-500 font-bold">لا توجد حركات في هذه الفترة</div>;
    }
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-950 border border-white/5 rounded-xl p-3"><p className="text-[10px] text-slate-500 font-bold">الرصيد الافتتاحي</p><p className="text-sm font-black font-mono text-slate-300">₪{money(statement.opening_balance)}</p></div>
                <div className="bg-slate-950 border border-white/5 rounded-xl p-3"><p className="text-[10px] text-slate-500 font-bold">إجمالي المدين</p><p className="text-sm font-black font-mono text-rose-400">₪{money(statement.total_debit)}</p></div>
                <div className="bg-slate-950 border border-white/5 rounded-xl p-3"><p className="text-[10px] text-slate-500 font-bold">إجمالي الدائن</p><p className="text-sm font-black font-mono text-emerald-400">₪{money(statement.total_credit)}</p></div>
                <div className="bg-slate-950 border border-white/5 rounded-xl p-3"><p className="text-[10px] text-slate-500 font-bold">الرصيد الختامي</p><p className={`text-sm font-black font-mono ${(statement.closing_balance || 0) > 0 ? "text-rose-400" : "text-emerald-400"}`}>₪{money(Math.abs(statement.closing_balance || 0))}</p></div>
            </div>
            <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-x-auto">
                <div className="min-w-[1100px]">
                    <table className="w-full text-xs">
                        <thead className="bg-slate-950/40 border-b border-white/5 sticky top-0 z-10">
                            <tr className="text-slate-500 font-black text-[10px]">
                                <th className="text-right px-4 py-3">التاريخ</th>
                                <th className="text-right px-4 py-3">نوع العملية</th>
                                <th className="text-right px-4 py-3">الوصف</th>
                                <th className="text-right px-4 py-3">المرجع</th>
                                <th className="text-right px-4 py-3">الحساب</th>
                                <th className="text-right px-4 py-3">مدين</th>
                                <th className="text-right px-4 py-3">دائن</th>
                                <th className="text-right px-4 py-3">الرصيد الجاري</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {statement.lines.map((line: any, i: number) => (
                                <tr key={i} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => {/* click-to-source */ }}>
                                    <td className="px-4 py-3 text-slate-300 font-mono text-[10px]">{dateFmt(line.date)}</td>
                                    <td className="px-4 py-3">{typeBadge(line.type)}</td>
                                    <td className="px-4 py-3"><p className="text-slate-300 text-[11px]">{line.description || line.type}</p></td>
                                    <td className="px-4 py-3 text-slate-500 font-mono text-[9px]">{line.transaction_number || "—"}</td>
                                    <td className="px-4 py-3 text-slate-500 text-[9px]">{line.account_name || "—"}</td>
                                    <td className={`px-4 py-3 font-mono text-[11px] ${line.debit > 0 ? "text-rose-400 font-bold" : "text-slate-600"}`}>{line.debit > 0 ? money(line.debit) : "—"}</td>
                                    <td className={`px-4 py-3 font-mono text-[11px] ${line.credit > 0 ? "text-emerald-400 font-bold" : "text-slate-600"}`}>{line.credit > 0 ? money(line.credit) : "—"}</td>
                                    <td className={`px-4 py-3 font-mono font-bold text-[11px] ${line.balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>₪{money(Math.abs(line.balance))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-950/40 border border-white/5 rounded-xl px-4 py-3">
                <span>{statement.lines.length} معاملة</span>
                <span>الرصيد الختامي: <strong className="text-white font-black">₪{money(Math.abs(statement.closing_balance || 0))}</strong></span>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════
// 4. EMPLOYEE STATEMENTS BROWSE
// ══════════════════════════════════════════════════════════════
const EmployeeStatements: React.FC<{ onViewEmployee: (id: number) => void }> = ({ onViewEmployee }) => {
    const [employees, setEmployees] = useState<FinancialBatchEmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        employeeService.getFinancialBatch().then(res => {
            if (res?.data?.employees) setEmployees(res.data.employees);
        }).finally(() => setLoading(false));
    }, []);

    const filtered = employees.filter(e => !search || e.name?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-4">
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن موظف..." className="w-full bg-slate-950 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white outline-none" />
                    </div>
                    <span className="text-[10px] text-slate-500">{filtered.length} موظف</span>
                </div>
            </div>
            {loading ? <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map((e) => (
                        <button key={e.id} onClick={() => onViewEmployee(e.id)} className="flex items-center gap-3 p-4 bg-slate-800/50 border border-white/5 rounded-2xl hover:border-cyan-500/30 transition-all group text-right">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-800 flex items-center justify-center text-white font-bold text-sm">{e.name?.charAt(0)}</div>
                            <div className="flex-1 min-w-0"><p className="text-sm font-bold text-white truncate">{e.name}</p><p className="text-[10px] text-slate-500">{e.department || "—"}</p></div>
                            <div className="text-left shrink-0 space-y-0.5"><p className="text-xs font-black font-mono text-emerald-400">₪{money(e.net_payable)}</p><p className="text-[8px] text-slate-600">صافي</p></div>
                            <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════════════
// 5. EMPLOYEE ANALYTICS
// ══════════════════════════════════════════════════════════════
const EmployeeAnalytics: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        setLoading(true);
        employeeService.getAnalytics({ month, year })
            .then(res => { if (res?.data) setData(res.data); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [month, year]);

    if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-slate-600" /></div>;
    if (!data) return <div className="text-center py-16 text-slate-500">لا توجد بيانات</div>;

    const { department_payroll = [], totals = {} } = data;
    const averageSalary = totals.average_salary || 0;

    const chartData = department_payroll.map((d: any) => ({
        name: d.name?.length > 10 ? d.name.substring(0, 10) + ".." : d.name,
        الرواتب: d.salaries, السلف: d.advances, الموظفين: d.count,
    }));

    return (
        <div className="space-y-5">
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><label className="text-[9px] text-slate-600 font-bold block mb-1">الشهر</label>
                        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-[11px] text-white outline-none">
                            {monthNames.map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}</select></div>
                    <div><label className="text-[9px] text-slate-600 font-bold block mb-1">السنة</label>
                        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-[11px] text-white outline-none">
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-5"><p className="text-[10px] text-slate-500 font-bold mb-1">إجمالي الرواتب (SUM)</p><p className="text-xl font-black font-mono text-rose-400">₪{money(totals.total_salaries)}</p></div>
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-5"><p className="text-[10px] text-slate-500 font-bold mb-1">إجمالي السلف</p><p className="text-xl font-black font-mono text-amber-400">₪{money(totals.total_advances)}</p></div>
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-5"><p className="text-[10px] text-slate-500 font-bold mb-1">متوسط الراتب</p><p className="text-xl font-black font-mono text-emerald-400">₪{money(averageSalary)}</p><p className="text-[8px] text-slate-600 mt-1">لكل موظف</p></div>
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-5"><p className="text-[10px] text-slate-500 font-bold mb-1">إجمالي الموظفين</p><p className="text-xl font-black font-mono text-blue-400">{totals.total_employees}</p></div>
            </div>

            <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                <h4 className="text-sm font-bold text-white mb-4">تحليل الرواتب حسب القسم</h4>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, fontSize: 11 }} labelStyle={{ color: "#fff", fontWeight: "bold" }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="الرواتب" fill="url(#salaryGradient)" radius={[6, 6, 0, 0]} maxBarSize={60} />
                        <Bar dataKey="السلف" fill="url(#advanceGradient)" radius={[6, 6, 0, 0]} maxBarSize={60} />
                        <defs>
                            <linearGradient id="salaryGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={1} /><stop offset="100%" stopColor="#f43f5e" stopOpacity={0.6} /></linearGradient>
                            <linearGradient id="advanceGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={1} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6} /></linearGradient>
                        </defs>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                    <h4 className="text-sm font-bold text-white mb-4">توزيع الموظفين حسب القسم</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="الموظفين" nameKey="name"
                                label={({ name, percent }: any) => `${name || ""} (${((percent || 0) * 100).toFixed(0)}%)`} labelLine={false}>
                                {chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, fontSize: 11 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                    <h4 className="text-sm font-bold text-white mb-4">إحصائيات سريعة</h4>
                    <div className="space-y-4">
                        {chartData.slice(0, 8).map((d: any, i: number) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-xs text-slate-300">{d.name}</span></div>
                                <div className="text-left"><span className="text-xs font-bold text-white">{d.الموظفين}</span><span className="text-[10px] text-slate-500 mr-2">موظف</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-white/5 rounded-2xl p-5">
                <h4 className="text-sm font-bold text-white mb-4">مقارنة الرواتب والسلف</h4>
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="salaryArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} /><stop offset="95%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
                            <linearGradient id="advanceArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Area type="monotone" dataKey="الرواتب" stroke="#f43f5e" fill="url(#salaryArea)" strokeWidth={2} />
                        <Area type="monotone" dataKey="السلف" stroke="#f59e0b" fill="url(#advanceArea)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default EmployeePortal;