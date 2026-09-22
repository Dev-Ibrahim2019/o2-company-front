import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, ArrowLeft, Award, CalendarDays, CalendarHeart, Footprints, Globe, Headset, Plus, RefreshCw,
  ShoppingBag, TriangleAlert, UserCheck, Users2, UserPlus, Users, Wallet, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "../../auth";
import { crmApi } from "./api";
import { date as formatDate, num } from "./format";
import { getCrmError } from "./components";
import "./customers-ui/crmx.css";
import { CrmAvatar, CrmKpiCard, CrmPageHeader, CrmStatusBadge } from "./customers-ui";
import type { CrmCustomerSource, CrmDashboard, CrmOccasionsSummary } from "./types";

// Fixed, brand-consistent series colors for the donut — same palette used
// across the CRM design tokens (green/navy/purple/warning/muted).
const OCCASION_COLORS = ["var(--crmx-primary)", "var(--crmx-navy)", "var(--crmx-accent)", "var(--crmx-warning)", "var(--crmx-text-muted)"];
// Customer Source (not Order Source) — icon + tone per acquisition channel.
// Labels come from the shared CRM_CUSTOMER_SOURCE_LABELS (sourceOptions.ts);
// only the icon/tone presentation is dashboard-specific.
const SOURCE_META: Record<CrmCustomerSource, { icon: LucideIcon; tone: string }> = {
  website: { icon: Globe, tone: "bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]" },
  fawri: { icon: Wallet, tone: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]" },
  families: { icon: Users2, tone: "bg-[var(--crmx-accent-soft)] text-[var(--crmx-accent-text)]" },
  call_center: { icon: Headset, tone: "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]" },
  walk_in: { icon: Footprints, tone: "bg-[var(--crmx-navy-soft)] text-[var(--crmx-navy)]" },
};

const OCCASION_BADGE: Record<string, string> = {
  birthday: "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]",
  anniversary: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]",
  wedding: "bg-[var(--crmx-accent-soft)] text-[var(--crmx-accent-text)]",
  graduation: "bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]",
  other: "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]",
};

