import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  Clock,
  FileText,
  Phone,
  PhoneCall,
  PhoneMissed,
  Printer,
  RefreshCw,
  RotateCw,
  Table2,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import { callCenterPbxService } from "../../../services/callCenterPbxService";
import type { CallAnalytics } from "../../../types/callCenterPbx";
import {
  EmptyState,
  StatsCard,
  StatsCardSkeleton,
} from "./PbxSharedComponents";

type Period = "today" | "week" | "month" | "custom";

const PERIOD_LABELS: Record<Period, string> = {
  today: "اليوم",
  week: "هذا الأسبوع",
  month: "هذا الشهر",
  custom: "نطاق مخصص",
};

const inputCls =
  "w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10 placeholder:text-slate-600";
const labelCls = "mb-1.5 block text-[11px] font-black text-slate-400";

function formatSec(s: number): string {
  if (!s || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ":" + String(sec).padStart(2, "0");
}

function formatDateStr(d: string): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

const ChartCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, children, className = "" }) => (
  <div
    className={
      "rounded-2xl border border-white/5 bg-slate-900/80 p-4 md:p-5 " + className
    }
  >
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h3 className="text-sm font-bold text-white">{title}</h3>
    </div>
    {children}
  </div>
);

const EmptyChartMessage: React.FC = () => (
  <div className="flex items-center justify-center h-32 text-xs text-slate-600">
    لا توجد بيانات
  </div>
);

const LoadingSkeleton: React.FC = () => (
  <div dir="rtl" className="min-h-screen bg-slate-950 p-4 md:p-6 space-y-6">
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-xl bg-slate-800 animate-pulse" />
      <div>
        <div className="h-7 w-40 rounded bg-slate-800 animate-pulse" />
        <div className="h-4 w-56 rounded bg-slate-800 animate-pulse mt-1" />
      </div>
    </div>
    <div className="flex gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-9 w-24 rounded-xl bg-slate-800 animate-pulse"
        />
      ))}
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/5 bg-slate-900/80 p-5 h-64 animate-pulse"
        />
      ))}
    </div>
  </div>
);

