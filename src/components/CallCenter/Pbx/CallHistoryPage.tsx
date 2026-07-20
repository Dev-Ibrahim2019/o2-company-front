import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  Download,
  FileText,
  Printer,
  X,
  Clock,
  User,
  Headphones,
  Mic,
  MicOff,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Filter,
  BarChart3,
  Loader2,
  Calendar,
  ArrowUpDown,
} from "lucide-react";
import { callCenterPbxService } from "../../../services/callCenterPbxService";
import type { CdrRecord, CallDisposition, CallDirection } from "../../../types/callCenterPbx";
import {
  DISPOSITION_LABELS,
  DISPOSITION_COLORS,
  CALL_DIRECTION_LABELS,
  formatDuration,
  formatTime,
  formatDate,
  formatDateTime,
  formatPhoneDisplay,
} from "../../../types/callCenterPbx";
import {
  CallStatusBadge,
  DirectionBadge,
  DispositionBadge,
  StatsCard,
  DurationDisplay,
  UserAvatar,
  DirectionIcon,
  EmptyState,
  TableRowSkeleton,
  Pagination,
  SearchInput,
  DateRangeFilter,
} from "./PbxSharedComponents";

type SortField = "calldate" | "src" | "dst" | "duration" | "billsec" | "disposition";
type SortDir = "asc" | "desc";

const AGENT_OPTIONS = [
  { value: "", label: "كل الوكلاء" },
  { value: "ahmed", label: "أحمد" },
  { value: "fatima", label: "فاطمة" },
  { value: "omar", label: "عمر" },
  { value: "sara", label: "سارة" },
  { value: "ali", label: "علي" },
];

const QUEUE_OPTIONS = [
  { value: "", label: "كل الطوابير" },
  { value: "sales", label: "المبيعات" },
  { value: "support", label: "الدعم الفني" },
  { value: "billing", label: "الحسابات" },
  { value: "general", label: "عام" },
];

const DISPOSITION_OPTIONS = [
  { value: "", label: "كل الحالات" },
  { value: "ANSWERED", label: "تم الرد" },
  { value: "NO ANSWER", label: "لم يتم الرد" },
  { value: "BUSY", label: "مشغول" },
  { value: "FAILED", label: "فشل" },
  { value: "CANCELLED", label: "ملغي" },
  { value: "CONGESTION", label: "ازدحام" },
];

const DIRECTION_OPTIONS = [
  { value: "", label: "كل الاتجاهات" },
  { value: "inbound", label: "وارد" },
  { value: "outbound", label: "صادر" },
  { value: "internal", label: "داخلي" },
];

const PER_PAGE = 20;

