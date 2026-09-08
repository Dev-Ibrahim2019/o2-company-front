import { AlertTriangle, Copy, User, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { crmApi } from "../api";
import { getCrmError } from "../components";
import { dateTime as formatDateTime, money as formatMoney, num } from "../format";
import { OccasionContactActions } from "../OccasionContactActions";
import type { CrmOrderDetails, CrmOrderRow } from "../types";
import { CrmStatusBadge, PaymentStatusBadge } from "./CrmStatusBadge";
import { FactRow, Section } from "./CrmQuickViewDrawer";
import { CRM_ORDER_SOURCE_LABELS, crmOrderTypeLabel } from "./sourceOptions";
import { toast } from "../../../components/shared/Toast";

/**
 * Order Quick View — a contextual popover (desktop/tablet) or bottom sheet
 * (mobile) opened by clicking an order row, standing in for an immediate
 * jump to the full row expansion.
 *
 * The interaction is borrowed from ChatGPT's "select text → contextual
 * action card" pattern — select something, get a small surface with just
 * enough information and the one or two things you'd actually do next,
 * without leaving the list behind it. None of the visual language is
 * borrowed: every colour, radius, shadow, and type scale here is a
 * `--crmx-*` token or an existing CRM component (CrmStatusBadge,
 * PaymentStatusBadge, the FactRow/Section pair the customer quick-view
 * drawer already established, OccasionContactActions for call/WhatsApp).
 *
 * Deliberately NOT CrmQuickViewDrawer's pattern (full-height edge drawer):
 * that component intentionally reads as "a smaller version of the full
 * page", which is exactly what this brief asked NOT to build. This is
 * closer to a native OS popover — small, anchored, dismissible without
 * losing your place in the list.
 */

const DESKTOP_QUERY = "(min-width: 1024px)"; // same lg breakpoint CrmShell already draws the sidebar/main split at.
const POPUP_WIDTH = 380;
const POPUP_MAX_HEIGHT = 480;
const GAP = 8;
const VIEWPORT_MARGIN = 12;

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => (typeof window === "undefined" ? true : window.matchMedia(DESKTOP_QUERY).matches));
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

type Placement = { left: number; width: number; maxHeight: number; top?: number; bottom?: number };

/**
 * Positions the popover against the clicked row: below it if there's room,
 * flipped above otherwise, and always clamped inside the viewport both
 * horizontally and vertically. Computed once per open (not re-measured
 * against the popover's own rendered height) — the body already scrolls
 * internally, so a height *budget* is enough; it just has to be the real
 * available space in the chosen direction, not a flat constant, or a short
 * viewport (a small laptop, a row near the very top of the page) pushes the
 * popup off-screen on the far edge instead of merely getting a shorter one.
 */
function computePlacement(anchorEl: HTMLElement): Placement {
  const rect = anchorEl.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - GAP - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - GAP - VIEWPORT_MARGIN;
  const placeBelow = spaceBelow >= POPUP_MAX_HEIGHT || spaceBelow >= spaceAbove;

  let left = rect.left + rect.width / 2 - POPUP_WIDTH / 2;
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - POPUP_WIDTH - VIEWPORT_MARGIN));

  const maxHeight = Math.max(240, Math.min(POPUP_MAX_HEIGHT, placeBelow ? spaceBelow : spaceAbove));

  return placeBelow
    ? { left, width: POPUP_WIDTH, maxHeight, top: rect.bottom + GAP }
    : { left, width: POPUP_WIDTH, maxHeight, bottom: window.innerHeight - rect.top + GAP };
}

function ItemsSummary({ orderId, onLoaded }: { orderId: string | number; onLoaded: (details: CrmOrderDetails) => void }) {
  const [details, setDetails] = useState<CrmOrderDetails>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = () => {
    setLoading(true);
    setError(undefined);
    crmApi.orderDetails(orderId)
      .then((d) => { setDetails(d); onLoaded(d); })
      .catch((e) => setError(getCrmError(e).message))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [orderId]);

  if (loading) {
    return (
      <div className="space-y-1.5">
        <div className="crmx-skeleton h-3.5 w-24 rounded" />
        <div className="crmx-skeleton h-3.5 w-40 rounded" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12.5px] text-[var(--crmx-danger-text)]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> تعذّر تحميل تفاصيل الطلب
        </span>
        <button type="button" onClick={load} className="text-[12.5px] font-bold text-[var(--crmx-primary-text)] hover:underline">
          إعادة المحاولة
        </button>
      </div>
    );
  }
  if (!details || details.items.length === 0) {
    return <p className="text-[13px] text-[var(--crmx-text-muted)]">لا توجد أصناف مسجلة</p>;
  }

  const shown = details.items.slice(0, 2);
  const rest = details.items.length - shown.length;

  return (
    <div className="space-y-1">
      <p className="text-[12px] font-bold text-[var(--crmx-text-muted)]">{num(details.items.length)} صنف</p>
      <ul className="space-y-0.5">
        {shown.map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-2 text-[13px]">
            <span className="min-w-0 truncate text-[var(--crmx-text)]">{item.item_name_ar || item.item_name}</span>
            <span className="shrink-0 text-[var(--crmx-text-secondary)]">× {num(item.quantity)}</span>
          </li>
        ))}
      </ul>
      {rest > 0 && <p className="text-[12.5px] text-[var(--crmx-text-muted)]">+ {num(rest)} أخرى</p>}
    </div>
  );
}

