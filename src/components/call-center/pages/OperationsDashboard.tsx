import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import {
  ShoppingCart, Wallet, PhoneCall, PhoneMissed, CheckCircle2, Coffee, Circle,
  AlertTriangle, Phone, Eye, TrendingUp, TrendingDown, Building2, Flame, Clock,
} from "lucide-react";
import { colors, typography, radius, shadows, transitions } from "../design/tokens";
import { Card, Badge, Button, EmptyState, Skeleton } from "../design/components";
import { callCenterService, type OperationsSnapshot } from "../services/callCenterService";
import { getBranchId } from "../../../auth/authStorage";
import { useApp } from "../../../../store";

// ============================================================================
// OPERATIONS DASHBOARD — لوحة العمليات (الصفحة الافتراضية عند دخول الكول سنتر)
// كل الأرقام هنا محسوبة من orders/call_tickets الحقيقية عبر
// GET /call-center/reports/operations-snapshot — لا بيانات وهمية.
// ============================================================================

type AgentStatus = "available" | "break";
const SHIFT_KEY = "cc_shift_started_at";

const ARABIC_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const formatArabicDate = (d: Date) =>
  `${ARABIC_DAYS[d.getDay()]}، ${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;

const formatClock = (d: Date) =>
  d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: true });

const formatShiftDuration = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const formatCallDuration = (seconds: number | null) => {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const money = (n: number) => `${n.toFixed(2)} ₪`;

const pctChange = (today: number, yesterday: number): number | null => {
  if (yesterday === 0) return today > 0 ? 100 : null;
  return Math.round(((today - yesterday) / yesterday) * 100);
};

export const OperationsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const branchId = getBranchId();

  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("available");
  const [shiftStartedAt] = useState<number>(() => {
    const stored = localStorage.getItem(SHIFT_KEY);
    if (stored) return Number(stored);
    const started = Date.now();
    localStorage.setItem(SHIFT_KEY, String(started));
    return started;
  });

  // Live clock — يحدّث كل ثانية (للساعة وعدّاد الدوام)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadSnapshot = async () => {
    try {
      const { data } = await callCenterService.getOperationsSnapshot(branchId ?? undefined);
      setSnapshot(data);
      setError(null);
    } catch {
      setError("تعذّر تحميل بيانات لوحة العمليات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshot();
    // تحديث شبه حي كل دقيقة — لوحة عمليات وليست شاشة مكالمة حية، لا داعٍ لتردد أعلى
    const id = setInterval(loadSnapshot, 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const hourlyChartData = useMemo(
    () => (snapshot?.hourly ?? []).map(h => ({ label: `${String(h.hour).padStart(2, "0")}:00`, الطلبات: h.orders, المكالمات: h.calls })),
    [snapshot],
  );

  const statusDonutData = useMemo(() => {
    const b = snapshot?.order_status_breakdown;
    if (!b) return [];
    return [
      { name: "مكتمل", value: b.completed, color: colors.semantic.success },
      { name: "قيد التحضير", value: b.preparing, color: colors.semantic.info },
      { name: "بانتظار الفرع", value: b.pending_branch, color: colors.semantic.warning },
      { name: "ملغي", value: b.cancelled, color: colors.semantic.error },
    ].filter(x => x.value > 0);
  }, [snapshot]);

  const ordersTotal = snapshot?.today.orders_count ?? 0;
  const ordersChange = snapshot ? pctChange(snapshot.today.orders_count, snapshot.yesterday.orders_count) : null;
  const salesChange = snapshot ? pctChange(snapshot.today.sales_total, snapshot.yesterday.sales_total) : null;

  const missedCallsToday = snapshot?.today.calls_missed ?? 0;
  const noBranchAssigned = !branchId;

  const statusMeta: Record<AgentStatus, { label: string; color: string; icon: React.ReactNode }> = {
    available: { label: "متاح", color: colors.semantic.success, icon: <Circle size={9} fill={colors.semantic.success} stroke="none" /> },
    break: { label: "استراحة", color: colors.semantic.warning, icon: <Circle size={9} fill={colors.semantic.warning} stroke="none" /> },
  };

  return (
    <div dir="rtl" style={{ minHeight: "100%", fontFamily: typography.fontFamily.sans }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: typography.size["3xl"], fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
            لوحة العمليات
          </h1>
          <p style={{ fontSize: typography.size.sm, color: colors.neutral[500], marginTop: 4 }}>
            نظرة عامة على عمليات اليوم — {formatArabicDate(now)} · {formatClock(now)}
          </p>
        </div>

        {/* ── Employee Status Card ── */}
        <Card padding="12px 16px" style={{ boxShadow: shadows.xs, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {statusMeta[agentStatus].icon}
              <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                {currentUser?.name || "موظف الكول سنتر"}
              </span>
              <Badge variant={agentStatus === "available" ? "success" : "warning"}>{statusMeta[agentStatus].label}</Badge>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, color: colors.neutral[500] }}>
              <Clock size={11} />
              <span style={{ fontSize: "11px", fontFamily: typography.fontFamily.mono }}>{formatShiftDuration(now.getTime() - shiftStartedAt)}</span>
              <span style={{ fontSize: "11px" }}>منذ بداية الجلسة على هذا الجهاز</span>
            </div>
          </div>
          <Button
            size="sm"
            variant={agentStatus === "break" ? "primary" : "secondary"}
            icon={<Coffee size={13} />}
            onClick={() => setAgentStatus(prev => (prev === "break" ? "available" : "break"))}
          >
            {agentStatus === "break" ? "إنهاء الاستراحة" : "بدء استراحة"}
          </Button>
        </Card>
      </div>

      {/* ── يحتاج انتباهك ── */}
      {(noBranchAssigned || missedCallsToday > 0) && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          {noBranchAssigned && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: radius.lg, background: colors.semantic.errorBg, border: `1px solid ${colors.semantic.errorBorder}` }}>
              <AlertTriangle size={16} color={colors.semantic.error} />
              <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: "#991b1b" }}>
                لا يوجد فرع محدد لحسابك — لن تتمكن من إتمام أي طلب حتى يُضبط الفرع من إدارة المستخدمين
              </span>
            </div>
          )}
          {missedCallsToday > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: radius.lg, background: colors.semantic.warningBg, border: `1px solid ${colors.semantic.warningBorder}` }}>
              <PhoneMissed size={16} color={colors.semantic.warning} />
              <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: "#92400e" }}>
                {missedCallsToday} مكالمة فائتة اليوم
              </span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: radius.lg, background: colors.semantic.errorBg, border: `1px solid ${colors.semantic.errorBorder}`, color: "#991b1b", fontSize: typography.size.sm }}>
          {error}
        </div>
      )}

      {/* ── KPI Row ── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} height={92} borderRadius={radius.xl} />)}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
          <KpiCard title="الطلبات اليوم" value={ordersTotal} icon={<ShoppingCart size={18} />} color={colors.brand[500]} change={ordersChange} />
          <KpiCard title="المبيعات" value={money(snapshot?.today.sales_total ?? 0)} icon={<Wallet size={18} />} color={colors.semantic.success} change={salesChange} />
          <KpiCard title="إجمالي المكالمات" value={snapshot?.today.calls_total ?? 0} icon={<PhoneCall size={18} />} color={colors.semantic.info} />
          <KpiCard title="مكالمات مكتملة" value={snapshot?.today.calls_completed ?? 0} icon={<CheckCircle2 size={18} />} color={colors.semantic.success} />
          <KpiCard title="مكالمات فائتة" value={snapshot?.today.calls_missed ?? 0} icon={<PhoneMissed size={18} />} color={colors.semantic.error} />
          <KpiCard title="متوسط قيمة الطلب" value={money(snapshot?.today.avg_order_value ?? 0)} icon={<TrendingUp size={18} />} color={colors.semantic.warning} />
        </div>
      )}

      {/* ── Hourly Chart ── */}
      {/* minHeight صريح على الحاوية الأم — بدونه Recharts's ResponsiveContainer قد يقيس 0×0
          عند أول تركيب (mount) قبل استقرار تخطيط الصفحة، وينتج تحذير Console متكرر */}
      <Card padding="20px" style={{ boxShadow: shadows.xs, marginBottom: 20, minHeight: 340 }}>
        <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900], marginBottom: 16 }}>
          الطلبات والمكالمات خلال اليوم
        </h2>
        {loading ? (
          <Skeleton height={260} borderRadius={radius.lg} />
        ) : hourlyChartData.length === 0 ? (
          <EmptyState icon={<TrendingUp size={22} />} title="لا يوجد نشاط بعد اليوم" description="سيظهر توزيع الطلبات والمكالمات على الساعات هنا فور تسجيل أول طلب أو مكالمة" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={hourlyChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.brand[500]} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={colors.brand[500]} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.semantic.info} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={colors.semantic.info} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.neutral[100]} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: colors.neutral[500] }} axisLine={{ stroke: colors.neutral[200] }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: colors.neutral[500] }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: radius.lg, border: `1px solid ${colors.border.subtle}`, fontSize: 12, direction: "rtl" }} />
              <Area type="monotone" dataKey="الطلبات" stroke={colors.brand[500]} fill="url(#ordersGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="المكالمات" stroke={colors.semantic.info} fill="url(#callsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── حالة الطلبات | أداء المكالمات ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 20 }}>
        <Card padding="20px" style={{ boxShadow: shadows.xs, minHeight: 260 }}>
          <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900], marginBottom: 16 }}>
            حالة الطلبات
          </h2>
          {loading ? (
            <Skeleton height={200} borderRadius={radius.lg} />
          ) : statusDonutData.length === 0 ? (
            <EmptyState icon={<ShoppingCart size={22} />} title="لا توجد طلبات بعد اليوم" />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ position: "relative", width: 160, height: 160, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDonutData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={2} strokeWidth={0}>
                      {statusDonutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: radius.lg, border: `1px solid ${colors.border.subtle}`, fontSize: 12, direction: "rtl" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: colors.neutral[900] }}>{ordersTotal}</span>
                  <span style={{ fontSize: 10, color: colors.neutral[500] }}>إجمالي</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 140 }}>
                {statusDonutData.map(entry => (
                  <div key={entry.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: entry.color, flexShrink: 0 }} />
                      <span style={{ fontSize: typography.size.sm, color: colors.neutral[700] }}>{entry.name}</span>
                    </div>
                    <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card padding="20px" style={{ boxShadow: shadows.xs }}>
          <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900], marginBottom: 16 }}>
            أداء المكالمات
          </h2>
          {loading ? (
            <Skeleton height={200} borderRadius={radius.lg} />
          ) : !snapshot || snapshot.today.calls_total === 0 ? (
            <EmptyState icon={<PhoneCall size={22} />} title="لا توجد مكالمات بعد اليوم" />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <MiniStat label="مستلمة" value={snapshot.today.calls_total} icon={<Phone size={15} />} color={colors.semantic.info} />
              <MiniStat label="فائتة" value={snapshot.today.calls_missed} icon={<PhoneMissed size={15} />} color={colors.semantic.error} />
              <MiniStat label="مكتملة" value={snapshot.today.calls_completed} icon={<CheckCircle2 size={15} />} color={colors.semantic.success} />
              <MiniStat label="نسبة التحويل لطلب" value={`${snapshot.today.conversion_rate}%`} icon={<TrendingUp size={15} />} color={colors.brand[500]} />
            </div>
          )}
        </Card>
      </div>

      {/* ── آخر مكالمة | أدائي اليوم ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 20 }}>
        <Card padding="20px" style={{ boxShadow: shadows.xs }}>
          <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900], marginBottom: 16 }}>
            آخر مكالمة
          </h2>
          {loading ? (
            <Skeleton height={90} borderRadius={radius.lg} />
          ) : !snapshot?.last_call ? (
            <EmptyState icon={<Phone size={22} />} title="لا توجد مكالمات بعد اليوم" />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                  {snapshot.last_call.customer_name || snapshot.last_call.phone || "غير معروف"}
                </p>
                <p style={{ fontSize: typography.size.xs, color: colors.neutral[500], marginTop: 2 }}>
                  {formatCallDuration(snapshot.last_call.duration_seconds)} · {snapshot.last_call.started_at ? new Date(snapshot.last_call.started_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "—"}
                </p>
                <div style={{ marginTop: 8 }}>
                  {snapshot.last_call.linked_order_id ? (
                    <Badge variant="success">تم إنشاء طلب</Badge>
                  ) : snapshot.last_call.status === "missed" ? (
                    <Badge variant="error">لم يُرد</Badge>
                  ) : (
                    <Badge variant="default">استفسار فقط</Badge>
                  )}
                </div>
              </div>
              {snapshot.last_call.linked_order_id && (
                <Button variant="secondary" size="sm" icon={<Eye size={13} />} onClick={() => navigate("/call-center/active-orders")}>
                  عرض التفاصيل
                </Button>
              )}
            </div>
          )}
        </Card>

        <Card padding="20px" style={{ boxShadow: shadows.xs }}>
          <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900], marginBottom: 16 }}>
            أدائي اليوم
          </h2>
          {loading ? (
            <Skeleton height={90} borderRadius={radius.lg} />
          ) : !snapshot?.my_performance ? (
            <EmptyState icon={<TrendingUp size={22} />} title="لا يوجد نشاط لك بعد اليوم" />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <MiniStat label="طلباتي" value={snapshot.my_performance.orders} icon={<ShoppingCart size={15} />} color={colors.brand[500]} />
              <MiniStat label="مبيعاتي" value={money(snapshot.my_performance.sales)} icon={<Wallet size={15} />} color={colors.semantic.success} />
              <MiniStat label="مكالماتي" value={snapshot.my_performance.calls_total} icon={<PhoneCall size={15} />} color={colors.semantic.info} />
              <MiniStat label="مكالماتي المكتملة" value={snapshot.my_performance.calls_completed} icon={<CheckCircle2 size={15} />} color={colors.semantic.success} />
            </div>
          )}
        </Card>
      </div>

      {/* ── أفضل الأصناف | توزيع الفروع ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <Card padding="20px" style={{ boxShadow: shadows.xs }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900], marginBottom: 16 }}>
            <Flame size={16} style={{ color: colors.brand[500] }} />
            أفضل الأصناف مبيعًا اليوم
          </h2>
          {loading ? (
            <Skeleton height={140} borderRadius={radius.lg} />
          ) : !snapshot || snapshot.top_items.length === 0 ? (
            <EmptyState icon={<Flame size={22} />} title="لا توجد مبيعات أصناف بعد اليوم" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {snapshot.top_items.map((item, i) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 22, height: 22, borderRadius: radius.md, background: colors.neutral[100], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: colors.neutral[600], flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: typography.size.sm, color: colors.neutral[800] }}>{item.name}</span>
                  <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>× {item.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {(snapshot?.branch_distribution?.length ?? 0) > 0 && (
          <Card padding="20px" style={{ boxShadow: shadows.xs }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900], marginBottom: 16 }}>
              <Building2 size={16} style={{ color: colors.brand[500] }} />
              توزيع الطلبات حسب الفرع
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {snapshot!.branch_distribution.map(b => {
                const pct = ordersTotal > 0 ? Math.round((b.orders_count / ordersTotal) * 100) : 0;
                return (
                  <div key={b.branch_id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: typography.size.sm, color: colors.neutral[700] }}>{b.branch_name}</span>
                      <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>{b.orders_count}</span>
                    </div>
                    <div style={{ width: "100%", height: 6, background: colors.neutral[100], borderRadius: 9999, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: colors.brand[500], borderRadius: 9999, transition: `width ${transitions.normal}` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; change?: number | null }> = ({ title, value, icon, color, change }) => (
  <Card padding="16px" style={{ boxShadow: shadows.xs }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: "11px", fontWeight: 500, color: colors.neutral[500], marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</p>
        <span style={{ fontSize: "20px", fontWeight: 700, color: colors.neutral[900], fontFamily: typography.fontFamily.mono }}>{value}</span>
        {change != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
            {change >= 0 ? <TrendingUp size={12} color={colors.semantic.success} /> : <TrendingDown size={12} color={colors.semantic.error} />}
            <span style={{ fontSize: "11px", fontWeight: 600, color: change >= 0 ? colors.semantic.success : colors.semantic.error }}>
              {Math.abs(change)}% عن أمس
            </span>
          </div>
        )}
      </div>
      <div style={{ width: 34, height: 34, borderRadius: radius.lg, background: `color-mix(in srgb, ${color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
        {icon}
      </div>
    </div>
  </Card>
);

const MiniStat: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div style={{ padding: "12px", borderRadius: radius.lg, background: colors.neutral[50], border: `1px solid ${colors.border.subtle}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, color, marginBottom: 6 }}>
      {icon}
      <span style={{ fontSize: "11px", fontWeight: 600, color: colors.neutral[500] }}>{label}</span>
    </div>
    <span style={{ fontSize: "17px", fontWeight: 700, color: colors.neutral[900] }}>{value}</span>
  </div>
);

export default OperationsDashboard;
