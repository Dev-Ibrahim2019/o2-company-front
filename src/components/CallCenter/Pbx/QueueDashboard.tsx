import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Headphones,
  Phone,
  Clock,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  User,
  PhoneCall,
  PhoneOff,
  Timer,
  Pause,
  Wifi,
  WifiOff,
  BarChart3,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { callCenterPbxService } from "../../../services/callCenterPbxService";
import type { QueueInfo, QueueMember, AgentStatus, LiveCall } from "../../../types/callCenterPbx";
import {
  formatDuration,
  AGENT_STATUS_LABELS,
  QUEUE_HEALTH_LABELS,
  QUEUE_HEALTH_COLORS,
} from "../../../types/callCenterPbx";
import {
  StatsCardSkeleton,
  StatsCard,
  EmptyState,
  HealthIndicator,
  AgentStatusBadge,
  UserAvatar,
  ProgressRing,
} from "./PbxSharedComponents";

interface QueueCardProps {
  queue: QueueInfo;
  expanded: boolean;
  onToggle: () => void;
}

const QUEUE_REFRESH_INTERVAL = 5000;

const getHealthIcon = (health: string) => {
  switch (health) {
    case "healthy":
      return <ShieldCheck size={16} className="text-green-400" />;
    case "warning":
      return <ShieldAlert size={16} className="text-yellow-400" />;
    case "critical":
      return <ShieldAlert size={16} className="text-red-400" />;
    default:
      return <Shield size={16} className="text-slate-400" />;
  }
};

const getHealthBorderColor = (health: string) => {
  switch (health) {
    case "healthy":
      return "border-green-500/30";
    case "warning":
      return "border-yellow-500/30";
    case "critical":
      return "border-red-500/30";
    default:
      return "border-white/10";
  }
};

const getHealthBgColor = (health: string) => {
  switch (health) {
    case "healthy":
      return "bg-green-500/10";
    case "warning":
      return "bg-yellow-500/10";
    case "critical":
      return "bg-red-500/10";
    default:
      return "bg-slate-800";
  }
};

const getStatusDotColor = (status?: AgentStatus) => {
  switch (status) {
    case "available":
      return "bg-green-400";
    case "on_call":
      return "bg-blue-400";
    case "busy":
      return "bg-red-400";
    case "paused":
      return "bg-yellow-400";
    case "wrap_up":
      return "bg-orange-400";
    default:
      return "bg-slate-500";
  }
};

