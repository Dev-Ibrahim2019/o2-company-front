import { AlertTriangle, CheckCircle2, ChevronDown, Flag, Loader2, MessageSquare, Star, User, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../../../auth";
import { CRM_PERMISSIONS } from "../../../auth/permissions";
import { crmApi } from "../api";
import { getCrmError } from "../components";
import { dateTime as formatDateTime, money as formatMoney, num } from "../format";
import { OccasionContactActions } from "../OccasionContactActions";
import { toast } from "../../../components/shared/Toast";
import type { CrmOrderDetails, CrmOrderItem, CrmOrderItemFeedbackInput, CrmOrderRow } from "../types";
import { CrmStatusBadge, PaymentStatusBadge } from "./CrmStatusBadge";
import { CRM_ORDER_SOURCE_LABELS, CRM_ORDER_TYPE_LABELS, crmOrderTypeLabel } from "./sourceOptions";
import { FeedbackEditor, Field, StarRow, TimelineSection } from "./CrmOrderExpandedPanel";

/**
 * Order Details — a single centred pop-up, the CRM orders screens' one
 * detail surface. No tabs: one scrollable column.
 *
 * The line items read as a tight invoice — name · price · ×qty · total,
 * plus a small "★n" where a rating exists — and stay read-only. Rating
 * happens in ONE panel below it: pick an item, rate it, note it. A star
 * press saves in the background (optimistic, no dialog refetch), then the
 * picker advances to the next un-rated item so the whole order can be
 * rated without stopping. The parent's copy of each item is patched in
 * place so the "n / m مُقيَّم" count stays live, a debounced toast confirms
 * the write, a failure reverts. Every rating also lands in the order's
 * timeline (OrderTimelineController) as a real action on the order.
 *
 * Read-only over the Order domain otherwise (see OrdersPage.tsx's note) —
 * feedback is the only thing CRM writes here, under crm.customer-orders.view.
 */

// Right-bordered heading — one consistent accent so sections separate at a
// glance without a rainbow of colours.
function SecHead({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h4 className="border-e-[3px] border-[var(--crmx-primary)] pe-2.5 text-[12px] font-bold uppercase tracking-wide text-[var(--crmx-text-secondary)]">
        {children}
      </h4>
      {aside}
    </div>
  );
}

// A single invoice line — read-only. The gold "★n" is the only rating
// footprint here; the actual rating control is the panel below the list.
function InvoiceRow({ item }: { item: CrmOrderItem }) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate">
          <span className="text-[13.5px] font-semibold text-[var(--crmx-text)]">{item.item_name_ar || item.item_name}</span>
          <span className="text-[12px] text-[var(--crmx-text-muted)]"> · {formatMoney(item.price)} · ×{num(item.quantity)}</span>
        </p>
        {item.notes && <p className="truncate text-[11.5px] text-[var(--crmx-text-muted)]">{item.notes}</p>}
      </div>
      <span className="flex shrink-0 items-baseline gap-2">
        {item.feedback?.complaint_id ? (
          <Flag className="h-3 w-3 translate-y-0.5 fill-[var(--crmx-danger)] text-[var(--crmx-danger)]" />
        ) : null}
        {item.feedback?.rating ? (
          <span className="inline-flex items-center gap-0.5 text-[11.5px] font-bold text-[var(--crmx-gold)]">
            <Star className="h-3 w-3 fill-[var(--crmx-gold)]" />
            {num(item.feedback.rating)}
          </span>
        ) : null}
        <span className="text-[13.5px] font-bold text-[var(--crmx-text)]">{formatMoney(item.total)}</span>
      </span>
    </li>
  );
}

