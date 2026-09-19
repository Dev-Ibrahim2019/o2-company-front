import { AlertTriangle } from "lucide-react";

/**
 * A styled stand-in for window.confirm() — every CRM screen that needs "are
 * you sure?" before a destructive action (delete an occasion, remove a
 * member...) reads from this one component instead of the browser's native
 * dialog, which cannot be styled and reads as a jarring break from the rest
 * of the CRM.
 *
 * Deliberately just confirm/cancel with a title and a message — not a form,
 * not a drawer. A caller with more to show (what exactly will be deleted,
 * for instance) puts that in `description`.
 */
export function CrmConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button + red icon tile — the destructive default (delete). */
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="crmx-root fixed inset-0 z-[60] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={title}>
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/40" onClick={onCancel} />
      <div dir="rtl" className="relative w-full max-w-sm rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5 shadow-[var(--crmx-shadow-md)]">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              danger ? "bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger)]" : "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 pt-1">
            <h2 className="text-[16px] font-bold text-[var(--crmx-text)]">{title}</h2>
            {description && <p className="mt-1.5 text-[13.5px] leading-6 text-[var(--crmx-text-secondary)]">{description}</p>}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`h-11 flex-1 rounded-xl text-[14px] font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              danger
                ? "bg-[var(--crmx-danger)] hover:bg-[var(--crmx-danger-text)]"
                : "bg-[var(--crmx-primary)] hover:bg-[var(--crmx-primary-hover)]"
            }`}
          >
            {busy ? "جارٍ التنفيذ..." : confirmLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="h-11 flex-1 rounded-xl border border-[var(--crmx-border)] text-[14px] font-semibold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)] disabled:opacity-60"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
