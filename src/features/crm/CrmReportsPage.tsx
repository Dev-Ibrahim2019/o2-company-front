import {
  AlertTriangle, ArrowLeft, Ban, CheckCircle2, Clock3, Lightbulb, ShoppingBag, Smile, TrendingUp, Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CrmKpiCard, CrmPageHeader } from "./customers-ui";
import "./customers-ui/crmx.css";
import { money, num } from "./format";
import type { CrmReportOverview, CrmReportPeriod } from "./types";

const PERIODS: { key: CrmReportPeriod; label: string }[] = [
  { key: "today", label: "اليوم" },
  { key: "week", label: "أسبوع" },
  { key: "month", label: "شهر" },
  { key: "quarter", label: "ربع" },
  { key: "year", label: "سنة" },
];

const ORDER_TYPE_LABELS: Record<string, string> = { dine_in: "داخل المطعم", takeaway: "استلام ذاتي", delivery: "توصيل" };
const ORDER_TYPE_COLORS = ["var(--crmx-primary)", "var(--crmx-info)", "var(--crmx-accent)"];

const DECISION_TONE: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: "bg-[var(--crmx-danger-soft)]", text: "text-[var(--crmx-danger-text)]", label: "عاجل" },
  attention: { bg: "bg-[var(--crmx-warning-soft)]", text: "text-[var(--crmx-warning-text)]", label: "يستحق الاهتمام" },
  opportunity: { bg: "bg-[var(--crmx-success-soft)]", text: "text-[var(--crmx-success-text)]", label: "فرصة نمو" },
};

function ChartCard({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold text-[var(--crmx-text)]">{title}</h3>
        {aside}
      </div>
      {children}
    </div>
  );
}

/** Highlights the rule-based anomaly days (20%+ below their own trailing average) in red, everything else in the brand color. */
function AnomalyDot(props: { cx?: number; cy?: number; payload?: { is_anomaly: boolean } }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  if (!payload?.is_anomaly) return <circle cx={cx} cy={cy} r={2.5} fill="var(--crmx-primary)" />;
  return <circle cx={cx} cy={cy} r={5} fill="var(--crmx-danger)" stroke="white" strokeWidth={1.5} />;
}