function ChartCard({ title, children, empty }: { title: string; children?: React.ReactNode; empty?: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
      <h3 className="mb-4 text-[15px] font-bold text-[var(--crmx-text)]">{title}</h3>
      {empty ? (
        <div className="flex h-[220px] items-center justify-center text-[13px] text-[var(--crmx-text-muted)]">
          لا توجد بيانات كافية بعد
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function CrmDashboardPage() {
  const { user } = useAuth();
  // Read straight from GET /crm/occasions/summary rather than from the
  // dashboard payload: that endpoint resolves every count through
  // CustomerOccasion::nextOccurrence(), so an annual occasion stored in 1999
  // is counted on this year's date. The dashboard's own occasion figures are
  // a type distribution over stored rows and answer a different question.
  const [occasionsDue, setOccasionsDue] = useState<CrmOccasionsSummary | null>(null);
  const [occasionsLoading, setOccasionsLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const summary = await crmApi.occasionsSummary();
        if (alive) setOccasionsDue(summary);
      } catch {
        // A failed summary must not take the whole dashboard down; the card
        // says so itself via the null value below.
        if (alive) setOccasionsDue(null);
      } finally {
        if (alive) setOccasionsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);
  const [data, setData] = useState<CrmDashboard>();
  const [error, setError] = useState<{ status?: number; message: string }>();
  const [loading, setLoading] = useState(true);
  // Keys match GET /crm/dashboard's own query params exactly. They used to be
  // `from`/`to`, which the endpoint never reads (it validates `date_from`/
  // `date_to`), so the date filter silently did nothing.
  const [filters, setFilters] = useState({ branch_id: "", date_from: "", date_to: "" });
  // "الوضع التشغيلي الآن" used to read straight from useCrmOperational() —
  // fetched once, with no filters, at the CrmShell level (shared with the
  // sidebar badge). That made it ignore both this page's branch picker and
  // its date range entirely, despite the cards' own copy claiming "طلبات
  // الفرع". Fetched here instead, scoped to whichever branch/date range this
  // page currently has selected; the shell's own unfiltered copy still backs
  // the sidebar badge, which is deliberately company-wide and un-filterable.
  const [localOperational, setLocalOperational] = useState<{ activeCount: number | null; delayedCount: number | null; loading: boolean; error: boolean }>(
    { activeCount: null, delayedCount: null, loading: true, error: false },
  );
  // The one filter combination GET /crm/dashboard rejects with a 422
  // (date_to must be after_or_equal date_from). ISO date strings compare
  // chronologically, so a plain string compare is enough. Caught here so a
  // half-entered range never fires the request that used to blank the whole
  // page and leave "إعادة المحاولة" retrying the same bad values forever.
  const rangeInvalid = Boolean(filters.date_from && filters.date_to && filters.date_from > filters.date_to);
  const load = useCallback(async () => {
    if (rangeInvalid) { setError(undefined); return; }
    setLoading(true);
    setError(undefined);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""));
      setData(await crmApi.dashboard(params));
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, [filters, rangeInvalid]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (rangeInvalid) return;
    let cancelled = false;
    setLocalOperational((v) => ({ ...v, loading: true }));
    const activeParams = new URLSearchParams({ active: "1", per_page: "1" });
    const delayedParams = new URLSearchParams({ per_page: "1" });
    if (filters.branch_id) {
      activeParams.set("branch_id", filters.branch_id);
      delayedParams.set("branch_id", filters.branch_id);
    }
    // ordersDelayed() has no date_from/date_to of its own — "delayed" is
    // inherently about elapsed time from now, not a historical window — so
    // only the active-orders count takes the date range.
    if (filters.date_from) activeParams.set("date_from", filters.date_from);
    if (filters.date_to) activeParams.set("date_to", filters.date_to);

    Promise.allSettled([crmApi.orders(activeParams), crmApi.delayedOrders(delayedParams)]).then(([active, delayed]) => {
      if (cancelled) return;
      setLocalOperational({
        activeCount: active.status === "fulfilled" ? active.value.total : null,
        delayedCount: delayed.status === "fulfilled" ? delayed.value.total : null,
        loading: false,
        error: active.status === "rejected" || delayed.status === "rejected",
      });
    });
    return () => { cancelled = true; };
  }, [filters, rangeInvalid]);

  // Only take over the whole page when the first load itself failed and there
  // is nothing to show. Once data is on screen, a later failure (a bad filter,
  // a dropped request) shows an inline banner by the filter bar instead — the
  // numbers stay put and the filters stay reachable to correct.
  if (error && !data) {
    return (
      <div className="crmx-root p-6">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] py-16 text-center">
          <AlertTriangle className="h-8 w-8 text-[var(--crmx-danger)]" />
          <p className="text-[15px] font-bold text-[var(--crmx-text)]">{error.message}</p>
          <button onClick={load} className="h-10 rounded-xl bg-[var(--crmx-primary)] px-4 text-[13px] font-bold text-white">إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  const metrics = [
    { icon: <Users className="h-5 w-5" />, label: "إجمالي العملاء", value: data?.customers_count, trend: data?.trends?.customers_count, tone: "navy" as const },
    { icon: <UserCheck className="h-5 w-5" />, label: "العملاء النشطون", value: data?.active_customers_count, trend: data?.trends?.active_customers_count, tone: "success" as const },
    { icon: <UserPlus className="h-5 w-5" />, label: "عملاء جدد", value: data?.new_customers_count, tone: "warning" as const, hint: "هذا الشهر" },
    { icon: <TriangleAlert className="h-5 w-5" />, label: "شكاوى مفتوحة", value: data?.open_complaints_count, trend: data?.trends?.open_complaints_count, trendInverse: true, tone: "accent" as const },
    // Counts orders that belong to a CRM customer (CrmController@dashboard:
    // Order::whereIn('customer_id', visibleCustomerIds)), NOT every order in
    // the branch — that is what the "الطلبات النشطة"/"الطلبات المتأخرة" cards
    // below report, via a different query with a different scope. Labelled
    // explicitly because a bare "الطلبات" next to those two reads as a
    // contradiction whenever orders exist that carry no customer_id.
    { icon: <ShoppingBag className="h-5 w-5" />, label: "طلبات العملاء", value: data?.orders_count, tone: "navy" as const, hint: "الطلبات المرتبطة بملف عميل" },
  ];

  const exportRecentCustomers = () => {
    if (!data?.recent_customers?.length) return;
    const headers = ["الاسم", "رقم العميل", "الهاتف", "البريد الإلكتروني", "المناسبة", "نقاط الولاء", "الحالة", "تاريخ الإضافة"];
    const rows = data.recent_customers.map((c) => [
      c.name, c.code ?? "", String(c.primary_phone ?? c.mobile ?? c.phone ?? ""), c.email ?? "",
      c.occasion_label ?? "", String(c.loyalty_points ?? ""), c.status ?? "", c.created_at ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crm-recent-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const firstName = (user?.name || "").trim().split(/\s+/)[0];
  const monthlyData = (data?.monthly_new_customers ?? []).map((point, i) => ({
    month: point.month,
    "عملاء جدد": point.count,
    "عملاء نشطون": data?.monthly_active_customers?.[i]?.count ?? 0,
  }));
  const occasions = data?.occasion_distribution ?? [];
  const occasionsTotal = occasions.reduce((sum, o) => sum + o.count, 0);
  const sources = data?.customer_sources ?? [];
  const topLoyalty = data?.top_customers_by_loyalty ?? [];
  const recentTotal = data?.customers_count ?? data?.recent_customers?.length ?? 0;

  return (
    <section className="crmx-root space-y-6 p-4 sm:p-6">
      <CrmPageHeader
        breadcrumb="CRM / لوحة التحكم"
        title={firstName ? `مرحبًا بك، ${firstName} 👋` : "لوحة تحكم CRM"}
        description="نظرة عامة على عملائك ونشاطهم وإحصائيات مهمة."
        actions={
          <>
            <Link
              to="/admin/crm/customers?new=1"
              className="flex h-11 items-center gap-2 rounded-xl bg-[var(--crmx-primary)] px-4 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]"
            >
              <Plus className="h-4 w-4" /> إضافة عميل جديد
            </Link>
            <button
              onClick={exportRecentCustomers}
              disabled={!data?.recent_customers?.length}
              className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-white px-4 text-[14px] font-semibold text-[var(--crmx-text)] transition enabled:hover:border-[var(--crmx-primary)] disabled:opacity-40"
              title="تصدير آخر العملاء إلى CSV"
            >
              تصدير
            </button>
            <button onClick={load} aria-label="تحديث" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--crmx-border)] bg-white text-[var(--crmx-text-secondary)] hover:border-[var(--crmx-primary)] hover:text-[var(--crmx-navy)]">
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </button>
          </>
        }
      />

      <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
            الفرع
            <select
              value={filters.branch_id}
              onChange={(e) => setFilters((v) => ({ ...v, branch_id: e.target.value }))}
              className="h-11 min-w-[160px] rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10"
            >
              <option value="">جميع الفروع</option>
              {data?.branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> من</span>
            <input type="date" value={filters.date_from} max={filters.date_to || undefined} onChange={(e) => setFilters((v) => ({ ...v, date_from: e.target.value }))} className={`h-11 rounded-xl border bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:ring-2 focus:ring-[var(--crmx-primary)]/10 ${rangeInvalid ? "border-[var(--crmx-danger)] focus:border-[var(--crmx-danger)]" : "border-[var(--crmx-border)] focus:border-[var(--crmx-primary)]"}`} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
            إلى
            <input type="date" value={filters.date_to} min={filters.date_from || undefined} onChange={(e) => setFilters((v) => ({ ...v, date_to: e.target.value }))} className={`h-11 rounded-xl border bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:ring-2 focus:ring-[var(--crmx-primary)]/10 ${rangeInvalid ? "border-[var(--crmx-danger)] focus:border-[var(--crmx-danger)]" : "border-[var(--crmx-border)] focus:border-[var(--crmx-primary)]"}`} />
          </label>
          {(filters.date_from || filters.date_to) && (
            <button
              type="button"
              onClick={() => setFilters((v) => ({ ...v, date_from: "", date_to: "" }))}
              className="h-11 rounded-xl border border-[var(--crmx-border)] px-3 text-[13px] font-semibold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]"
            >
              مسح التاريخ
            </button>
          )}
        </div>

        {rangeInvalid && (
          <p className="mt-2.5 text-[12.5px] font-semibold text-[var(--crmx-danger-text)]">
            تاريخ "من" يجب أن يكون قبل تاريخ "إلى" أو مساويًا له — لم يُطبَّق الفلتر.
          </p>
        )}
        {error && data && !rangeInvalid && (
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[12.5px] font-semibold text-[var(--crmx-danger-text)]">
            {error.message}
            <button
              onClick={load}
              className="rounded-lg border border-[var(--crmx-danger)]/40 px-2.5 py-1 transition hover:bg-[var(--crmx-danger-soft)]"
            >
              إعادة المحاولة
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {metrics.map((m) => (
          <CrmKpiCard
            key={m.label}
            icon={m.icon}
            label={m.label}
            tone={m.tone}
            loading={loading}
            value={num(m.value ?? 0)}
            trend={m.trend}
            trendInverse={"trendInverse" in m ? m.trendInverse : false}
            hint={"hint" in m ? m.hint : undefined}
          />
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-[17px] font-bold text-[var(--crmx-text)]">الوضع التشغيلي الآن</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/admin/crm/orders/active"
            className="block rounded-2xl transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crmx-navy)]/30"
          >
            <CrmKpiCard
              icon={<Zap className="h-5 w-5" />}
              label="الطلبات النشطة"
              tone="navy"
              loading={localOperational.loading}
              value={num(localOperational.activeCount)}
              hint={!localOperational.loading && localOperational.activeCount == null ? "تعذر تحميل العدد" : "كل طلبات الفرع الآن — لم تُدفع أو تُسلَّم أو تُلغَ بعد"}
            />
          </Link>
          <Link
            to="/admin/crm/orders/delayed"
            className="block rounded-2xl transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crmx-danger)]/30"
          >
            <CrmKpiCard
              icon={<AlertTriangle className="h-5 w-5" />}
              label="الطلبات المتأخرة"
              tone={localOperational.delayedCount ? "danger" : "navy"}
              loading={localOperational.loading}
              value={num(localOperational.delayedCount)}
              hint={!localOperational.loading && localOperational.delayedCount == null ? "تعذر تحميل العدد" : "من طلبات الفرع النشطة — منذ الإنشاء، بعد الحد التشغيلي المحدد"}
            />
          </Link>
          {/* Deep-links into the screen already filtered to today, so the
              number the reader clicked is the list they land on. */}
          <Link
            to="/admin/crm/occasions?range=today"
            className="block rounded-2xl transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crmx-accent)]/30"
          >
          <CrmKpiCard
            icon={<CalendarHeart className="h-5 w-5" />}
            label="مناسبات اليوم"
            tone={occasionsDue?.today ? "accent" : "navy"}
            loading={occasionsLoading}
            value={num(occasionsDue?.today)}
            hint={
              occasionsLoading
                ? undefined
                : occasionsDue == null
                  ? "تعذر تحميل العدد"
                  : `${num(occasionsDue.this_week)} خلال هذا الأسبوع · ${num(occasionsDue.this_month)} خلال الشهر`
            }
          />
          </Link>
        </div>
      </div>

      {data && data.branch_breakdown && data.branch_breakdown.length > 0 && (
        <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
          <h3 className="mb-3 text-[15px] font-bold text-[var(--crmx-text)]">الإحصائيات حسب الفرع</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-[13px]">
              <thead>
                <tr className="border-b border-[var(--crmx-border)] text-[12px] font-bold text-[var(--crmx-text-muted)]">
                  <th className="py-2 text-start">الفرع</th>
                  <th className="py-2 text-start">العملاء</th>
                  <th className="py-2 text-start">عملاء جدد بالفترة</th>
                  <th className="py-2 text-start">الطلبات</th>
                </tr>
              </thead>
              <tbody>
                {data.branch_breakdown.map((b) => (
                  <tr key={b.branch_id} className="border-b border-[var(--crmx-border)] last:border-0">
                    <td className="py-2.5 font-semibold text-[var(--crmx-text)]">{b.branch_name}</td>
                    <td className="py-2.5 text-[var(--crmx-text-secondary)]">{num(b.customers_count)}</td>
                    <td className="py-2.5 text-[var(--crmx-text-secondary)]">{num(b.new_customers_count)}</td>
                    <td className="py-2.5 text-[var(--crmx-text-secondary)]">{num(b.orders_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <ChartCard title="توزيع العملاء حسب المناسبة">
            {loading ? (
              <div className="crmx-skeleton h-[220px] w-full rounded-xl" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative w-[45%] shrink-0">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      {occasionsTotal > 0 ? (
                        <Pie data={occasions} dataKey="count" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={3}>
                          {occasions.map((o, i) => <Cell key={o.type} fill={OCCASION_COLORS[i % OCCASION_COLORS.length]} />)}
                        </Pie>
                      ) : (
                        // No occasions recorded for any visible customer yet —
                        // an inert gray ring keeps the layout identical to the
                        // fully-populated state instead of collapsing away.
                        <Pie data={[{ label: "", count: 1 }]} dataKey="count" innerRadius={55} outerRadius={85}>
                          <Cell fill="var(--crmx-neutral-soft)" />
                        </Pie>
                      )}
                      {occasionsTotal > 0 && (
                        <Tooltip formatter={(v: number, _n, p) => [`${v} (${(p.payload as { percent: number }).percent}%)`, p.payload && (p.payload as { label: string }).label]} />
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                  {occasionsTotal === 0 && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] font-semibold leading-tight text-[var(--crmx-text-muted)]">لا توجد<br />بيانات بعد</span>
                    </div>
                  )}
                </div>
                <ul className="flex-1 space-y-2">
                  {occasions.map((o, i) => (
                    <li key={o.type} className="flex items-center justify-between text-[12.5px]">
                      <span className="flex items-center gap-2 text-[var(--crmx-text-secondary)]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: OCCASION_COLORS[i % OCCASION_COLORS.length] }} />
                        {o.label}
                      </span>
                      <span className="font-bold text-[var(--crmx-text)]">{o.percent}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </ChartCard>
        </div>

        <div className="lg:col-span-3">
          <ChartCard title="العملاء الجدد والنشطون — آخر 6 أشهر">
            {loading ? (
              <div className="crmx-skeleton h-[220px] w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--crmx-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--crmx-text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--crmx-text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="عملاء جدد" fill="var(--crmx-navy)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="عملاء نشطون" fill="var(--crmx-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] shadow-[var(--crmx-shadow-sm)] lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
            <div>
              <h2 className="text-[16px] font-bold text-[var(--crmx-text)]">آخر العملاء المضافين</h2>
              <p className="mt-0.5 text-[13px] text-[var(--crmx-text-secondary)]">أحدث السجلات التي وصلت إلى مساحة CRM.</p>
            </div>
            <Link to="/admin/crm/customers" className="flex shrink-0 items-center gap-1.5 text-[13px] font-bold text-[var(--crmx-navy)] hover:text-[var(--crmx-primary)]">
              عرض جميع العملاء <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="crmx-skeleton h-10 w-full" />)}
            </div>
          ) : !data?.recent_customers?.length ? (
            <div className="py-14 text-center text-[13px] text-[var(--crmx-text-secondary)]">لا توجد بيانات ضمن النطاق المحدد</div>
          ) : (
            <div className="crmx-scrollbar overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-right">
                <thead>
                  <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">#</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">العميل</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">رقم الجوال</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">البريد الإلكتروني</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">المناسبة</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">نقاط الولاء</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">الحالة</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">تاريخ الإضافة</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_customers.map((c, i) => (
                    <tr key={c.id} className="crmx-table-row border-b border-[var(--crmx-border)] last:border-0">
                      <td className="px-4 py-3 text-[12px] text-[var(--crmx-text-muted)]">{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/crm/customers/${c.id}`} className="flex items-center gap-3">
                          <CrmAvatar name={c.name} size={32} />
                          <div className="min-w-0">
                            <p className="max-w-[140px] truncate text-[13px] font-bold text-[var(--crmx-text)]">{c.name}</p>
                            <p className="truncate text-[11px] text-[var(--crmx-text-muted)]">{c.code || `#${c.id}`}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]" dir="ltr">{c.mobile || c.phone || "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]" dir="ltr">{(c.email as string) || "—"}</td>
                      <td className="px-4 py-3">
                        {c.occasion_label ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap ${OCCASION_BADGE[c.occasion_type || ""] || OCCASION_BADGE.other}`}>
                            {c.occasion_label}
                          </span>
                        ) : (
                          <span className="text-[13px] text-[var(--crmx-text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[var(--crmx-text)]">{c.loyalty_points ?? "—"}</td>
                      <td className="px-4 py-3"><CrmStatusBadge value={c.status} /></td>
                      <td className="px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">{formatDate(c.created_at)}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/crm/customers/${c.id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)]"
                          title="عرض الملف"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !!data?.recent_customers?.length && (
            <div className="flex items-center justify-between border-t border-[var(--crmx-border)] px-5 py-3 text-[12.5px] font-semibold text-[var(--crmx-text-secondary)]">
              <span>عرض 1 إلى {data.recent_customers.length} من {num(recentTotal)} عميل</span>
              <Link to="/admin/crm/customers" className="text-[var(--crmx-navy)] hover:text-[var(--crmx-primary)]">عرض الكل ←</Link>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
            <h3 className="mb-3 text-[15px] font-bold text-[var(--crmx-text)]">مصادر العملاء</h3>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="crmx-skeleton h-4 w-full" />)}</div>
            ) : sources.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[var(--crmx-text-muted)]">لا توجد بيانات مصدر مسجّلة بعد</p>
            ) : (
              <ul className="space-y-3">
                {sources.map((s) => {
                  const meta = SOURCE_META[s.source];
                  const Icon = meta?.icon ?? Globe;
                  return (
                    <li key={s.source} className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta?.tone ?? "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]"}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="w-16 shrink-0 text-[13.5px] font-semibold text-[var(--crmx-text)]">{s.label}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--crmx-neutral-soft)]">
                        <span className="block h-full rounded-full bg-[var(--crmx-primary)]" style={{ width: `${s.percent}%` }} />
                      </span>
                      <span className="w-10 shrink-0 text-left text-[13.5px] font-bold text-[var(--crmx-text)]">{s.percent}%</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
            <h3 className="mb-3 text-[15px] font-bold text-[var(--crmx-text)]">أعلى العملاء نقاطًا</h3>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="crmx-skeleton h-9 w-full" />)}</div>
            ) : topLoyalty.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[var(--crmx-text-muted)]">لا يوجد عملاء لديهم نقاط ولاء بعد</p>
            ) : (
              <ul className="space-y-3">
                {topLoyalty.map((c, i) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <Link to={`/admin/crm/customers/${c.id}`} className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--crmx-warning-soft)] text-[11px] font-black text-[var(--crmx-warning-text)]">
                        <Award className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate text-[13px] font-semibold text-[var(--crmx-text)]">{i + 1}. {c.name}</span>
                    </Link>
                    <span className="shrink-0 text-[12.5px] font-bold text-[var(--crmx-text)]">{num(c.loyalty_points)} نقطة</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
