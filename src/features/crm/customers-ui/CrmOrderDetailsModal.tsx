import { AlertTriangle, CheckCircle2, Loader2, MessageSquare, MessageSquarePlus, User, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { crmApi } from "../api";
import { getCrmError } from "../components";
import { dateTime as formatDateTime, money as formatMoney, num } from "../format";
import { OccasionContactActions } from "../OccasionContactActions";
import type { CrmOrderDetails, CrmOrderItem, CrmOrderRow } from "../types";
import { CrmStatusBadge, PaymentStatusBadge } from "./CrmStatusBadge";
import { CRM_ORDER_SOURCE_LABELS, CRM_ORDER_TYPE_LABELS, crmOrderTypeLabel } from "./sourceOptions";
import { FeedbackEditor, Field, SectionLabel, StarRow, TimelineSection } from "./CrmOrderExpandedPanel";

/**
 * Order Details — a centred pop-up (modal), the CRM orders screens' single
 * detail surface. Replaces the row-click popover + inline row expansion that
 * preceded it: one dialog, four tabs (نظرة عامة / الأصناف والمالية / العميل /
 * النشاط والتقييم), fixed spacing and type scale.
 *
 * Read-only over the Order domain, exactly as the orders list is (see
 * OrdersPage.tsx's own note) — the one thing it writes is feedback, which CRM
 * already owns: order-level (order_feedback) and now per-item
 * (order_item_feedback), both under crm.customer-orders.view.
 */

type TabKey = "overview" | "items" | "customer" | "activity";
const TABS: Array<[TabKey, string]> = [
  ["overview", "نظرة عامة"],
  ["items", "الأصناف والمالية"],
  ["customer", "العميل"],
  ["activity", "النشاط والتقييم"],
];

// One line item + its 1–5 rating. Stars save on click (the common pattern for
// a rating control); a note is opt-in and saved with the next star press or
// its own button. The row shows the last saved value on mount.
function ItemRow({
  orderId,
  item,
  onSaved,
}: {
  orderId: string | number;
  item: CrmOrderItem;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(item.feedback?.rating ?? 0);
  const [note, setNote] = useState(item.feedback?.notes ?? "");
  const [noteOpen, setNoteOpen] = useState(Boolean(item.feedback?.notes));
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string>();

  const save = async (nextRating: number, nextNote: string) => {
    if (nextRating < 1) return;
    setSaving(true);
    setError(undefined);
    setJustSaved(false);
    try {
      await crmApi.saveOrderItemFeedback(orderId, item.id, {
        rating: nextRating,
        notes: nextNote.trim() || null,
      });
      setJustSaved(true);
      onSaved();
      window.setTimeout(() => setJustSaved(false), 2000);
    } catch (e) {
      setError(getCrmError(e).message);
      setRating(item.feedback?.rating ?? 0); // revert the optimistic star
    } finally {
      setSaving(false);
    }
  };

  const onStar = (v: number) => {
    setRating(v);
    void save(v, note);
  };

  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[var(--crmx-text)]">{item.item_name_ar || item.item_name}</p>
          <p className="mt-0.5 text-[12.5px] text-[var(--crmx-text-muted)]">
            {num(item.quantity)} × {formatMoney(item.price)}
            {item.notes ? ` · ${item.notes}` : ""}
          </p>
        </div>
        <span className="shrink-0 text-[14px] font-bold text-[var(--crmx-text)]">{formatMoney(item.total)}</span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <StarRow value={rating} onChange={onStar} disabled={saving} size={5} />
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--crmx-text-muted)]" />}
        {justSaved && (
          <span className="flex items-center gap-1 text-[12px] font-semibold text-[var(--crmx-primary-text)]">
            <CheckCircle2 className="h-3.5 w-3.5" /> تم الحفظ
          </span>
        )}
        {error && <span className="text-[12px] font-semibold text-[var(--crmx-danger-text)]">{error}</span>}
        {!noteOpen && (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="flex items-center gap-1 text-[12px] font-semibold text-[var(--crmx-text-muted)] transition hover:text-[var(--crmx-primary-text)]"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" /> إضافة ملاحظة
          </button>
        )}
      </div>

      {noteOpen && (
        <div className="mt-2 flex items-start gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ملاحظة على هذا الصنف…"
            rows={2}
            maxLength={1000}
            className="flex-1 resize-none rounded-lg border border-[var(--crmx-border)] bg-white px-3 py-2 text-[13px] text-[var(--crmx-text)] outline-none transition focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10"
          />
          <button
            type="button"
            onClick={() => save(rating, note)}
            disabled={saving || rating < 1}
            className="h-9 shrink-0 rounded-lg bg-[var(--crmx-primary)] px-3 text-[12.5px] font-bold text-white transition disabled:opacity-40"
            title={rating < 1 ? "اختر تقييماً أولاً" : undefined}
          >
            حفظ
          </button>
        </div>
      )}
    </li>
  );
}

