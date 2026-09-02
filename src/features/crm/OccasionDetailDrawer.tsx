import { CalendarHeart, History, Repeat, Send, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { toast } from "../../components/shared/Toast";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
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
        className={`absolute end-auto start-0 top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[var(--crmx-card)] ${
          prefix ? "bg-[var(--crmx-accent)]" : "bg-[var(--crmx-border)]"
        }`}
      />
      <div className="rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-3">
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

/**
 * One occasion in full: its details, its quick-contact actions, and the
 * yearly diary that turns a date into "here is what we did last time".
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
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await crmApi.occasion(occasionId));
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, [occasionId]);

  useEffect(() => { void load(); }, [load]);

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

  const followups = detail?.followups ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="تفاصيل المناسبة">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/25 backdrop-blur-[2px]" onClick={onClose} />
      <div dir="rtl" className="crmx-drawer-panel relative flex h-full w-full max-w-md flex-col bg-[var(--crmx-card)] shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--crmx-border)] px-5 py-4">
          <h2 className="min-w-0 truncate text-[17px] font-bold text-[var(--crmx-text)]">
            {detail?.title ?? "تفاصيل المناسبة"}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="crmx-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {loading ? (
            <CrmState kind="loading" title="جارٍ تحميل المناسبة" />
          ) : error ? (
            <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />
          ) : detail ? (
            <>
              <section className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
                <p className="flex items-center gap-2 text-[14px] font-bold text-[var(--crmx-text)]">
                  <CalendarHeart className="h-4 w-4 shrink-0 text-[var(--crmx-text-muted)]" />
                  {detail.title}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className={`${pill} bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]`}>
                    {OCCASION_TYPE_LABELS[detail.occasion_type] ?? detail.occasion_type}
                  </span>
                  <span className={`${pill} bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]`}>
                    {fmtDate(detail.date)}
                  </span>
                  {detail.repeats_annually && (
                    <span className={`${pill} gap-1 bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]`}>
                      <Repeat className="h-3 w-3" /> سنوياً
                    </span>
                  )}
                  {detail.preferred_contact_method && (
                    <span className="text-[12px] text-[var(--crmx-text-muted)]">
                      {CONTACT_METHOD_LABELS[detail.preferred_contact_method]}
                    </span>
                  )}
                </div>

                {/* The rolled date, not the stored one — a birthday saved in
                    1999 is only useful as "next: this year's date". */}
                {detail.next_occurrence && (
                  <p className="mt-3 text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
                    الموعد القادم: {fmtDate(detail.next_occurrence)}
                    {detail.days_until_next != null && (
                      <span className="text-[var(--crmx-text-muted)]">
                        {" · "}
                        {detail.days_until_next === 0
                          ? "اليوم"
                          : `بعد ${detail.days_until_next} يوم`}
                      </span>
                    )}
                  </p>
                )}

                {detail.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-[13px] text-[var(--crmx-text-secondary)]">
                    {detail.notes}
                  </p>
                )}

                {contact && (
                  <div className="mt-3 border-t border-[var(--crmx-border)] pt-3">
                    <OccasionContactActions
                      // The owner's name is only needed for the greeting, and
                      // the loaded detail carries it even when the caller's
                      // contact object does not.
                      contact={{ ...contact, name: contact.name ?? detail.occasionable?.name }}
                      occasionType={detail.occasion_type}
                    />
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-[var(--crmx-text)]">
                  <History className="h-4 w-4 text-[var(--crmx-text-muted)]" />
                  الذكريات والمتابعات
                  {followups.length > 0 && (
                    <span className="text-[13px] font-semibold text-[var(--crmx-text-muted)]">
                      ({followups.length})
                    </span>
                  )}
                </h3>

                {followups.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[var(--crmx-border)] p-4 text-center text-[13px] text-[var(--crmx-text-muted)]">
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
            </>
          ) : null}
        </div>

        {/* Hidden entirely without crm.occasions.update — a visible-but-dead
            composer would tell the reader the log is writable when it is not. */}
        {canWrite && !loading && !error && (
          <footer className="space-y-2.5 border-t border-[var(--crmx-border)] px-5 py-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="ماذا فعلنا هذه المرة؟ مثال: اتصلنا وهنّأناه، طلب كيك شوكولاتة"
              maxLength={5000}
              className="h-24 w-full resize-none rounded-xl border border-[var(--crmx-border)] bg-white px-3 py-2.5 text-[14px] text-[var(--crmx-text)] outline-none transition focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10"
            />
            <button
              onClick={() => void submit()}
              disabled={saving || draft.trim() === ""}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--crmx-primary)] text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {saving ? "جارٍ الحفظ..." : "إضافة متابعة"}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
