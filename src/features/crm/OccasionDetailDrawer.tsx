import { AlertTriangle, History, Loader2, Repeat, Send, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { toast } from "../../components/shared/Toast";
import { crmApi } from "./api";
import { getCrmError } from "./components";
import { Field, SecHead } from "./customers-ui";
import "./customers-ui/crmx.css";
import { date as fmtDate } from "./format";
import { CONTACT_METHOD_LABELS, OCCASION_TYPE_LABELS } from "./occasionLabels";
import { OccasionContactActions, type OccasionContact } from "./OccasionContactActions";
import type { CrmId, CrmOccasionDetail, CrmOccasionFollowup } from "./types";

const pill = "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap";

/**
 * How a diary line is introduced.
 *
 * The point of the log is not an audit trail — it is "this is what we did for
 * them last time". A line written in an earlier calendar year is therefore
 * framed as a memory ("من العام الماضي"), and anything older gets its year
 * named rather than a vague "قديم". Lines from this year read as plain
 * entries, because calling something a memory an hour after it was written
 * would be nonsense.
 *
 * Calendar years, not a 365-day window: the occasion itself recurs on a
 * calendar date, so "last year's note" is the one from the previous
 * observance, which is exactly what a year boundary expresses.
 */
function memoryPrefix(createdAt?: string | null, now: Date = new Date()): string | null {
  if (!createdAt) return null;
  const then = new Date(createdAt);
  if (Number.isNaN(then.getTime())) return null;

  const years = now.getFullYear() - then.getFullYear();
  if (years <= 0) return null;
  if (years === 1) return "من العام الماضي";
  return `من عام ${then.getFullYear()}`;
}

function MemoryLine({ followup }: { followup: CrmOccasionFollowup }) {
  const prefix = memoryPrefix(followup.created_at);

  return (
    <li className="relative ps-6">
      {/* The rail dot. A memory is marked in the accent colour so the eye can
          find "what happened before" without reading the dates. */}
      <span
        className={`absolute end-auto start-0 top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[var(--crmx-bg)] ${
          prefix ? "bg-[var(--crmx-accent)]" : "bg-[var(--crmx-border)]"
        }`}
      />
      <div className="rounded-xl bg-[var(--crmx-card)] p-3 shadow-[var(--crmx-shadow-sm)]">
        {prefix && (
          <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-[var(--crmx-accent)]">
            <History className="h-3.5 w-3.5" />
            {prefix}
          </p>
        )}
        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--crmx-text)]">
          {followup.notes}
        </p>
        <p className="mt-2 text-[12px] text-[var(--crmx-text-muted)]">
          {followup.creator?.name ? `${followup.creator.name} · ` : ""}
          {fmtDate(followup.created_at)}
        </p>
      </div>
    </li>
  );
}

