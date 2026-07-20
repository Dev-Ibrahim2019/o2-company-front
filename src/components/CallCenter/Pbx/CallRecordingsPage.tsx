import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  StickyNote,
  User,
  Clock,
  Phone,
  LayoutGrid,
  LayoutList,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Headphones,
  FileAudio,
  CalendarDays,
  Users,
  Timer,
  Music,
  FastForward,
  Rewind,
} from "lucide-react";
import { callCenterPbxService } from "../../../services/callCenterPbxService";
import type { CdrRecord } from "../../../types/callCenterPbx";
import {
  formatDuration,
  formatDateTime,
  formatDate,
  formatTime,
  formatPhoneDisplay,
  CALL_DIRECTION_LABELS,
} from "../../../types/callCenterPbx";
import {
  StatsCardSkeleton,
  CallCardSkeleton,
  StatsCard,
  EmptyState,
  SearchInput,
  DateRangeFilter,
  Pagination,
  DirectionIcon,
} from "./PbxSharedComponents";

interface RecordingItem {
  id: string;
  fileName: string;
  customerName: string;
  customerPhone: string;
  customerId?: number;
  agentName: string;
  agentExtension: string;
  date: string;
  time: string;
  duration: number;
  queue: string;
  direction: "inbound" | "outbound" | "internal";
  fileSize?: string;
  notes?: string;
  cdr?: CdrRecord;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const CallRecordingsPage: React.FC = () => {
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterQueue, setFilterQueue] = useState("");
  const [filterDurationMin, setFilterDurationMin] = useState("");
  const [filterDurationMax, setFilterDurationMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecordings, setTotalRecordings] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  // Audio player state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Notes modal
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesTarget, setNotesTarget] = useState<RecordingItem | null>(null);
  const [notesText, setNotesText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const uniqueAgents = useMemo(() => {
    const map = new Map<string, string>();
    recordings.forEach((r) => {
      if (r.agentName && !map.has(r.agentExtension)) {
        map.set(r.agentExtension, r.agentName);
      }
    });
    return Array.from(map.entries()).map(([ext, name]) => ({ extension: ext, name }));
  }, [recordings]);

  const uniqueQueues = useMemo(() => {
    const set = new Set<string>();
    recordings.forEach((r) => {
      if (r.queue) set.add(r.queue);
    });
    return Array.from(set);
  }, [recordings]);

  const todayRecordings = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return recordings.filter((r) => r.date === today).length;
  }, [recordings]);

  const loadRecordings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, per_page: 20 };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await callCenterPbxService.getRecordings(params);
      const raw: any[] = res.recordings ?? [];
      const mapped: RecordingItem[] = raw.map((r: any, idx: number) => ({
        id: r.id ?? r.unique_id ?? String(idx),
        fileName: r.recordingfile ?? r.file_name ?? "",
        customerName: r.caller_name ?? r.dst_cnam ?? r.caller_id_name ?? "",
        customerPhone: r.src ?? r.cnum ?? r.caller_id_num ?? "",
        customerId: r.caller_customer_id ?? r.callee_customer_id,
        agentName: r.agent ?? r.outbound_cnam ?? "",
        agentExtension: r.account_code ?? r.dst ?? "",
        date: r.calldate ? r.calldate.slice(0, 10) : "",
        time: r.calldate ? formatTime(r.calldate) : "",
        duration: r.duration ?? 0,
        queue: r.queue ?? "",
        direction: r.direction ?? "inbound",
        fileSize: r.file_size ?? undefined,
        notes: r.notes ?? "",
        cdr: r,
      }));
      setRecordings(mapped);
      setTotalRecordings(res.total ?? mapped.length);
      const totalDur = mapped.reduce((sum, r) => sum + r.duration, 0);
      setTotalDuration(totalDur);
      setTotalPages(Math.max(1, Math.ceil((res.total ?? mapped.length) / 20)));
    } catch {
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate]);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadRecordings, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadRecordings]);

  const filteredRecordings = useMemo(() => {
    return recordings.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        const match =
          r.customerName.toLowerCase().includes(q) ||
          r.customerPhone.includes(q) ||
          r.agentName.toLowerCase().includes(q) ||
          r.agentExtension.includes(q);
        if (!match) return false;
      }
      if (filterAgent && r.agentExtension !== filterAgent) return false;
      if (filterQueue && r.queue !== filterQueue) return false;
      if (filterDurationMin && r.duration < Number(filterDurationMin)) return false;
      if (filterDurationMax && r.duration > Number(filterDurationMax)) return false;
      return true;
    });
  }, [recordings, search, filterAgent, filterQueue, filterDurationMin, filterDurationMax]);

  const playAudio = useCallback(
    (recording: RecordingItem) => {
      if (!recording.fileName) return;
      if (playingId === recording.id) {
        if (audioRef.current) {
          if (audioRef.current.paused) {
            audioRef.current.play();
          } else {
            audioRef.current.pause();
          }
        }
        return;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const url = callCenterPbxService.playRecording(recording.fileName);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.playbackRate = playbackSpeed;
      audio.volume = isMuted ? 0 : volume;
      audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
      audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
      audio.addEventListener("ended", () => {
        setPlayingId(null);
        setCurrentTime(0);
      });
      audio.play().catch(() => {});
      setPlayingId(recording.id);
      setCurrentTime(0);
    },
    [playingId, playbackSpeed, volume, isMuted]
  );

  const seekAudio = useCallback(
    (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
      }
    },
    [duration]
  );

  const changeVolume = useCallback((v: number) => {
    setVolume(v);
    setIsMuted(v === 0);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioRef.current) audioRef.current.volume = newMuted ? 0 : volume;
  }, [isMuted, volume]);

  const changeSpeed = useCallback(
    (speed: number) => {
      setPlaybackSpeed(speed);
      if (audioRef.current) audioRef.current.playbackSpeed = speed;
    },
    []
  );

  const openNotes = useCallback((recording: RecordingItem) => {
    setNotesTarget(recording);
    setNotesText(recording.notes ?? "");
    setNotesModalOpen(true);
  }, []);

  const saveNote = useCallback(async () => {
    if (!notesTarget) return;
    setSavingNote(true);
    try {
      setRecordings((prev) =>
        prev.map((r) =>
          r.id === notesTarget.id ? { ...r, notes: notesText } : r
        )
      );
      setNotesModalOpen(false);
      setNotesTarget(null);
      setNotesText("");
    } finally {
      setSavingNote(false);
    }
  }, [notesTarget, notesText]);

  const handleDownload = useCallback((recording: RecordingItem) => {
    if (!recording.fileName) return;
    const url = callCenterPbxService.downloadRecording(recording.fileName);
    const a = document.createElement("a");
    a.href = url;
    a.download = recording.fileName;
    a.click();
  }, []);

  const getDirectionIcon = (dir: string) => {
    switch (dir) {
      case "inbound":
        return <ArrowDownLeft size={12} className="text-green-400" />;
      case "outbound":
        return <ArrowUpRight size={12} className="text-blue-400" />;
      default:
        return <ArrowLeftRight size={12} className="text-purple-400" />;
    }
  };

  const getDirectionLabel = (dir: string) => {
    return CALL_DIRECTION_LABELS[dir as keyof typeof CALL_DIRECTION_LABELS] ?? dir;
  };

  const formatFileSize = (size?: string) => {
    if (!size) return null;
    return size;
  };

  const resetFilters = useCallback(() => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setFilterAgent("");
    setFilterQueue("");
    setFilterDurationMin("");
    setFilterDurationMax("");
    setPage(1);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (startDate || endDate) count++;
    if (filterAgent) count++;
    if (filterQueue) count++;
    if (filterDurationMin || filterDurationMax) count++;
    return count;
  }, [startDate, endDate, filterAgent, filterQueue, filterDurationMin, filterDurationMax]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <FileAudio size={20} className="text-red-500" />
            تسجيلات المكالمات
          </h2>
          <p className="text-xs text-slate-400">تشغيل وتحميل وتدقيق تسجيلات المكالمات</p>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 border border-white/10 rounded-xl text-xs font-bold hover:border-red-500/50 transition-all"
          >
            {viewMode === "grid" ? <LayoutList size={12} /> : <LayoutGrid size={12} />}
            {viewMode === "grid" ? "قائمة" : "شبكة"}
          </button>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatsCard
            icon={<FileAudio size={16} />}
            label="إجمالي التسجيلات"
            value={totalRecordings.toLocaleString("ar-EG")}
            color="red"
          />
          <StatsCard
            icon={<Clock size={16} />}
            label="إجمالي المدة"
            value={formatDuration(totalDuration)}
            color="blue"
          />
          <StatsCard
            icon={<CalendarDays size={16} />}
            label="تسجيلات اليوم"
            value={todayRecordings.toLocaleString("ar-EG")}
            color="green"
          />
          <StatsCard
            icon={<Users size={16} />}
            label="الوكيل النشط"
            value={uniqueAgents.length.toLocaleString("ar-EG")}
            color="purple"
          />
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، رقم الهاتف، الوكيل..."
            className="w-full bg-slate-800 border border-white/10 rounded-lg py-1.5 pr-8 pl-3 text-xs text-white focus:outline-none focus:border-red-500/50 placeholder-slate-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            showFilters || activeFilterCount > 0
              ? "bg-red-600 text-white"
              : "bg-slate-800 text-slate-300 border border-white/10 hover:border-red-500/50"
          }`}
        >
          <Filter size={12} />
          فلاتر
          {activeFilterCount > 0 && (
            <span className="bg-white text-red-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="bg-slate-900 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">خيارات التصفية</span>
            <button
              onClick={resetFilters}
              className="text-xs text-red-400 hover:text-red-300 font-bold"
            >
              مسح الكل
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 font-bold mb-1 block">من تاريخ</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold mb-1 block">إلى تاريخ</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold mb-1 block">الوكيل</label>
              <select
                value={filterAgent}
                onChange={(e) => setFilterAgent(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50"
              >
                <option value="">جميع الوكلاء</option>
                {uniqueAgents.map((a) => (
                  <option key={a.extension} value={a.extension}>
                    {a.name} ({a.extension})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold mb-1 block">الQueue</label>
              <select
                value={filterQueue}
                onChange={(e) => setFilterQueue(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50"
              >
                <option value="">جميع الQueues</option>
                {uniqueQueues.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold mb-1 block">
                المدة الأدنى (ثانية)
              </label>
              <input
                type="number"
                value={filterDurationMin}
                onChange={(e) => setFilterDurationMin(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold mb-1 block">
                المدة الأقصى (ثانية)
              </label>
              <input
                type="number"
                value={filterDurationMax}
                onChange={(e) => setFilterDurationMax(e.target.value)}
                placeholder="9999"
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50 placeholder-slate-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mini Player Bar */}
      {playingId && (
        <div className="bg-slate-900 border border-red-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                }
              }}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <Rewind size={14} />
            </button>
            <button
              onClick={() => {
                const rec = recordings.find((r) => r.id === playingId);
                if (rec) playAudio(rec);
              }}
              className="w-9 h-9 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 transition-colors"
            >
              {audioRef.current && !audioRef.current.paused ? (
                <Pause size={14} />
              ) : (
                <Play size={14} className="mr-0.5" />
              )}
            </button>
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
                }
              }}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <FastForward size={14} />
            </button>
          </div>

          <div className="flex-1 flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] text-slate-400 w-10 text-center font-mono">
              {formatDuration(Math.floor(currentTime))}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onChange={(e) => seekAudio(Number(e.target.value))}
              className="flex-1 h-1 accent-red-500"
            />
            <span className="text-[10px] text-slate-400 w-10 text-center font-mono">
              {formatDuration(Math.floor(duration))}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="p-1 text-slate-400 hover:text-white transition-colors">
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              className="w-16 h-1 accent-red-500"
            />
            <select
              value={playbackSpeed}
              onChange={(e) => changeSpeed(Number(e.target.value))}
              className="bg-slate-800 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none"
            >
              {SPEED_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current = null;
                }
                setPlayingId(null);
                setCurrentTime(0);
                setDuration(0);
              }}
              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Recordings Grid / List */}
      {loading ? (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              : "space-y-2"
          }
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <CallCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredRecordings.length === 0 ? (
        <EmptyState
          icon={<FileAudio size={40} />}
          title="لا توجد تسجيلات"
          description="لم يتم العثور على تسجيلات مطابقة لمعايير البحث"
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredRecordings.map((rec) => (
            <div
              key={rec.id}
              className="bg-slate-900 border border-white/10 rounded-xl p-4 hover:border-red-500/30 transition-all group"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getDirectionIcon(rec.direction)}
                  <div>
                    <p className="text-xs font-bold text-white truncate max-w-[180px]">
                      {rec.customerName || formatPhoneDisplay(rec.customerPhone) || "غير معروف"}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {formatPhoneDisplay(rec.customerPhone)}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold px-2 py-0.5 bg-slate-800 rounded-full">
                  {getDirectionLabel(rec.direction)}
                </span>
              </div>

              {/* Info */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <User size={10} />
                  <span className="font-bold">{rec.agentName || "غير محدد"}</span>
                  <span className="text-slate-600">|</span>
                  <span className="font-mono">{rec.agentExtension}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <CalendarDays size={10} />
                  <span>{formatDate(rec.date)}</span>
                  <span className="text-slate-600">|</span>
                  <Clock size={10} />
                  <span>{rec.time}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Timer size={10} />
                  <span className="font-bold text-white">{formatDuration(rec.duration)}</span>
                  {rec.queue && (
                    <>
                      <span className="text-slate-600">|</span>
                      <Headphones size={10} />
                      <span>{rec.queue}</span>
                    </>
                  )}
                </div>
                {rec.fileSize && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <Music size={10} />
                    <span>{formatFileSize(rec.fileSize)}</span>
                  </div>
                )}
              </div>

              {/* Notes indicator */}
              {rec.notes && (
                <div className="bg-slate-800 rounded-lg p-2 mb-3">
                  <p className="text-[10px] text-slate-300 line-clamp-2">{rec.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => playAudio(rec)}
                    className={`p-1.5 rounded-lg transition-all ${
                      playingId === rec.id
                        ? "bg-red-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white hover:bg-red-600/20"
                    }`}
                    title={playingId === rec.id ? "إيقاف مؤقت" : "تشغيل"}
                  >
                    {playingId === rec.id && audioRef.current && !audioRef.current.paused ? (
                      <Pause size={12} />
                    ) : (
                      <Play size={12} />
                    )}
                  </button>
                  <button
                    onClick={() => handleDownload(rec)}
                    className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-white hover:bg-blue-600/20 transition-all"
                    title="تحميل"
                  >
                    <Download size={12} />
                  </button>
                  <button
                    onClick={() => openNotes(rec)}
                    className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-white hover:bg-yellow-600/20 transition-all"
                    title="ملاحظات"
                  >
                    <StickyNote size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {rec.customerId && (
                    <button
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold transition-colors"
                      title="فتح ملف العميل"
                    >
                      العميل
                    </button>
                  )}
                  <button
                    className="text-[10px] text-green-400 hover:text-green-300 font-bold transition-colors"
                    title="فتح الطلب"
                  >
                    الطلب
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-right px-4 py-2 text-[10px] text-slate-400 font-bold">العميل</th>
                  <th className="text-right px-4 py-2 text-[10px] text-slate-400 font-bold">الوكيل</th>
                  <th className="text-right px-4 py-2 text-[10px] text-slate-400 font-bold">التاريخ</th>
                  <th className="text-right px-4 py-2 text-[10px] text-slate-400 font-bold">المدة</th>
                  <th className="text-right px-4 py-2 text-[10px] text-slate-400 font-bold">الاتجاه</th>
                  <th className="text-right px-4 py-2 text-[10px] text-slate-400 font-bold">الQueue</th>
                  <th className="text-center px-4 py-2 text-[10px] text-slate-400 font-bold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecordings.map((rec) => (
                  <tr
                    key={rec.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-2">
                      <p className="text-white font-bold truncate max-w-[150px]">
                        {rec.customerName || formatPhoneDisplay(rec.customerPhone) || "غير معروف"}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {formatPhoneDisplay(rec.customerPhone)}
                      </p>
                    </td>
                    <td className="px-4 py-2">
                      <p className="text-white font-bold">{rec.agentName || "غير محدد"}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{rec.agentExtension}</p>
                    </td>
                    <td className="px-4 py-2">
                      <p className="text-slate-300">{formatDate(rec.date)}</p>
                      <p className="text-[10px] text-slate-500">{rec.time}</p>
                    </td>
                    <td className="px-4 py-2 text-white font-bold">{formatDuration(rec.duration)}</td>
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-1">
                        {getDirectionIcon(rec.direction)}
                        <span className="text-slate-300">{getDirectionLabel(rec.direction)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-300">{rec.queue || "-"}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => playAudio(rec)}
                          className={`p-1.5 rounded-lg transition-all ${
                            playingId === rec.id
                              ? "bg-red-600 text-white"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {playingId === rec.id && audioRef.current && !audioRef.current.paused ? (
                            <Pause size={10} />
                          ) : (
                            <Play size={10} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDownload(rec)}
                          className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-all"
                        >
                          <Download size={10} />
                        </button>
                        <button
                          onClick={() => openNotes(rec)}
                          className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-all"
                        >
                          <StickyNote size={10} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Notes Modal */}
      {notesModalOpen && notesTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">ملاحظات التسجيل</h3>
              <button
                onClick={() => {
                  setNotesModalOpen(false);
                  setNotesTarget(null);
                  setNotesText("");
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 space-y-1">
              <p className="text-xs text-white font-bold">
                {notesTarget.customerName || formatPhoneDisplay(notesTarget.customerPhone)}
              </p>
              <p className="text-[10px] text-slate-400">
                {formatDate(notesTarget.date)} - {notesTarget.time} - {formatDuration(notesTarget.duration)}
              </p>
            </div>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="أضف ملاحظة حول هذا التسجيل..."
              rows={4}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 placeholder-slate-500 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setNotesModalOpen(false);
                  setNotesTarget(null);
                  setNotesText("");
                }}
                className="px-4 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={saveNote}
                disabled={savingNote}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {savingNote ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <Save size={12} />
                )}
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { CallRecordingsPage };
export default CallRecordingsPage;
