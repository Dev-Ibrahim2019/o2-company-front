import React from "react";
import {
  Phone,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Search,
  ChevronRight,
  ChevronLeft,
  User,
  BarChart3,
  Clock,
  Loader2,
} from "lucide-react";
import type {
  CallStatus,
  CallDirection,
  CallDisposition,
  AgentStatus,
} from "../../../types/callCenterPbx";
import {
  CALL_STATUS_LABELS,
  CALL_STATUS_COLORS,
  CALL_DIRECTION_LABELS,
  DISPOSITION_LABELS,
  DISPOSITION_COLORS,
  AGENT_STATUS_LABELS,
  AGENT_STATUS_COLORS,
  formatDuration,
} from "../../../types/callCenterPbx";

/* ───────────────────────── Skeletons ───────────────────────── */

export const CallCardSkeleton: React.FC = () => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-slate-800" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-800 rounded w-1/3" />
        <div className="h-2 bg-slate-800 rounded w-1/2" />
      </div>
      <div className="h-6 w-16 bg-slate-800 rounded-full" />
    </div>
    <div className="flex gap-4">
      <div className="h-2 bg-slate-800 rounded w-20" />
      <div className="h-2 bg-slate-800 rounded w-16" />
      <div className="h-2 bg-slate-800 rounded w-24" />
    </div>
  </div>
);

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 8 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-3 bg-slate-800 rounded w-full max-w-[120px]" />
      </td>
    ))}
  </tr>
);

export const StatsCardSkeleton: React.FC = () => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-slate-800" />
      <div className="flex-1 space-y-2">
        <div className="h-2 bg-slate-800 rounded w-1/2" />
        <div className="h-5 bg-slate-800 rounded w-1/3" />
      </div>
    </div>
  </div>
);

/* ───────────────────── Status Badges ───────────────────── */

export const CallStatusBadge: React.FC<{ status: CallStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${CALL_STATUS_COLORS[status]}`}
  >
    {CALL_STATUS_LABELS[status]}
  </span>
);

export const DirectionBadge: React.FC<{ direction: CallDirection }> = ({ direction }) => {
  const colors: Record<CallDirection, string> = {
    inbound: "bg-blue-100 text-blue-700",
    outbound: "bg-emerald-100 text-emerald-700",
    internal: "bg-purple-100 text-purple-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${colors[direction]}`}
    >
      <DirectionIcon direction={direction} />
      {CALL_DIRECTION_LABELS[direction]}
    </span>
  );
};

export const DispositionBadge: React.FC<{ disposition: CallDisposition }> = ({ disposition }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${DISPOSITION_COLORS[disposition]}`}
  >
    {DISPOSITION_LABELS[disposition]}
  </span>
);

export const AgentStatusBadge: React.FC<{ status: AgentStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${AGENT_STATUS_COLORS[status]}`}
  >
    {AGENT_STATUS_LABELS[status]}
  </span>
);

/* ───────────────────── Stats Card ───────────────────── */

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  icon,
  label,
  value,
  subValue,
  color = "bg-red-600",
}) => (
  <div
    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4 hover:border-slate-700 transition-colors"
    style={{ color: "var(--o2-text)" }}
  >
    <div className={`w-11 h-11 rounded-lg ${color} flex items-center justify-center text-white shrink-0`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-400 truncate">{label}</p>
      <p className="text-xl font-black leading-tight">{value}</p>
      {subValue && <p className="text-xs text-slate-500 mt-0.5">{subValue}</p>}
    </div>
  </div>
);

/* ───────────────────── Empty State ───────────────────── */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: "var(--o2-text)" }}>
    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-slate-500">
      {icon || <Phone size={28} />}
    </div>
    <h3 className="text-base font-bold text-slate-300">{title}</h3>
    {description && <p className="text-sm text-slate-500 mt-1 max-w-xs">{description}</p>}
  </div>
);

/* ───────────────────── Duration Display ───────────────────── */

export const DurationDisplay: React.FC<{ seconds: number; label?: string }> = ({
  seconds,
  label,
}) => (
  <div className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--o2-text)" }}>
    <Clock size={13} className="text-slate-500 shrink-0" />
    {label && <span className="text-slate-500 text-xs">{label}:</span>}
    <span className="font-mono font-bold">{formatDuration(seconds)}</span>
  </div>
);

