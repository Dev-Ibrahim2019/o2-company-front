import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Trophy,
  Medal,
  TrendingUp,
  TrendingDown,
  Users,
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneForwarded,
  Clock,
  Timer,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Target,
  Award,
  AlertCircle,
  RefreshCw,
  Headphones,
  Zap,
  User,
  Briefcase,
  Calendar,
  Clock3,
} from "lucide-react";
import { callCenterPbxService } from "../../../services/callCenterPbxService";
import type { AgentPerformance, AgentStatus } from "../../../types/callCenterPbx";
import {
  formatDuration,
  formatPercent,
  AGENT_STATUS_LABELS,
} from "../../../types/callCenterPbx";
import {
  StatsCardSkeleton,
  StatsCard,
  EmptyState,
  SearchInput,
  AgentStatusBadge,
  UserAvatar,
  ProgressRing,
} from "./PbxSharedComponents";

type SortField =
  | "productivity_score"
  | "answered_calls"
  | "missed_calls"
  | "avg_talk_time"
  | "calls_today"
  | "occupancy_rate"
  | "name";

type SortDirection = "asc" | "desc";

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
};

const getScoreBg = (score: number) => {
  if (score >= 80) return "bg-green-500/10";
  if (score >= 60) return "bg-yellow-500/10";
  if (score >= 40) return "bg-orange-500/10";
  return "bg-red-500/10";
};

const getScoreRingColor = (score: number) => {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
};

const getMedalIcon = (position: number) => {
  switch (position) {
    case 0:
      return <Trophy size={18} className="text-yellow-400" />;
    case 1:
      return <Medal size={18} className="text-slate-300" />;
    case 2:
      return <Medal size={18} className="text-amber-600" />;
    default:
      return null;
  }
};

const getMedalBg = (position: number) => {
  switch (position) {
    case 0:
      return "bg-yellow-500/10 border-yellow-500/30";
    case 1:
      return "bg-slate-500/10 border-slate-500/30";
    case 2:
      return "bg-amber-500/10 border-amber-500/30";
    default:
      return "bg-slate-800 border-white/10";
  }
};

