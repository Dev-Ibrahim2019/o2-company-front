type Tone = "success" | "danger" | "warning" | "accent" | "info" | "orange" | "neutral";

const VALUE_MAP: Record<string, { label: string; tone: Tone }> = {
  active: { label: "نشط", tone: "success" },
  inactive: { label: "غير نشط", tone: "neutral" },
  blocked: { label: "محظور", tone: "danger" },
  vip: { label: "VIP", tone: "accent" },
  // Mockup renders "جديد" amber, not blue — blue is reserved there for
  // in-flight order states (قيد التوصيل / مؤكد / قيد التنفيذ).
  new: { label: "جديد", tone: "warning" },
  retail: { label: "تجزئة", tone: "neutral" },
  wholesale: { label: "جملة", tone: "neutral" },
  corporate: { label: "شركات", tone: "neutral" },
  government: { label: "حكومي", tone: "neutral" },
  service: { label: "خدمي", tone: "neutral" },
  regular: { label: "عادي", tone: "neutral" },
  important: { label: "مهم", tone: "warning" },
  follow_up: { label: "متابعة", tone: "warning" },
  complaints: { label: "شكاوى", tone: "danger" },
  // orders.status — see database/migrations/2026_07_03_000001_create_orders_table.php.
  // Only these 7 values exist; anything else falls back to the raw string.
  pending: { label: "قيد الانتظار", tone: "warning" },
  confirmed: { label: "مؤكد", tone: "info" },
  in_progress: { label: "قيد التنفيذ", tone: "info" },
  ready: { label: "جاهز", tone: "accent" },
  served: { label: "تم التسليم", tone: "success" },
  paid: { label: "مدفوع", tone: "success" },
  cancelled: { label: "ملغي", tone: "danger" },
};

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]",
  danger: "bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]",
  warning: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]",
  accent: "bg-[var(--crmx-accent-soft)] text-[var(--crmx-accent-text)]",
  info: "bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]",
  orange: "bg-[var(--crmx-orange-soft)] text-[var(--crmx-orange-text)]",
  neutral: "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]",
};

export function CrmStatusBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-[13px] text-[var(--crmx-text-muted)]">—</span>;
  const entry = VALUE_MAP[value.toLowerCase().trim()] ?? { label: value, tone: "neutral" as Tone };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap ${TONE_CLASS[entry.tone]}`}>
      {entry.label}
    </span>
  );
}

/**
 * The mockup's "إجمالي المشكلة" column: a red "نعم" / green "لا" pill.
 * Same pill geometry as CrmStatusBadge so the two read as one system.
 */
export function CrmYesNoBadge({ value, yesTone = "danger" }: { value: boolean; yesTone?: "danger" | "success" }) {
  const tone: Tone = value ? yesTone : yesTone === "danger" ? "success" : "neutral";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold ${TONE_CLASS[tone]}`}>
      {value ? "نعم" : "لا"}
    </span>
  );
}
