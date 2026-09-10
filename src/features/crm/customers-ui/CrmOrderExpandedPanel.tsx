import { AlertTriangle, CheckCircle2, ChevronDown, History, Loader2, MessageSquare, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { crmApi } from "../api";
import { getCrmError } from "../components";
import { dateTime as formatDate, money as formatMoney, num } from "../format";
import type { CrmOrderDetails, CrmOrderTimeline } from "../types";
import { CrmStatusBadge, PaymentStatusBadge } from "./CrmStatusBadge";
import { CRM_ORDER_SOURCE_LABELS, CRM_ORDER_TYPE_LABELS } from "./sourceOptions";


// Sized up from the original h-5 w-5 (and the Call Center reference's own
// ~13px icons, which read as small/secondary) so the rating reads as a
// prominent feedback signal, not a muted footnote. Fill/empty tokens are
// unchanged — this is a sizing-only upgrade. `size` lets a denser context
// (the per-item rows in the order pop-up) ask for smaller stars.
export function StarRow({ value, onChange, disabled, size = 7 }: { value: number; onChange?: (v: number) => void; disabled?: boolean; size?: 5 | 7 }) {
  const cls = size === 5 ? "h-5 w-5" : "h-7 w-7";
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled || !onChange}
            onClick={() => onChange?.(i + 1)}
            aria-label={`${i + 1} من 5`}
            className={onChange ? "cursor-pointer" : "cursor-default"}
          >
            {/* A minor legibility bump for the empty-star outline against
                --crmx-border, which touches no colour token. */}
            <Star strokeWidth={1.5} className={`${cls} ${filled ? "fill-[var(--crmx-warning)] text-[var(--crmx-warning)]" : "text-[var(--crmx-border)]"}`} />
          </button>
        );
      })}
    </div>
  );
}