const QueueCard: React.FC<QueueCardProps> = ({ queue, expanded, onToggle }) => {
  const totalMembers = queue.members?.length ?? 0;
  const availableMembers = queue.available_agents ?? 0;
  const busyMembers = queue.busy_agents ?? 0;
  const pausedMembers = queue.paused_agents ?? 0;
  const offlineMembers = Math.max(0, totalMembers - availableMembers - busyMembers - pausedMembers);

  const totalCalls = queue.callscompleted ?? 0;
  const abandonedCalls = queue.callscompletedabandoned ?? 0;
  const answerRate = totalCalls > 0 ? ((totalCalls - abandonedCalls) / totalCalls) * 100 : 0;
  const abandonRate = totalCalls > 0 ? (abandonedCalls / totalCalls) * 100 : 0;

  const slaPercent = queue.sla_percent ?? 0;

  const longestWaitingMinutes = queue.longest_waiting
    ? Math.floor(queue.longest_waiting / 60)
    : 0;
  const longestWaitingSeconds = queue.longest_waiting ? queue.longest_waiting % 60 : 0;

  const getSLAColor = (sla: number) => {
    if (sla >= 80) return "text-green-400";
    if (sla >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div
      className={`bg-slate-900 border rounded-xl overflow-hidden transition-all ${getHealthBorderColor(queue.health)}`}
    >
      {/* Queue Header */}
      <div
        className={`p-4 cursor-pointer hover:bg-white/5 transition-colors`}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getHealthBgColor(queue.health)}`}>
              {getHealthIcon(queue.health)}
            </div>
            <div>
              <h3 className="text-sm font-black text-white">{queue.name}</h3>
              <p className="text-[10px] text-slate-400">
                {QUEUE_HEALTH_LABELS[queue.health] ?? queue.health}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Waiting Calls - Big Number */}
            <div className="text-center">
              <p
                className={`text-2xl font-black ${
                  queue.callswaiting > 0 ? "text-red-400" : "text-green-400"
                }`}
              >
                {queue.callswaiting}
              </p>
              <p className="text-[10px] text-slate-500 font-bold">في الانتظار</p>
            </div>

            {/* SLA Ring */}
            <div className="flex flex-col items-center gap-0.5">
              <ProgressRing
                percent={slaPercent}
                size={44}
                color={slaPercent >= 80 ? "#22c55e" : slaPercent >= 60 ? "#eab308" : "#ef4444"}
              />
              <p className="text-[10px] text-slate-500 font-bold">SLA</p>
            </div>

            {expanded ? (
              <ChevronUp size={16} className="text-slate-400" />
            ) : (
              <ChevronDown size={16} className="text-slate-400" />
            )}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="text-center">
            <p className="text-xs font-black text-green-400">{availableMembers}</p>
            <p className="text-[10px] text-slate-500">متاح</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-blue-400">{busyMembers}</p>
            <p className="text-[10px] text-slate-500">مشغول</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-yellow-400">{pausedMembers}</p>
            <p className="text-[10px] text-slate-500">متوقف</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-slate-400">{offlineMembers}</p>
            <p className="text-[10px] text-slate-500">غير متصل</p>
          </div>
        </div>

        {/* Answer / Abandon Bar */}
        {totalCalls > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-green-400 font-bold">
                تم الرد {answerRate.toFixed(1)}%
              </span>
              <span className="text-[10px] text-red-400 font-bold">
                تم التخلي {abandonRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${answerRate}%` }}
              />
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${abandonRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-slate-500">{totalCalls - abandonedCalls} مكالمة</span>
              <span className="text-[10px] text-slate-500">{abandonedCalls} مكالمة متروكة</span>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4">
          {/* Avg Waiting & Longest Waiting */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Timer size={12} className="text-blue-400" />
                <span className="text-[10px] text-slate-400 font-bold">متوسط وقت الانتظار</span>
              </div>
              <p className="text-sm font-black text-white">
                {formatDuration(Math.floor(queue.avg_waiting_time ?? 0))}
              </p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={12} className="text-orange-400" />
                <span className="text-[10px] text-slate-400 font-bold">أطول وقت انتظار</span>
              </div>
              <p className="text-sm font-black text-white">
                {longestWaitingMinutes > 0
                  ? `${longestWaitingMinutes} د ${longestWaitingSeconds} ث`
                  : "0 ثانية"}
              </p>
            </div>
          </div>

          {/* Longest Waiting Customer */}
          {queue.longest_waiting > 0 && (
            <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Phone size={14} className="text-orange-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold">أطول عميل في الانتظار</p>
                <p className="text-xs text-white font-black">
                  {formatDuration(queue.longest_waiting)}
                </p>
              </div>
            </div>
          )}

          {/* Members Section */}
          <div>
            <h4 className="text-xs font-black text-white mb-2 flex items-center gap-2">
              <Users size={14} className="text-red-500" />
              أعضاء الQueue ({totalMembers})
            </h4>
            {totalMembers === 0 ? (
              <p className="text-[10px] text-slate-500 text-center py-4">لا يوجد أعضاء</p>
            ) : (
              <div className="space-y-2">
                {queue.members.map((member, idx) => (
                  <MemberRow key={member.memberName + idx} member={member} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MemberRow: React.FC<{ member: QueueMember }> = ({ member }) => {
  const [showCallInfo, setShowCallInfo] = useState(false);
  const hasCall = !!member.current_call;

  const formatLastCall = (lastCall: string) => {
    if (!lastCall || lastCall === "0" || lastCall === "Never") return "لم يُتصل بعد";
    try {
      const d = new Date(lastCall);
      if (isNaN(d.getTime())) return lastCall;
      return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch {
      return lastCall;
    }
  };

  return (
    <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3 hover:bg-slate-800 transition-colors">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => hasCall && setShowCallInfo(!showCallInfo)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <UserAvatar name={member.memberName} size="sm" />
            <div
              className={`absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-800 ${getStatusDotColor(
                member.status
              )}`}
            />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{member.memberName}</p>
            <p className="text-[10px] text-slate-500 font-mono">
              {member.extension ?? member.memberName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AgentStatusBadge status={member.status ?? (member.paused ? "paused" : "offline")} />
          {member.callsTaken > 0 && (
            <span className="text-[10px] text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full font-bold">
              {member.callsTaken} مكالمة
            </span>
          )}
        </div>
      </div>

      {/* Member Details */}
      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/5">
        <div className="text-center">
          <p className="text-[10px] text-slate-500">المكالمات اليوم</p>
          <p className="text-xs font-black text-white">{member.callsTaken}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500">الوقت الأخير</p>
          <p className="text-[10px] text-white font-bold">{formatLastCall(member.lastCall)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500">ال罰則</p>
          <p className="text-xs font-black text-white">{member.penalty}</p>
        </div>
      </div>

      {/* Current Call Info */}
      {showCallInfo && hasCall && member.current_call && (
        <div className="mt-2 pt-2 border-t border-white/5 bg-blue-500/5 rounded-lg p-2">
          <div className="flex items-center gap-2 mb-1">
            <PhoneCall size={10} className="text-blue-400" />
            <span className="text-[10px] text-blue-400 font-bold">مكالمة حالية</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-slate-500">العميل: </span>
              <span className="text-white font-bold">
                {member.current_call.caller_id_name || member.current_call.caller_id_num}
              </span>
            </div>
            <div>
              <span className="text-slate-500">المدة: </span>
              <span className="text-white font-bold">
                {formatDuration(member.current_call.duration)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const QueueDashboard: React.FC = () => {
  const [queues, setQueues] = useState<QueueInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedQueues, setExpandedQueues] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadQueues = useCallback(async () => {
    try {
      const data = await callCenterPbxService.getQueues();
      setQueues(data);
      setLastRefresh(new Date());
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueues();
  }, [loadQueues]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadQueues, QUEUE_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [autoRefresh, loadQueues]);

  const toggleQueue = useCallback((name: string) => {
    setExpandedQueues((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const summaryStats = useMemo(() => {
    const totalQueues = queues.length;
    const totalWaiting = queues.reduce((sum, q) => sum + (q.callswaiting ?? 0), 0);
    const totalAgents = queues.reduce(
      (sum, q) => sum + (q.available_agents ?? 0) + (q.busy_agents ?? 0) + (q.paused_agents ?? 0),
      0
    );
    const totalAvailable = queues.reduce((sum, q) => sum + (q.available_agents ?? 0), 0);
    const avgWaitTime =
      queues.length > 0
        ? queues.reduce((sum, q) => sum + (q.avg_waiting_time ?? 0), 0) / queues.length
        : 0;
    return { totalQueues, totalWaiting, totalAgents, totalAvailable, avgWaitTime };
  }, [queues]);

  const criticalQueues = useMemo(
    () => queues.filter((q) => q.health === "critical"),
    [queues]
  );

  const warningQueues = useMemo(
    () => queues.filter((q) => q.health === "warning"),
    [queues]
  );

  const lastRefreshTime = useMemo(() => {
    return lastRefresh.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }, [lastRefresh]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Headphones size={20} className="text-red-500" />
            لوحة مراقبة Queue
          </h2>
          <p className="text-xs text-slate-400">مراقبة حية ل queues والوكلاء والانتظار</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono">
            آخر تحديث: {lastRefreshTime}
          </span>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              autoRefresh
                ? "bg-green-600 text-white"
                : "bg-slate-800 text-slate-300 border border-white/10 hover:border-red-500/50"
            }`}
          >
            <RefreshCw size={12} className={autoRefresh ? "animate-spin" : ""} />
            {autoRefresh ? "تحديث تلقائي" : "إيقاف التحديث"}
          </button>
          <button
            onClick={loadQueues}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 border border-white/10 rounded-xl text-xs font-bold hover:border-red-500/50 transition-all"
          >
            <RefreshCw size={12} />
            تحديث
          </button>
        </div>
      </div>

      {/* Critical / Warning Alerts */}
      {!loading && criticalQueues.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={14} className="text-red-400" />
          </div>
          <div>
            <p className="text-xs font-black text-red-400">
              تحذير: {criticalQueues.length} queue في حالة حرجة
            </p>
            <p className="text-[10px] text-red-300/70">
              {criticalQueues.map((q) => q.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {!loading && warningQueues.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={14} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-xs font-black text-yellow-400">
              تنبيه: {warningQueues.length} queue في حالة تحذير
            </p>
            <p className="text-[10px] text-yellow-300/70">
              {warningQueues.map((q) => q.name).join(", ")}
            </p>
          </div>
        </div>
      )}

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
            icon={<Headphones size={16} />}
            label="إجمالي الQueues"
            value={summaryStats.totalQueues.toLocaleString("ar-EG")}
            color="red"
          />
          <StatsCard
            icon={<Phone size={16} />}
            label="في الانتظار"
            value={summaryStats.totalWaiting.toLocaleString("ar-EG")}
            color={summaryStats.totalWaiting > 0 ? "yellow" : "green"}
          />
          <StatsCard
            icon={<Users size={16} />}
            label="الوكلاء المتاحون"
            value={`${summaryStats.totalAvailable} / ${summaryStats.totalAgents}`}
            color="blue"
          />
          <StatsCard
            icon={<Clock size={16} />}
            label="متوسط وقت الانتظار"
            value={formatDuration(Math.floor(summaryStats.avgWaitTime))}
            color="purple"
          />
        </div>
      )}

      {/* Queue Cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-white/10 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-800 rounded-xl" />
                <div className="space-y-1.5">
                  <div className="h-3 bg-slate-800 rounded w-24" />
                  <div className="h-2 bg-slate-800 rounded w-16" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="text-center space-y-1">
                    <div className="h-4 bg-slate-800 rounded mx-auto w-8" />
                    <div className="h-2 bg-slate-800 rounded mx-auto w-12" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : queues.length === 0 ? (
        <EmptyState
          icon={<Headphones size={40} />}
          title="لا توجد queues"
          description="لم يتم العثور على أي queue نشط"
        />
      ) : (
        <div className="space-y-3">
          {queues.map((queue) => (
            <QueueCard
              key={queue.name}
              queue={queue}
              expanded={expandedQueues.has(queue.name)}
              onToggle={() => toggleQueue(queue.name)}
            />
          ))}
        </div>
      )}

      {/* Overall Summary */}
      {!loading && queues.length > 0 && (
        <div className="bg-slate-900 border border-white/10 rounded-xl p-4">
          <h3 className="text-xs font-black text-white mb-3 flex items-center gap-2">
            <BarChart3 size={14} className="text-red-500" />
            ملخص الأداء العام
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={12} className="text-green-400" />
                <span className="text-[10px] text-slate-400 font-bold">queues سليمة</span>
              </div>
              <p className="text-lg font-black text-green-400">
                {queues.filter((q) => q.health === "healthy").length}
              </p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={12} className="text-yellow-400" />
                <span className="text-[10px] text-slate-400 font-bold"> queues تحذيرية</span>
              </div>
              <p className="text-lg font-black text-yellow-400">
                {queues.filter((q) => q.health === "warning").length}
              </p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={12} className="text-red-400" />
                <span className="text-[10px] text-slate-400 font-bold"> queues حرجة</span>
              </div>
              <p className="text-lg font-black text-red-400">
                {queues.filter((q) => q.health === "critical").length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { QueueDashboard };
export default QueueDashboard;
