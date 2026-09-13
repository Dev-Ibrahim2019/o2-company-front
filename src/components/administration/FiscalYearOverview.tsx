import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Calendar, Lock, Unlock, Loader2, BarChart3,
  Clock, User, DollarSign, TrendingUp, FileText, Download,
  Printer, ChevronDown, ChevronUp, Search, AlertTriangle,
  CreditCard, Smartphone, Banknote, X,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import {
  fiscalYearService,
  type FiscalYearFromApi,
  type FiscalYearPerformance,
  type ShiftInYear,
  type EmployeePerformance,
  type YearEndReport,
} from "../../services/fiscalYearService";
import { orderService } from "../../services/orderService";

// ── Types ──────────────────────────────────────────────────────────────────────

type TabKey = "performance" | "shifts" | "employees" | "reports";

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "performance", label: "ملخص الأداء", icon: BarChart3 },
  { key: "shifts", label: "اليوميات والورديات", icon: Clock },
  { key: "employees", label: "أداء الموظفين", icon: User },
  { key: "reports", label: "التقارير الختامية", icon: FileText },
];

const STATUS_CONFIG = {
  active: { label: "نشطة", color: "var(--o2-success-text)", bg: "var(--o2-success-soft)", icon: Unlock },
  closed: { label: "مغلقة", color: "var(--o2-danger-text)", bg: "var(--o2-danger-soft)", icon: Lock },
};

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "كاش",
  card: "فيزا/شبكة",
  wallet: "محفظة",
  bank: "تحويل بنكي",
  account: "حساب مفتوح",
};

const MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return "0";
  return amount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
};

const extractError = (err: any): string => {
  return err?.response?.data?.message || err?.response?.data?.error || err?.message || "حدث خطأ غير متوقع";
};

// ── KPI Card ───────────────────────────────────────────────────────────────────