// The one rating control for the whole order — pick an item, rate it, note
// it. Everything else about the items list stays a plain invoice.
function ItemRatingPanel({
  orderId,
  items,
  onSaved,
  onError,
  onComplaintFlagged,
}: {
  orderId: string | number;
  items: CrmOrderItem[];
  onSaved: (itemId: CrmOrderItem["id"], feedback: NonNullable<CrmOrderItem["feedback"]>) => void;
  onError: (message: string) => void;
  onComplaintFlagged: (itemId: CrmOrderItem["id"], complaintId: number) => void;
}) {
  const { hasPermission } = useAuth();
  const canComplain = hasPermission(CRM_PERMISSIONS.COMPLAINTS_CREATE);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [flagging, setFlagging] = useState(false);

  const [selectedId, setSelectedId] = useState<CrmOrderItem["id"] | null>(
    () => items.find((i) => !i.feedback?.rating)?.id ?? items[0]?.id ?? null,
  );
  const selected = items.find((i) => i.id === selectedId) ?? null;

  const [rating, setRating] = useState(selected?.feedback?.rating ?? 0);
  const [note, setNote] = useState(selected?.feedback?.notes ?? "");
  const [savedNote, setSavedNote] = useState(selected?.feedback?.notes ?? "");
  const [inFlight, setInFlight] = useState(0);
  const [justSaved, setJustSaved] = useState(false);
  const [advancePending, setAdvancePending] = useState(false);
  const lastSaved = useRef({ rating: selected?.feedback?.rating ?? 0, notes: selected?.feedback?.notes ?? "" });
  const checkTimer = useRef<number>();
  const advanceTimer = useRef<number>();
  // Set the moment the user touches the note field. Blocks auto-advance even
  // if the save that would schedule it is still in flight when they do — the
  // star press and the note focus land in the same tick, and the timer is
  // only armed after the save resolves.
  const noteEngaged = useRef(false);

  const nextUnrated = items.find((i) => i.id !== selectedId && !i.feedback?.rating) ?? null;

  const clearAdvanceTimer = useCallback(() => {
    window.clearTimeout(advanceTimer.current);
    setAdvancePending(false);
  }, []);

  // Called from the note field — a persistent "don't move me off this item".
  const holdForNote = useCallback(() => {
    noteEngaged.current = true;
    clearAdvanceTimer();
  }, [clearAdvanceTimer]);

  const goNext = useCallback(() => {
    clearAdvanceTimer();
    const next = itemsRef.current.find((i) => i.id !== selectedId && !i.feedback?.rating);
    if (next) setSelectedId(next.id);
  }, [clearAdvanceTimer, selectedId]);

  // Re-sync the editor to the picked item — on selection change only, never
  // on an items refresh (which would wipe an in-progress note).
  useEffect(() => {
    clearAdvanceTimer();
    noteEngaged.current = false;
    const it = itemsRef.current.find((i) => i.id === selectedId);
    const r = it?.feedback?.rating ?? 0;
    const n = it?.feedback?.notes ?? "";
    setRating(r);
    setNote(n);
    setSavedNote(n);
    lastSaved.current = { rating: r, notes: n };
    setJustSaved(false);
  }, [selectedId, clearAdvanceTimer]);

  useEffect(() => () => {
    window.clearTimeout(checkTimer.current);
    window.clearTimeout(advanceTimer.current);
  }, []);

  if (!selected || selectedId == null) return null;

  const save = async (payload: CrmOrderItemFeedbackInput, fromStar: boolean): Promise<void> => {
    if (payload.rating < 1) return;
    const id = selectedId;
    const notes = payload.notes?.trim() ?? "";
    const wasUnrated = !itemsRef.current.find((i) => i.id === id)?.feedback?.rating;
    setInFlight((n) => n + 1);
    try {
      await crmApi.saveOrderItemFeedback(orderId, id, { rating: payload.rating, notes: notes || null });
      lastSaved.current = { rating: payload.rating, notes };
      setSavedNote(notes);
      setJustSaved(true);
      window.clearTimeout(checkTimer.current);
      checkTimer.current = window.setTimeout(() => setJustSaved(false), 2000);
      onSaved(id, { rating: payload.rating, notes: notes || null });
      // Auto-advance only after a star press that newly rated the item, and
      // only after a pause — so there's room to add a note first. Any touch
      // of the note field (below) cancels it; the "التالي" button skips it.
      if (
        fromStar &&
        wasUnrated &&
        !noteEngaged.current &&
        itemsRef.current.some((i) => i.id !== id && !i.feedback?.rating)
      ) {
        window.clearTimeout(advanceTimer.current);
        setAdvancePending(true);
        advanceTimer.current = window.setTimeout(() => {
          setAdvancePending(false);
          if (noteEngaged.current) return;
          const next = itemsRef.current.find((i) => i.id !== id && !i.feedback?.rating);
          if (next) setSelectedId(next.id);
        }, 2500);
      }
    } catch (e) {
      setRating(lastSaved.current.rating);
      setNote(lastSaved.current.notes);
      onError(getCrmError(e).message);
    } finally {
      setInFlight((n) => n - 1);
    }
  };

  const onStar = (v: number) => {
    setRating(v);
    void save({ rating: v, notes: note }, true);
  };
  const noteDirty = note.trim() !== savedNote.trim();
  const nextName = nextUnrated ? nextUnrated.item_name_ar || nextUnrated.item_name : null;
  const complaintId = selected.feedback?.complaint_id ?? null;

  const flagAsComplaint = async () => {
    clearAdvanceTimer();
    noteEngaged.current = true;
    if (noteDirty && rating >= 1) await save({ rating, notes: note }, false); // persist the note first — it becomes the complaint body
    if (!window.confirm("تسجيل هذه الملاحظة كشكوى من العميل؟ ستُدرج ضمن شكاوى العميل وتظهر في ملفه.")) return;
    setFlagging(true);
    try {
      const complaint = await crmApi.flagOrderItemComplaint(orderId, selectedId);
      onComplaintFlagged(selectedId, Number(complaint.id));
      toast.success("تم تسجيل الشكوى", "أُدرجت ضمن شكاوى العميل.");
    } catch (e) {
      toast.error("تعذّر تسجيل الشكوى", getCrmError(e).message);
    } finally {
      setFlagging(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-3.5">
      <select
        value={String(selectedId)}
        onChange={(e) => setSelectedId(items.find((i) => String(i.id) === e.target.value)?.id ?? null)}
        className="h-10 w-full rounded-lg border border-[var(--crmx-border)] bg-white px-3 text-[13.5px] font-semibold text-[var(--crmx-text)] outline-none transition focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10"
      >
        {items.map((it) => (
          <option key={it.id} value={String(it.id)}>
            {(it.item_name_ar || it.item_name) + (it.feedback?.rating ? `  ★ ${it.feedback.rating}` : "")}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <StarRow value={rating} onChange={onStar} size={7} />
        {inFlight > 0 ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--crmx-text-muted)]" />
        ) : justSaved ? (
          <span className="flex items-center gap-1 text-[12px] font-semibold text-[var(--crmx-success-text)]">
            <CheckCircle2 className="h-4 w-4" /> محفوظ
          </span>
        ) : null}
        {nextName && (
          <button
            type="button"
            onClick={goNext}
            className={`ms-auto rounded-lg px-2.5 py-1 text-[12px] font-bold transition ${
              advancePending
                ? "animate-pulse bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]"
                : "text-[var(--crmx-primary-text)] hover:bg-[var(--crmx-neutral-soft)]"
            }`}
            title={advancePending ? "سينتقل تلقائياً — اضغط للانتقال الآن" : undefined}
          >
            التالي: {nextName} ←
          </button>
        )}
      </div>

      <div>
        <div className="flex items-start gap-2">
          <textarea
            value={note}
            onFocus={holdForNote}
            onChange={(e) => { holdForNote(); setNote(e.target.value); }}
            onBlur={(e) => {
              // Don't double-fire when the blur is the user clicking "حفظ".
              if ((e.relatedTarget as HTMLElement | null)?.dataset?.noteSave) return;
              if (noteDirty && rating >= 1) void save({ rating, notes: note }, false);
            }}
            placeholder="ملاحظة على هذا الصنف (اختياري)…"
            rows={2}
            maxLength={1000}
            className="flex-1 resize-none rounded-lg border border-[var(--crmx-border)] bg-white px-3 py-2 text-[13px] text-[var(--crmx-text)] outline-none transition focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10"
          />
          {noteDirty && (
            <button
              type="button"
              data-note-save="1"
              onClick={() => void save({ rating, notes: note }, false)}
              disabled={inFlight > 0 || rating < 1}
              className="h-9 shrink-0 rounded-lg bg-[var(--crmx-primary)] px-3 text-[12.5px] font-bold text-white transition disabled:opacity-40"
            >
              حفظ
            </button>
          )}
        </div>
        {noteDirty && rating < 1 && (
          <p className="mt-1 text-[11.5px] text-[var(--crmx-text-muted)]">قيّم الصنف أولاً لحفظ الملاحظة معه.</p>
        )}

        {rating >= 1 && (
          <div className="mt-2">
            {complaintId ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--crmx-danger-soft)] px-2.5 py-1 text-[12px] font-bold text-[var(--crmx-danger-text)]">
                <Flag className="h-3.5 w-3.5" /> مُسجَّلة كشكوى من العميل
              </span>
            ) : canComplain ? (
              <button
                type="button"
                onClick={flagAsComplaint}
                disabled={flagging || inFlight > 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--crmx-danger)]/40 px-2.5 py-1 text-[12px] font-bold text-[var(--crmx-danger-text)] transition hover:bg-[var(--crmx-danger-soft)] disabled:opacity-40"
              >
                {flagging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
                تسجيل كشكوى من العميل
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function TotalBlock({ order }: { order: CrmOrderDetails }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--crmx-border)]">
      {(order.subtotal !== order.total || order.discount_amount > 0) && (
        <dl className="space-y-1.5 bg-[var(--crmx-card)] px-4 py-2.5 text-[13px]">
          <div className="flex items-center justify-between">
            <dt className="text-[var(--crmx-text-secondary)]">الإجمالي الفرعي</dt>
            <dd className="font-semibold text-[var(--crmx-text)]">{formatMoney(order.subtotal)}</dd>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-[var(--crmx-text-secondary)]">الخصم</dt>
              <dd className="font-semibold text-[var(--crmx-danger-text)]">−{formatMoney(order.discount_amount)}</dd>
            </div>
          )}
        </dl>
      )}
      <div className="flex items-center justify-between bg-[var(--crmx-primary-soft)] px-4 py-2.5">
        <span className="text-[13px] font-bold text-[var(--crmx-primary-text)]">الإجمالي</span>
        <span className="text-[18px] font-extrabold text-[var(--crmx-primary-text)]">{formatMoney(order.total)}</span>
      </div>
    </div>
  );
}

