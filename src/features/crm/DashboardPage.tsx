import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, ArrowLeft, Award, CalendarDays, Footprints, Globe, Headset, Plus, RefreshCw,
  ShoppingBag, TriangleAlert, UserCheck, Users2, UserPlus, Users, Wallet, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "../../auth";
import { crmApi } from "./api";
import { getCrmError } from "./components";
import { useCrmOperational } from "./CrmShell";
import "./customers-ui/crmx.css";
import { CrmAvatar, CrmKpiCard, CrmPageHeader, CrmStatusBadge } from "./customers-ui";
import type { CrmCustomerSource, CrmDashboard } from "./types";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

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
  const operational = useCrmOperational();
  const [data, setData] = useState<CrmDashboard>();
  const [error, setError] = useState<{ status?: number; message: string }>();
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ branch_id: "", from: "", to: "" });
  const load = useCallback(async () => { setLoading(true); setError(undefined); try { setData(await crmApi.dashboard(filters)); } catch (e) { setError(getCrmError(e)); } finally { setLoading(false); } }, [filters]);
  useEffect(() => { void load(); }, [load]);

  if (error) {
    return (
      <div className="crmx-root p-6">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] py-16 text-center">
          <AlertTriangle className="h-8 w-8 text-[var(--crmx-danger)]" />
          <p className="text-[15px] font-bold text-[var(--crmx-text)]">{error.message}</p>
          <button onClick={load} className="h-10 rounded-xl bg-[var(--crmx-navy)] px-4 text-[13px] font-bold text-white">إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  const metrics = [
    { icon: <Users className="h-5 w-5" />, label: "إجمالي العملاء", value: data?.customers_count, trend: data?.trends?.customers_count, tone: "navy" as const },
    { icon: <UserCheck className="h-5 w-5" />, label: "العملاء النشطون", value: data?.active_customers_count, trend: data?.trends?.active_customers_count, tone: "success" as const },
    { icon: <UserPlus className="h-5 w-5" />, label: "عملاء جدد", value: data?.new_customers_count, tone: "warning" as const, hint: "هذا الشهر" },
    { icon: <TriangleAlert className="h-5 w-5" />, label: "شكاوى مفتوحة", value: data?.open_complaints_count, trend: data?.trends?.open_complaints_count, trendInverse: true, tone: "accent" as const },
    { icon: <ShoppingBag className="h-5 w-5" />, label: "الطلبات", value: data?.orders_count, tone: "navy" as const },
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
              className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-white px-4 text-[14px] font-semibold text-[var(--crmx-text)] transition enabled:hover:border-[var(--crmx-navy)] disabled:opacity-40"
              title="تصدير آخر العملاء إلى CSV"
            >
              تصدير
            </button>
            <button onClick={load} aria-label="تحديث" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--crmx-border)] bg-white text-[var(--crmx-text-secondary)] hover:border-[var(--crmx-navy)] hover:text-[var(--crmx-navy)]">
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
          الفرع
          <select
            value={filters.branch_id}
            onChange={(e) => setFilters((v) => ({ ...v, branch_id: e.target.value }))}
            className="h-11 min-w-[160px] rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-navy)] focus:ring-2 focus:ring-[var(--crmx-navy)]/10"
          >
            <option value="">جميع الفروع</option>
            {data?.branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
          <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> من</span>
          <input type="date" value={filters.from} onChange={(e) => setFilters((v) => ({ ...v, from: e.target.value }))} className="h-11 rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-navy)] focus:ring-2 focus:ring-[var(--crmx-navy)]/10" />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
          إلى
          <input type="date" value={filters.to} onChange={(e) => setFilters((v) => ({ ...v, to: e.target.value }))} className="h-11 rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-navy)] focus:ring-2 focus:ring-[var(--crmx-navy)]/10" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {metrics.map((m) => (
          <CrmKpiCard
            key={m.label}
            icon={m.icon}
            label={m.label}
            tone={m.tone}
            loading={loading}
            value={(m.value ?? 0).toLocaleString("ar")}
            trend={m.trend}
            trendInverse={"trendInverse" in m ? m.trendInverse : false}
            hint={"hint" in m ? m.hint : undefined}
          />
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-[17px] font-bold text-[var(--crmx-text)]">الوضع التشغيلي الآن</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-xl">
          <Link
            to="/admin/crm/orders/active"
            className="block rounded-2xl transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crmx-navy)]/30"
          >
            <CrmKpiCard
              icon={<Zap className="h-5 w-5" />}
              label="الطلبات النشطة"
              tone="navy"
              loading={operational.loading}
              value={operational.activeCount != null ? operational.activeCount.toLocaleString("ar") : "—"}
              hint={!operational.loading && operational.activeCount == null ? "تعذر تحميل العدد" : "لم تُدفع أو تُسلَّم أو تُلغَ بعد"}
            />
          </Link>
          <Link
            to="/admin/crm/orders/delayed"
            className="block rounded-2xl transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crmx-danger)]/30"
          >
            <CrmKpiCard
              icon={<AlertTriangle className="h-5 w-5" />}
              label="الطلبات المتأخرة"
              tone={operational.delayedCount ? "danger" : "navy"}
              loading={operational.loading}
              value={operational.delayedCount != null ? operational.delayedCount.toLocaleString("ar") : "—"}
              hint={!operational.loading && operational.delayedCount == null ? "تعذر تحميل العدد" : "منذ الإنشاء، بعد الحد التشغيلي المحدد"}
            />
          </Link>
        </div>
      </div>

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
              <span>عرض 1 إلى {data.recent_customers.length} من {recentTotal.toLocaleString("ar")} عميل</span>
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
                    <span className="shrink-0 text-[12.5px] font-bold text-[var(--crmx-text)]">{c.loyalty_points.toLocaleString("ar")} نقطة</span>
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
