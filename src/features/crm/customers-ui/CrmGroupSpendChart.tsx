import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money, monthLabel } from "../format";
import type { CrmGroupSpendPoint } from "../types";

/**
 * The groups module's one spending-trend chart — real monthly sums from
 * CustomerGroupController::analytics()/crossAnalytics(), both derived from
 * the exact same paid-order definition group.total_spend uses. Shared
 * between one group's own profile and the cross-group analytics screen
 * rather than kept as two copies, since both read the identical response
 * shape (CrmGroupAnalytics.monthly_spend).
 */
export function CrmGroupSpendChart({
  data,
  loading,
  height = 220,
}: {
  data?: CrmGroupSpendPoint[];
  loading: boolean;
  height?: number;
}) {
  const hasAny = data?.some((m) => m.total > 0);

  if (loading) {
    return <div className="crmx-skeleton w-full rounded-xl" style={{ height }} />;
  }

  if (!data?.length || !hasAny) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--crmx-border)] text-center"
        style={{ height }}
      >
        <TrendingUp className="h-6 w-6 text-[var(--crmx-text-muted)]" />
        <p className="max-w-[240px] text-[12.5px] text-[var(--crmx-text-muted)]">لا توجد طلبات مدفوعة خلال آخر 6 أشهر.</p>
      </div>
    );
  }

  const chartData = data.map((p) => ({ ...p, label: monthLabel(p.month) }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="crmGroupSpendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--crmx-primary)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--crmx-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--crmx-border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--crmx-text-muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "var(--crmx-text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} width={56} />
        <Tooltip formatter={(v) => money(Number(v))} labelFormatter={(_l, p) => monthLabel(String(p?.[0]?.payload?.month ?? ""))} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="var(--crmx-primary)"
          strokeWidth={2.5}
          fill="url(#crmGroupSpendFill)"
          dot={{ r: 3.5, fill: "var(--crmx-primary)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
