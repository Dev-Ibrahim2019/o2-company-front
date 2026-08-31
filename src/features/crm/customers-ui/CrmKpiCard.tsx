import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { num } from "../format";

// Soft-tinted tile + coloured icon, the way the mockup draws KPI icons —
// not a solid block with a white glyph. Solid tiles also broke once the shell
// ink became near-black: the default "navy" KPI rendered as a heavy black
// square fighting the card next to it.
const TONE_CLASS: Record<Tone, string> = {
  navy: "bg-[var(--crmx-navy-soft)] text-[var(--crmx-navy)]",
  primary: "bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary)]",
  success: "bg-[var(--crmx-success-soft)] text-[var(--crmx-success)]",
  accent: "bg-[var(--crmx-accent-soft)] text-[var(--crmx-accent)]",
  warning: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]",
  danger: "bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger)]",
  info: "bg-[var(--crmx-info-soft)] text-[var(--crmx-info)]",
};

type Tone = "navy" | "primary" | "success" | "accent" | "warning" | "danger" | "info";

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
  tone?: Tone;
  loading?: boolean;
}) {
  const hasTrend = trend != null && Number.isFinite(trend);
  const isUp = hasTrend && trend! > 0;
  const isPositiveDirection = hasTrend && (trendInverse ? trend! <= 0 : trend! >= 0);
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
      <div className="flex items-center gap-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--crmx-radius-control)] ${TONE_CLASS[tone]}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[var(--crmx-text-secondary)]">{label}</p>
          {loading ? (
            <div className="crmx-skeleton mt-1.5 h-7 w-16" />
          ) : (
            // nowrap + a size that fits the longest value these cards carry
            // (a full "2026-08-23" date), so a KPI never breaks across lines
            // in the narrow columns of the five-across row.
            <p className="whitespace-nowrap text-[24px] font-extrabold leading-tight text-[var(--crmx-text)]">{value}</p>
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
          {num(Math.abs(trend!))}% عن الشهر الماضي
        </p>
      )}
      {hint && !loading && !hasTrend && <p className="mt-1 text-[12px] text-[var(--crmx-text-muted)]">{hint}</p>}
    </div>
  );
}
