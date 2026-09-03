import { X } from "lucide-react";
import { useState } from "react";

const inputCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none transition focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const labelCls = "mb-1 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";

/**
 * Adds or deducts points with a required reason.
 *
 * The backend rejects an adjustment with no notes (422) — this form mirrors
 * that requirement client-side so the rejection is never the first thing the
 * user sees, but the server validation is still the real guard.
 */
export function LoyaltyManualAdjustmentDrawer({
  ownerLabel,
  saving,
  onClose,
  onSubmit,
}: {
  ownerLabel: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (points: number, notes: string) => void;
}) {
  const [direction, setDirection] = useState<"add" | "subtract">("add");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const parsed = Number(amount);
  const canSubmit = Number.isFinite(parsed) && parsed > 0 && notes.trim().length >= 3;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(direction === "add" ? parsed : -parsed, notes.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="تعديل يدوي">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/25 backdrop-blur-[2px]" onClick={onClose} />
      <div dir="rtl" className="crmx-drawer-panel relative flex h-full w-full max-w-sm flex-col bg-[var(--crmx-card)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
          <h2 className="text-[17px] font-bold text-[var(--crmx-text)]">تعديل يدوي — {ownerLabel}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <label className={labelCls}>الاتجاه</label>
            <div className="flex gap-2">
              {([["add", "إضافة"], ["subtract", "خصم"]] as const).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDirection(v)}
                  className={`h-11 flex-1 rounded-xl border text-[14px] font-bold transition ${
                    direction === v
                      ? v === "add"
                        ? "border-[var(--crmx-success)] bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]"
                        : "border-[var(--crmx-danger)] bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]"
                      : "border-[var(--crmx-border)] bg-white text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)]"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>عدد النقاط</label>
            <input
              type="number" min={0} step="0.01"
              className={inputCls}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="مثال: 20"
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>السبب <span className="text-[var(--crmx-danger-text)]">*</span></label>
            <textarea
              className={`${inputCls} h-24 resize-none py-2.5`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="سبب التعديل — إلزامي، مثال: تعويض عن خطأ فني بطلب سابق"
              maxLength={1000}
            />
            {notes.trim().length > 0 && notes.trim().length < 3 && (
              <p className="mt-1 text-[12px] text-[var(--crmx-danger-text)]">السبب قصير جداً.</p>
            )}
          </div>
        </div>

        <footer className="flex items-center gap-2.5 border-t border-[var(--crmx-border)] px-5 py-4">
          <button
            disabled={saving || !canSubmit}
            onClick={submit}
            className="h-11 flex-1 rounded-xl bg-[var(--crmx-primary)] text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="h-11 rounded-xl border border-[var(--crmx-border)] px-4 text-[14px] font-semibold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]"
          >
            إلغاء
          </button>
        </footer>
      </div>
    </div>
  );
}
