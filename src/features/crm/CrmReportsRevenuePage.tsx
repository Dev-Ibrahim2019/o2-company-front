import { ArrowRight, Award, Info, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CrmPageHeader } from "./customers-ui";
import "./customers-ui/crmx.css";
import { date as fmtDate, money, num } from "./format";
import type { CrmReportRevenue } from "./types";

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
      <h3 className="mb-4 text-[15px] font-bold text-[var(--crmx-text)]">{title}</h3>
      {children}
    </div>
  );
}

/** Deeper red = more orders in that hour — the only encoding, no legend needed once seen. */
function heatColor(value: number, max: number): string {
  if (value === 0 || max === 0) return "var(--crmx-neutral-soft)";
  const intensity = Math.min(1, value / max);
  return `color-mix(in srgb, var(--crmx-primary) ${Math.round(intensity * 85 + 15)}%, white)`;
}

export function CrmReportsRevenuePage() {
  const [data, setData] = useState<CrmReportRevenue | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setData(await crmApi.reportsRevenue());
      setState("ready");
    } catch (e) {
      setError(getCrmError(e).message);
      setState("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (state === "loading" && !data) return <div className="crmx-root"><CrmState kind="loading" title="جارٍ تحميل تقرير الإيرادات..." /></div>;
  if (state === "error" || !data) return <div className="crmx-root"><CrmState kind="error" title="تعذر تحميل التقرير" detail={error} retry={load} /></div>;

  const maxHeat = Math.max(1, ...data.heatmap.flatMap((row) => row.hours));
  const activeHours = Array.from({ length: 24 }, (_, h) => h).filter((h) => data.heatmap.some((row) => row.hours[h] > 0));
  const hoursToShow = activeHours.length > 0 ? activeHours : Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="crmx-root space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CrmPageHeader title={`تقرير الإيرادات — ${data.month}`} description="مقارنة أسبوعية وتفصيلية، بيانات حقيقية للشهر الحالي حتى اليوم." breadcrumb="التقارير / CRM" />
        <Link to="/admin/crm/reports" className="flex items-center gap-1.5 rounded-xl border border-[var(--crmx-border)] px-3 py-2 text-[12.5px] font-bold text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)]">
          <ArrowRight className="h-4 w-4" /> العودة للتقارير
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-[var(--crmx-danger)]/25 bg-[var(--crmx-danger-soft)] p-4">
          <p className="text-[12px] font-bold text-[var(--crmx-danger-text)]">أضعف يوم</p>
          <p className="mt-1 text-[18px] font-extrabold text-[var(--crmx-danger-text)]">{data.worst_weekday?.label ?? "—"}</p>
          {data.worst_weekday && data.weekday_average > 0 && (
            <p className="mt-1 flex items-center gap-1 text-[11.5px] font-semibold text-[var(--crmx-danger-text)]">
              <TrendingDown className="h-3.5 w-3.5" />
              {Math.round((1 - data.worst_weekday.revenue / data.weekday_average) * 100)}% تحت المتوسط
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-[var(--crmx-success)]/25 bg-[var(--crmx-success-soft)] p-4">
          <p className="text-[12px] font-bold text-[var(--crmx-success-text)]">أعلى يوم</p>
          <p className="mt-1 text-[18px] font-extrabold text-[var(--crmx-success-text)]">{data.best_weekday?.label ?? "—"}</p>
          {data.best_weekday && (
            <p className="mt-1 flex items-center gap-1 text-[11.5px] font-semibold text-[var(--crmx-success-text)]">
              <TrendingUp className="h-3.5 w-3.5" /> متوسط {money(data.best_weekday.revenue / Math.max(1, data.best_weekday.orders_count))} / طلب
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
          <p className="text-[12px] font-bold text-[var(--crmx-text-secondary)]">الإيرادات اليومية (المتوسط)</p>
          <p className="mt-1 text-[18px] font-extrabold text-[var(--crmx-text)]">{money(data.weekday_average)}</p>
          <p className="mt-1 text-[11.5px] text-[var(--crmx-text-muted)]">حتى اليوم · {data.from} → {data.to}</p>
        </div>
        <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4 sm:col-span-2">
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--crmx-text-secondary)]">
            <Info className="h-3.5 w-3.5" /> تقدير نهاية الشهر (بناءً على المعدل الحالي، وليس نموذجًا إحصائيًا)
          </p>
          <p className="mt-1 text-[18px] font-extrabold text-[var(--crmx-text)]">
            {money(data.projection.low)} – {money(data.projection.high)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="التفصيل الأسبوعي">
          <div className="space-y-3">
            {data.weeks.map((w) => (
              <div key={w.label} className="rounded-xl border border-[var(--crmx-border)] p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12.5px] font-bold text-[var(--crmx-text)]">
                    {w.label} {w.in_progress && <span className="text-[10.5px] font-semibold text-[var(--crmx-text-muted)]">(جارٍ)</span>}
                  </span>
                  {w.change_pct != null && (
                    <span className={`flex items-center gap-0.5 text-[11px] font-bold ${w.change_pct >= 0 ? "text-[var(--crmx-success-text)]" : "text-[var(--crmx-danger-text)]"}`}>
                      {w.change_pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(w.change_pct)}%
                    </span>
                  )}
                </div>
                <p className="text-[16px] font-extrabold text-[var(--crmx-text)]">{money(w.revenue)}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--crmx-neutral-soft)]">
                  <div
                    className="h-full rounded-full bg-[var(--crmx-primary)]"
                    style={{ width: `${Math.min(100, (w.revenue / Math.max(1, Math.max(...data.weeks.map((x) => x.revenue)))) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="أعلى الأيام إيرادًا">
          <ol className="space-y-2.5">
            {data.top_days.map((d, i) => (
              <li key={d.date} className="flex items-center justify-between rounded-xl bg-[var(--crmx-neutral-soft)] p-3">
                <span className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--crmx-primary-soft)] text-[12px] font-black text-[var(--crmx-primary-text)]">
                    {i === 0 ? <Award className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--crmx-text)]">{fmtDate(d.date)}</span>
                </span>
                <span className="text-[14px] font-extrabold text-[var(--crmx-text)]">{money(d.revenue)}</span>
              </li>
            ))}
            {data.top_days.length === 0 && <p className="text-center text-[13px] text-[var(--crmx-text-muted)]">لا بيانات كافية بعد</p>}
          </ol>
        </ChartCard>

        <ChartCard title="الإيراد حسب القسم">
          {data.department_revenue.length === 0 ? (
            <p className="flex h-[180px] items-center justify-center text-[13px] text-[var(--crmx-text-muted)]">لا بيانات كافية بعد</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.department_revenue} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="department" width={80} tick={{ fontSize: 11.5, fill: "var(--crmx-text-secondary)" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} fill="var(--crmx-primary)" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="خريطة أوقات الذروة (يوم × ساعة)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[10.5px]">
            <thead>
              <tr>
                <th className="w-16" />
                {hoursToShow.map((h) => (
                  <th key={h} className="pb-1 text-center font-semibold text-[var(--crmx-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.heatmap.map((row) => (
                <tr key={row.dow}>
                  <td className="pe-2 text-[11.5px] font-bold text-[var(--crmx-text-secondary)]">{row.label}</td>
                  {hoursToShow.map((h) => (
                    <td key={h} className="p-0.5">
                      <div
                        title={`${row.label} ${h}:00 — ${num(row.hours[h])} طلب`}
                        className="flex h-6 w-full min-w-[22px] items-center justify-center rounded text-[9.5px] font-bold text-[var(--crmx-text)]"
                        style={{ background: heatColor(row.hours[h], maxHeat) }}
                      >
                        {row.hours[h] > 0 ? row.hours[h] : ""}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
