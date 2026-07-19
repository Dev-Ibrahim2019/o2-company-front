import { useState, useCallback, useMemo, useRef } from "react";
import {
  Search,
  RefreshCw,
  Loader2,
  Phone,
  Download,
  Play,
  Pause,
  Square,
  Clock,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Filter,
  ChevronDown,
  ChevronUp,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  FileAudio,
  HardDrive,
  Activity,
} from "lucide-react";
import api from "../../api/axios";
import { useAuth } from "../../auth";

type Recording = {
  id: string;
  unique_id: string;
  caller: string;
  callee: string;
  caller_name: string;
  callee_name: string;
  direction: string;
  duration: number;
  billsec: number;
  date: string;
  file_name: string;
  file_size: string | null;
  disposition: string;
  channel: string | null;
  dst_channel: string | null;
  context: string | null;
  account_code: string | null;
  did: string | null;
  play_url: string;
  download_url: string;
};

type RecordingsResponse = {
  success: boolean;
  count: number;
  total_count: number;
  recordings: Recording[];
  stats: { today: number; total_duration: number; total_size: number | null };
  connection: {
    status: string;
    method: string | null;
    response_time_ms: number;
  };
  error: { type: string; message: string } | null;
};

const DISPOSITION_COLORS: Record<string, { bg: string; text: string }> = {
  ANSWERED: { bg: "#dcfce7", text: "#16a34a" },
  NOANSWER: { bg: "#f3f4f6", text: "#6b7280" },
  BUSY: { bg: "#fef3c7", text: "#d97706" },
  FAILED: { bg: "#fee2e2", text: "#dc2626" },
  "NO ANSWER": { bg: "#f3f4f6", text: "#6b7280" },
  "CALL FAILED": { bg: "#fee2e2", text: "#dc2626" },
};

const DIR_ICONS: Record<string, React.ElementType> = {
  Inbound: ArrowDownLeft,
  Outbound: ArrowUpRight,
  Internal: ArrowRightLeft,
};

const DIR_COLORS: Record<string, string> = {
  Inbound: "#16a34a",
  Outbound: "#2563eb",
  Internal: "#d97706",
};