export function FeedbackEditor({ order, onSaved, customerId: customerIdProp }: { order: CrmOrderDetails; onSaved: () => void; customerId?: string | number }) {
  // Customer 360 tabs mount this inside a /:customerId route; the standalone
  // orders pop-up passes order.customer_id explicitly instead.
  const { customerId: routeCustomerId = "" } = useParams();
  const customerId = customerIdProp ?? routeCustomerId;
  const isDelivery = order.order_type === "delivery";
  const [foodQuality, setFoodQuality] = useState(order.feedback?.food_quality ?? 0);
  const [serviceQuality, setServiceQuality] = useState(order.feedback?.service_quality ?? 0);
  const [deliverySpeed, setDeliverySpeed] = useState(order.feedback?.delivery_speed ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const canSave = foodQuality > 0 && serviceQuality > 0 && (!isDelivery || deliverySpeed > 0);

  const save = async () => {
    setSaving(true);
    setError(undefined);
    setSaved(false);
    try {
      await crmApi.saveOrderFeedback(customerId, order.id, {
        food_quality: foodQuality,
        service_quality: serviceQuality,
        delivery_speed: isDelivery ? deliverySpeed : null,
      });
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(getCrmError(e).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[var(--crmx-text-secondary)]">جودة الطعام</span>
        <StarRow value={foodQuality} onChange={setFoodQuality} disabled={saving} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[var(--crmx-text-secondary)]">تقييم الخدمة</span>
        <StarRow value={serviceQuality} onChange={setServiceQuality} disabled={saving} />
      </div>
      {isDelivery && (
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[var(--crmx-text-secondary)]">سرعة التوصيل</span>
          <StarRow value={deliverySpeed} onChange={setDeliverySpeed} disabled={saving} />
        </div>
      )}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={save}
          disabled={!canSave || saving}
          className="flex h-9 items-center gap-2 rounded-xl bg-[var(--crmx-primary)] px-4 text-[13px] font-bold text-white transition disabled:opacity-40"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          حفظ التقييم
        </button>
        {saved && <span className="flex items-center gap-1 text-[12.5px] font-semibold text-[var(--crmx-primary-text)]"><CheckCircle2 className="h-4 w-4" /> تم الحفظ</span>}
        {error && <span className="text-[12.5px] font-semibold text-[var(--crmx-danger-text)]">{error}</span>}
      </div>
    </div>
  );
}

export function TimelineSection({ orderId }: { orderId: string | number }) {
  const [timeline, setTimeline] = useState<CrmOrderTimeline>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    crmApi.orderTimeline(orderId)
      .then((d) => !cancelled && setTimeline(d))
      .catch((e) => !cancelled && setError(getCrmError(e).message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [orderId]);

  if (loading) return <div className="crmx-skeleton h-16 w-full rounded-xl" />;
  if (error) return <p className="text-[13px] text-[var(--crmx-danger-text)]">{error}</p>;
  if (!timeline?.events.length) return <p className="text-[13px] text-[var(--crmx-text-muted)]">لا يوجد سجل نشاط لهذا الطلب</p>;

  return (
    <ul className="space-y-3 border-s-2 border-[var(--crmx-border)] ps-4">
      {timeline.events.map((ev, i) => (
        <li key={i} className="relative">
          <span className="absolute -start-[21px] top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--crmx-primary)]" />
          <p className="text-[14px] font-semibold text-[var(--crmx-text)]">{ev.label}</p>
          <p className="text-[12.5px] text-[var(--crmx-text-muted)]">
            {ev.user?.name || "النظام"} · {ev.timestamp ? formatDate(ev.timestamp) : "التاريخ غير متوفر"}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2.5 text-[12px] font-bold uppercase tracking-wide text-[var(--crmx-text-secondary)]">{children}</h4>;
}

// Label-over-value stack — 12px label / 14px value, a clear step apart so
// the two roles never blur into one flat run of text.
export function Field({ label, value, ltr }: { label: string; value: React.ReactNode; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] text-[var(--crmx-text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-[14px] font-semibold text-[var(--crmx-text)]" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}

export function CrmOrderExpandedPanel({
  orderId,
  preloadedOrder,
}: {
  orderId: string | number;
  /**
   * Skip the initial fetch when the caller already has this exact order's
   * details — the order quick view popover fetches /crm/orders/{id} to build
   * its own items summary, and hands the result here when "عرض الطلب" opens
   * this panel moments later, so the same order is never fetched twice for
   * one click-through. Ignored (falls back to the normal fetch) if it's for
   * a different order than `orderId`.
   */
  preloadedOrder?: CrmOrderDetails;
}) {
  const preloadMatches = preloadedOrder && String(preloadedOrder.id) === String(orderId);
  const [order, setOrder] = useState<CrmOrderDetails | undefined>(preloadMatches ? preloadedOrder : undefined);
  const [loading, setLoading] = useState(!preloadMatches);
  const [error, setError] = useState<{ status?: number; message: string }>();
  const [showTimeline, setShowTimeline] = useState(false);

  const load = () => {
    setLoading(true);
    setError(undefined);
    crmApi.orderDetails(orderId)
      .then(setOrder)
      .catch((e) => setError(getCrmError(e)))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    if (preloadMatches) { setOrder(preloadedOrder); setLoading(false); setError(undefined); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--crmx-text-muted)]" /></div>;
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <AlertTriangle className="h-5 w-5 text-[var(--crmx-danger)]" />
        <p className="text-[13px] font-semibold text-[var(--crmx-danger-text)]">{error.message}</p>
      </div>
    );
  }
  if (!order) return null;

  return (
    // `.crmx-root` stays on an outer, unstyled wrapper so every --crmx-*
    // token/font-family resolves for descendants (custom properties inherit
    // down the DOM regardless of which element re-declares the class), while
    // the inner div is the only rule that sets this panel's background.
    //
    // No payment-conditional wash: an earlier version tinted the whole panel
    // green when order.is_paid, which read as a second, competing signal
    // beside the badges and — on a payment-status mismatch — as a
    // confidently-wrong "this is paid". Payment now reads only from the
    // PaymentStatusBadge in the summary strip, the same axis, one place.
    <div className="crmx-root">
      <div className="space-y-4 bg-[var(--crmx-bg)] p-5">
        {/* Summary strip — the at-a-glance facts (number, status, payment,
            date, note, total) in one line so the columns below don't each
            have to restate them. Colour is confined to the two badges. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 py-3">
          <span className="text-[15px] font-bold text-[var(--crmx-text)]" dir="ltr">{order.order_number}</span>
          <CrmStatusBadge value={order.status} />
          <PaymentStatusBadge isPaid={order.is_paid} paymentStatus={order.payment_status} />
          <span className="text-[13px] text-[var(--crmx-text-secondary)]">{formatDate(order.created_at)}</span>
          {order.note && (
            <span
              title={order.note}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--crmx-warning-soft)] px-2 py-0.5 text-[12px] font-semibold text-[var(--crmx-warning-text)]"
            >
              <MessageSquare className="h-3.5 w-3.5" /> ملاحظة
            </span>
          )}
          <span className="ms-auto text-[13px] text-[var(--crmx-text-secondary)]">
            الإجمالي
            <span className="ms-1.5 text-[16px] font-bold text-[var(--crmx-text)]">{formatMoney(order.total)}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
              <SectionLabel>تفاصيل الطلب</SectionLabel>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                <Field label="الفرع" value={order.branch?.name || "—"} />
                <Field label="مصدر الطلب" value={order.source ? (CRM_ORDER_SOURCE_LABELS[order.source] || order.source) : "—"} />
                {order.order_type && <Field label="النوع" value={CRM_ORDER_TYPE_LABELS[order.order_type] || order.order_type} />}
                <Field label="أنشأه" value={order.cashier?.name || "—"} />
              </dl>

              <div className="mt-4 border-t border-[var(--crmx-border)] pt-4">
                <SectionLabel>العميل</SectionLabel>
                {order.customer_name ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                    <Field label="الاسم" value={order.customer_name} />
                    {order.customer_phone && <Field label="الهاتف" value={order.customer_phone} ltr />}
                  </dl>
                ) : (
                  <p className="text-[13px] text-[var(--crmx-text-muted)]">غير مرتبط بعميل</p>
                )}
              </div>
            </div>

            <div>
              <SectionLabel>الأصناف</SectionLabel>
              {order.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--crmx-border)] py-5 text-center text-[13px] text-[var(--crmx-text-muted)]">لا توجد أصناف مسجلة</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]">
                  <table className="w-full border-collapse text-right">
                    <thead>
                      {/* Same header-background/text-size convention as the orders table
                          in OrdersPage.tsx, for visual consistency between the two tables. */}
                      <tr className="border-b border-[var(--crmx-border)] bg-[var(--crmx-neutral-soft)]">
                        <th className="px-3.5 py-2.5 text-[12px] font-bold text-[var(--crmx-text-secondary)]">الصنف</th>
                        <th className="px-3.5 py-2.5 text-center text-[12px] font-bold text-[var(--crmx-text-secondary)]">الكمية</th>
                        <th className="px-3.5 py-2.5 text-[12px] font-bold text-[var(--crmx-text-secondary)]">سعر الوحدة</th>
                        <th className="px-3.5 py-2.5 text-[12px] font-bold text-[var(--crmx-text-secondary)]">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--crmx-border)]">
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3.5 py-3">
                            <p className="truncate text-[14px] font-semibold text-[var(--crmx-text)]">{item.item_name_ar || item.item_name}</p>
                            {item.notes && <p className="text-[12px] text-[var(--crmx-text-muted)]">{item.notes}</p>}
                          </td>
                          <td className="px-3.5 py-3 text-center text-[13px] text-[var(--crmx-text-secondary)]">{num(item.quantity)}</td>
                          <td className="px-3.5 py-3 text-[13px] text-[var(--crmx-text-secondary)]">{formatMoney(item.price)}</td>
                          <td className="px-3.5 py-3 text-[14px] font-bold text-[var(--crmx-text)]">{formatMoney(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
              <SectionLabel>الماليات</SectionLabel>
              <dl className="space-y-2 text-[13px]">
                <div className="flex items-center justify-between"><dt className="text-[var(--crmx-text-secondary)]">الإجمالي الفرعي</dt><dd className="font-semibold text-[var(--crmx-text)]">{formatMoney(order.subtotal)}</dd></div>
                {order.discount_amount > 0 && (
                  <div className="flex items-center justify-between"><dt className="text-[var(--crmx-text-secondary)]">الخصم</dt><dd className="font-semibold text-[var(--crmx-danger-text)]">-{formatMoney(order.discount_amount)}</dd></div>
                )}
                <div className="flex items-center justify-between border-t border-[var(--crmx-border)] pt-2"><dt className="font-bold text-[var(--crmx-text)]">الإجمالي</dt><dd className="text-[15px] font-bold text-[var(--crmx-text)]">{formatMoney(order.total)}</dd></div>
              </dl>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <SectionLabel>التقييم</SectionLabel>
              <FeedbackEditor order={order} onSaved={load} />
            </div>

            <div className="rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
              <button
                type="button"
                onClick={() => setShowTimeline((v) => !v)}
                aria-expanded={showTimeline}
                className="flex w-full items-center gap-2 text-[14px] font-bold text-[var(--crmx-text)] hover:text-[var(--crmx-primary)]"
              >
                <History className="h-4 w-4" /> سجل نشاط الطلب
                <ChevronDown className={`ms-auto h-4 w-4 transition-transform ${showTimeline ? "rotate-180" : ""}`} />
              </button>
              {showTimeline && (
                <div className="mt-4">
                  <TimelineSection orderId={order.id} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