const KpiCard: React.FC<{
  label: string; value: string; icon: React.ElementType; color: string; bg: string; subtitle?: string;
}> = ({ label, value, icon: Icon, color, bg, subtitle }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    className={`${bg} border border-[var(--o2-border)] rounded-xl p-4`}>
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-9 h-9 rounded-xl ${bg} border border-[var(--o2-border)] flex items-center justify-center ${color}`}>
        <Icon size={16} />
      </div>
      <span className="text-[10px] text-[var(--o2-text-secondary)] font-bold">{label}</span>
    </div>
    <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
    {subtitle && <p className="text-[10px] text-[var(--o2-text-secondary)] mt-1">{subtitle}</p>}
  </motion.div>
);

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--o2-card)] border border-[var(--o2-border)] rounded-xl p-3 shadow-xl text-right">
      <p className="text-[10px] text-[var(--o2-text-secondary)] font-bold uppercase tracking-widest mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[11px] text-[var(--o2-text-secondary)] font-bold">{p.name}:</span>
          <span className="text-[11px] font-black text-[var(--o2-text-primary)]">
            ₪{Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

export const FiscalYearOverview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>("performance");
  const [fiscalYear, setFiscalYear] = useState<FiscalYearFromApi | null>(null);
  const [performance, setPerformance] = useState<FiscalYearPerformance | null>(null);
  const [shifts, setShifts] = useState<ShiftInYear[]>([]);
  const [employees, setEmployees] = useState<EmployeePerformance[]>([]);
  const [reports, setReports] = useState<YearEndReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedShiftId, setExpandedShiftId] = useState<number | null>(null);

  const [shiftMonthFilter, setShiftMonthFilter] = useState<string>("all");
  const [shiftCashierFilter, setShiftCashierFilter] = useState<string>("all");

  // ── Fetch Data ──
  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);
        const [fyData, perfData, shiftsData, empData, reportData] = await Promise.all([
          fiscalYearService.getById(Number(id)),
          fiscalYearService.getPerformance(Number(id)),
          fiscalYearService.getShiftsByYear(Number(id)),
          fiscalYearService.getEmployeesPerformance(Number(id)),
          fiscalYearService.getReports(Number(id)),
        ]);
        setFiscalYear(fyData);
        setPerformance(perfData);
        setShifts(shiftsData);
        setEmployees(empData);
        setReports(reportData);
      } catch (err: any) {
        setError(extractError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  // ── Filtered Shifts ──
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (shiftMonthFilter !== "all") {
        const shiftMonth = new Date(s.date).getMonth() + 1;
        if (shiftMonth !== Number(shiftMonthFilter)) return false;
      }
      if (shiftCashierFilter !== "all") {
        if (String(s.opener?.id) !== shiftCashierFilter) return false;
      }
      return true;
    });
  }, [shifts, shiftMonthFilter, shiftCashierFilter]);

  // ── Unique Cashiers ──
  const uniqueCashiers = useMemo(() => {
    const map = new Map<number, string>();
    shifts.forEach((s) => {
      if (s.opener) map.set(s.opener.id, s.opener.name);
    });
    return Array.from(map.entries());
  }, [shifts]);

  // ── Monthly Sales Data for Chart ──
  const monthlyChartData = useMemo(() => {
    if (!performance?.monthly_sales) return [];
    return performance.monthly_sales.map((ms) => ({
      name: ms.month_name,
      المبيعات: ms.total,
      الفواتير: ms.count,
    }));
  }, [performance]);

  // ── Payment Method Pie Data ──
  const paymentPieData = useMemo(() => {
    if (!performance?.payment_methods) return [];
    return performance.payment_methods.map((pm) => ({
      name: PAYMENT_METHOD_LABELS[pm.method] || pm.method,
      value: pm.total,
    }));
  }, [performance]);

  // ── Loading State ──
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--o2-primary)]" />
      </div>
    );
  }

  // ── Error State ──
  if (error || !fiscalYear) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-4 p-4 bg-[var(--o2-danger-soft)] border border-[var(--o2-danger)]/20 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[var(--o2-danger-text)]" />
          <span className="text-[var(--o2-danger-text)]">{error || "السنة المالية غير موجودة"}</span>
        </div>
        <button onClick={() => navigate("/admin/fiscal-years")}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--o2-primary)] text-white rounded-lg hover:opacity-90">
          <ArrowRight className="w-4 h-4" />
          العودة للسنوات المالية
        </button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[fiscalYear.status];
  const StatusIcon = statusCfg.icon;

  // ── Render ──
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/fiscal-years")}
            className="p-2 rounded-lg bg-[var(--o2-bg-secondary)] hover:bg-[var(--o2-border)] transition-colors">
            <ArrowRight className="w-5 h-5 text-[var(--o2-text-primary)]" />
          </button>
          <div className="p-2 rounded-lg bg-[var(--o2-primary-soft)]">
            <Calendar className="w-6 h-6 text-[var(--o2-primary-text)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--o2-text-primary)]">
              لوحة تدقيق: {fiscalYear.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusCfg.label}
              </span>
              <span className="text-sm text-[var(--o2-text-secondary)]">
                {formatDate(fiscalYear.start_date)} — {formatDate(fiscalYear.end_date)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--o2-bg-secondary)] border border-[var(--o2-border)] rounded-xl p-1.5 flex gap-1 overflow-x-auto shrink-0 mb-6">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-[var(--o2-primary)] text-white shadow-lg"
                : "text-[var(--o2-text-secondary)] hover:text-[var(--o2-text-primary)] hover:bg-[var(--o2-border)]"
            }`}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

          {/* ═══════════════════════════════════════════════════════════════════
               Tab 1: ملخص الأداء
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "performance" && performance && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="إجمالي المبيعات" value={`₪${formatCurrency(performance.total_sales)}`}
                  icon={DollarSign} color="text-[var(--o2-success-text)]" bg="bg-[var(--o2-success-soft)]" />
                <KpiCard label="عدد الفواتير" value={performance.total_orders.toLocaleString()}
                  icon={FileText} color="text-[var(--o2-primary-text)]" bg="bg-[var(--o2-primary-soft)]" />
                <KpiCard label="متوسط الفاتورة" value={`₪${formatCurrency(performance.average_order)}`}
                  icon={TrendingUp} color="text-[var(--o2-warning-text)]" bg="bg-[var(--o2-warning-soft)]" />
                <KpiCard label="عدد الورديات" value={performance.total_shifts.toLocaleString()}
                  icon={Clock} color="text-purple-500" bg="bg-purple-500/10" />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Sales Chart */}
                <div className="lg:col-span-2 bg-[var(--o2-card)] border border-[var(--o2-border)] rounded-xl p-5">
                  <h3 className="text-sm font-bold text-[var(--o2-text-primary)] mb-4">حركة المبيعات الشهرية</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyChartData}>
                      <defs>
                        <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--o2-primary)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--o2-primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--o2-border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--o2-text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--o2-text-secondary)" fontSize={10} tickLine={false} axisLine={false}
                        tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="المبيعات" stroke="var(--o2-primary)" strokeWidth={2.5}
                        fill="url(#gSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Payment Methods Pie */}
                <div className="bg-[var(--o2-card)] border border-[var(--o2-border)] rounded-xl p-5">
                  <h3 className="text-sm font-bold text-[var(--o2-text-primary)] mb-4">وسائل الدفع</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        paddingAngle={4} dataKey="value">
                        {paymentPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{
                        backgroundColor: 'var(--o2-card)',
                        border: '1px solid var(--o2-border)',
                        borderRadius: '12px'
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mt-2">
                    {paymentPieData.map((entry, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-[11px] text-[var(--o2-text-secondary)]">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
               Tab 2: اليوميات والورديات
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "shifts" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="bg-[var(--o2-card)] border border-[var(--o2-border)] rounded-xl p-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-[var(--o2-text-secondary)]" />
                  <span className="text-xs font-bold text-[var(--o2-text-secondary)]">فلترة:</span>
                </div>
                <select value={shiftMonthFilter} onChange={(e) => setShiftMonthFilter(e.target.value)}
                  className="px-3 py-1.5 bg-[var(--o2-bg)] border border-[var(--o2-border)] rounded-lg text-xs text-[var(--o2-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--o2-primary)]">
                  <option value="all">جميع الأشهر</option>
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
                <select value={shiftCashierFilter} onChange={(e) => setShiftCashierFilter(e.target.value)}
                  className="px-3 py-1.5 bg-[var(--o2-bg)] border border-[var(--o2-border)] rounded-lg text-xs text-[var(--o2-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--o2-primary)]">
                  <option value="all">جميع الكاشير</option>
                  {uniqueCashiers.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
                <span className="text-xs text-[var(--o2-text-secondary)] self-center">
                  {filteredShifts.length} يومية
                </span>
              </div>

              {/* Shifts Table */}
              <div className="bg-[var(--o2-card)] border border-[var(--o2-border)] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--o2-border)] bg-[var(--o2-bg-secondary)]">
                        <th className="px-4 py-3 text-right text-xs font-medium text-[var(--o2-text-secondary)]">رقم</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[var(--o2-text-secondary)]">التاريخ</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[var(--o2-text-secondary)]">الكاشير</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--o2-text-secondary)]">الحالة</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--o2-text-secondary)]">الفواتير</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--o2-text-secondary)]">إجمالي المبيعات</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--o2-text-secondary)]">الرصيد الافتتاحي</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--o2-text-secondary)]">تفاصيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShifts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-[var(--o2-text-secondary)]">
                            لا توجد وديريات في الفترة المحددة
                          </td>
                        </tr>
                      ) : (
                        filteredShifts.map((shift) => {
                          const shiftStatus = shift.status === "closed"
                            ? { label: "مغلقة", color: "var(--o2-success-text)", bg: "var(--o2-success-soft)", icon: Lock }
                            : { label: "مفتوحة", color: "var(--o2-warning-text)", bg: "var(--o2-warning-soft)", icon: Unlock };
                          const ShiftStatusIcon = shiftStatus.icon;
                          const isExpanded = expandedShiftId === shift.id;

                          return (
                            <tr key={shift.id}
                              className="border-b border-[var(--o2-border)] last:border-b-0 hover:bg-[var(--o2-bg-secondary)]/50 transition-colors">
                              <td className="px-4 py-3 text-sm text-[var(--o2-text-primary)]">#{shift.id}</td>
                              <td className="px-4 py-3 text-sm text-[var(--o2-text-primary)]">{formatDate(shift.date)}</td>
                              <td className="px-4 py-3 text-sm text-[var(--o2-text-primary)]">
                                <div className="flex items-center gap-2">
                                  <User className="w-3.5 h-3.5 text-[var(--o2-text-secondary)]" />
                                  {shift.opener?.name || "—"}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                                  style={{ backgroundColor: shiftStatus.bg, color: shiftStatus.color }}>
                                  <ShiftStatusIcon className="w-3.5 h-3.5" />
                                  {shiftStatus.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-[var(--o2-text-primary)]">
                                {shift.orders_count}
                              </td>
                              <td className="px-4 py-3 text-center text-sm font-bold text-[var(--o2-text-primary)]">
                                ₪{formatCurrency(shift.total_sales)}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-[var(--o2-text-primary)]">
                                ₪{formatCurrency(shift.opening_balance)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button onClick={() => setExpandedShiftId(isExpanded ? null : shift.id)}
                                  className="p-1.5 rounded-lg hover:bg-[var(--o2-border)] transition-colors">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Expanded Shift Details */}
                <AnimatePresence>
                  {expandedShiftId && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-[var(--o2-border)]">
                      <div className="p-4 bg-[var(--o2-bg-secondary)]/50">
                        <ShiftDetails shiftId={expandedShiftId} fiscalYearId={Number(id)} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
               Tab 3: أداء الموظفين
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "employees" && (
            <div className="space-y-6">
              {/* Chart */}
              <div className="bg-[var(--o2-card)] border border-[var(--o2-border)] rounded-xl p-5">
                <h3 className="text-sm font-bold text-[var(--o2-text-primary)] mb-4">مقارنة مبيعات الموظفين</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={employees.map((e) => ({
                    name: e.name,
                    المبيعات: e.total_sales,
                    الفواتير: e.total_orders,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--o2-border)" />
                    <XAxis dataKey="name" stroke="var(--o2-text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--o2-text-secondary)" fontSize={10} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="المبيعات" fill="var(--o2-primary)" radius={[6, 6, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Employees Table */}
              <div className="bg-[var(--o2-card)] border border-[var(--o2-border)] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--o2-border)] bg-[var(--o2-bg-secondary)]">
                        <th className="px-4 py-3 text-right text-xs font-medium text-[var(--o2-text-secondary)]">الموظف</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[var(--o2-text-secondary)]">الدور</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--o2-text-secondary)]">فواتير مفتوحة</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--o2-text-secondary)]">فواتير مطبوعة</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--o2-text-secondary)]">فواتير مغلقة</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--o2-text-secondary)]">إجمالي المبيعات</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--o2-text-secondary)]">متوسط الفاتورة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-[var(--o2-text-secondary)]">
                            لا توجد بيانات موظفين
                          </td>
                        </tr>
                      ) : (
                        employees.map((emp) => (
                          <tr key={emp.id}
                            className="border-b border-[var(--o2-border)] last:border-b-0 hover:bg-[var(--o2-bg-secondary)]/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-[var(--o2-primary-soft)] flex items-center justify-center">
                                  <User className="w-4 h-4 text-[var(--o2-primary-text)]" />
                                </div>
                                <span className="text-sm font-bold text-[var(--o2-text-primary)]">{emp.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--o2-text-secondary)]">{emp.role}</td>
                            <td className="px-4 py-3 text-center text-sm text-[var(--o2-text-primary)]">{emp.orders_opened}</td>
                            <td className="px-4 py-3 text-center text-sm text-[var(--o2-text-primary)]">{emp.orders_printed}</td>
                            <td className="px-4 py-3 text-center text-sm text-[var(--o2-text-primary)]">{emp.orders_closed}</td>
                            <td className="px-4 py-3 text-center text-sm font-bold text-[var(--o2-success-text)]">
                              ₪{formatCurrency(emp.total_sales)}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-[var(--o2-text-primary)]">
                              ₪{formatCurrency(emp.average_order)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
               Tab 4: التقارير الختامية
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "reports" && reports && (
            <div className="space-y-6">
              {/* Export Buttons */}
              <div className="flex items-center gap-3">
                <button onClick={() => handlePrintReport(fiscalYear, reports)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--o2-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-bold">
                  <Printer className="w-4 h-4" />
                  تصدير PDF
                </button>
                <button onClick={() => handleExportCSV(fiscalYear, reports)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--o2-success-text)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-bold">
                  <Download className="w-4 h-4" />
                  تصدير Excel
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="إجمالي المبيعات" value={`₪${formatCurrency(reports.total_sales)}`}
                  icon={DollarSign} color="text-[var(--o2-success-text)]" bg="bg-[var(--o2-success-soft)]" />
                <KpiCard label="عدد الفواتير" value={reports.total_orders.toLocaleString()}
                  icon={FileText} color="text-[var(--o2-primary-text)]" bg="bg-[var(--o2-primary-soft)]" />
                <KpiCard label="إجمالي الخصومات" value={`₪${formatCurrency(reports.total_discounts)}`}
                  icon={TrendingUp} color="text-[var(--o2-warning-text)]" bg="bg-[var(--o2-warning-soft)]" />
                <KpiCard label="الإلغاءات" value={reports.cancelled_orders_count.toLocaleString()}
                  icon={AlertTriangle} color="text-[var(--o2-danger-text)]" bg="bg-[var(--o2-danger-soft)]"
                  subtitle={`إجمالي: ₪${formatCurrency(reports.total_cancellations)}`} />
              </div>

              {/* Payment Method Summary */}
              <div className="bg-[var(--o2-card)] border border-[var(--o2-border)] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--o2-border)]">
                  <h3 className="text-sm font-bold text-[var(--o2-text-primary)]">ملخص وسائل الدفع</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--o2-border)] bg-[var(--o2-bg-secondary)]">
                        <th className="px-4 py-3 text-right text-xs font-medium text-[var(--o2-text-secondary)]">طريقة الدفع</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--o2-text-secondary)]">العدد</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--o2-text-secondary)]">الإجمالي</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--o2-text-secondary)]">النسبة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.payment_method_summary.map((pm, i) => (
                        <tr key={i}
                          className="border-b border-[var(--o2-border)] last:border-b-0 hover:bg-[var(--o2-bg-secondary)]/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-[var(--o2-text-primary)]">
                            {PAYMENT_METHOD_LABELS[pm.method] || pm.method}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-[var(--o2-text-primary)]">{pm.count}</td>
                          <td className="px-4 py-3 text-center text-sm font-bold text-[var(--o2-success-text)]">
                            ₪{formatCurrency(pm.total)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-[var(--o2-text-primary)]">
                            {pm.percentage.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ── Shift Details Sub-Component ────────────────────────────────────────────────

const ShiftDetails: React.FC<{ shiftId: number; fiscalYearId: number }> = ({ shiftId, fiscalYearId }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        // جلب كل الطلبات وفلترتها حسب shift_id
        const allOrders = await orderService.getAll();
        const shiftOrders = allOrders.filter((o: any) => o.shift_id === shiftId);
        setOrders(shiftOrders);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [shiftId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--o2-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-[var(--o2-text-secondary)] uppercase tracking-wider">
        تفاصيل اليومية #{shiftId}
      </h4>
      {orders.length === 0 ? (
        <p className="text-xs text-[var(--o2-text-secondary)]">لا توجد فواتير مرتبطة بهذه اليومية</p>
      ) : (
        <div className="bg-[var(--o2-card)] border border-[var(--o2-border)] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--o2-border)] bg-[var(--o2-bg-secondary)]">
                <th className="px-3 py-2 text-right text-[10px] font-medium text-[var(--o2-text-secondary)]">رقم الفاتورة</th>
                <th className="px-3 py-2 text-right text-[10px] font-medium text-[var(--o2-text-secondary)]">الحالة</th>
                <th className="px-3 py-2 text-right text-[10px] font-medium text-[var(--o2-text-secondary)]">طريقة الدفع</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-[var(--o2-text-secondary)]">المبلغ</th>
                <th className="px-3 py-2 text-right text-[10px] font-medium text-[var(--o2-text-secondary)]">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-[var(--o2-border)] last:border-b-0">
                  <td className="px-3 py-2 text-xs text-[var(--o2-text-primary)]">#{order.order_number || order.id}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      order.status === "paid" ? "bg-[var(--o2-success-soft)] text-[var(--o2-success-text)]"
                        : order.status === "cancelled" ? "bg-[var(--o2-danger-soft)] text-[var(--o2-danger-text)]"
                        : "bg-[var(--o2-warning-soft)] text-[var(--o2-warning-text)]"
                    }`}>
                      {order.status === "paid" ? "مدفوعة" : order.status === "cancelled" ? "ملغاة" : order.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--o2-text-secondary)]">
                    {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || "—"}
                  </td>
                  <td className="px-3 py-2 text-center text-xs font-bold text-[var(--o2-text-primary)]">
                    ₪{formatCurrency(order.total)}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--o2-text-secondary)]">{formatDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Export Helpers ──────────────────────────────────────────────────────────────

function handlePrintReport(fy: FiscalYearFromApi, reports: YearEndReport) {
  const content = `
    <div dir="rtl" style="font-family: 'Cairo', sans-serif; padding: 30px; max-width: 800px; margin: 0 auto;">
      <h1 style="text-align: center; color: #1e293b; margin-bottom: 10px;">تقرير السنة المالية: ${fy.name}</h1>
      <p style="text-align: center; color: #64748b; margin-bottom: 30px;">
        من ${fy.start_date} إلى ${fy.end_date} | الحالة: ${fy.status === "active" ? "نشطة" : "مغلقة"}
      </p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
          <h3 style="color: #166534; margin: 0;">إجمالي المبيعات</h3>
          <p style="color: #166534; font-size: 24px; font-weight: bold; margin: 5px 0 0;">₪${reports.total_sales.toLocaleString()}</p>
        </div>
        <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border: 1px solid #bfdbfe;">
          <h3 style="color: #1e40af; margin: 0;">عدد الفواتير</h3>
          <p style="color: #1e40af; font-size: 24px; font-weight: bold; margin: 5px 0 0;">${reports.total_orders}</p>
        </div>
        <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border: 1px solid #fde68a;">
          <h3 style="color: #92400e; margin: 0;">الخصومات</h3>
          <p style="color: #92400e; font-size: 24px; font-weight: bold; margin: 5px 0 0;">₪${reports.total_discounts.toLocaleString()}</p>
        </div>
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca;">
          <h3 style="color: #991b1b; margin: 0;">الإلغاءات</h3>
          <p style="color: #991b1b; font-size: 24px; font-weight: bold; margin: 5px 0 0;">${reports.cancelled_orders_count}</p>
        </div>
      </div>
      <h2 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">وسائل الدفع</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 10px; text-align: right;">طريقة الدفع</th>
            <th style="padding: 10px; text-align: center;">العدد</th>
            <th style="padding: 10px; text-align: center;">الإجمالي</th>
            <th style="padding: 10px; text-align: center;">النسبة</th>
          </tr>
        </thead>
        <tbody>
          ${reports.payment_method_summary.map(pm => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold;">${pm.label}</td>
              <td style="padding: 10px; text-align: center;">${pm.count}</td>
              <td style="padding: 10px; text-align: center; font-weight: bold;">₪${pm.total.toLocaleString()}</td>
              <td style="padding: 10px; text-align: center;">${pm.percentage.toFixed(1)}%</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <p style="text-align: center; color: #94a3b8; margin-top: 30px; font-size: 12px;">
        تم طباعة التقرير في ${new Date().toLocaleDateString("ar-SA")}
      </p>
    </div>
  `;
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(content);
    win.document.close();
    win.focus();
    win.print();
  }
}

function handleExportCSV(fy: FiscalYearFromApi, reports: YearEndReport) {
  const headers = ["طريقة الدفع", "العدد", "الإجمالي", "النسبة"];
  const rows = reports.payment_method_summary.map((pm) => [
    pm.label, String(pm.count), String(pm.total), `${pm.percentage.toFixed(1)}%`,
  ]);
  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fiscal-year-${fy.name}-report.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default FiscalYearOverview;
