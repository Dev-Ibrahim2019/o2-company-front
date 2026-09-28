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
  // orders.status — every value the orders_status_check constraint allows
  // (latest: 2026_12_18_000005_add_closed_status_to_orders_table.php).
  // Keys are matched lower-cased, so the delivery flow's upper-case values
  // (DELIVERED, CANCELLED, ...) land here too.
  pending: { label: "قيد الانتظار", tone: "warning" },
  pending_confirmation: { label: "بانتظار التأكيد", tone: "warning" },
  pending_payment: { label: "بانتظار الدفع", tone: "warning" },
  scheduled: { label: "مجدول", tone: "info" },
  confirmed: { label: "مؤكد", tone: "info" },
  in_progress: { label: "قيد التنفيذ", tone: "info" },
  preparation: { label: "قيد التحضير", tone: "info" },
  assembling: { label: "قيد التجهيز", tone: "info" },
  ready: { label: "جاهز", tone: "accent" },
  ready_for_delivery: { label: "جاهز للتوصيل", tone: "accent" },
  out_for_delivery: { label: "قيد التوصيل", tone: "info" },
  served: { label: "تم التسليم", tone: "success" },
  delivered: { label: "تم التوصيل", tone: "success" },
  paid: { label: "مدفوع", tone: "success" },
  closed: { label: "مغلق", tone: "neutral" },
  cancellation_requested: { label: "طلب إلغاء", tone: "orange" },
  failed_delivery: { label: "فشل التوصيل", tone: "danger" },
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

// Real orders.payment_status values (Order::PAYMENT_STATUSES) — only ever
// populated for Call Center orders today (POS folds payment into `status`
// directly); "processing" is the closest real equivalent to "جزئي". Kept
// here, not re-typed at every call site, so the order table's filter and
// this badge can never say two different things for the same value.
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  awaiting_confirmation: "بانتظار تأكيد التحويل",
  processing: "جزئي / قيد المعالجة",
  paid: "مدفوع",
  failed: "فشل الدفع",
};

/**
 * Payment-state pill — deliberately separate from CrmStatusBadge above,
 * which reads `orders.status` (the fulfilment lifecycle). Payment is a
 * second, independent axis on the same order (see OrderPaymentService:
 * a Call Center order can be fully paid while status is still
 * 'confirmed', never 'paid').
 *
 * Takes `isPaid`/`paymentStatus` as plain values, not a whole order
 * object, so both CrmOrderRow (list rows) and CrmOrderDetails (the
 * expanded panel, the order quick view) can feed it without a shared
 * supertype — both already carry the same is_paid/payment_status pair,
 * derived identically on the backend (see either type's own comment).
 *
 * `is_paid` is that backend-derived source of truth
 * (status === 'paid' || payment_status === 'paid') — raw payment_status
 * alone is blank for most actually-paid orders (the POS path never
 * writes it), so it must not be read directly as "is this paid".
 */
export function PaymentStatusBadge({ isPaid, paymentStatus }: { isPaid?: boolean | null; paymentStatus?: string | null }) {
  let tone: Tone = "neutral";
  let label = "غير مدفوع";
  if (isPaid) {
    tone = "success";
    label = "مدفوع";
  } else if (paymentStatus && paymentStatus !== "unpaid") {
    tone = "warning";
    label = PAYMENT_STATUS_LABELS[paymentStatus] || paymentStatus;
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap ${TONE_CLASS[tone]}`}>
      {label}
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
