import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Phone,
  PhoneOff,
  RefreshCw,
  Users,
  Headphones,
  Clock,
  Volume2,
  AlertCircle,
  Wifi,
  WifiOff,
  X,
  ShoppingCart,
  ArrowRightLeft,
  Pause,
  Play,
  UserPlus,
  Mic,
  MicOff,
  Star,
  Zap,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { callCenterPbxService } from "../../../services/callCenterPbxService";
import type { LiveCall, QueueInfo, CallStatus } from "../../../types/callCenterPbx";
import {
  CALL_STATUS_LABELS,
  CALL_STATUS_COLORS,
  CALL_DIRECTION_LABELS,
  QUEUE_HEALTH_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  formatDuration,
  formatTime,
  formatPhoneDisplay,
} from "../../../types/callCenterPbx";
import {
  CallStatusBadge,
  DirectionBadge,
  StatsCard,
  DurationDisplay,
  UserAvatar,
  DirectionIcon,
  EmptyState,
  CallCardSkeleton,
  HealthIndicator,
} from "./PbxSharedComponents";

const REFRESH_INTERVAL = 5000;

export const LiveCallsDashboard: React.FC = () => {
  const [calls, setCalls] = useState<LiveCall[]>([]);
  const [queues, setQueues] = useState<QueueInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [connected, setConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [selectedCall, setSelectedCall] = useState<LiveCall | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const result = await callCenterPbxService.getLiveCalls();
      setCalls(result.calls || []);
      setQueues(result.queues || []);
      setLastUpdate(result.timestamp || new Date().toISOString());
      setConnected(true);
      setError(null);
    } catch (err: any) {
      setConnected(false);
      setError(err?.message || "خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchData]);

  const stats = useMemo(() => {
    const total = calls.length;
    const ringing = calls.filter((c) => c.status === "ringing").length;
    const answered = calls.filter((c) => c.status === "answered").length;
    const onHold = calls.filter((c) => c.status === "on_hold").length;
    const transferred = calls.filter((c) => c.status === "transferred").length;
    return { total, ringing, answered, onHold, transferred };
  }, [calls]);

  const filteredCalls = useMemo(() => {
    if (!searchTerm) return calls;
    const term = searchTerm.toLowerCase();
    return calls.filter(
      (c) =>
        c.caller_id_num.includes(term) ||
        c.caller_id_name?.toLowerCase().includes(term) ||
        c.connected_line_num.includes(term) ||
        c.connected_line_name?.toLowerCase().includes(term) ||
        c.customer_name?.toLowerCase().includes(term) ||
        c.agent?.toLowerCase().includes(term) ||
        c.queue?.toLowerCase().includes(term)
    );
  }, [calls, searchTerm]);

  const queueStats = useMemo(() => {
    return queues.map((q) => ({
      name: q.name,
      waiting: q.callswaiting,
      available: q.available_agents,
      busy: q.busy_agents,
      paused: q.paused_agents,
      sla: q.sla_percent,
      health: q.health,
      longestWait: q.longest_waiting,
    }));
  }, [queues]);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh((prev) => !prev);
  }, []);

  const handleCallClick = useCallback((call: LiveCall) => {
    setSelectedCall((prev) => (prev?.channel === call.channel ? null : call));
  }, []);

  const closePanel = useCallback(() => {
    setSelectedCall(null);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">المكالمات المباشرة</h2>
            <p className="text-xs text-slate-400">مراقبة المكالمات النشطة في الوقت الفعلي</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-2 bg-slate-800 rounded w-1/2" />
                  <div className="h-5 bg-slate-800 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CallCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Phone size={20} className="text-red-500" />
            المكالمات المباشرة
          </h2>
          <p className="text-xs text-slate-400">مراقبة المكالمات النشطة في الوقت الفعلي</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            {connected ? (
              <Wifi size={13} className="text-green-400" />
            ) : (
              <WifiOff size={13} className="text-red-400" />
            )}
            <span className={connected ? "text-green-400" : "text-red-400"}>
              {connected ? "متصل" : "غير متصل"}
            </span>
          </div>
          {lastUpdate && (
            <span className="text-[10px] text-slate-600">
              آخر تحديث: {formatTime(lastUpdate)}
            </span>
          )}
          <button
            onClick={toggleAutoRefresh}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              autoRefresh
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            <RefreshCw size={12} className={autoRefresh ? "animate-spin" : ""} />
            {autoRefresh ? "تحديث تلقائي" : "تحديث يدوي"}
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={12} />
            تحديث
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-400 font-bold">خطأ في الاتصال</p>
            <p className="text-xs text-red-400/70">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatsCard
          icon={<Phone size={18} />}
          label="المكالمات النشطة"
          value={stats.total}
          color="bg-slate-700"
        />
        <StatsCard
          icon={<Volume2 size={18} />}
          label="رنين"
          value={stats.ringing}
          color="bg-blue-600"
        />
        <StatsCard
          icon={<Headphones size={18} />}
          label="تم الرد"
          value={stats.answered}
          color="bg-green-600"
        />
        <StatsCard
          icon={<Pause size={18} />}
          label="في الانتظار"
          value={stats.onHold}
          color="bg-yellow-600"
        />
        <StatsCard
          icon={<ArrowRightLeft size={18} />}
          label="تحويل"
          value={stats.transferred}
          color="bg-purple-600"
        />
      </div>

      {/* Queue Summary */}
      {queueStats.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Users size={15} className="text-red-500" />
            ملخص الطوابير
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {queueStats.map((q) => (
              <div
                key={q.name}
                className="bg-slate-950 border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition-colors"
                style={{ color: "var(--o2-text)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold truncate">{q.name}</span>
                  <HealthIndicator health={q.health} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">بانتظار:</span>
                    <span className={`ml-1 font-bold ${q.waiting > 0 ? "text-yellow-400" : "text-slate-400"}`}>
                      {q.waiting}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">متاحون:</span>
                    <span className="ml-1 font-bold text-green-400">{q.available}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">مشغولون:</span>
                    <span className="ml-1 font-bold text-red-400">{q.busy}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">متوقفون:</span>
                    <span className="ml-1 font-bold text-yellow-400">{q.paused}</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">
                    أطول انتظار: <span className="text-slate-300 font-bold">{formatDuration(q.longestWait)}</span>
                  </span>
                  <span className="text-slate-500">
                    SLA: <span className="text-slate-300 font-bold">{q.sla.toFixed(0)}%</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="بحث بالاسم، رقم الهاتف، الوكيل، أو الطابور..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-600 transition-colors"
          style={{ color: "var(--o2-text)" }}
        />
        <Phone size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>

      {/* Active Calls List */}
      {filteredCalls.length === 0 ? (
        <EmptyState
          icon={<Phone size={28} />}
          title="لا توجد مكالمات نشطة"
          description="لا توجد مكالمات حالياً في الانتظار أو قيد المعالجة"
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full" style={{ color: "var(--o2-text)" }}>
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="px-4 py-3 text-right font-bold">الاتجاه</th>
                  <th className="px-4 py-3 text-right font-bold">ال咴الق</th>
                  <th className="px-4 py-3 text-right font-bold">ال咴الم</th>
                  <th className="px-4 py-3 text-right font-bold">الحالة</th>
                  <th className="px-4 py-3 text-right font-bold">المدة</th>
                  <th className="px-4 py-3 text-right font-bold">الوكيل</th>
                  <th className="px-4 py-3 text-right font-bold">الطابور</th>
                  <th className="px-4 py-3 text-right font-bold">الأولوية</th>
                  <th className="px-4 py-3 text-right font-bold">تسجيل</th>
                </tr>
              </thead>
              <tbody>
                {filteredCalls.map((call) => (
                  <tr
                    key={call.channel}
                    onClick={() => handleCallClick(call)}
                    className={`border-b border-slate-800/50 cursor-pointer transition-colors ${
                      selectedCall?.channel === call.channel
                        ? "bg-red-600/10 hover:bg-red-600/15"
                        : "hover:bg-slate-800/50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <DirectionIcon direction={call.direction} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={call.caller_id_name || call.caller_id_num} size="sm" />
                        <div>
                          <p className="text-xs font-bold">{call.caller_id_name || "مجهول"}</p>
                          <p className="text-[10px] text-slate-500">{formatPhoneDisplay(call.caller_id_num)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs font-bold">{call.connected_line_name || "—"}</p>
                        <p className="text-[10px] text-slate-500">{formatPhoneDisplay(call.connected_line_num)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <CallStatusBadge status={call.status} />
                    </td>
                    <td className="px-4 py-3">
                      <DurationDisplay seconds={call.talking_duration || call.ringing_duration} />
                    </td>
                    <td className="px-4 py-3">
                      {call.agent ? (
                        <div className="flex items-center gap-1.5">
                          <UserAvatar name={call.agent} size="sm" />
                          <div>
                            <p className="text-xs font-bold">{call.agent}</p>
                            {call.agent_extension && (
                              <p className="text-[10px] text-slate-500">Ext: {call.agent_extension}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {call.queue ? (
                        <span className="inline-flex items-center px-2 py-0.5 bg-slate-800 rounded text-xs font-bold text-slate-300">
                          {call.queue}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_COLORS[call.priority]}`}>
                        {call.priority === "vip" && <Star size={10} className="ml-0.5" />}
                        {call.priority === "urgent" && <Zap size={10} className="ml-0.5" />}
                        {PRIORITY_LABELS[call.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {call.has_recording ? (
                        <Mic size={14} className="text-green-400" />
                      ) : (
                        <MicOff size={14} className="text-slate-600" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filteredCalls.map((call) => (
              <div
                key={call.channel}
                onClick={() => handleCallClick(call)}
                className={`bg-slate-900 border rounded-xl p-4 transition-all ${
                  selectedCall?.channel === call.channel
                    ? "border-red-600 ring-1 ring-red-600/30"
                    : "border-slate-800 hover:border-slate-700"
                }`}
                style={{ color: "var(--o2-text)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <DirectionIcon direction={call.direction} />
                    <UserAvatar name={call.caller_id_name || call.caller_id_num} size="md" />
                    <div>
                      <p className="text-sm font-bold">{call.caller_id_name || "مجهول"}</p>
                      <p className="text-xs text-slate-400">{formatPhoneDisplay(call.caller_id_num)}</p>
                    </div>
                  </div>
                  <CallStatusBadge status={call.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">ال咴الم:</span>
                    <span className="mr-1 font-bold">{call.connected_line_name || call.connected_line_num || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">المدة:</span>
                    <span className="mr-1 font-mono font-bold">{formatDuration(call.talking_duration || call.ringing_duration)}</span>
                  </div>
                  {call.agent && (
                    <div>
                      <span className="text-slate-500">الوكيل:</span>
                      <span className="mr-1 font-bold">{call.agent}</span>
                    </div>
                  )}
                  {call.queue && (
                    <div>
                      <span className="text-slate-500">الطابور:</span>
                      <span className="mr-1 font-bold">{call.queue}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_COLORS[call.priority]}`}>
                    {PRIORITY_LABELS[call.priority]}
                  </span>
                  {call.has_recording && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-green-400">
                      <Mic size={10} /> مسجل
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Side Detail Panel */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 flex" dir="rtl">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closePanel} />
          <div className="absolute left-0 top-0 bottom-0 w-full max-w-md bg-slate-950 border-r border-slate-800 overflow-y-auto animate-in slide-in-from-left">
            {/* Panel Header */}
            <div className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Phone size={15} className="text-red-500" />
                تفاصيل المكالمة
              </h3>
              <button
                onClick={closePanel}
                className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-4 space-y-4" style={{ color: "var(--o2-text)" }}>
              {/* Caller Info */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <UserAvatar
                    name={selectedCall.caller_id_name || selectedCall.caller_id_num}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black truncate">
                      {selectedCall.customer_name || selectedCall.caller_id_name || "مجهول"}
                    </p>
                    <p className="text-sm text-slate-400" dir="ltr">
                      {formatPhoneDisplay(selectedCall.caller_id_num)}
                    </p>
                    {selectedCall.customer_name && (
                      <p className="text-[10px] text-green-400 mt-0.5">✓ عميل مسجل في النظام</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 rounded-lg p-2.5">
                    <p className="text-slate-500 mb-1">الحالة</p>
                    <CallStatusBadge status={selectedCall.status} />
                  </div>
                  <div className="bg-slate-950 rounded-lg p-2.5">
                    <p className="text-slate-500 mb-1">الاتجاه</p>
                    <DirectionBadge direction={selectedCall.direction} />
                  </div>
                  <div className="bg-slate-950 rounded-lg p-2.5">
                    <p className="text-slate-500 mb-1">المدة</p>
                    <DurationDisplay seconds={selectedCall.talking_duration || selectedCall.ringing_duration} />
                  </div>
                  <div className="bg-slate-950 rounded-lg p-2.5">
                    <p className="text-slate-500 mb-1">الأولوية</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_COLORS[selectedCall.priority]}`}>
                      {PRIORITY_LABELS[selectedCall.priority]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Agent Info */}
              {selectedCall.agent && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5">
                    <Headphones size={13} />
                    الوكيل
                  </h4>
                  <div className="flex items-center gap-3">
                    <UserAvatar name={selectedCall.agent} size="md" />
                    <div>
                      <p className="text-sm font-bold">{selectedCall.agent}</p>
                      {selectedCall.agent_extension && (
                        <p className="text-xs text-slate-500">الامتداد: {selectedCall.agent_extension}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Queue Info */}
              {selectedCall.queue && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                    <Users size={13} />
                    الطابور
                  </h4>
                  <p className="text-sm font-bold">{selectedCall.queue}</p>
                </div>
              )}

              {/* Channel Info */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-400 mb-3">معلومات تقنية</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">القناة:</span>
                    <span className="font-mono text-slate-300">{selectedCall.channel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">السياق:</span>
                    <span className="font-mono text-slate-300">{selectedCall.context}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">التطبيق:</span>
                    <span className="font-mono text-slate-300">{selectedCall.application}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">معرّف الجسر:</span>
                    <span className="font-mono text-slate-300">{selectedCall.bridge_id || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-400 mb-3">إجراءات سريعة</h4>
                <div className="grid grid-cols-2 gap-2">
                  {!selectedCall.customer_name && (
                    <button className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors">
                      <UserPlus size={14} />
                      إنشاء عميل
                    </button>
                  )}
                  <button className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors">
                    <ShoppingCart size={14} />
                    إنشاء طلب
                  </button>
                  <button className="flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors">
                    <ArrowRightLeft size={14} />
                    تحويل
                  </button>
                  <button className="flex items-center justify-center gap-2 px-3 py-2.5 bg-yellow-600 text-white rounded-lg text-xs font-bold hover:bg-yellow-700 transition-colors">
                    <Pause size={14} />
                    إيقاف مؤقت
                  </button>
                  {selectedCall.has_recording && (
                    <button className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-600 transition-colors col-span-2">
                      <Play size={14} />
                      تشغيل التسجيل
                    </button>
                  )}
                  <button className="flex items-center justify-center gap-2 px-3 py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors col-span-2">
                    <PhoneOff size={14} />
                    إنهاء المكالمة
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
