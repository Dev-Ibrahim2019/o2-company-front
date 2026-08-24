import { AlertTriangle, Inbox, LoaderCircle, LockKeyhole } from "lucide-react";
import "./customers-ui/crmx.css";

export function CrmState({ kind, title, detail, retry }: { kind: "loading" | "empty" | "error" | "forbidden"; title: string; detail?: string; retry?: () => void }) {
  const Icon = kind === "loading" ? LoaderCircle : kind === "empty" ? Inbox : kind === "forbidden" ? LockKeyhole : AlertTriangle;
  return (
    <div
      className="crmx-root flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl px-6 py-10 text-center"
      role={kind === "error" ? "alert" : "status"}
    >
      <Icon className={`h-7 w-7 text-[var(--crmx-text-muted)] ${kind === "loading" ? "animate-spin" : ""}`} aria-hidden />
      <strong className="text-[14px] font-bold text-[var(--crmx-text)]">{title}</strong>
      {detail && <p className="max-w-sm text-[13px] text-[var(--crmx-text-secondary)]">{detail}</p>}
      {retry && (
        <button
          onClick={retry}
          className="mt-1 h-9 rounded-xl bg-[var(--crmx-navy)] px-4 text-[13px] font-bold text-white hover:bg-[var(--crmx-navy-hover)]"
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
export const getCrmError = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const messages: Record<number, string> = {
    401: "انتهت الجلسة. سجّل الدخول مجددًا.", 403: "لا تملك صلاحية عرض هذه البيانات.",
    404: "تعذر العثور على السجل المطلوب.", 409: "تعذر إتمام الطلب بسبب تعارض في البيانات.",
    422: "تحقق من القيم المدخلة ثم حاول مجددًا.", 500: "حدث خطأ في الخادم. حاول بعد قليل.",
  };
  return { status, message: messages[status ?? 0] ?? "تعذر الاتصال بالخدمة. تحقق من الشبكة وحاول مجددًا." };
};

const STATUS_CHIP: Record<string, { label: string; tone: string }> = {
  active: { label: "نشط", tone: "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]" },
  inactive: { label: "غير نشط", tone: "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]" },
  blocked: { label: "محظور", tone: "bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]" },
  vip: { label: "مميز", tone: "bg-[var(--crmx-accent-soft)] text-[var(--crmx-accent-text)]" },
  open: { label: "مفتوحة", tone: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]" },
  closed: { label: "مغلقة", tone: "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]" },
};
export function StatusChip({ value }: { value?: string | null }) {
  const entry = STATUS_CHIP[value || ""] ?? { label: value || "غير محدد", tone: "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap ${entry.tone}`}>
      {entry.label}
    </span>
  );
}
