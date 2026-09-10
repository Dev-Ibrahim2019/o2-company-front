const STATUS_MAP: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "نشط", className: "text-emerald-500 bg-emerald-500/10" },
  ON_LEAVE: { label: "في إجازة", className: "text-orange-500 bg-orange-500/10" },
  SUSPENDED: { label: "موقوف", className: "text-red-500 bg-red-500/10" },
  TERMINATED: { label: "مفصول", className: "text-slate-500 bg-slate-500/10" },
  RESIGNED: { label: "مستقيل", className: "text-purple-400 bg-purple-400/10" },
};

export const getStatusLabel = (status: string): string =>
  STATUS_MAP[status]?.label ?? status;

export const getStatusColor = (status: string): string =>
  STATUS_MAP[status]?.className ?? "text-slate-400 bg-slate-400/10";