/** Shared between the desktop popover and the mobile sheet — only the outer positioning/chrome differs. */
function QuickViewBody({
  order,
  onClose,
  onViewOrder,
  onItemsLoaded,
  titleId,
}: {
  order: CrmOrderRow;
  onClose: () => void;
  onViewOrder: () => void;
  onItemsLoaded: (details: CrmOrderDetails) => void;
  titleId: string;
}) {
  const copyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(order.order_number);
      toast.success("تم نسخ رقم الطلب");
    } catch {
      // Clipboard access can be denied by the browser/OS — not worth an
      // error toast for a convenience action; the number is right there to
      // select manually.
    }
  };

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-[var(--crmx-border)] px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 id={titleId} className="truncate text-[15px] font-bold text-[var(--crmx-text)]" dir="ltr">
            {order.order_number}
          </h2>
          <CrmStatusBadge value={order.status} />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="shrink-0 rounded-lg p-1.5 text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-neutral-soft)]"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </header>

      <div className="crmx-scrollbar flex-1 overflow-y-auto px-4 py-3">
        <Section title="الطلب">
          <FactRow label="النوع" value={crmOrderTypeLabel(order)} />
          <FactRow label="المصدر" value={order.source ? (CRM_ORDER_SOURCE_LABELS[order.source] || order.source) : "—"} />
          <FactRow label="الفرع" value={order.branch?.name || "—"} />
          <FactRow label="التاريخ" value={formatDateTime(order.created_at)} />
        </Section>

        <Section title="العميل">
          <FactRow label="الاسم" value={order.customer?.name || "غير مرتبط بعميل"} />
          {order.customer_phone && <FactRow label="الهاتف" value={order.customer_phone} ltr />}
        </Section>

        <Section title="المالية">
          <FactRow label="الإجمالي" value={formatMoney(order.total)} strong />
          <div className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
            <dt className="shrink-0 text-[var(--crmx-text-secondary)]">حالة الدفع</dt>
            <dd><PaymentStatusBadge isPaid={order.is_paid} paymentStatus={order.payment_status} /></dd>
          </div>
        </Section>

        <Section title="الأصناف">
          <ItemsSummary orderId={order.id} onLoaded={onItemsLoaded} />
        </Section>

        {order.customer_phone && (
          <div className="border-t border-[var(--crmx-border)] pt-3 first:border-t-0 first:pt-0">
            <OccasionContactActions contact={{ phone: order.customer_phone, name: order.customer?.name }} />
          </div>
        )}
      </div>

      <footer className="space-y-2 border-t border-[var(--crmx-border)] px-4 py-3.5">
        <button
          type="button"
          onClick={onViewOrder}
          className="flex h-10 w-full items-center justify-center rounded-xl bg-[var(--crmx-primary)] text-[13.5px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]"
        >
          عرض الطلب
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyOrderNumber}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--crmx-border)] text-[12.5px] font-semibold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]"
          >
            <Copy className="h-3.5 w-3.5" /> نسخ رقم الطلب
          </button>
          {order.customer?.id != null && (
            <Link
              to={`/admin/crm/customers/${order.customer.id}/overview`}
              onClick={onClose}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--crmx-border)] text-[12.5px] font-semibold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]"
            >
              <User className="h-3.5 w-3.5" /> عرض العميل
            </Link>
          )}
        </div>
      </footer>
    </>
  );
}