/* ───────────────────── Direction Icon ───────────────────── */

export const DirectionIcon: React.FC<{ direction: CallDirection }> = ({ direction }) => {
  const size = 14;
  if (direction === "inbound") return <ArrowDownLeft size={size} className="text-blue-400" />;
  if (direction === "outbound") return <ArrowUpRight size={size} className="text-emerald-400" />;
  return <ArrowRightLeft size={size} className="text-purple-400" />;
};

/* ───────────────────── Health Indicator ───────────────────── */

export const HealthIndicator: React.FC<{
  health: "healthy" | "warning" | "critical";
}> = ({ health }) => {
  const colors: Record<string, string> = {
    healthy: "bg-green-500",
    warning: "bg-yellow-500",
    critical: "bg-red-500",
  };
  const labels: Record<string, string> = {
    healthy: "سليم",
    warning: "تحذير",
    critical: "حرج",
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold">
      <span className={`w-2 h-2 rounded-full ${colors[health]} animate-pulse`} />
      <span style={{ color: "var(--o2-text)" }}>{labels[health]}</span>
    </span>
  );
};

/* ───────────────────── Search Input ───────────────────── */

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "بحث...",
}) => (
  <div className="relative">
    <Search
      size={15}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
    />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-600 transition-colors"
      style={{ color: "var(--o2-text)" }}
    />
  </div>
);

/* ───────────────────── Date Range Filter ───────────────────── */

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onChange,
}) => (
  <div className="flex items-center gap-2 flex-wrap">
    <div className="flex items-center gap-1.5">
      <label className="text-xs text-slate-400">من:</label>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onChange(e.target.value, endDate)}
        className="bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-red-600 transition-colors"
        style={{ color: "var(--o2-text)" }}
      />
    </div>
    <div className="flex items-center gap-1.5">
      <label className="text-xs text-slate-400">إلى:</label>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onChange(startDate, e.target.value)}
        className="bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-red-600 transition-colors"
        style={{ color: "var(--o2-text)" }}
      />
    </div>
  </div>
);

/* ───────────────────── Pagination ───────────────────── */

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1" dir="ltr">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={14} />
      </button>
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-slate-600 text-xs">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
              p === currentPage
                ? "bg-red-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={14} />
      </button>
    </div>
  );
};

/* ───────────────────── User Avatar ───────────────────── */

export const UserAvatar: React.FC<{
  name: string;
  size?: "sm" | "md" | "lg";
}> = ({ name, size = "md" }) => {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sizeClasses = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-xs",
    lg: "w-12 h-12 text-sm",
  };

  const colors = [
    "bg-red-600",
    "bg-blue-600",
    "bg-emerald-600",
    "bg-purple-600",
    "bg-orange-600",
    "bg-cyan-600",
    "bg-pink-600",
  ];

  const colorIndex = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  return (
    <div
      className={`${sizeClasses[size]} ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
      title={name}
    >
      {initials || <User size={size === "sm" ? 12 : size === "md" ? 14 : 18} />}
    </div>
  );
};

/* ───────────────────── Bar Chart ───────────────────── */

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  maxVal?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ data, maxVal }) => {
  const max = maxVal || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-2">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <span className="text-xs text-slate-400 w-20 text-left shrink-0 truncate" style={{ color: "var(--o2-text)" }}>
            {item.label}
          </span>
          <div className="flex-1 h-5 bg-slate-800 rounded overflow-hidden">
            <div
              className={`h-full rounded ${item.color || "bg-red-600"} transition-all duration-500`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-300 w-10 text-right shrink-0" style={{ color: "var(--o2-text)" }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ───────────────────── Progress Ring ───────────────────── */

interface ProgressRingProps {
  percent: number;
  size?: number;
  color?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percent,
  size = 60,
  color = "#dc2626",
}) => {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span
        className="absolute text-xs font-bold"
        style={{ color: "var(--o2-text)" }}
      >
        {Math.round(percent)}%
      </span>
    </div>
  );
};