export function CrmReportsPage() {
  const [period, setPeriod] = useState<CrmReportPeriod>("month");
  const [data, setData] = useState<CrmReportOverview | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  const load = useCallback(async (p: CrmReportPeriod) => {
    setState("loading");
    try {
      setData(await crmApi.reportsOverview(p));
      setState("ready");
    } catch (e) {
      setError(getCrmError(e).message);
      setState("error");
    }
  }, []);

  useEffect(() => { load(period); }, [load, period]);

  if (state === "loading" && !data) return <div className="crmx-root"><CrmState kind="loading" title="جارٍ تحميل التقارير..." /></div>;
  if (state === "error" || !data) return <div className="crmx-root"><CrmState kind="error" title="تعذر تحميل التقارير" detail={error} retry={() => load(period)} /></div>;

  const { kpis } = data;
  const dailyChart = data.daily_revenue.map((d) => ({ ...d, label: d.date.slice(5) }));

  return (
    <div className="crmx-root space-y-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CrmPageHeader
          title="التقارير والتحليلات"
          description="لوحة تحكم شاملة لرصد الأداء ودعم اتخاذ القرار — بيانات حقيقية محسوبة من الطلبات والتقييمات والشكاوى، لا أرقام افتراضية."
          breadcrumb="CRM / التقارير"
        />
        <div className="flex rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition-colors ${
                period === p.key ? "bg-[var(--crmx-primary)] text-white" : "text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {data.alerts.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-[var(--crmx-danger)]/25 bg-[var(--crmx-danger-soft)] p-4">
          <p className="flex items-center gap-2 text-[13px] font-extrabold text-[var(--crmx-danger-text)]">
            <AlertTriangle className="h-4 w-4" /> تنبيهات تستوجب المتابعة ({data.alerts.length})
          </p>
          <ul className="space-y-1">
            {data.alerts.map((a, i) => (
              <li key={i} className={`text-[12.5px] font-semibold ${a.level === "urgent" ? "text-[var(--crmx-danger-text)]" : "text-[var(--crmx-warning-text)]"}`}>
                • {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <CrmKpiCard
          icon={<Wallet className="h-5 w-5" />} label="إجمالي الإيرادات" value={money(kpis.revenue.value)}
          trend={kpis.revenue.trend_pct} tone="success"
          hint={kpis.revenue.target ? `الهدف: ${money(kpis.revenue.target)}` : undefined}
        />
        <CrmKpiCard icon={<TrendingUp className="h-5 w-5" />} label="متوسط قيمة الطلب" value={money(kpis.aov.value)} trend={kpis.aov.trend_pct} tone="info" />
        <CrmKpiCard
          icon={<ShoppingBag className="h-5 w-5" />} label="الطلبات المكتملة" value={num(kpis.orders.completed)}
          trend={kpis.orders.trend_pct} tone="navy"
          hint={`من ${num(kpis.orders.total)} · إنجاز ${kpis.orders.completion_rate}%`}
        />
        <CrmKpiCard
          icon={<Smile className="h-5 w-5" />} label="رضا العملاء" value={kpis.satisfaction.pct != null ? `${kpis.satisfaction.pct}%` : "—"}
          tone="accent" hint={kpis.satisfaction.rated_count > 0 ? `من ${num(kpis.satisfaction.rated_count)} تقييم` : "لا تقييمات بعد"}
        />
        <CrmKpiCard
          icon={<Ban className="h-5 w-5" />} label="معدل الإلغاء" value={`${kpis.cancellation_rate.pct}%`}
          trend={kpis.cancellation_rate.trend_pct} trendInverse tone="danger"
          hint={kpis.cancellation_rate.target != null ? `الحد المسموح: ${kpis.cancellation_rate.target}%` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="اتجاه الإيرادات اليومية" aside={<span className="text-[11.5px] text-[var(--crmx-text-muted)]">النقاط الحمراء = انخفاض حاد عن المتوسط</span>}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={dailyChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="crmReportRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--crmx-primary)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--crmx-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--crmx-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--crmx-text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--crmx-text-muted)" }} axisLine={false} tickLine={false} width={50} />
                <Tooltip
                  formatter={(v) => money(Number(v))}
                  labelFormatter={(l) => `يوم ${l}`}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--crmx-primary)" strokeWidth={2.5} fill="url(#crmReportRevenueFill)" dot={<AnomalyDot />} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="توزيع الطلبات حسب النوع">
          {data.order_type_distribution.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-[13px] text-[var(--crmx-text-muted)]">لا توجد طلبات مكتملة بعد</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.order_type_distribution} dataKey="orders_count" nameKey="order_type" innerRadius={45} outerRadius={70} paddingAngle={2}>
                    {data.order_type_distribution.map((_, i) => <Cell key={i} fill={ORDER_TYPE_COLORS[i % ORDER_TYPE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, _n, p) => [`${num(Number(v))} طلب · ${money(Number(p?.payload?.revenue ?? 0))}`, ORDER_TYPE_LABELS[String(p?.payload?.order_type)] || String(p?.payload?.order_type ?? "")]} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1.5">
                {data.order_type_distribution.map((t, i) => (
                  <li key={t.order_type} className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-1.5 text-[var(--crmx-text-secondary)]">
                      <span className="h-2 w-2 rounded-full" style={{ background: ORDER_TYPE_COLORS[i % ORDER_TYPE_COLORS.length] }} />
                      {ORDER_TYPE_LABELS[t.order_type] || t.order_type}
                    </span>
                    <span className="font-bold text-[var(--crmx-text)]">{num(t.orders_count)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </ChartCard>
      </div>

      <ChartCard title="أوقات الذروة (طلبات لكل ساعة)" aside={<Clock3 className="h-4 w-4 text-[var(--crmx-text-muted)]" />}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data.peak_hours} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="hour" tickFormatter={(h) => `${h}`} tick={{ fontSize: 10, fill: "var(--crmx-text-muted)" }} axisLine={false} tickLine={false} interval={1} />
            <YAxis hide allowDecimals={false} />
            <Tooltip formatter={(v) => [`${num(Number(v))} طلب`, ""]} labelFormatter={(h) => `الساعة ${h}:00`} />
            <Bar dataKey="orders" radius={[4, 4, 0, 0]} fill="var(--crmx-primary)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
        <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-[var(--crmx-text)]">
          <Lightbulb className="h-4.5 w-4.5 text-[var(--crmx-warning-text)]" /> دعم القرار — مُرتّبة حسب الأولوية
        </h3>
        <ul className="space-y-2">
          {data.decision_support.map((d, i) => {
            const tone = DECISION_TONE[d.priority];
            return (
              <li key={i} className={`flex items-start gap-3 rounded-xl p-3 ${tone.bg}`}>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-black ${tone.text}`}>{tone.label}</span>
                <p className={`text-[13px] font-semibold leading-relaxed ${tone.text}`}>{d.message}</p>
              </li>
            );
          })}
        </ul>
      </div>

      <Link
        to="/admin/crm/reports/revenue"
        className="flex items-center justify-between rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4 transition-colors hover:border-[var(--crmx-primary)]"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[13.5px] font-bold text-[var(--crmx-text)]">تقرير الإيرادات المفصّل</p>
            <p className="text-[12px] text-[var(--crmx-text-muted)]">تحليل أسبوعي، أفضل/أسوأ يوم، توزيع الأقسام، وخريطة أوقات الذروة</p>
          </div>
        </div>
        <ArrowLeft className="h-4.5 w-4.5 text-[var(--crmx-text-muted)]" />
      </Link>
    </div>
  );
}