function FinancialSummary({ order }: { order: CrmOrderDetails }) {
  return (
    <dl className="space-y-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4 text-[13px]">
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
      <div className="flex items-center justify-between border-t border-[var(--crmx-border)] pt-2">
        <dt className="text-[14px] font-bold text-[var(--crmx-text)]">الإجمالي</dt>
        <dd className="text-[16px] font-bold text-[var(--crmx-text)]">{formatMoney(order.total)}</dd>
      </div>
    </dl>
  );
}

function ModalBody({
  row,
  details,
  loading,
  error,
  reload,
  onClose,
}: {
  row: CrmOrderRow;
  details?: CrmOrderDetails;
  loading: boolean;
  error?: string;
  reload: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("overview");
  const titleId = "crm-order-details-title";

  const ratedCount = useMemo(
    () => (details?.items ?? []).filter((i) => i.feedback?.rating).length,
    [details],
  );

  const source = row.source ? CRM_ORDER_SOURCE_LABELS[row.source] || row.source : null;

  return (
    <>
      <header className="border-b border-[var(--crmx-border)] px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-[19px] font-bold leading-tight text-[var(--crmx-text)]" dir="ltr">
              {row.order_number}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <CrmStatusBadge value={row.status} />
              <PaymentStatusBadge isPaid={row.is_paid} paymentStatus={row.payment_status} />
              <span className="text-[12.5px] text-[var(--crmx-text-muted)]">{formatDateTime(row.created_at)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 -mb-5 flex items-center gap-6 border-b border-transparent">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`border-b-2 px-1 pb-3 text-[14px] font-semibold transition ${
                tab === key
                  ? "border-[var(--crmx-primary)] text-[var(--crmx-text)]"
                  : "border-transparent text-[var(--crmx-text-muted)] hover:text-[var(--crmx-text-secondary)]"
              }`}
            >
              {label}
              {key === "items" && ratedCount > 0 && (
                <span className="ms-1.5 rounded-full bg-[var(--crmx-warning-soft)] px-1.5 text-[11px] font-bold text-[var(--crmx-warning-text)]">
                  {num(ratedCount)}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <div className="crmx-scrollbar flex-1 overflow-y-auto px-6 py-5">
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
        ) : !details ? null : tab === "overview" ? (
          <div className="space-y-5">
            <div>
              <SectionLabel>تفاصيل الطلب</SectionLabel>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                <Field label="الفرع" value={details.branch?.name || row.branch?.name || "—"} />
                <Field label="مصدر الطلب" value={source || "—"} />
                <Field label="النوع" value={crmOrderTypeLabel(row) || CRM_ORDER_TYPE_LABELS[details.order_type ?? ""] || "—"} />
                <Field label="التاريخ" value={formatDateTime(details.created_at)} />
                <Field label="أنشأه" value={details.cashier?.name || "—"} />
              </dl>
            </div>

            {details.note && (
              <div>
                <SectionLabel>ملاحظة الطلب</SectionLabel>
                <p className="flex items-start gap-2 rounded-xl bg-[var(--crmx-warning-soft)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--crmx-warning-text)]">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                  {details.note}
                </p>
              </div>
            )}

            <div>
              <SectionLabel>الإجمالي</SectionLabel>
              <FinancialSummary order={details} />
            </div>
          </div>
        ) : tab === "items" ? (
          <div className="space-y-5">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <SectionLabel>الأصناف</SectionLabel>
                <span className="text-[12px] text-[var(--crmx-text-muted)]">
                  {details.items.length > 0 ? `${num(ratedCount)} / ${num(details.items.length)} مُقيَّم` : ""}
                </span>
              </div>
              {details.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--crmx-border)] py-6 text-center text-[13px] text-[var(--crmx-text-muted)]">
                  لا توجد أصناف مسجلة
                </p>
              ) : (
                <ul className="divide-y divide-[var(--crmx-border)] rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4">
                  {details.items.map((item) => (
                    <ItemRow key={item.id} orderId={details.id} item={item} onSaved={reload} />
                  ))}
                </ul>
              )}
            </div>

            <div>
              <SectionLabel>الماليات</SectionLabel>
              <FinancialSummary order={details} />
            </div>
          </div>
        ) : tab === "customer" ? (
          <div className="space-y-4">
            <SectionLabel>العميل</SectionLabel>
            {row.customer?.name || details.customer_name ? (
              <>
                <p className="text-[16px] font-semibold text-[var(--crmx-text)]">
                  {row.customer?.name || details.customer_name}
                </p>
                {(details.customer_phone || row.customer_phone) && (
                  <p className="mt-0.5 text-[13px] text-[var(--crmx-text-muted)]" dir="ltr">
                    {details.customer_phone || row.customer_phone}
                  </p>
                )}
                {(details.customer_id ?? row.customer?.id) != null && (
                  <Link
                    to={`/admin/crm/customers/${details.customer_id ?? row.customer?.id}/overview`}
                    onClick={onClose}
                    className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-[var(--crmx-primary-text)] hover:underline"
                  >
                    <User className="h-3.5 w-3.5" /> عرض ملف العميل
                  </Link>
                )}
                {(details.customer_phone || row.customer_phone) && (
                  <div className="pt-1">
                    <OccasionContactActions
                      contact={{
                        phone: details.customer_phone || row.customer_phone,
                        name: row.customer?.name || details.customer_name,
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="text-[13px] text-[var(--crmx-text-muted)]">هذا الطلب غير مرتبط بعميل.</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <SectionLabel>تقييم الطلب</SectionLabel>
              {details.customer_id ? (
                <FeedbackEditor order={details} customerId={details.customer_id} onSaved={reload} />
              ) : (
                <p className="text-[13px] text-[var(--crmx-text-muted)]">
                  تقييم الطلب يُحفظ على ملف العميل — وهذا الطلب غير مرتبط بعميل.
                </p>
              )}
            </div>
            <div>
              <SectionLabel>سجل نشاط الطلب</SectionLabel>
              <TimelineSection orderId={details.id} />
            </div>
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

  return createPortal(
    // .crmx-root/contents wrapper: this tree is portalled to document.body,
    // outside the CRM shell, so without it every --crmx-* token the modal
    // reads is undefined. `contents` keeps the wrapper from painting a box.
    <div className="crmx-root contents">
      <AnimatePresence>
        {order && (
          <motion.div
            key={order.id}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            dir="rtl"
          >
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
              className="relative flex max-h-[calc(100vh-4rem)] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] shadow-[var(--crmx-shadow-md)]"
            >
              <ModalBody
                row={order}
                details={details}
                loading={loading}
                error={error}
                reload={() => load(order.id)}
                onClose={onClose}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