function ModalBody({
  detail,
  loading,
  error,
  reload,
  onClose,
  contact,
  canWrite,
  draft,
  setDraft,
  saving,
  onSubmit,
}: {
  detail?: CrmOccasionDetail;
  loading: boolean;
  error?: string;
  reload: () => void;
  onClose: () => void;
  contact?: OccasionContact;
  canWrite: boolean;
  draft: string;
  setDraft: (v: string) => void;
  saving: boolean;
  onSubmit: () => void;
}) {
  const titleId = "crm-occasion-details-title";
  const followups = detail?.followups ?? [];

  return (
    <>
      <span className="block h-1 shrink-0 bg-[var(--crmx-primary)]" aria-hidden />
      <header className="shrink-0 border-b border-[var(--crmx-border)] bg-[var(--crmx-card)] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-[18px] font-extrabold leading-tight text-[var(--crmx-text)]">
              {detail?.title ?? "تفاصيل المناسبة"}
            </h2>
            {detail && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className={`${pill} bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]`}>
                  {OCCASION_TYPE_LABELS[detail.occasion_type] ?? detail.occasion_type}
                </span>
                {detail.repeats_annually && (
                  <span className={`${pill} gap-1 bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]`}>
                    <Repeat className="h-3 w-3" /> سنويًا
                  </span>
                )}
                <span className="text-[12.5px] text-[var(--crmx-text-muted)]">{fmtDate(detail.date)}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {detail && (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-[var(--crmx-neutral-soft)] p-3 sm:grid-cols-4">
            <Field label="النوع" value={OCCASION_TYPE_LABELS[detail.occasion_type] ?? detail.occasion_type} />
            <Field
              label="الموعد القادم"
              value={
                detail.next_occurrence
                  ? `${fmtDate(detail.next_occurrence)}${
                      detail.days_until_next != null
                        ? detail.days_until_next === 0 ? " · اليوم" : ` · بعد ${detail.days_until_next} يوم`
                        : ""
                    }`
                  : "—"
              }
            />
            <Field label="التكرار" value={detail.repeats_annually ? "سنويًا" : "مرة واحدة"} />
            <Field label="طريقة التواصل" value={detail.preferred_contact_method ? CONTACT_METHOD_LABELS[detail.preferred_contact_method] : "—"} />
          </dl>
        )}
      </header>

      <div className="crmx-scrollbar flex-1 overflow-y-auto bg-[var(--crmx-bg)] px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--crmx-text-muted)]" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <AlertTriangle className="h-7 w-7 text-[var(--crmx-danger)]" />
            <p className="text-[14px] font-semibold text-[var(--crmx-danger-text)]">{error}</p>
            <button
              type="button"
              onClick={reload}
              className="h-10 rounded-xl bg-[var(--crmx-primary)] px-4 text-[13px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : !detail ? null : (
          <div className="space-y-4">
            {detail.notes && (
              <section>
                <SecHead>ملاحظات</SecHead>
                <p className="whitespace-pre-wrap rounded-xl bg-[var(--crmx-card)] p-3.5 text-[13px] leading-relaxed text-[var(--crmx-text-secondary)] shadow-[var(--crmx-shadow-sm)]">
                  {detail.notes}
                </p>
              </section>
            )}

            {contact && (
              <section>
                <SecHead>تواصل سريع</SecHead>
                <div className="rounded-xl bg-[var(--crmx-card)] p-3.5 shadow-[var(--crmx-shadow-sm)]">
                  <OccasionContactActions
                    // The owner's name is only needed for the greeting, and the
                    // loaded detail carries it even when the caller's contact
                    // object does not.
                    contact={{ ...contact, name: contact.name ?? detail.occasionable?.name }}
                    occasionType={detail.occasion_type}
                  />
                </div>
              </section>
            )}

            <section>
              <SecHead
                aside={
                  followups.length > 0 ? (
                    <span className="rounded-full bg-[var(--crmx-neutral-soft)] px-2 py-0.5 text-[11.5px] font-bold text-[var(--crmx-text-secondary)]">
                      {followups.length}
                    </span>
                  ) : undefined
                }
              >
                الذكريات والمتابعات
              </SecHead>

              {followups.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--crmx-border)] bg-[var(--crmx-card)] py-5 text-center text-[13px] text-[var(--crmx-text-muted)]">
                  لا توجد متابعات بعد — أول ملاحظة تكتبها هنا ستظهر العام القادم كتذكير.
                </p>
              ) : (
                // The rail sits on the start edge so the dots line up under
                // the heading in RTL exactly as they would in LTR.
                <ul className="relative space-y-3 before:absolute before:bottom-2 before:start-[4.5px] before:top-2 before:w-px before:bg-[var(--crmx-border)]">
                  {followups.map((f) => (
                    <MemoryLine key={String(f.id)} followup={f} />
                  ))}
                </ul>
              )}
            </section>

            {/* Hidden entirely without crm.occasions.update — a visible-but-dead
                composer would tell the reader the log is writable when it is not. */}
            {canWrite && (
              <section>
                <SecHead>إضافة متابعة</SecHead>
                <div className="space-y-2.5 rounded-xl bg-[var(--crmx-card)] p-3.5 shadow-[var(--crmx-shadow-sm)]">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="ماذا فعلنا هذه المرة؟ مثال: اتصلنا وهنّأناه، طلب كيك شوكولاتة"
                    maxLength={5000}
                    className="h-24 w-full resize-none rounded-xl border border-[var(--crmx-border)] bg-white px-3 py-2.5 text-[14px] text-[var(--crmx-text)] outline-none transition focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10"
                  />
                  <button
                    onClick={onSubmit}
                    disabled={saving || draft.trim() === ""}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--crmx-primary)] text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {saving ? "جارٍ الحفظ..." : "إضافة متابعة"}
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * One occasion in full: its details, its quick-contact actions, and the
 * yearly diary that turns a date into "here is what we did last time" — now
 * the same centred pop-up shape as CrmOrderDetailsModal (top accent bar,
 * quick-facts grid, tick-headed sections on a tinted background), the shape
 * every other CRM detail surface already converged on.
 *
 * Reads GET /crm/occasions/{id}, which is the only endpoint that carries the
 * followup log — the per-owner list endpoints return the occasion rows alone.
 */
export function OccasionDetailDrawer({
  occasionId,
  contact,
  onClose,
  onChanged,
}: {
  occasionId: CrmId;
  /** Present only for a customer-owned occasion — see OccasionContactActions. */
  contact?: OccasionContact;
  onClose: () => void;
  /** Fired after a write, so the list behind the drawer can refresh. */
  onChanged?: () => void;
}) {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission(CRM_PERMISSIONS.OCCASIONS_UPDATE);

  const [detail, setDetail] = useState<CrmOccasionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setDetail(await crmApi.occasion(occasionId));
    } catch (e) {
      setError(getCrmError(e).message);
    } finally {
      setLoading(false);
    }
  }, [occasionId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    const notes = draft.trim();
    if (!notes) return;
    setSaving(true);
    try {
      await crmApi.addOccasionFollowup(occasionId, notes);
      setDraft("");
      toast.success("تمت إضافة المتابعة");
      // Reloaded rather than appended locally: the server decides the order
      // and stamps the author, and the list must read the same either way.
      await load();
      onChanged?.();
    } catch (e) {
      toast.error("تعذّر إضافة المتابعة", getCrmError(e).message);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    // .crmx-root/contents wrapper: this tree is portalled to document.body,
    // outside the CRM shell, so without it every --crmx-* token the modal
    // reads is undefined. `contents` keeps the wrapper from painting a box.
    <div className="crmx-root contents">
      <AnimatePresence>
        <motion.div key={String(occasionId)} className="fixed inset-0 z-[90] flex items-center justify-center p-4" dir="rtl">
          <motion.button
            type="button"
            aria-label="إغلاق"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="crm-occasion-details-title"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="relative flex max-h-[calc(100vh-4rem)] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl bg-[var(--crmx-card)] shadow-[var(--crmx-shadow-md)]"
          >
            <ModalBody
              detail={detail ?? undefined}
              loading={loading}
              error={error}
              reload={load}
              onClose={onClose}
              contact={contact}
              canWrite={canWrite}
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              onSubmit={() => void submit()}
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  );
}
