import { AlertTriangle, CheckCircle2, ChevronDown, History, Loader2, MessageSquare, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { crmApi } from "../api";
import { getCrmError } from "../components";
import { dateTime as formatDate, money as formatMoney, num } from "../format";
import type { CrmOrderDetails, CrmOrderTimeline } from "../types";
import { CrmStatusBadge } from "./CrmStatusBadge";
import { CRM_ORDER_SOURCE_LABELS } from "./sourceOptions";


// Sized up from the original h-5 w-5 (and the Call Center reference's own
// ~13px icons, which read as small/secondary) so the rating reads as a
// prominent feedback signal, not a muted footnote. Fill/empty tokens are
// unchanged — this is a sizing-only upgrade.
function StarRow({ value, onChange, disabled }: { value: number; onChange?: (v: number) => void; disabled?: boolean }) {
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
            className={onChange ? "cursor-pointer" : "cursor-default"}
          >
            {/* A minor legibility bump for the empty-star outline against
                --crmx-border, which touches no colour token. */}
            <Star strokeWidth={1.5} className={`h-7 w-7 ${filled ? "fill-[var(--crmx-warning)] text-[var(--crmx-warning)]" : "text-[var(--crmx-border)]"}`} />
          </button>
        );
      })}
    </div>
  );
}

function FeedbackEditor({ order, onSaved }: { order: CrmOrderDetails; onSaved: () => void }) {
  const { customerId = "" } = useParams();
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
        <span className="text-[13px] font-semibold text-[var(--crmx-text-secondary)]">تقييم الأصناف</span>
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

function TimelineSection({ orderId }: { orderId: string | number }) {
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-[var(--crmx-text-muted)]">{children}</h4>;
}

export function CrmOrderExpandedPanel({ orderId }: { orderId: string | number }) {
  const [order, setOrder] = useState<CrmOrderDetails>();
  const [loading, setLoading] = useState(true);
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
  useEffect(load, [orderId]);

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
    // Two nested divs, deliberately: `.crmx-root` (crmx.css) sets an opaque
    // `background: var(--crmx-bg)`, so putting the tint on the SAME element
    // as `crmx-root` is a same-specificity cascade coin-flip decided by
    // stylesheet injection order, not by class order in this file — verified
    // in-browser to actually lose (the opaque --crmx-bg painted over the
    // tint). Keeping `crmx-root` on an outer, unstyled wrapper still resolves
    // every --crmx-* token/font-family for descendants (custom properties
    // inherit down the DOM regardless of which element re-declares the
    // class), while the inner div is the only rule that ever sets this
    // panel's background, so it always wins.
    //
    // The green only appears when order.is_paid is actually true — an
    // earlier version painted it unconditionally, which read as "this order
    // is paid" on orders that were not (caught by a real payment-status
    // mismatch during visual review, on an order that was still unpaid).
    // Unpaid orders get the plain neutral panel background instead of an
    // invented "unpaid" colour — silence is the correct signal for "nothing
    // special to report" here, not a competing hue.
    <div className="crmx-root">
      <div className={`grid grid-cols-1 gap-5 p-5 lg:grid-cols-2 ${order.is_paid ? "bg-[var(--crmx-success-soft)]" : "bg-[var(--crmx-bg)]"}`}>
        <div className="space-y-5">
          <div className="rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[14px] font-bold text-[var(--crmx-text)]">
                {formatDate(order.created_at)}
                {order.note && (
                  <span
                    title={order.note}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </span>
                )}
              </span>
              <CrmStatusBadge value={order.status} />
            </div>
  
            <SectionLabel>الطلب</SectionLabel>
            <dl className="mb-4 grid grid-cols-2 gap-3 text-[13px]">
              <div><dt className="text-[var(--crmx-text-muted)]">الفرع</dt><dd className="mt-0.5 font-semibold text-[var(--crmx-text)]">{order.branch?.name || "—"}</dd></div>
              <div><dt className="text-[var(--crmx-text-muted)]" title="مصدر الطلب">مصدر الطلب</dt><dd className="mt-0.5 font-semibold text-[var(--crmx-text)]">{order.source ? (CRM_ORDER_SOURCE_LABELS[order.source] || order.source) : "—"}</dd></div>
              <div><dt className="text-[var(--crmx-text-muted)]">أنشأه</dt><dd className="mt-0.5 font-semibold text-[var(--crmx-text)]">{order.cashier?.name || "—"}</dd></div>
            </dl>
  
            <SectionLabel>العميل</SectionLabel>
            {order.customer_name ? (
              <dl className="grid grid-cols-2 gap-3 text-[13px]">
                <div><dt className="text-[var(--crmx-text-muted)]">الاسم</dt><dd className="mt-0.5 font-semibold text-[var(--crmx-text)]">{order.customer_name}</dd></div>
                {order.customer_phone && (
                  <div><dt className="text-[var(--crmx-text-muted)]">الهاتف</dt><dd className="mt-0.5 font-semibold text-[var(--crmx-text)]" dir="ltr">{order.customer_phone}</dd></div>
                )}
              </dl>
            ) : (
              <p className="text-[13px] text-[var(--crmx-text-muted)]">غير مرتبط بعميل</p>
            )}
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
  
        <div className="space-y-5">
          <div>
            <SectionLabel>التقييم</SectionLabel>
            <FeedbackEditor order={order} onSaved={load} />
          </div>
  
          <div className="rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
            <button
              type="button"
              onClick={() => setShowTimeline((v) => !v)}
              aria-expanded={showTimeline}
              className="flex w-full items-center gap-2 text-[14px] font-bold text-[var(--crmx-navy)] hover:text-[var(--crmx-primary)]"
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
  );
}
