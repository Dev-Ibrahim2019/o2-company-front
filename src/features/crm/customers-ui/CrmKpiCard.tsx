import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

const TONE_CLASS: Record<"navy" | "success" | "accent" | "warning" | "danger", string> = {
  navy: "bg-[var(--crmx-navy)]",
  success: "bg-[var(--crmx-success)]",
  accent: "bg-[var(--crmx-accent)]",
  warning: "bg-[var(--crmx-warning)]",
  danger: "bg-[var(--crmx-danger)]",
};

export function CrmKpiCard({
  icon,
  label,
  value,
  hint,
  /** Month-over-month % change, when the backend can compute one. Omit
   *  entirely rather than showing a fabricated number. */
  trend,
  /** For KPIs where a rising value is bad (e.g. open complaints), a positive
   *  trend should render as a warning color instead of green. */
  trendInverse = false,
  tone = "navy",
  loading,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  trend?: number | null;
  trendInverse?: boolean;
  tone?: "navy" | "success" | "accent" | "warning" | "danger";
  loading?: boolean;
}) {
  const hasTrend = trend != null && Number.isFinite(trend);
  const isUp = hasTrend && trend! > 0;
  const isPositiveDirection = hasTrend && (trendInverse ? trend! <= 0 : trend! >= 0);
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
      <div className="flex items-center gap-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${TONE_CLASS[tone]}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[var(--crmx-text-secondary)]">{label}</p>
          {loading ? (
            <div className="crmx-skeleton mt-1.5 h-7 w-16" />
          ) : (
            <p className="text-[28px] font-extrabold leading-tight text-[var(--crmx-text)]">{value}</p>
          )}
        </div>
      </div>
      {!loading && hasTrend && (
        <p
          className={`mt-2 flex items-center gap-1 text-[12px] font-bold ${
            isPositiveDirection ? "text-[var(--crmx-primary-text)]" : "text-[var(--crmx-danger-text)]"
          }`}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          {Math.abs(trend!).toLocaleString("ar")}% عن الشهر الماضي
        </p>
      )}
      {hint && !loading && !hasTrend && <p className="mt-1 text-[12px] text-[var(--crmx-text-muted)]">{hint}</p>}
    </div>
  );
}