export const CallHistoryPage: React.FC = () => {
  const [records, setRecords] = useState<CdrRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [agent, setAgent] = useState("");
  const [queue, setQueue] = useState("");
  const [disposition, setDisposition] = useState("");
  const [direction, setDirection] = useState("");

  const [sortField, setSortField] = useState<SortField>("calldate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [selectedRecord, setSelectedRecord] = useState<CdrRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        per_page: PER_PAGE,
      };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (agent) params.agent = agent;
      if (queue) params.queue = queue;
      if (disposition) params.disposition = disposition;
      if (direction) params.direction = direction;
      if (search) {
        params.caller = search;
        params.destination = search;
      }

      const result = await callCenterPbxService.getCallHistory(params);
      setRecords(result.data || []);
      setTotalPages(result.last_page || 1);
      setTotalCount(result.total || 0);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, startDate, endDate, agent, queue, disposition, direction, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const total = records.length;
    const answered = records.filter((r) => r.disposition === "ANSWERED").length;
    const missed = records.filter(
      (r) => r.disposition === "NO ANSWER" || r.disposition === "FAILED"
    ).length;
    const avgDuration =
      total > 0
        ? Math.round(records.reduce((acc, r) => acc + r.billsec, 0) / total)
        : 0;
    return { total, answered, missed, avgDuration };
  }, [records]);

  const sortedRecords = useMemo(() => {
    const sorted = [...records];
    sorted.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (sortField === "calldate") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [records, sortField, sortDir]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField]
  );

  const openDetail = useCallback(async (record: CdrRecord) => {
    setSelectedRecord(record);
    setDetailLoading(true);
    try {
      const full = await callCenterPbxService.getCdrById(record.id);
      setSelectedRecord(full);
    } catch {
      // keep the basic record
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedRecord(null);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setAgent("");
    setQueue("");
    setDisposition("");
    setDirection("");
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = search || startDate || endDate || agent || queue || disposition || direction;

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field)
      return <ArrowUpDown size={12} className="text-slate-600" />;
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="text-red-400" />
    ) : (
      <ChevronDown size={12} className="text-red-400" />
    );
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Phone size={20} className="text-red-500" />
            سجل المكالمات
          </h2>
          <p className="text-xs text-slate-400">سجل تفاصيل المكالمات (CDR)</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors">
            <Download size={12} />
            Excel
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors">
            <FileText size={12} />
            CSV
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors">
            <FileText size={12} />
            PDF
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors">
            <Printer size={12} />
            طباعة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatsCard
          icon={<Phone size={18} />}
          label="إجمالي المكالمات"
          value={totalCount}
          color="bg-slate-700"
        />
        <StatsCard
          icon={<PhoneIncoming size={18} />}
          label="تم الرد"
          value={stats.answered}
          color="bg-green-600"
        />
        <StatsCard
          icon={<PhoneMissed size={18} />}
          label="لم يتم الرد"
          value={stats.missed}
          color="bg-red-600"
        />
        <StatsCard
          icon={<Clock size={18} />}
          label="متوسط المدة"
          value={formatDuration(stats.avgDuration)}
          color="bg-blue-600"
        />
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1 w-full sm:max-w-md">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="بحث بالاسم أو رقم الهاتف..."
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-red-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            <Filter size={13} />
            تصفية
            {hasActiveFilters && (
              <span className="w-4 h-4 rounded-full bg-white text-red-600 flex items-center justify-center text-[10px] font-black">
                !
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="border-t border-slate-800 pt-3 space-y-3">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onChange={(s, e) => {
                setStartDate(s);
                setEndDate(e);
                setCurrentPage(1);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={agent}
                onChange={(e) => {
                  setAgent(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-red-600 transition-colors"
                style={{ color: "var(--o2-text)" }}
              >
                {AGENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={queue}
                onChange={(e) => {
                  setQueue(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-red-600 transition-colors"
                style={{ color: "var(--o2-text)" }}
              >
                {QUEUE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={disposition}
                onChange={(e) => {
                  setDisposition(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-red-600 transition-colors"
                style={{ color: "var(--o2-text)" }}
              >
                {DISPOSITION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={direction}
                onChange={(e) => {
                  setDirection(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-red-600 transition-colors"
                style={{ color: "var(--o2-text)" }}
              >
                {DIRECTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-2 bg-red-600/10 text-red-400 rounded-lg text-xs font-bold hover:bg-red-600/20 transition-colors"
                >
                  <X size={12} />
                  مسح الفلاتر
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full" style={{ color: "var(--o2-text)" }}>
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400">
                <th className="px-4 py-3 text-right font-bold">التاريخ</th>
                <th className="px-4 py-3 text-right font-bold">الوقت</th>
                <th className="px-4 py-3 text-right font-bold">ال咴الق</th>
                <th className="px-4 py-3 text-right font-bold">الوجهة</th>
                <th className="px-4 py-3 text-right font-bold">الوكيل</th>
                <th className="px-4 py-3 text-right font-bold">المدة</th>
                <th className="px-4 py-3 text-right font-bold">الحالة</th>
                <th className="px-4 py-3 text-right font-bold">الاتجاه</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={8} />
              ))}
            </tbody>
          </table>
        </div>
      ) : sortedRecords.length === 0 ? (
        <EmptyState
          icon={<Phone size={28} />}
          title="لا توجد سجلات"
          description="لم يتم العثور على مكالمات تطابق معايير البحث"
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ color: "var(--o2-text)" }}>
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400">
                    <th
                      onClick={() => handleSort("calldate")}
                      className="px-4 py-3 text-right font-bold cursor-pointer hover:text-white transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        التاريخ والوقت <SortIcon field="calldate" />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort("src")}
                      className="px-4 py-3 text-right font-bold cursor-pointer hover:text-white transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        ال咴الق <SortIcon field="src" />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort("dst")}
                      className="px-4 py-3 text-right font-bold cursor-pointer hover:text-white transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        الوجهة <SortIcon field="dst" />
                      </span>
                    </th>
                    <th className="px-4 py-3 text-right font-bold">الوكيل</th>
                    <th className="px-4 py-3 text-right font-bold">الطابور</th>
                    <th
                      onClick={() => handleSort("duration")}
                      className="px-4 py-3 text-right font-bold cursor-pointer hover:text-white transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        المدة <SortIcon field="duration" />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort("billsec")}
                      className="px-4 py-3 text-right font-bold cursor-pointer hover:text-white transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        مدة الفوترة <SortIcon field="billsec" />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort("disposition")}
                      className="px-4 py-3 text-right font-bold cursor-pointer hover:text-white transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        الحالة <SortIcon field="disposition" />
                      </span>
                    </th>
                    <th className="px-4 py-3 text-right font-bold">الاتجاه</th>
                    <th className="px-4 py-3 text-right font-bold">تسجيل</th>
                    <th className="px-4 py-3 text-right font-bold">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map((record) => (
                    <tr
                      key={record.id}
                      onClick={() => openDetail(record)}
                      className="border-b border-slate-800/50 cursor-pointer hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-xs font-bold">{formatDate(record.calldate)}</p>
                          <p className="text-[10px] text-slate-500">{formatTime(record.calldate)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <UserAvatar name={record.caller_name || record.src} size="sm" />
                          <div>
                            <p className="text-xs font-bold">{record.caller_name || "مجهول"}</p>
                            <p className="text-[10px] text-slate-500">{formatPhoneDisplay(record.src)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-xs font-bold">{record.callee_name || "—"}</p>
                          <p className="text-[10px] text-slate-500">{formatPhoneDisplay(record.dst)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {record.agent ? (
                          <div className="flex items-center gap-1.5">
                            <UserAvatar name={record.agent} size="sm" />
                            <span className="text-xs font-bold">{record.agent}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {record.queue ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-slate-800 rounded text-xs font-bold text-slate-300">
                            {record.queue}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <DurationDisplay seconds={record.duration} />
                      </td>
                      <td className="px-4 py-3">
                        <DurationDisplay seconds={record.billsec} />
                      </td>
                      <td className="px-4 py-3">
                        <DispositionBadge disposition={record.disposition} />
                      </td>
                      <td className="px-4 py-3">
                        <DirectionBadge direction={record.direction} />
                      </td>
                      <td className="px-4 py-3">
                        {record.recordingfile ? (
                          <Mic size={14} className="text-green-400" />
                        ) : (
                          <MicOff size={14} className="text-slate-600" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500 truncate max-w-[100px] block">
                          {record.userfield || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {sortedRecords.map((record) => (
              <div
                key={record.id}
                onClick={() => openDetail(record)}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-slate-700 transition-colors"
                style={{ color: "var(--o2-text)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DirectionIcon direction={record.direction} />
                    <UserAvatar name={record.caller_name || record.src} size="md" />
                    <div>
                      <p className="text-sm font-bold">{record.caller_name || "مجهول"}</p>
                      <p className="text-xs text-slate-400">{formatPhoneDisplay(record.src)}</p>
                    </div>
                  </div>
                  <DispositionBadge disposition={record.disposition} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-slate-500">الوجهة:</span>
                    <span className="mr-1 font-bold">{record.callee_name || record.dst}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">التاريخ:</span>
                    <span className="mr-1 font-bold">{formatDate(record.calldate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">المدة:</span>
                    <span className="mr-1 font-mono font-bold">{formatDuration(record.duration)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">فوترة:</span>
                    <span className="mr-1 font-mono font-bold">{formatDuration(record.billsec)}</span>
                  </div>
                  {record.agent && (
                    <div>
                      <span className="text-slate-500">الوكيل:</span>
                      <span className="mr-1 font-bold">{record.agent}</span>
                    </div>
                  )}
                  {record.queue && (
                    <div>
                      <span className="text-slate-500">الطابور:</span>
                      <span className="mr-1 font-bold">{record.queue}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-[10px]">
                  <span className="text-slate-500">{formatTime(record.calldate)}</span>
                  <DirectionBadge direction={record.direction} />
                  {record.recordingfile && (
                    <span className="inline-flex items-center gap-1 text-green-400">
                      <Mic size={10} /> مسجل
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Detail Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex" dir="rtl">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDetail} />
          <div className="absolute left-0 top-0 bottom-0 w-full max-w-lg bg-slate-950 border-r border-slate-800 overflow-y-auto">
            {/* Drawer Header */}
            <div className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Phone size={15} className="text-red-500" />
                تفاصيل المكالمة
              </h3>
              <button
                onClick={closeDetail}
                className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-4 space-y-4" style={{ color: "var(--o2-text)" }}>
              {detailLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="text-red-500 animate-spin" />
                </div>
              )}

              {/* Timeline */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-1.5">
                  <Clock size={13} />
                  الجدول الزمني
                </h4>
                <div className="relative">
                  <div className="absolute right-3 top-0 bottom-0 w-0.5 bg-slate-800" />
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 relative">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center z-10 shrink-0">
                        <PhoneIncoming size={10} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">بداية المكالمة</p>
                        <p className="text-[10px] text-slate-500">{formatDateTime(selectedRecord.calldate)}</p>
                      </div>
                    </div>
                    {selectedRecord.billsec > 0 && (
                      <div className="flex items-start gap-3 relative">
                        <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center z-10 shrink-0">
                          <Headphones size={10} className="text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">تم الرد</p>
                          <p className="text-[10px] text-slate-500">
                            مدة المحادثة: {formatDuration(selectedRecord.billsec)}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3 relative">
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center z-10 shrink-0">
                        <Phone size={10} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">نهاية المكالمة</p>
                        <p className="text-[10px] text-slate-500">
                          المدة الكلية: {formatDuration(selectedRecord.duration)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Call Info */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-400 mb-3">معلومات المكالمة</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 rounded-lg p-2.5">
                    <p className="text-slate-500 mb-1">ال咴الق</p>
                    <div className="flex items-center gap-2">
                      <UserAvatar name={selectedRecord.caller_name || selectedRecord.src} size="sm" />
                      <div>
                        <p className="font-bold">{selectedRecord.caller_name || "مجهول"}</p>
                        <p className="text-[10px] text-slate-500">{formatPhoneDisplay(selectedRecord.src)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-950 rounded-lg p-2.5">
                    <p className="text-slate-500 mb-1">الوجهة</p>
                    <div>
                      <p className="font-bold">{selectedRecord.callee_name || "—"}</p>
                      <p className="text-[10px] text-slate-500">{formatPhoneDisplay(selectedRecord.dst)}</p>
                    </div>
                  </div>
                  <div className="bg-slate-950 rounded-lg p-2.5">
                    <p className="text-slate-500 mb-1">الحالة</p>
                    <DispositionBadge disposition={selectedRecord.disposition} />
                  </div>
                  <div className="bg-slate-950 rounded-lg p-2.5">
                    <p className="text-slate-500 mb-1">الاتجاه</p>
                    <DirectionBadge direction={selectedRecord.direction} />
                  </div>
                  <div className="bg-slate-950 rounded-lg p-2.5">
                    <p className="text-slate-500 mb-1">المدة</p>
                    <DurationDisplay seconds={selectedRecord.duration} />
                  </div>
                  <div className="bg-slate-950 rounded-lg p-2.5">
                    <p className="text-slate-500 mb-1">مدة الفوترة</p>
                    <DurationDisplay seconds={selectedRecord.billsec} />
                  </div>
                </div>
              </div>

              {/* Agent Info */}
              {selectedRecord.agent && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5">
                    <Headphones size={13} />
                    الوكيل
                  </h4>
                  <div className="flex items-center gap-3">
                    <UserAvatar name={selectedRecord.agent} size="md" />
                    <div>
                      <p className="text-sm font-bold">{selectedRecord.agent}</p>
                      {selectedRecord.queue && (
                        <p className="text-xs text-slate-500">الطابور: {selectedRecord.queue}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Recording */}
              {selectedRecord.recordingfile && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5">
                    <Mic size={13} />
                    التسجيل
                  </h4>
                  <div className="bg-slate-950 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <button className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition-colors shrink-0">
                        <Play size={16} />
                      </button>
                      <div className="flex-1">
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-red-600 rounded-full w-0" />
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                          <span>00:00</span>
                          <span>{formatDuration(selectedRecord.billsec)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <a
                        href={callCenterPbxService.playRecording(selectedRecord.recordingfile)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
                      >
                        <Play size={12} />
                        تشغيل
                      </a>
                      <a
                        href={callCenterPbxService.downloadRecording(selectedRecord.recordingfile)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
                      >
                        <Download size={12} />
                        تحميل
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Technical Info */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-400 mb-3">معلومات تقنية</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">القناة:</span>
                    <span className="font-mono text-slate-300">{selectedRecord.channel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">قناة الوجهة:</span>
                    <span className="font-mono text-slate-300">{selectedRecord.dst_channel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">السياق:</span>
                    <span className="font-mono text-slate-300">{selectedRecord.dcontext}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">التطبيق الأخير:</span>
                    <span className="font-mono text-slate-300">{selectedRecord.lastapp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">بيانات التطبيق:</span>
                    <span className="font-mono text-slate-300">{selectedRecord.lastdata}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">رقم الهاتف:</span>
                    <span className="font-mono text-slate-300">{selectedRecord.did}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">معرّف فريد:</span>
                    <span className="font-mono text-slate-300 text-[10px]">{selectedRecord.unique_id}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-400 mb-3">ملاحظات</h4>
                <textarea
                  placeholder="أضف ملاحظات حول هذه المكالمة..."
                  defaultValue={selectedRecord.userfield || ""}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-600 transition-colors resize-none h-20"
                  style={{ color: "var(--o2-text)" }}
                />
                <button className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">
                  حفظ الملاحظات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