const BarChartSimple: React.FC<{
  data: { label: string; value: number; maxValue: number; color: string }[];
}> = ({ data }) => {
  return (
    <div className="space-y-2">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold w-16 text-left truncate">
            {item.label}
          </span>
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${item.maxValue > 0 ? (item.value / item.maxValue) * 100 : 0}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
          <span className="text-[10px] text-white font-bold w-8 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

interface AgentRowProps {
  agent: AgentPerformance;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
  maxCalls: number;
  maxTalkTime: number;
}

const AgentRow: React.FC<AgentRowProps> = ({
  agent,
  rank,
  expanded,
  onToggle,
  maxCalls,
  maxTalkTime,
}) => {
  const callMetrics = [
    {
      label: "تم الرد",
      value: agent.answered_calls,
      color: "#22c55e",
      maxValue: maxCalls,
    },
    {
      label: "تم الفواتير",
      value: agent.outgoing_calls,
      color: "#3b82f6",
      maxValue: maxCalls,
    },
    {
      label: "مفقودة",
      value: agent.missed_calls,
      color: "#ef4444",
      maxValue: maxCalls,
    },
    {
      label: "تحويل",
      value: agent.transferred_calls,
      color: "#a855f7",
      maxValue: maxCalls,
    },
  ];

  const timeMetrics = [
    {
      label: "متوسط الحديث",
      value: formatDuration(Math.floor(agent.avg_talk_time)),
      icon: <PhoneCall size={10} className="text-green-400" />,
    },
    {
      label: "متوسط الإغلاق",
      value: formatDuration(Math.floor(agent.avg_wrap_time)),
      icon: <Timer size={10} className="text-orange-400" />,
    },
    {
      label: "متوسط الانتظار",
      value: formatDuration(Math.floor(agent.avg_wait_time)),
      icon: <Clock size={10} className="text-blue-400" />,
    },
    {
      label: "أطول مكالمة",
      value: formatDuration(Math.floor(agent.longest_call)),
      icon: <TrendingUp size={10} className="text-purple-400" />,
    },
    {
      label: "أقصر مكالمة",
      value: formatDuration(Math.floor(agent.shortest_call)),
      icon: <TrendingDown size={10} className="text-cyan-400" />,
    },
  ];

  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden hover:border-red-500/20 transition-all">
      {/* Main Row */}
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-slate-500 w-6 text-center">#{rank}</span>
            <div className="relative">
              <UserAvatar name={agent.name} size="md" />
              <div
                className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                  agent.status === "available"
                    ? "bg-green-400"
                    : agent.status === "on_call"
                    ? "bg-blue-400"
                    : agent.status === "busy"
                    ? "bg-red-400"
                    : agent.status === "paused"
                    ? "bg-yellow-400"
                    : "bg-slate-500"
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-black text-white">{agent.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-slate-500 font-mono">{agent.extension}</p>
                <AgentStatusBadge status={agent.status} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Calls Today */}
            <div className="text-center hidden sm:block">
              <p className="text-xs font-black text-white">{agent.calls_today}</p>
              <p className="text-[10px] text-slate-500">مكالمات اليوم</p>
            </div>

            {/* Productivity Score Ring */}
            <div className="flex flex-col items-center gap-0.5">
              <ProgressRing
                percent={agent.productivity_score}
                size={40}
                color={getScoreRingColor(agent.productivity_score)}
              />
              <p className="text-[10px] text-slate-500 font-bold">الإنتاجية</p>
            </div>

            {/* Score Badge */}
            <div
              className={`px-3 py-1 rounded-xl text-xs font-black ${getScoreBg(
                agent.productivity_score
              )} ${getScoreColor(agent.productivity_score)}`}
            >
              {agent.productivity_score.toFixed(0)}
            </div>

            {expanded ? (
              <ChevronUp size={16} className="text-slate-400" />
            ) : (
              <ChevronDown size={16} className="text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4">
          {/* KPIs */}
          <div>
            <h4 className="text-xs font-black text-white mb-2 flex items-center gap-2">
              <Target size={12} className="text-red-500" />
              مؤشرات الأداء
            </h4>
            <BarChartSimple data={callMetrics} />
          </div>

          {/* Time Metrics */}
          <div>
            <h4 className="text-xs font-black text-white mb-2 flex items-center gap-2">
              <Clock3 size={12} className="text-red-500" />
              مقاييس الوقت
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {timeMetrics.map((metric, idx) => (
                <div key={idx} className="bg-slate-800 rounded-xl p-2.5">
                  <div className="flex items-center gap-1 mb-1">{metric.icon}</div>
                  <p className="text-[10px] text-slate-400 font-bold">{metric.label}</p>
                  <p className="text-xs font-black text-white">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Productivity Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Occupancy Rate */}
            <div className="bg-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400 font-bold">معدل الشغل</span>
                <span className={`text-xs font-black ${getScoreColor(agent.occupancy_rate)}`}>
                  {agent.occupancy_rate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(agent.occupancy_rate, 100)}%` }}
                />
              </div>
            </div>

            {/* Productivity Score */}
            <div className="bg-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400 font-bold">درجة الإنتاجية</span>
                <span className={`text-xs font-black ${getScoreColor(agent.productivity_score)}`}>
                  {agent.productivity_score.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(agent.productivity_score, 100)}%`,
                    backgroundColor: getScoreRingColor(agent.productivity_score),
                  }}
                />
              </div>
            </div>
          </div>

          {/* Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Calendar size={14} className="text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold">ساعات اليوم</p>
                <p className="text-xs font-black text-white">
                  {agent.hours_today.toFixed(1)} ساعة
                </p>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Clock3 size={14} className="text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold">إجمالي الحديث</p>
                <p className="text-xs font-black text-white">
                  {formatDuration(Math.floor(agent.total_talk_time))}
                </p>
              </div>
            </div>
          </div>

          {/* Current Call */}
          {agent.current_call && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <PhoneCall size={12} className="text-blue-400" />
                <span className="text-[10px] text-blue-400 font-bold">مكالمة حالية</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-slate-500">العميل: </span>
                  <span className="text-white font-bold">
                    {agent.current_call.caller_id_name || agent.current_call.caller_id_num}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">المدة: </span>
                  <span className="text-white font-bold">
                    {formatDuration(agent.current_call.duration)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AgentPerformancePage: React.FC = () => {
  const [agents, setAgents] = useState<AgentPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("productivity_score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callCenterPbxService.getAgents();
      setAgents(data);
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const filteredAgents = useMemo(() => {
    let result = agents;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.extension.includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === "string") {
        valA = valA.toLowerCase() as any;
        valB = (valB as any).toLowerCase();
      }
      if (sortDirection === "asc") {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      }
      return valA < valB ? 1 : valA > valB ? -1 : 0;
    });
    return result;
  }, [agents, search, sortField, sortDirection]);

  const topPerformers = useMemo(
    () =>
      [...agents]
        .sort((a, b) => b.productivity_score - a.productivity_score)
        .slice(0, 3),
    [agents]
  );

  const needsAttention = useMemo(
    () => agents.filter((a) => a.productivity_score < 50 || a.missed_calls > 5),
    [agents]
  );

  const summaryStats = useMemo(() => {
    const totalAgents = agents.length;
    const avgProductivity =
      agents.length > 0
        ? agents.reduce((sum, a) => sum + a.productivity_score, 0) / agents.length
        : 0;
    const topPerf =
      agents.length > 0
        ? agents.reduce((best, a) =>
            a.productivity_score > best.productivity_score ? a : best
          )
        : null;
    return { totalAgents, avgProductivity, topPerf };
  }, [agents]);

  const maxCalls = useMemo(
    () => Math.max(1, ...agents.map((a) => a.answered_calls)),
    [agents]
  );

  const maxTalkTime = useMemo(
    () => Math.max(1, ...agents.map((a) => a.avg_talk_time)),
    [agents]
  );

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("desc");
      }
    },
    [sortField]
  );

  const toggleAgent = useCallback((extension: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(extension)) {
        next.delete(extension);
      } else {
        next.add(extension);
      }
      return next;
    });
  }, []);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <TrendingUp size={10} className="text-red-400" />
    ) : (
      <TrendingDown size={10} className="text-red-400" />
    );
  };

  const availableAgents = useMemo(
    () => agents.filter((a) => a.status === "available").length,
    [agents]
  );

  const onCallAgents = useMemo(
    () => agents.filter((a) => a.status === "on_call").length,
    [agents]
  );

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Trophy size={20} className="text-red-500" />
            أداء الوكلاء
          </h2>
          <p className="text-xs text-slate-400">لوحة مؤشرات الأداء الشاملة للوكلاء</p>
        </div>
        <button
          onClick={loadAgents}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 border border-white/10 rounded-xl text-xs font-bold hover:border-red-500/50 transition-all"
        >
          <RefreshCw size={12} />
          تحديث
        </button>
      </div>

      {/* Summary Stats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatsCard
            icon={<Users size={16} />}
            label="إجمالي الوكلاء"
            value={summaryStats.totalAgents.toLocaleString("ar-EG")}
            color="red"
          />
          <StatsCard
            icon={<TrendingUp size={16} />}
            label="متوسط الإنتاجية"
            value={`${summaryStats.avgProductivity.toFixed(1)}%`}
            color="green"
          />
          <StatsCard
            icon={<PhoneCall size={16} />}
            label="متاحون الآن"
            value={availableAgents.toLocaleString("ar-EG")}
            color="blue"
          />
          <StatsCard
            icon={<Phone size={16} />}
            label="في مكالمة"
            value={onCallAgents.toLocaleString("ar-EG")}
            color="purple"
          />
        </div>
      )}

      {/* Top Performers Section */}
      {!loading && topPerformers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-black text-white flex items-center gap-2">
            <Award size={14} className="text-yellow-400" />
            أفضل الوكلاء أداءً
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topPerformers.map((agent, idx) => (
              <div
                key={agent.extension}
                className={`bg-slate-900 border rounded-xl p-4 ${getMedalBg(idx)}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <UserAvatar name={agent.name} size="lg" />
                    <div className="absolute -top-2 -right-2">
                      {getMedalIcon(idx)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{agent.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{agent.extension}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ProgressRing
                      percent={agent.productivity_score}
                      size={36}
                      color={getScoreRingColor(agent.productivity_score)}
                    />
                    <div>
                      <p className="text-lg font-black text-white">{agent.calls_today}</p>
                      <p className="text-[10px] text-slate-500">مكالمات اليوم</p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-xl text-sm font-black ${getScoreBg(
                      agent.productivity_score
                    )} ${getScoreColor(agent.productivity_score)}`}
                  >
                    {agent.productivity_score.toFixed(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Needs Attention Section */}
      {!loading && needsAttention.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-black text-white flex items-center gap-2">
            <AlertCircle size={14} className="text-orange-400" />
            يحتاج اهتمام ({needsAttention.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {needsAttention.map((agent) => (
              <div
                key={agent.extension}
                className="bg-orange-500/5 border border-orange-500/20 rounded-xl px-3 py-2 flex items-center gap-2"
              >
                <div className="relative">
                  <UserAvatar name={agent.name} size="sm" />
                  <div className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 bg-orange-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{agent.name}</p>
                  <p className="text-[10px] text-orange-300">
                    {agent.missed_calls > 5 && `${agent.missed_calls} مكالمة مفقودة`}
                    {agent.missed_calls > 5 && agent.productivity_score < 50 && " | "}
                    {agent.productivity_score < 50 &&
                      `إنتاجية ${agent.productivity_score.toFixed(0)}%`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Sort */}
      {!loading && agents.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الامتداد..."
              className="w-full bg-slate-800 border border-white/10 rounded-lg py-1.5 pr-8 pl-3 text-xs text-white focus:outline-none focus:border-red-500/50 placeholder-slate-500"
            />
          </div>
          <div className="flex gap-1">
            {(
              [
                { field: "productivity_score" as SortField, label: "الإنتاجية" },
                { field: "answered_calls" as SortField, label: "تم الرد" },
                { field: "calls_today" as SortField, label: "اليوم" },
                { field: "occupancy_rate" as SortField, label: "الشغل" },
              ] as const
            ).map((item) => (
              <button
                key={item.field}
                onClick={() => handleSort(item.field)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  sortField === item.field
                    ? "bg-red-600 text-white"
                    : "bg-slate-800 text-slate-400 border border-white/10 hover:border-red-500/50"
                }`}
              >
                {item.label}
                {getSortIcon(item.field)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Agent List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-900 border border-white/10 rounded-xl p-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-full" />
                  <div className="space-y-1.5">
                    <div className="h-3 bg-slate-800 rounded w-24" />
                    <div className="h-2 bg-slate-800 rounded w-16" />
                  </div>
                </div>
                <div className="h-8 w-8 bg-slate-800 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <EmptyState
          icon={<Users size={40} />}
          title="لا يوجد وكلاء"
          description={search ? "لا توجد نتائج مطابقة لمعايير البحث" : "لم يتم العثور على أي وكيل"}
        />
      ) : (
        <div className="space-y-2">
          {filteredAgents.map((agent, idx) => (
            <AgentRow
              key={agent.extension}
              agent={agent}
              rank={idx + 1}
              expanded={expandedAgents.has(agent.extension)}
              onToggle={() => toggleAgent(agent.extension)}
              maxCalls={maxCalls}
              maxTalkTime={maxTalkTime}
            />
          ))}
        </div>
      )}

      {/* Charts Section */}
      {!loading && agents.length > 0 && (
        <div className="bg-slate-900 border border-white/10 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-black text-white flex items-center gap-2">
            <BarChart3 size={14} className="text-red-500" />
            مقارنة الأداء
          </h3>

          {/* Answered Calls Comparison */}
          <div>
            <p className="text-[10px] text-slate-400 font-bold mb-2">المكالمات المردودة</p>
            <BarChartSimple
              data={agents.slice(0, 8).map((a) => ({
                label: a.name.split(" ")[0],
                value: a.answered_calls,
                maxValue: maxCalls,
                color: "#22c55e",
              }))}
            />
          </div>

          {/* Missed Calls Comparison */}
          <div>
            <p className="text-[10px] text-slate-400 font-bold mb-2">المكالمات المفقودة</p>
            <BarChartSimple
              data={agents.slice(0, 8).map((a) => ({
                label: a.name.split(" ")[0],
                value: a.missed_calls,
                maxValue: Math.max(1, ...agents.map((x) => x.missed_calls)),
                color: "#ef4444",
              }))}
            />
          </div>

          {/* Productivity Score Comparison */}
          <div>
            <p className="text-[10px] text-slate-400 font-bold mb-2">درجة الإنتاجية</p>
            <BarChartSimple
              data={agents.slice(0, 8).map((a) => ({
                label: a.name.split(" ")[0],
                value: Math.round(a.productivity_score),
                maxValue: 100,
                color: getScoreRingColor(a.productivity_score),
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export { AgentPerformancePage };
export default AgentPerformancePage;
