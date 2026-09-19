import { BarChart3, Layers, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CrmGroupSpendChart, CrmKpiCard, CrmPageHeader } from "./customers-ui";
import { money, num } from "./format";
import { GROUP_TYPE_LABELS } from "./GroupsPage";
import type { CrmCustomerGroup, CrmGroupSpendPoint, CrmGroupType } from "./types";

const cardCls = "rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]";

const DONUT_COLORS = [
  "var(--crmx-primary)",
  "var(--crmx-info)",
  "var(--crmx-navy)",
  "var(--crmx-accent)",
  "var(--crmx-success)",
];

/**
 * "التحليلات والرؤى" — the cross-group screen.
 *
 * Every figure here is derived from the same two sources GroupsPage and
 * GroupProfilePage already read: the group list (with its real total_spend/
 * customers_count columns) and CustomerGroupController::crossAnalytics()'s
 * monthly trend — nothing here is a separate, differently-computed number
 * that could disagree with what a single group's own page shows.
 */
export function GroupsAnalyticsPage() {
  const [groups, setGroups] = useState<CrmCustomerGroup[]>([]);
  const [monthlySpend, setMonthlySpend] = useState<CrmGroupSpendPoint[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, a] = await Promise.all([crmApi.customerGroups(), crmApi.groupsAnalytics()]);
      setGroups(g);
      setMonthlySpend(a.monthly_spend);
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const totalMembers = groups.reduce((sum, g) => sum + (g.customers_count ?? 0), 0);
  const totalSpend = groups.reduce((sum, g) => sum + (g.total_spend ?? 0), 0);
  const avgPerMember = totalMembers > 0 ? totalSpend / totalMembers : 0;

  const byType = (Object.keys(GROUP_TYPE_LABELS) as CrmGroupType[])
    .map((t) => ({ type: t, label: GROUP_TYPE_LABELS[t], count: groups.filter((g) => g.group_type === t).length }))
    .filter((r) => r.count > 0);

  const topGroups = [...groups]
    .sort((a, b) => (b.total_spend ?? 0) - (a.total_spend ?? 0))
    .slice(0, 6);
  const maxSpend = Math.max(1, ...topGroups.map((g) => g.total_spend ?? 0));

  if (error) {
    return (
      <div className="crmx-root space-y-6 p-4 sm:p-6">
        <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />
      </div>
    );
  }

  return (
    <div className="crmx-root space-y-6 p-4 sm:p-6">
      <CrmPageHeader
        title="التحليلات والرؤى"
        description="أداء المجموعات مجتمعة — الإيرادات وتوزيع الأعضاء عبر الزمن، من نفس الأرقام الحقيقية التي تظهر في ملف كل مجموعة."
        actions={
          <Link
            to="/admin/crm/groups"
            className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-bold text-[var(--crmx-navy)] transition hover:bg-[var(--crmx-neutral-soft)]"
          >
            المجموعات
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CrmKpiCard icon={<Layers className="h-5 w-5" />} label="عدد المجموعات" value={String(groups.length)} tone="navy" loading={loading} />
        <CrmKpiCard icon={<Users className="h-5 w-5" />} label="إجمالي الأعضاء" value={String(totalMembers)} tone="success" loading={loading} />
        <CrmKpiCard icon={<BarChart3 className="h-5 w-5" />} label="إجمالي الإيرادات" value={money(totalSpend)} hint="طلبات مدفوعة" tone="primary" loading={loading} />
        <CrmKpiCard icon={<TrendingUp className="h-5 w-5" />} label="متوسط الإنفاق للعضو" value={money(avgPerMember)} tone="accent" loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`${cardCls} p-5 lg:col-span-2`}>
          <h3 className="mb-4 text-[15px] font-bold text-[var(--crmx-text)]">
            اتجاه الإيرادات <span className="font-semibold text-[var(--crmx-text-muted)]">(آخر 6 أشهر، كل المجموعات)</span>
          </h3>
          <CrmGroupSpendChart data={monthlySpend} loading={loading} height={260} />
        </div>

        <div className={`${cardCls} p-5`}>
          <h3 className="mb-4 text-[15px] font-bold text-[var(--crmx-text)]">توزيع المجموعات حسب النوع</h3>
          {loading ? (
            <div className="crmx-skeleton h-[210px] w-full rounded-xl" />
          ) : byType.length === 0 ? (
            <p className="flex h-[210px] items-center justify-center text-[12.5px] text-[var(--crmx-text-muted)]">لا توجد مجموعات بعد.</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="relative w-[45%] shrink-0">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byType} dataKey="count" nameKey="label" innerRadius={48} outerRadius={78} paddingAngle={3} stroke="none">
                      {byType.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, _n, item) => [num(Number(v)), (item.payload as { label: string }).label]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <strong className="text-[22px] font-extrabold leading-none text-[var(--crmx-text)]">{num(groups.length)}</strong>
                  <span className="mt-1 text-[10.5px] text-[var(--crmx-text-muted)]">مجموعة</span>
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-2">
                {byType.map((r, i) => (
                  <li key={r.type} className="flex items-center justify-between text-[12.5px]">
                    <span className="flex min-w-0 items-center gap-2 text-[var(--crmx-text-secondary)]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="truncate">{r.label}</span>
                    </span>
                    <span className="shrink-0 font-bold text-[var(--crmx-text)]">{num(r.count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className={`${cardCls} p-5`}>
        <h3 className="mb-4 text-[15px] font-bold text-[var(--crmx-text)]">أفضل المجموعات أداءً</h3>
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="crmx-skeleton h-9 w-full rounded-lg" />)}
          </div>
        ) : topGroups.length === 0 ? (
          <p className="text-[12.5px] text-[var(--crmx-text-muted)]">لا توجد بيانات إنفاق بعد.</p>
        ) : (
          <ul className="space-y-3">
            {topGroups.map((g, i) => (
              <li key={String(g.id)}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <Link to={`/admin/crm/groups/${g.id}`} className="flex items-center gap-2 font-semibold text-[var(--crmx-text)] hover:text-[var(--crmx-primary)]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--crmx-neutral-soft)] text-[11px] font-bold text-[var(--crmx-text-secondary)]">{i + 1}</span>
                    {g.name}
                  </Link>
                  <span className="font-bold text-[var(--crmx-text)]">{money(g.total_spend ?? 0)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--crmx-neutral-soft)]">
                  <div
                    className="h-full rounded-full bg-[var(--crmx-primary)]"
                    style={{ width: `${Math.max(4, ((g.total_spend ?? 0) / maxSpend) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