function ActivityBlock({
  order,
  refreshKey,
  onFeedbackSaved,
}: {
  order: CrmOrderDetails;
  refreshKey: number;
  onFeedbackSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-[14px] font-bold text-[var(--crmx-text)]"
      >
        سجل النشاط وتقييم الطلب
        <ChevronDown className={`ms-auto h-4 w-4 text-[var(--crmx-text-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-5 border-t border-[var(--crmx-border)] p-4">
          <div>
            <SecHead>تقييم الطلب</SecHead>
            {order.customer_id ? (
              <FeedbackEditor order={order} customerId={order.customer_id} onSaved={onFeedbackSaved} />
            ) : (
              <p className="text-[13px] text-[var(--crmx-text-muted)]">
                تقييم الطلب يُحفظ على ملف العميل — وهذا الطلب غير مرتبط بعميل.
              </p>
            )}
          </div>
          <div>
            <SecHead>سجل نشاط الطلب</SecHead>
            <TimelineSection orderId={order.id} refreshKey={refreshKey} />
          </div>
        </div>
      )}
    </div>
  );
}

function ModalBody({
  row,
  details,
  loading,
  error,
  reload,
  onClose,
  onItemSaved,
  onItemError,
  onComplaintFlagged,
  feedbackVersion,
  bumpFeedbackVersion,
}: {
  row: CrmOrderRow;
  details?: CrmOrderDetails;
  loading: boolean;
  error?: string;
  reload: () => void;
  onClose: () => void;
  onItemSaved: (itemId: CrmOrderItem["id"], feedback: NonNullable<CrmOrderItem["feedback"]>) => void;
  onItemError: (message: string) => void;
  onComplaintFlagged: (itemId: CrmOrderItem["id"], complaintId: number) => void;
  feedbackVersion: number;
  bumpFeedbackVersion: () => void;
}) {
  const titleId = "crm-order-details-title";
  const items = details?.items ?? [];
  const ratedCount = useMemo(() => items.filter((i) => i.feedback?.rating).length, [items]);
  const allRated = items.length > 0 && ratedCount === items.length;

  const source = row.source ? CRM_ORDER_SOURCE_LABELS[row.source] || row.source : null;
  const customerName = row.customer?.name || details?.customer_name;
  const customerPhone = details?.customer_phone || row.customer_phone;
  const customerId = details?.customer_id ?? row.customer?.id;

  return (
    <>
      <header className="border-b border-[var(--crmx-border)] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-[18px] font-bold leading-tight text-[var(--crmx-text)]" dir="ltr">
              {row.order_number}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <CrmStatusBadge value={row.status} />
              <PaymentStatusBadge isPaid={row.is_paid} paymentStatus={row.payment_status} />
              <span className="text-[12.5px] text-[var(--crmx-text-muted)]">{formatDateTime(row.created_at)}</span>
            </div>
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

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-[var(--crmx-bg)] p-3 sm:grid-cols-4">
          <Field label="الفرع" value={details?.branch?.name || row.branch?.name || "—"} />
          <Field label="المصدر" value={source || "—"} />
          <Field label="النوع" value={crmOrderTypeLabel(row) || CRM_ORDER_TYPE_LABELS[details?.order_type ?? ""] || "—"} />
          <Field label="أنشأه" value={details?.cashier?.name || "—"} />
        </dl>
      </header>

      <div className="crmx-scrollbar flex-1 overflow-y-auto px-5 py-4">
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
        ) : !details ? null : (
          <div className="space-y-5">
            {details.note && (
              <p className="flex items-start gap-2 rounded-xl bg-[var(--crmx-warning-soft)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--crmx-warning-text)]">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                {details.note}
              </p>
            )}

            <div>
              <SecHead>الأصناف</SecHead>
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--crmx-border)] py-5 text-center text-[13px] text-[var(--crmx-text-muted)]">
                  لا توجد أصناف مسجلة
                </p>
              ) : (
                <ul className="divide-y divide-[var(--crmx-border)] rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-3.5 py-1">
                  {items.map((item) => (
                    <InvoiceRow key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div>
                <SecHead
                  aside={
                    <span
                      className={`text-[12px] font-bold ${
                        allRated
                          ? "text-[var(--crmx-success-text)]"
                          : ratedCount > 0
                            ? "text-[var(--crmx-warning-text)]"
                            : "text-[var(--crmx-text-muted)]"
                      }`}
                    >
                      {num(ratedCount)} / {num(items.length)} مُقيَّم
                    </span>
                  }
                >
                  تقييم الأصناف
                </SecHead>
                <ItemRatingPanel
                  orderId={details.id}
                  items={items}
                  onSaved={onItemSaved}
                  onError={onItemError}
                  onComplaintFlagged={onComplaintFlagged}
                />
              </div>
            )}

            <div>
              <SecHead>الإجمالي</SecHead>
              <TotalBlock order={details} />
            </div>

            <div>
              <SecHead>العميل</SecHead>
              {customerName ? (
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="text-[15px] font-semibold text-[var(--crmx-text)]">{customerName}</span>
                    {customerId != null && (
                      <Link
                        to={`/admin/crm/customers/${customerId}/overview`}
                        onClick={onClose}
                        className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[var(--crmx-primary-text)] hover:underline"
                      >
                        <User className="h-3.5 w-3.5" /> الملف
                      </Link>
                    )}
                  </div>
                  {customerPhone && (
                    <p className="text-[13px] text-[var(--crmx-text-muted)]" dir="ltr">{customerPhone}</p>
                  )}
                  {customerPhone && (
                    <div className="pt-1">
                      <OccasionContactActions contact={{ phone: customerPhone, name: customerName }} />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-[var(--crmx-text-muted)]">هذا الطلب غير مرتبط بعميل.</p>
              )}
            </div>

            <ActivityBlock order={details} refreshKey={feedbackVersion} onFeedbackSaved={bumpFeedbackVersion} />
          </div>
        )}
      </div>
    </>
  );
}

export function CrmOrderDetailsModal({
  order,
  preloaded,
  onClose,
}: {
  order: CrmOrderRow | null;
  /** The /crm/orders/{id} response, if the caller already fetched it. */
  preloaded?: CrmOrderDetails | null;
  onClose: () => void;
}) {
  const preloadMatches = Boolean(preloaded && order && String(preloaded.id) === String(order.id));
  const [details, setDetails] = useState<CrmOrderDetails | undefined>(preloadMatches ? preloaded ?? undefined : undefined);
  const [loading, setLoading] = useState(!preloadMatches);
  const [error, setError] = useState<string>();
  // Bumped on any feedback write — the collapsed timeline re-fetches on this
  // (and on expand) so a rating shows up in the trail as the action it is.
  const [feedbackVersion, setFeedbackVersion] = useState(0);
  const savedToastTimer = useRef<number>();

  const load = useCallback((id: string | number) => {
    setLoading(true);
    setError(undefined);
    crmApi.orderDetails(id)
      .then(setDetails)
      .catch((e) => setError(getCrmError(e).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!order) return;
    setFeedbackVersion(0);
    if (preloaded && String(preloaded.id) === String(order.id)) {
      setDetails(preloaded);
      setLoading(false);
      setError(undefined);
      return;
    }
    load(order.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  useEffect(() => {
    if (!order) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [order, onClose]);

  useEffect(() => () => window.clearTimeout(savedToastTimer.current), []);

  const bumpFeedbackVersion = useCallback(() => setFeedbackVersion((v) => v + 1), []);

  // Patch just the one item's feedback in place — no refetch, so the list
  // never re-mounts and no spinner covers the dialog.
  const onItemSaved = useCallback((itemId: CrmOrderItem["id"], feedback: NonNullable<CrmOrderItem["feedback"]>) => {
    setDetails((d) => (d ? { ...d, items: d.items.map((it) => (it.id === itemId ? { ...it, feedback } : it)) } : d));
    setFeedbackVersion((v) => v + 1);
    window.clearTimeout(savedToastTimer.current);
    savedToastTimer.current = window.setTimeout(() => toast.success("تم حفظ التقييم"), 900);
  }, []);

  const onItemError = useCallback((message: string) => {
    toast.error("تعذّر حفظ التقييم", message);
  }, []);

  // Mark the item's rating as escalated — the panel flips to a "مُسجَّلة
  // كشكوى" chip, the timeline (bumped) picks up the item_complaint event.
  const onComplaintFlagged = useCallback((itemId: CrmOrderItem["id"], complaintId: number) => {
    setDetails((d) =>
      d
        ? {
            ...d,
            items: d.items.map((it) =>
              it.id === itemId && it.feedback ? { ...it, feedback: { ...it.feedback, complaint_id: complaintId } } : it,
            ),
          }
        : d,
    );
    setFeedbackVersion((v) => v + 1);
  }, []);

  return createPortal(
    // .crmx-root/contents wrapper: this tree is portalled to document.body,
    // outside the CRM shell, so without it every --crmx-* token the modal
    // reads is undefined. `contents` keeps the wrapper from painting a box.
    <div className="crmx-root contents">
      <AnimatePresence>
        {order && (
          <motion.div key={order.id} className="fixed inset-0 z-[90] flex items-center justify-center p-4" dir="rtl">
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
              aria-labelledby="crm-order-details-title"
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="relative flex max-h-[calc(100vh-4rem)] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] shadow-[var(--crmx-shadow-md)]"
            >
              <ModalBody
                row={order}
                details={details}
                loading={loading}
                error={error}
                reload={() => load(order.id)}
                onClose={onClose}
                onItemSaved={onItemSaved}
                onItemError={onItemError}
                onComplaintFlagged={onComplaintFlagged}
                feedbackVersion={feedbackVersion}
                bumpFeedbackVersion={bumpFeedbackVersion}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
