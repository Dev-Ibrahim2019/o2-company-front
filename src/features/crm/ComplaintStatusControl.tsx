import { CheckCircle2, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { COMPLAINT_STATUS_TONE, COMPLAINT_TRANSITIONS } from "./customers-ui";
import type { CrmComplaintStatus } from "./types";

/**
 * The one status-transition control.
 *
 * Both the customer-profile tab and the CRM-wide screen render this, so the
 * offered transitions and the resolution rule can never diverge between them.
 *
 * Moving to "resolved" opens a required resolution note first: the request is
 * not sent until there is text. The backend refuses the same transition with a
 * 422 regardless — this is the convenience layer, not the guard, which is why
 * callers still surface the server's message verbatim on failure.
 */
export function ComplaintStatusControl({
  status, disabled, compact, onChange,
}: {
  status: CrmComplaintStatus;
  disabled?: boolean;
  /** Table cells need the short control; the drawer uses the full-width one. */
  compact?: boolean;
  onChange: (next: CrmComplaintStatus, resolutionNotes?: string) => void;
}) {
  const [pendingResolve, setPendingResolve] = useState(false);
  const [notes, setNotes] = useState("");

  const next = COMPLAINT_TRANSITIONS[status] ?? [];

  const selectCls = compact
    ? "h-8 rounded-lg border border-[var(--crmx-border)] bg-white px-2 text-[12px] font-semibold text-[var(--crmx-text)] outline-none transition focus:border-[var(--crmx-primary)] disabled:opacity-50"
    : "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10 disabled:opacity-50";

  if (next.length === 0) {
    return <span className="text-[var(--crmx-text-muted)]">—</span>;
  }

  const dialog = (
    <div
      className="crmx-root fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="تسجيل الحل"
    >
      <button aria-label="إلغاء" className="absolute inset-0 bg-[#0B1220]/25 backdrop-blur-[2px]" onClick={() => setPendingResolve(false)} />

      {/* Card chrome copied from the dashboard: rounded-2xl, hairline border,
          --crmx-card ground, header and footer split off by the same border. */}
      <div dir="rtl" className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--crmx-border)] px-5 py-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--crmx-radius-control)] bg-[var(--crmx-success-soft)] text-[var(--crmx-success)]">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-[17px] font-bold text-[var(--crmx-text)]">تسجيل الحل</h3>
              <p className="mt-0.5 text-[13px] text-[var(--crmx-text-secondary)]">
                اكتب ما تم فعله قبل تحويل الشكوى إلى «محلولة».
              </p>
            </div>
          </div>
          <button onClick={() => setPendingResolve(false)} className="shrink-0 rounded-lg p-1.5 text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="px-5 py-4">
          {/* Wrapping label + 14px field — the dashboard's control pattern. */}
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
            الحل المُنفَّذ
            <textarea
              className="h-28 w-full resize-none rounded-xl border border-[var(--crmx-border)] bg-white px-3 py-2.5 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تم استبدال الطلب وتعويض العميل."
              maxLength={2000}
              autoFocus
            />
          </label>
          <p className="mt-1.5 text-[12px] text-[var(--crmx-text-muted)]">
            يُحفظ هذا النص في حقل «الحل» بالشكوى، ويظهر لاحقاً بتفاصيلها.
          </p>
        </div>

        <footer className="flex items-center justify-end gap-2.5 border-t border-[var(--crmx-border)] bg-[var(--crmx-bg)] px-5 py-4">
          <button
            disabled={notes.trim() === ""}
            onClick={() => { setPendingResolve(false); onChange("resolved", notes.trim()); }}
            className="h-11 rounded-xl bg-[var(--crmx-primary)] px-4 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            تحويل إلى محلولة
          </button>
          <button
            onClick={() => setPendingResolve(false)}
            className="h-11 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-semibold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]"
          >
            إلغاء
          </button>
        </footer>
      </div>
    </div>
  );

  return (
    <>
      <select
        value=""
        disabled={disabled}
        aria-label="نقل حالة الشكوى"
        onChange={(e) => {
          const target = e.target.value as CrmComplaintStatus;
          if (!target) return;
          if (target === "resolved") { setNotes(""); setPendingResolve(true); return; }
          onChange(target);
        }}
        className={selectCls}
      >
        <option value="">نقل إلى…</option>
        {next.map((s) => (
          <option key={s} value={s}>{COMPLAINT_STATUS_TONE[s].label}</option>
        ))}
      </select>

      {/* Portalled to <body> on purpose. This control renders inside the
          complaint drawer, whose panel runs a CSS animation on `transform` —
          a transformed ancestor becomes the containing block for `fixed`
          descendants, so the dialog was being measured against the drawer
          instead of the viewport and stretched down its whole height. */}
      {pendingResolve && createPortal(dialog, document.body)}
    </>
  );
}