export function CrmOrderQuickView({
  order,
  anchorEl,
  onClose,
  onViewOrder,
}: {
  order: CrmOrderRow | null;
  /** The clicked row's DOM node — read once on open to compute the popover's position. */
  anchorEl: HTMLElement | null;
  onClose: () => void;
  /**
   * `details` is the same /crm/orders/{id} response this popover already
   * fetched for its own items summary, handed back so the full row
   * expansion (CrmOrderExpandedPanel) doesn't fetch it a second time for
   * the same click-through — null if the fetch hadn't resolved yet when
   * "عرض الطلب" was pressed, in which case the panel just fetches normally.
   */
  onViewOrder: (order: CrmOrderRow, details: CrmOrderDetails | null) => void;
}) {
  const isDesktop = useIsDesktop();
  const [placement, setPlacement] = useState<Placement>();
  const [loadedDetails, setLoadedDetails] = useState<CrmOrderDetails>();
  const popupRef = useRef<HTMLDivElement>(null);
  const titleId = "crm-order-quick-view-title";

  useLayoutEffect(() => {
    if (!order || !anchorEl || !isDesktop) { setPlacement(undefined); return; }
    setPlacement(computePlacement(anchorEl));
  }, [order, anchorEl, isDesktop]);

  // Cleared on every new order, not just appended to — stale details from a
  // previously-opened order must never be handed to onViewOrder for this one.
  useEffect(() => { setLoadedDetails(undefined); }, [order?.id]);

  // Escape to close, always; outside click to close, only once the popup has
  // actually mounted (a click that's still bubbling from the very click that
  // opened it must not immediately close it again).
  useEffect(() => {
    if (!order) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popupRef.current?.contains(target)) return;
      if (anchorEl?.contains(target)) return;
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    // Deferred one tick so the opening click (still bubbling to `document`)
    // doesn't immediately trigger this same handler and close the popover
    // it just opened.
    const id = window.setTimeout(() => document.addEventListener("mousedown", onPointerDown), 0);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      window.clearTimeout(id);
    };
  }, [order, anchorEl, onClose]);

  // Scrolling the list out from under an anchored popover leaves it visibly
  // detached from the row it describes — closing is simpler and safer than
  // re-tracking position on every scroll tick.
  useEffect(() => {
    if (!order || !anchorEl || !isDesktop) return;
    const scrollParent = anchorEl.closest("main") ?? window;
    const onScroll = () => onClose();
    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollParent.removeEventListener("scroll", onScroll);
  }, [order, anchorEl, isDesktop, onClose]);

  // Focus the popup on open; hand focus back to the row it came from on close.
  useEffect(() => {
    if (order) {
      popupRef.current?.focus();
    } else {
      anchorEl?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  const handleViewOrder = () => { if (order) onViewOrder(order, loadedDetails ?? null); };

  if (isDesktop) {
    return createPortal(
      // Portalled straight to document.body, outside the CRM shell's own
      // .crmx-root subtree — every --crmx-* custom property this popover
      // reads (border, card, primary, text-secondary...) is undefined
      // without it, which rendered as a fully transparent card in testing
      // (confirmed via computed style: backgroundColor was rgba(0,0,0,0)).
      // `contents` keeps this wrapper from generating a box of its own —
      // .crmx-root's own `background`/`min-height` never paint anywhere,
      // only its custom properties inherit down to the real popover below.
      <div className="crmx-root contents">
        <AnimatePresence>
          {order && placement && (
            <motion.div
              key={order.id}
              ref={popupRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              dir="rtl"
              initial={{ opacity: 0, scale: 0.97, y: placement.top ? -4 : 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: placement.top ? -4 : 4 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              style={{
                position: "fixed",
                left: placement.left,
                top: placement.top,
                bottom: placement.bottom,
                width: placement.width,
                maxHeight: placement.maxHeight,
                zIndex: 80,
              }}
              className="flex flex-col overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] shadow-2xl outline-none"
            >
              <QuickViewBody order={order} onClose={onClose} onViewOrder={handleViewOrder} onItemsLoaded={setLoadedDetails} titleId={titleId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>,
      document.body,
    );
  }

  // Mobile: a bottom sheet, not a squeezed-down popover — full-width, with a
  // real backdrop like the OS sheets this pattern is expected to resemble.
  // Same crmx-root/contents wrapper as the desktop branch above, and for the
  // same reason — this whole tree is portalled outside .crmx-root's scope.
  return createPortal(
    <div className="crmx-root contents">
      <AnimatePresence>
        {order && (
          <motion.div key={order.id} className="fixed inset-0 z-[80]" dir="rtl">
            <motion.button
              type="button"
              aria-label="إغلاق"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="absolute inset-0 bg-black/30"
              onClick={onClose}
            />
            <motion.div
              ref={popupRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
              className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col overflow-hidden rounded-t-2xl border-t border-[var(--crmx-border)] bg-[var(--crmx-card)] shadow-2xl outline-none"
            >
              <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--crmx-border)]" aria-hidden="true" />
              <QuickViewBody order={order} onClose={onClose} onViewOrder={handleViewOrder} onItemsLoaded={setLoadedDetails} titleId={titleId} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