export const AnalyticsDashboard: React.FC = () => {
  const [period, setPeriod] = useState<Period>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState<CallAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: {
        period?: string;
        start_date?: string;
        end_date?: string;
      } = {};
      if (period === "custom") {
        params.start_date = customStart || undefined;
        params.end_date = customEnd || undefined;
      } else {
        params.period = period;
      }
      const result = await callCenterPbxService.getAnalytics(params);
      setData(result);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const summaryCards = useMemo(() => {
    if (!data) return [];
    const answeredPct =
      data.total_calls > 0
        ? (data.answered_calls / data.total_calls) * 100
        : 0;
    const missedPct =
      data.total_calls > 0
        ? (data.missed_calls / data.total_calls) * 100
        : 0;
    return [
      {
        label: "إجمالي المكالمات",
        value: data.total_calls.toLocaleString("ar-EG"),
        icon: Phone,
        accent: "text-blue-400",
        bg: "bg-blue-500/10",
      },
      {
        label: "المكالمات المحكّة",
        value: data.answered_calls.toLocaleString("ar-EG"),
        sub: answeredPct.toFixed(1) + "%",
        icon: PhoneCall,
        accent: "text-green-400",
        bg: "bg-green-500/10",
      },
      {
        label: "المكالمات الفائتة",
        value: data.missed_calls.toLocaleString("ar-EG"),
        sub: missedPct.toFixed(1) + "%",
        icon: PhoneMissed,
        accent: "text-red-400",
        bg: "bg-red-500/10",
      },
      {
        label: "متوسط وقت المحادثة",
        value: formatSec(data.avg_talk_time),
        icon: Clock,
        accent: "text-purple-400",
        bg: "bg-purple-500/10",
      },
      {
        label: "متوسط وقت الانتظار",
        value: formatSec(data.avg_wait_time),
        icon: Timer,
        accent: "text-amber-400",
        bg: "bg-amber-500/10",
      },
      {
        label: "متوسط وقت المعالجة",
        value: formatSec(data.avg_handle_time),
        icon: RotateCw,
        accent: "text-cyan-400",
        bg: "bg-cyan-500/10",
      },
    ];
  }, [data]);

  const maxHourly = useMemo(() => {
    if (!data?.calls_per_hour?.length) return 1;
    return Math.max(...data.calls_per_hour.map((h) => h.count), 1);
  }, [data]);

  const maxDaily = useMemo(() => {
    if (!data?.calls_per_day?.length) return 1;
    return Math.max(...data.calls_per_day.map((d) => d.count), 1);
  }, [data]);

  const maxBranchCalls = useMemo(() => {
    if (!data?.branch_comparison?.length) return 1;
    return Math.max(...data.branch_comparison.map((b) => b.calls), 1);
  }, [data]);

  const maxAgentCalls = useMemo(() => {
    if (!data?.top_agents?.length) return 1;
    return Math.max(...data.top_agents.map((a) => a.answered), 1);
  }, [data]);

  const maxQueueCalls = useMemo(() => {
    if (!data?.queue_performance?.length) return 1;
    return Math.max(
      ...data.queue_performance.map((q) => Math.max(q.answered, q.abandoned)),
      1
    );
  }, [data]);

  const maxCustomerCalls = useMemo(() => {
    if (!data?.top_customers?.length) return 1;
    return Math.max(...data.top_customers.map((c) => c.calls), 1);
  }, [data]);

  const totalCallsDirection = useMemo(() => {
    if (!data) return 1;
    return data.inbound_calls + data.outbound_calls + data.internal_calls || 1;
  }, [data]);

  const totalDispositionCalls = useMemo(() => {
    if (!data) return 1;
    return data.answered_calls + data.missed_calls || 1;
  }, [data]);

  if (loading && !data) {
    return <LoadingSkeleton />;
  }

  if (!data) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-950 p-4 md:p-6">
        <EmptyState
          icon={<BarChart3 className="w-12 h-12 text-slate-600" />}
          title="لا توجد بيانات تحليلية"
          description="لم يتم العثور على بيانات في النظام"
          action={
            <button
              onClick={fetchData}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 p-4 md:p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-red-500" />
            لوحة التحليلات
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            نظرة عامة على أداء مركز الاتصال
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={
              "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors " +
              (autoRefresh
                ? "bg-green-600/20 text-green-400 border border-green-500/30"
                : "bg-slate-800 text-slate-400 border border-white/10 hover:border-white/20")
            }
          >
            <RefreshCw
              className={
                "w-3.5 h-3.5 " + (autoRefresh ? "animate-spin" : "")
              }
            />
            {autoRefresh ? "تحديث تلقائي" : "تحديث يدوي"}
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-slate-800 border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors">
            <Table2 className="w-3.5 h-3.5" />
            Excel
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-slate-800 border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors">
            <FileText className="w-3.5 h-3.5" />
            PDF
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-slate-800 border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors">
            <Printer className="w-3.5 h-3.5" />
            طباعة
          </button>
        </div>
      </div>

      {/* ── Period Selector ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={
                "rounded-xl px-4 py-2 text-xs font-bold transition-all " +
                (period === p
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                  : "bg-slate-800/80 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white")
              }
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex gap-2 items-end">
            <div>
              <label className={labelCls}>من تاريخ</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>إلى تاريخ</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className={inputCls}
              />
            </div>
            <button
              onClick={fetchData}
              className="self-end rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition-colors"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Summary Cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {summaryCards.map((card, idx) => (
            <StatsCard
              key={idx}
              label={card.label}
              value={card.value}
              sub={card.sub}
              icon={<card.icon className={"w-5 h-5 " + card.accent} />}
              className={card.bg}
            />
          ))}
        </div>
      )}

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls Per Hour */}
        <ChartCard
          title="المكالمات لكل ساعة"
          icon={<Clock className="w-4 h-4 text-blue-400" />}
        >
          {data.calls_per_hour.length > 0 ? (
            <div className="flex items-end gap-1 h-40">
              {data.calls_per_hour.map((h) => (
                <div
                  key={h.hour}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {h.count}
                  </span>
                  <div
                    className="w-full bg-blue-500/70 rounded-t hover:bg-blue-400 transition-colors min-h-[2px]"
                    style={{
                      height: (h.count / maxHourly) * 100 + "%",
                    }}
                  />
                  <span className="text-[9px] text-slate-600">{h.hour}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChartMessage />
          )}
        </ChartCard>

        {/* Calls Per Day */}
        <ChartCard
          title="المكالمات لكل يوم"
          icon={<Calendar className="w-4 h-4 text-green-400" />}
        >
          {data.calls_per_day.length > 0 ? (
            <div className="flex items-end gap-1 h-40">
              {data.calls_per_day.map((d, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.count}
                  </span>
                  <div
                    className="w-full bg-green-500/70 rounded-t hover:bg-green-400 transition-colors min-h-[2px]"
                    style={{
                      height: (d.count / maxDaily) * 100 + "%",
                    }}
                  />
                  <span
                    className="text-[9px] text-slate-600 truncate max-w-full"
                    title={d.date}
                  >
                    {d.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChartMessage />
          )}
        </ChartCard>

        {/* Answered vs Missed */}
        <ChartCard
          title="المحكمة مقابل الفائتة"
          icon={<PhoneCall className="w-4 h-4 text-emerald-400" />}
        >
          {data.total_calls > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-16">محكمة</span>
                <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500/80 rounded-full flex items-center justify-end pr-2"
                    style={{
                      width:
                        (data.answered_calls / totalDispositionCalls) * 100 +
                        "%",
                    }}
                  >
                    <span className="text-[10px] font-bold text-white">
                      {(
                        (data.answered_calls / totalDispositionCalls) *
                        100
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                </div>
                <span className="text-xs text-white font-bold w-16">
                  {data.answered_calls.toLocaleString("ar-EG")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-16">فائتة</span>
                <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500/80 rounded-full flex items-center justify-end pr-2"
                    style={{
                      width:
                        (data.missed_calls / totalDispositionCalls) * 100 + "%",
                    }}
                  >
                    <span className="text-[10px] font-bold text-white">
                      {(
                        (data.missed_calls / totalDispositionCalls) *
                        100
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                </div>
                <span className="text-xs text-white font-bold w-16">
                  {data.missed_calls.toLocaleString("ar-EG")}
                </span>
              </div>
              <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-[10px] text-slate-500">محكمة</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-[10px] text-slate-500">فائتة</span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyChartMessage />
          )}
        </ChartCard>

        {/* Incoming vs Outgoing */}
        <ChartCard
          title="الوارد مقابل الصادر"
          icon={<Phone className="w-4 h-4 text-purple-400" />}
        >
          {data.total_calls > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-16">وارد</span>
                <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500/80 rounded-full flex items-center justify-end pr-2"
                    style={{
                      width:
                        (data.inbound_calls / totalCallsDirection) * 100 + "%",
                    }}
                  >
                    <span className="text-[10px] font-bold text-white">
                      {(
                        (data.inbound_calls / totalCallsDirection) *
                        100
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                </div>
                <span className="text-xs text-white font-bold w-16">
                  {data.inbound_calls.toLocaleString("ar-EG")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-16">صادر</span>
                <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500/80 rounded-full flex items-center justify-end pr-2"
                    style={{
                      width:
                        (data.outbound_calls / totalCallsDirection) * 100 + "%",
                    }}
                  >
                    <span className="text-[10px] font-bold text-white">
                      {(
                        (data.outbound_calls / totalCallsDirection) *
                        100
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                </div>
                <span className="text-xs text-white font-bold w-16">
                  {data.outbound_calls.toLocaleString("ar-EG")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-16">داخلي</span>
                <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500/80 rounded-full flex items-center justify-end pr-2"
                    style={{
                      width:
                        (data.internal_calls / totalCallsDirection) * 100 + "%",
                    }}
                  >
                    <span className="text-[10px] font-bold text-white">
                      {(
                        (data.internal_calls / totalCallsDirection) *
                        100
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                </div>
                <span className="text-xs text-white font-bold w-16">
                  {data.internal_calls.toLocaleString("ar-EG")}
                </span>
              </div>
              <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] text-slate-500">وارد</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="text-[10px] text-slate-500">صادر</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  <span className="text-[10px] text-slate-500">داخلي</span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyChartMessage />
          )}
        </ChartCard>

        {/* Queue Performance Table */}
        <ChartCard
          title="أداء الطوابير"
          icon={<Users className="w-4 h-4 text-amber-400" />}
          className="lg:col-span-2"
        >
          {data.queue_performance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-right py-2 px-3 text-slate-400 font-bold">
                      الطابور
                    </th>
                    <th className="text-right py-2 px-3 text-slate-400 font-bold">
                      محكّة
                    </th>
                    <th className="text-right py-2 px-3 text-slate-400 font-bold">
                      فائتة
                    </th>
                    <th className="text-right py-2 px-3 text-slate-400 font-bold">
                      متوسط الانتظار
                    </th>
                    <th className="text-right py-2 px-3 text-slate-400 font-bold">
                      SLA
                    </th>
                    <th className="text-right py-2 px-3 text-slate-400 font-bold">
                      الأداء
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.queue_performance.map((q, i) => (
                    <tr
                      key={i}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 px-3 text-white font-bold">
                        {q.queue}
                      </td>
                      <td className="py-2.5 px-3 text-green-400 font-bold">
                        {q.answered}
                      </td>
                      <td className="py-2.5 px-3 text-red-400 font-bold">
                        {q.abandoned}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {formatSec(q.avg_wait)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={
                            "px-2 py-0.5 rounded-full text-[10px] font-bold " +
                            (q.sla >= 80
                              ? "bg-green-500/20 text-green-400"
                              : q.sla >= 60
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400")
                          }
                        >
                          {q.sla.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-0.5">
                          <div
                            className="h-4 bg-green-500/70 rounded-l"
                            style={{
                              width:
                                (q.answered / maxQueueCalls) * 80 + "px",
                            }}
                          />
                          <div
                            className="h-4 bg-red-500/70 rounded-r"
                            style={{
                              width:
                                (q.abandoned / maxQueueCalls) * 80 + "px",
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyChartMessage />
          )}
        </ChartCard>
      </div>

      {/* ── Charts Row 2: Agents, Customers, Peak Hours ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Agents */}
        <ChartCard
          title="أفضل الوكلاء"
          icon={<Users className="w-4 h-4 text-cyan-400" />}
        >
          {data.top_agents.length > 0 ? (
            <div className="space-y-2.5">
              {data.top_agents.slice(0, 8).map((a, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <span
                    className={
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black " +
                      (i === 0
                        ? "bg-yellow-500/20 text-yellow-400"
                        : i === 1
                          ? "bg-slate-400/20 text-slate-300"
                          : i === 2
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-slate-800 text-slate-500")
                    }
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-white font-bold truncate">
                        {a.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {a.extension}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500/70 rounded-full transition-all"
                          style={{
                            width: (a.answered / maxAgentCalls) * 100 + "%",
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-cyan-400 font-bold w-8 text-left">
                        {a.answered}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-600">
                      متوسط: {formatSec(a.avg_time)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChartMessage />
          )}
        </ChartCard>

        {/* Top Customers */}
        <ChartCard
          title="أكثر العملاء اتصالاً"
          icon={<Phone className="w-4 h-4 text-pink-400" />}
        >
          {data.top_customers.length > 0 ? (
            <div className="space-y-2.5">
              {data.top_customers.slice(0, 8).map((c, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <span
                    className={
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black " +
                      (i === 0
                        ? "bg-yellow-500/20 text-yellow-400"
                        : i === 1
                          ? "bg-slate-400/20 text-slate-300"
                          : i === 2
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-slate-800 text-slate-500")
                    }
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-white font-bold truncate">
                        {c.name || "غير معروف"}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {c.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-pink-500/70 rounded-full transition-all"
                          style={{
                            width: (c.calls / maxCustomerCalls) * 100 + "%",
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-pink-400 font-bold w-8 text-left">
                        {c.calls}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-600">
                      آخر اتصال:{" "}
                      {c.last_call ? formatDateStr(c.last_call) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChartMessage />
          )}
        </ChartCard>

        {/* Peak Hours Heatmap */}
        <ChartCard
          title="ساعات الذروة"
          icon={<Clock className="w-4 h-4 text-red-400" />}
        >
          {data.peak_hours.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: 24 }).map((_, hour) => {
                  const peak = data.peak_hours.find((p) => p.hour === hour);
                  const calls = peak?.calls || 0;
                  const maxPeak = Math.max(
                    ...data.peak_hours.map((p) => p.calls),
                    1
                  );
                  const intensity = calls / maxPeak;
                  return (
                    <div
                      key={hour}
                      className="group relative aspect-square rounded flex items-center justify-center cursor-default"
                      style={{
                        backgroundColor:
                          intensity === 0
                            ? "rgb(30 41 59 / 0.5)"
                            : intensity < 0.33
                              ? "rgb(239 68 68 / 0.2)"
                              : intensity < 0.66
                                ? "rgb(239 68 68 / 0.5)"
                                : "rgb(239 68 68 / 0.85)",
                      }}
                    >
                      <span className="text-[8px] text-slate-500 font-bold">
                        {hour}
                      </span>
                      <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-xl">
                        {hour}:00 — {calls} مكالمة
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-2 text-[9px] text-slate-500">
                <span>قليل</span>
                <div className="flex gap-0.5">
                  <div className="w-3 h-3 rounded bg-slate-800" />
                  <div className="w-3 h-3 rounded bg-red-500/20" />
                  <div className="w-3 h-3 rounded bg-red-500/50" />
                  <div className="w-3 h-3 rounded bg-red-500/85" />
                </div>
                <span>كثيف</span>
              </div>
            </div>
          ) : (
            <EmptyChartMessage />
          )}
        </ChartCard>
      </div>

      {/* ── Charts Row 3: Trend + Branch Comparison ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Volume Trend */}
        <ChartCard
          title="اتجاه حجم المكالمات"
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
        >
          {data.calls_per_day.length > 0 ? (
            <div className="relative h-32">
              <div className="absolute inset-0 flex items-end gap-px">
                {data.calls_per_day.map((d, i) => {
                  const maxTrend = Math.max(
                    ...data.calls_per_day.map((x) => x.count),
                    1
                  );
                  return (
                    <div
                      key={i}
                      className="flex-1 group relative"
                      style={{
                        height: (d.count / maxTrend) * 100 + "%",
                      }}
                    >
                      <div className="absolute inset-0 bg-emerald-500/60 rounded-t hover:bg-emerald-400 transition-colors" />
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-xl">
                        {d.date.slice(5)}: {d.count}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="absolute bottom-0 inset-x-0 h-px bg-white/5" />
            </div>
          ) : (
            <EmptyChartMessage />
          )}
        </ChartCard>

        {/* Branch Comparison */}
        {data.branch_comparison.length > 0 && (
          <ChartCard
            title="مقارنة الفروع"
            icon={<BarChart3 className="w-4 h-4 text-indigo-400" />}
          >
            <div className="space-y-3">
              {data.branch_comparison
                .slice()
                .sort((a, b) => b.calls - a.calls)
                .map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-20 truncate">
                      {b.branch}
                    </span>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-blue-500/70 rounded-l-full"
                          style={{
                            width:
                              (b.answered / maxBranchCalls) * 100 + "%",
                          }}
                        />
                        <div
                          className="h-full bg-red-500/50 rounded-r-full"
                          style={{
                            width:
                              ((b.calls - b.answered) / maxBranchCalls) *
                                100 +
                              "%",
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-white font-bold w-10 text-left">
                        {b.calls.toLocaleString("ar-EG")}
                      </span>
                    </div>
                  </div>
                ))}
              <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] text-slate-500">محكمة</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-[10px] text-slate-500">فائتة</span>
                </div>
              </div>
            </div>
          </ChartCard>
        )}
      </div>
    </div>
  );
};