function formatDuration(sec: number): string {
  if (sec <= 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export const PbxRecordingsPage: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<RecordingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Audio player
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrl = useRef<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      const res = await api.get("/pbx/recordings", { params });
      setData(res.data as RecordingsResponse);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useMemo(() => {
    fetchData();
  }, [fetchData]);

  const filteredRecordings = useMemo(() => {
    if (!data?.recordings) return [];
    if (!search) return data.recordings;
    const q = search.toLowerCase();
    return data.recordings.filter(
      (r) =>
        r.caller.includes(q) ||
        r.callee.includes(q) ||
        r.file_name.toLowerCase().includes(q) ||
        r.caller_name.toLowerCase().includes(q) ||
        r.callee_name.toLowerCase().includes(q),
    );
  }, [data, search]);

  const playRecording = async (rec: Recording) => {
    if (playingId === rec.unique_id) {
      if (audioRef.current?.paused) {
        audioRef.current.play();
      } else {
        audioRef.current?.pause();
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      if (audioBlobUrl.current) {
        URL.revokeObjectURL(audioBlobUrl.current);
        audioBlobUrl.current = null;
      }
      audioRef.current = null;
    }

    try {
      const res = await api.get("/pbx/recordings/play", {
        responseType: "blob",
        params: { file: rec.file_name },
      });
      const blob = new Blob([res.data], {
        type: (res.headers["content-type"] as string) || "audio/wav",
      });
      const blobUrl = URL.createObjectURL(blob);
      audioBlobUrl.current = blobUrl;

      const audio = new Audio(blobUrl);
      audioRef.current = audio;
      setPlayingId(rec.unique_id);
      setPlayProgress(0);

      audio.ontimeupdate = () => {
        if (audio.duration)
          setPlayProgress((audio.currentTime / audio.duration) * 100);
      };
      audio.onended = () => {
        setPlayingId(null);
        setPlayProgress(0);
      };
      audio.onerror = () => {
        setPlayingId(null);
        setPlayProgress(0);
      };
      audio.play().catch(() => setPlayingId(null));
    } catch {
      setPlayingId(null);
      setPlayProgress(0);
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioBlobUrl.current) {
      URL.revokeObjectURL(audioBlobUrl.current);
      audioBlobUrl.current = null;
    }
    setPlayingId(null);
    setPlayProgress(0);
  };

  const downloadRecording = async (rec: Recording) => {
    try {
      const res = await api.get("/pbx/recordings/download", {
        responseType: "blob",
        params: { file: rec.file_name },
      });
      const blob = new Blob([res.data], {
        type:
          (res.headers["content-type"] as string) || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = rec.file_name || "recording.wav";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  const isPlaying = (id: string) => playingId === id;
  const isPaused = (id: string) => playingId === id && audioRef.current?.paused;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-black flex items-center gap-2"
            style={{ color: "var(--o2-text)" }}
          >
            <FileAudio className="w-6 h-6" style={{ color: "#dc2626" }} />
            تسجيلات المكالمات
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--o2-muted)" }}>
            عرض وتشغيل تسجيلات المكالمات من FreePBX
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border"
          style={{ borderColor: "var(--o2-border)", color: "var(--o2-text)" }}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          تحديث
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "الكل",
            value: data?.count ?? 0,
            icon: FileAudio,
            color: "#6b7280",
          },
          {
            label: "اليوم",
            value: data?.stats.today ?? 0,
            icon: Calendar,
            color: "#2563eb",
          },
          {
            label: "المدة الإجمالية",
            value: formatDuration(data?.stats.total_duration ?? 0),
            icon: Clock,
            color: "#d97706",
          },
          {
            label: "الاتصال",
            value:
              data?.connection.status === "connected" ? "متصل" : "غير متصل",
            icon: Activity,
            color:
              data?.connection.status === "connected" ? "#16a34a" : "#dc2626",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border p-4 flex items-center gap-3"
            style={{
              backgroundColor: "var(--o2-surface)",
              borderColor: "var(--o2-border)",
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${card.color}20` }}
            >
              <card.icon className="w-5 h-5" style={{ color: card.color }} />
            </div>
            <div>
              <p
                className="text-lg font-black"
                style={{ color: "var(--o2-text)" }}
              >
                {card.value}
              </p>
              <p
                className="text-[10px] font-bold"
                style={{ color: "var(--o2-muted)" }}
              >
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {data?.error && (
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: "#fee2e2", borderColor: "#dc2626" }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="w-5 h-5 mt-0.5"
              style={{ color: "#dc2626" }}
            />
            <div>
              <p className="text-sm font-bold" style={{ color: "#dc2626" }}>
                خطأ
              </p>
              <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
                {data.error.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--o2-muted)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالرقم أو الاسم..."
            className="w-full pr-9 pl-3 py-2 rounded-lg text-xs border"
            style={{
              backgroundColor: "var(--o2-surface)",
              borderColor: "var(--o2-border)",
              color: "var(--o2-text)",
            }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 rounded-lg border flex items-center gap-1.5 text-xs font-bold"
          style={{ borderColor: "var(--o2-border)", color: "var(--o2-muted)" }}
        >
          <Filter className="w-4 h-4" /> فلتر
        </button>
        <span className="text-xs" style={{ color: "var(--o2-muted)" }}>
          {filteredRecordings.length} تسجيل
        </span>
      </div>

      {showFilters && (
        <div
          className="rounded-xl border p-4 grid grid-cols-2 md:grid-cols-4 gap-3"
          style={{
            backgroundColor: "var(--o2-surface)",
            borderColor: "var(--o2-border)",
          }}
        >
          <div>
            <label
              className="block text-[10px] font-bold mb-1"
              style={{ color: "var(--o2-muted)" }}
            >
              من تاريخ
            </label>
            <input
              type="date"
              value={filters.start_date || ""}
              onChange={(e) =>
                setFilters((p) => ({ ...p, start_date: e.target.value }))
              }
              className="w-full px-2 py-1.5 rounded text-xs border"
              style={{
                backgroundColor: "var(--o2-surface-raised)",
                borderColor: "var(--o2-border)",
                color: "var(--o2-text)",
              }}
            />
          </div>
          <div>
            <label
              className="block text-[10px] font-bold mb-1"
              style={{ color: "var(--o2-muted)" }}
            >
              إلى تاريخ
            </label>
            <input
              type="date"
              value={filters.end_date || ""}
              onChange={(e) =>
                setFilters((p) => ({ ...p, end_date: e.target.value }))
              }
              className="w-full px-2 py-1.5 rounded text-xs border"
              style={{
                backgroundColor: "var(--o2-surface-raised)",
                borderColor: "var(--o2-border)",
                color: "var(--o2-text)",
              }}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({})}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ color: "var(--o2-brand)" }}
            >
              مسح الفلاتر
            </button>
          </div>
        </div>
      )}

      {/* Now Playing Bar */}
      {playingId && (
        <div
          className="rounded-xl border p-3 flex items-center gap-4"
          style={{
            backgroundColor: "var(--o2-surface)",
            borderColor: "var(--o2-border)",
          }}
        >
          <Volume2 className="w-4 h-4" style={{ color: "#dc2626" }} />
          <div className="flex-1">
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--o2-surface-raised)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${playProgress}%`,
                  backgroundColor: "#dc2626",
                }}
              />
            </div>
          </div>
          <button
            onClick={stopPlayback}
            className="p-1.5 rounded hover:opacity-80"
            style={{ color: "#dc2626" }}
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--o2-border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: "var(--o2-surface)" }}>
                {[
                  "التاريخ",
                  "المُتصل",
                  "المُستلم",
                  "الاتجاه",
                  "المدة",
                  "الملف",
                  "الحالة",
                  "إجراءات",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-right font-bold"
                    style={{ color: "var(--o2-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Loader2
                      className="w-8 h-8 animate-spin mx-auto"
                      style={{ color: "var(--o2-muted)" }}
                    />
                  </td>
                </tr>
              ) : filteredRecordings.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-16 text-center"
                    style={{ color: "var(--o2-muted)" }}
                  >
                    {data?.success === false
                      ? "لم يتم الاتصال بالخادم"
                      : "لا توجد تسجيلات"}
                  </td>
                </tr>
              ) : (
                filteredRecordings.map((rec, index) => {
                  const isExpanded = expandedId === rec.unique_id;
                  const DirIcon = DIR_ICONS[rec.direction] || ArrowRightLeft;
                  const dirColor = DIR_COLORS[rec.direction] || "#6b7280";
                  const disp = DISPOSITION_COLORS[rec.disposition] || {
                    bg: "#f3f4f6",
                    text: "#6b7280",
                  };

                  return (
                    <tr
                      key={`${rec.unique_id}-${index}`}
                      className="border-t cursor-pointer hover:opacity-90"
                      style={{ borderColor: "var(--o2-border)" }}
                      onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                    >
                      <td
                        className="px-4 py-3"
                        style={{ color: "var(--o2-text)" }}
                      >
                        {rec.date
                          ? new Date(rec.date).toLocaleString("ar-EG", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span
                            className="font-bold font-mono"
                            style={{ color: "var(--o2-text)" }}
                          >
                            {rec.caller}
                          </span>
                          {rec.caller_name && (
                            <p
                              className="text-[10px]"
                              style={{ color: "var(--o2-muted)" }}
                            >
                              {rec.caller_name}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span
                            className="font-bold font-mono"
                            style={{ color: "var(--o2-text)" }}
                          >
                            {rec.callee}
                          </span>
                          {rec.callee_name && (
                            <p
                              className="text-[10px]"
                              style={{ color: "var(--o2-muted)" }}
                            >
                              {rec.callee_name}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="flex items-center gap-1 text-[11px] font-bold"
                          style={{ color: dirColor }}
                        >
                          <DirIcon className="w-3 h-3" /> {rec.direction}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 font-mono"
                        style={{ color: "var(--o2-text)" }}
                      >
                        {formatDuration(rec.billsec || rec.duration)}
                      </td>
                      <td
                        className="px-4 py-3 max-w-[120px] truncate text-[10px] font-mono"
                        style={{ color: "var(--o2-muted)" }}
                      >
                        {rec.file_name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ backgroundColor: disp.bg, color: disp.text }}
                        >
                          {rec.disposition}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => playRecording(rec)}
                            className="p-1.5 rounded hover:opacity-80"
                            style={{
                              color: isPlaying(rec.unique_id)
                                ? "#dc2626"
                                : "#16a34a",
                            }}
                          >
                            {isPlaying(rec.unique_id) &&
                            !isPaused(rec.unique_id) ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => downloadRecording(rec)}
                            className="p-1.5 rounded hover:opacity-80"
                            style={{ color: "var(--o2-muted)" }}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setExpandedId(isExpanded ? null : rec.unique_id)
                            }
                            className="p-1.5 rounded hover:opacity-80"
                            style={{ color: "var(--o2-brand)" }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data?.connection.status === "connected" && (
        <p
          className="text-[10px] text-center"
          style={{ color: "var(--o2-muted)" }}
        >
          الاستجابة: {data.connection.response_time_ms}ms | الطريقة:{" "}
          {data.connection.method?.toUpperCase()}
        </p>
      )}
    </div>
  );
};
