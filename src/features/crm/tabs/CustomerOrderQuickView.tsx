import { AlertTriangle, Copy, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { crmApi } from "../api";
import { getCrmError } from "../components";
import { OccasionContactActions } from "../OccasionContactActions";
import { CRM_ORDER_SOURCE_LABELS, CRM_ORDER_TYPE_LABELS } from "../customers-ui/sourceOptions";
import { dateTime as formatDateTime, money as formatMoney, num } from "../format";
import { toast } from "../../../components/shared/Toast";
import type { CrmOrderDetails } from "../types";
import { text, type Row } from "./shared";

/**
 * Quick view for an order row on the Customer 360 "Orders" tab — the one
 * place this brief scoped the feature to. Deliberately a second, separate
 * component from customers-ui/CrmOrderQuickView (the one already wired into
 * the CRM-wide Orders screens): that one is styled with --crmx-* (CRM's own,
 * intentionally light-only token set — see crmx.css), and reusing it here
 * unmodified would carry that fixed-light styling into a component this
 * brief explicitly asked to be theme-aware. Rather than fork --crmx-*
 * itself (a module-wide change well outside this brief's scope: "لا تقم
 * بتغيير الـ global Orders experience في بقية النظام"), this component reads
 * the app's real, pre-existing --o2-* tokens (src/index.css) directly — it
 * is NOT wrapped in .crmx-root, so it inherits whichever theme is active on
 * <html> (data-theme/theme-dark/theme-light, see theme.tsx) independently of
 * the always-light CRM shell around it, exactly like every other O2 surface
 * that isn't part of the CRM module.
 *
 * The two components duplicate a small amount of structure (positioning
 * math, escape/outside-click/focus handling) rather than sharing a base —
 * an intentional trade-off so this change cannot touch the already-shipped,
 * already-verified CRM-wide popover.
 */

const DESKTOP_QUERY = "(min-width: 1024px)";
const POPUP_WIDTH = 360;
const POPUP_MAX_HEIGHT = 440;
const GAP = 8;
const VIEWPORT_MARGIN = 12;
const Z_INDEX = 80; // same layer the CRM-wide order quick view already uses; nothing else in the app claims it.

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

function computePlacement(anchorEl: HTMLElement): Placement {
  const rect = anchorEl.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - GAP - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - GAP - VIEWPORT_MARGIN;
  const placeBelow = spaceBelow >= POPUP_MAX_HEIGHT || spaceBelow >= spaceAbove;

  let left = rect.left + rect.width / 2 - POPUP_WIDTH / 2;
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - POPUP_WIDTH - VIEWPORT_MARGIN));

  const maxHeight = Math.max(220, Math.min(POPUP_MAX_HEIGHT, placeBelow ? spaceBelow : spaceAbove));

  return placeBelow
    ? { left, width: POPUP_WIDTH, maxHeight, top: rect.bottom + GAP }
    : { left, width: POPUP_WIDTH, maxHeight, bottom: window.innerHeight - rect.top + GAP };
}

// orders.status — same seven real values CrmStatusBadge maps, reduced to the
// four hues --o2-* actually has (no accent/orange token there): "ready" has
// no closer match than "info", which is also what "in the kitchen/in
// transit" already means for confirmed/in_progress.
const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار", confirmed: "مؤكد", in_progress: "قيد التنفيذ",
  ready: "جاهز", served: "تم التسليم", paid: "مدفوع", cancelled: "ملغي",
};
const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "info"> = {
  pending: "warning", confirmed: "info", in_progress: "info",
  ready: "info", served: "success", paid: "success", cancelled: "danger",
};
const TONE_CLASS: Record<"success" | "warning" | "danger" | "info" | "neutral", string> = {
  success: "bg-[var(--o2-success-soft)] text-[var(--o2-success-text)]",
  warning: "bg-[var(--o2-warning-soft)] text-[var(--o2-warning-text)]",
  // No --o2-danger-text/--o2-info-text token exists (only success/warning
  // have one) — --o2-danger/--o2-info themselves are already bright enough
  // for text on their own -soft background in both themes.
  danger: "bg-[var(--o2-danger-soft)] text-[var(--o2-danger)]",
  info: "bg-[var(--o2-info-soft)] text-[var(--o2-info)]",
  neutral: "bg-[var(--o2-surface-muted)] text-[var(--o2-muted)]",
};

function OrderStatusBadge({ value }: { value?: string | null }) {
  const key = (value || "").toLowerCase();
  const label = STATUS_LABELS[key] || value || "—";
  const tone = STATUS_TONE[key] || "neutral";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap ${TONE_CLASS[tone]}`}>
      {label}
    </span>
  );
}

function PaymentBadge({ isPaid, paymentStatus }: { isPaid?: boolean; paymentStatus?: string | null }) {
  if (isPaid) return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${TONE_CLASS.success}`}>مدفوع</span>;
  if (paymentStatus && paymentStatus !== "unpaid") {
    return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${TONE_CLASS.warning}`}>{paymentStatus}</span>;
  }
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${TONE_CLASS.neutral}`}>غير مدفوع</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--o2-muted)]">{children}</h4>;
}

function ItemsSkeleton() {
  return (
    <div className="space-y-1.5">
      <div className="h-3.5 w-20 animate-pulse rounded bg-[var(--o2-surface-muted)]" />
      <div className="h-3.5 w-36 animate-pulse rounded bg-[var(--o2-surface-muted)]" />
    </div>
  );
}

/**
 * Shared between the desktop popover and the mobile sheet — only the
 * outer positioning/chrome differs.
 *
 * `row` is what the tab already has in hand (no fetch); `details` is the
 * lazily fetched /crm/orders/{id} response this component requests itself
 * the moment it opens, purely for the items summary and the fields the row
 * doesn't carry (order type, payment, customer phone) — never fetched twice
 * for the same open.
 */
function QuickViewBody({
  row,
  onClose,
  onViewOrder,
  titleId,
}: {
  row: Row;
  onClose: () => void;
  onViewOrder: () => void;
  titleId: string;
}) {
  const orderId = row.id as string | number;
  const [details, setDetails] = useState<CrmOrderDetails>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = () => {
    setLoading(true);
    setError(undefined);
    crmApi.orderDetails(orderId)
      .then(setDetails)
      .catch((e) => setError(getCrmError(e).message))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [orderId]);

  const orderNumber = text(row.number ?? row.order_number ?? row.code);
  const branchName = text(row.branch_name ?? (row.branch as { name?: unknown })?.name);
  const source = row.source ? (CRM_ORDER_SOURCE_LABELS[String(row.source)] || String(row.source)) : null;

  const copyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      toast.success("تم نسخ رقم الطلب");
    } catch {
      // Denied clipboard permission is not worth surfacing as an error —
      // the number is right there in the header to select by hand.
    }
  };

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-[var(--o2-border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id={titleId} className="truncate text-base font-bold text-[var(--o2-text)]" dir="ltr">
            {orderNumber}
          </h2>
          <OrderStatusBadge value={String(row.status ?? "")} />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="shrink-0 rounded-md p-1 text-[var(--o2-muted)] transition-colors hover:bg-[var(--o2-surface-muted)] hover:text-[var(--o2-text)]"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        <div>
          <SectionLabel>معلومات الطلب</SectionLabel>
          <dl className="space-y-1 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[var(--o2-muted)]">التاريخ</dt>
              <dd className="font-semibold text-[var(--o2-text)]">{formatDateTime(String(row.created_at ?? ""))}</dd>
            </div>
            {source && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[var(--o2-muted)]">المصدر</dt>
                <dd className="font-semibold text-[var(--o2-text)]">{source}</dd>
              </div>
            )}
            {branchName && branchName !== "—" && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[var(--o2-muted)]">الفرع</dt>
                <dd className="font-semibold text-[var(--o2-text)]">{branchName}</dd>
              </div>
            )}
            {/* order_type only exists on the fetched details, not the row
                the table already has — shown once it resolves, omitted (not
                "—") while loading, since a value about to arrive is not the
                same thing as a value that doesn't exist. */}
            {details?.order_type && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[var(--o2-muted)]">النوع</dt>
                <dd className="font-semibold text-[var(--o2-text)]">{CRM_ORDER_TYPE_LABELS[details.order_type] || details.order_type}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[var(--o2-muted)]">حالة الدفع</dt>
              {/* Real payment status is only known once `details` resolves.
                  Defaulting the badge's isPaid/paymentStatus to undefined
                  while loading — or after a failed fetch — would render as
                  "غير مدفوع", a confidently wrong answer for an order that
                  actually is paid, not an honest "don't know yet". */}
              <dd>
                {details ? (
                  <PaymentBadge isPaid={details.is_paid} paymentStatus={details.payment_status} />
                ) : loading ? (
                  <div className="h-4 w-14 animate-pulse rounded bg-[var(--o2-surface-muted)]" />
                ) : (
                  <span className="text-sm text-[var(--o2-muted)]">—</span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <SectionLabel>الأصناف</SectionLabel>
          {loading ? (
            <ItemsSkeleton />
          ) : error ? (
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm text-[var(--o2-danger)]">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> تعذّر تحميل تفاصيل الطلب
              </span>
              <button type="button" onClick={load} className="text-sm font-bold text-[var(--o2-brand-text)] hover:underline">
                إعادة المحاولة
              </button>
            </div>
          ) : !details || details.items.length === 0 ? (
            <p className="text-sm text-[var(--o2-muted)]">لا توجد أصناف مسجلة</p>
          ) : (
            <div className="space-y-1">
              <p className="text-xs font-bold text-[var(--o2-muted)]">{num(details.items.length)} صنف</p>
              <ul className="space-y-0.5">
                {details.items.slice(0, 2).map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-[var(--o2-text)]">{item.item_name_ar || item.item_name}</span>
                    <span className="shrink-0 text-[var(--o2-muted)]">× {num(item.quantity)}</span>
                  </li>
                ))}
              </ul>
              {details.items.length > 2 && (
                <p className="text-xs text-[var(--o2-muted)]">+ {num(details.items.length - 2)} أخرى</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-baseline justify-between border-t border-[var(--o2-border)] pt-3">
          <span className="text-sm font-bold text-[var(--o2-muted)]">الإجمالي</span>
          <span className="text-xl font-bold text-[var(--o2-text)]">{formatMoney(Number(row.total ?? 0))}</span>
        </div>

        {/* Only once resolved — customer_phone isn't on the row (this tab
            already lives inside one customer's own profile, so the row
            itself never repeats their identity), and showing an empty
            contact row while it's still loading would flash then vanish. */}
        {details?.customer_phone && (
          <div className="border-t border-[var(--o2-border)] pt-3">
            <OccasionContactActions contact={{ phone: details.customer_phone, name: details.customer_name }} />
          </div>
        )}
      </div>

      <footer className="flex items-center gap-2 border-t border-[var(--o2-border)] px-4 py-3">
        <button
          type="button"
          onClick={onViewOrder}
          className="flex h-9 flex-1 items-center justify-center rounded-lg bg-[var(--o2-brand)] text-sm font-bold text-white transition-colors hover:bg-[var(--o2-brand-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--o2-brand-ring)]"
        >
          عرض الطلب
        </button>
        <button
          type="button"
          onClick={copyOrderNumber}
          aria-label="نسخ رقم الطلب"
          title="نسخ رقم الطلب"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--o2-border)] text-[var(--o2-muted)] transition-colors hover:bg-[var(--o2-surface-muted)] hover:text-[var(--o2-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--o2-brand-ring)]"
        >
          <Copy className="h-4 w-4" />
        </button>
      </footer>
    </>
  );
}

export function CustomerOrderQuickView({
  row,
  anchorEl,
  onClose,
  onViewOrder,
}: {
  row: Row | null;
  /** The clicked row's DOM node — read once on open to compute the popover's position. */
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onViewOrder: (row: Row) => void;
}) {
  const isDesktop = useIsDesktop();
  const [placement, setPlacement] = useState<Placement>();
  const popupRef = useRef<HTMLDivElement>(null);
  const titleId = "crm-customer-order-quick-view-title";

  useLayoutEffect(() => {
    if (!row || !anchorEl || !isDesktop) { setPlacement(undefined); return; }
    setPlacement(computePlacement(anchorEl));
  }, [row, anchorEl, isDesktop]);

  useEffect(() => {
    if (!row) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popupRef.current?.contains(target)) return;
      if (anchorEl?.contains(target)) return;
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const id = window.setTimeout(() => document.addEventListener("mousedown", onPointerDown), 0);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      window.clearTimeout(id);
    };
  }, [row, anchorEl, onClose]);

  useEffect(() => {
    if (!row || !anchorEl || !isDesktop) return;
    const scrollParent = anchorEl.closest("main") ?? window;
    const onScroll = () => onClose();
    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollParent.removeEventListener("scroll", onScroll);
  }, [row, anchorEl, isDesktop, onClose]);

  useEffect(() => {
    if (row) popupRef.current?.focus();
    else anchorEl?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row]);

  const handleViewOrder = () => { if (row) onViewOrder(row); };
  const transition = { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const };

  if (isDesktop) {
    return createPortal(
      <AnimatePresence>
        {row && placement && (
          <motion.div
            key={String(row.id)}
            ref={popupRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            dir="rtl"
            initial={{ opacity: 0, y: placement.top ? -4 : 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement.top ? -4 : 4, scale: 0.98 }}
            transition={transition}
            style={{
              position: "fixed",
              left: placement.left,
              top: placement.top,
              bottom: placement.bottom,
              width: placement.width,
              maxHeight: placement.maxHeight,
              zIndex: Z_INDEX,
              boxShadow: "var(--o2-card-shadow)",
            }}
            className="flex flex-col overflow-hidden rounded-lg border border-[var(--o2-border)] bg-[var(--o2-surface)] outline-none"
          >
            <QuickViewBody row={row} onClose={onClose} onViewOrder={handleViewOrder} titleId={titleId} />
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );
  }

  return createPortal(
    <AnimatePresence>
      {row && (
        <motion.div key={String(row.id)} className="fixed inset-0" style={{ zIndex: Z_INDEX }} dir="rtl">
          <motion.button
            type="button"
            aria-label="إغلاق"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            className="absolute inset-0 bg-black/40"
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
            transition={transition}
            style={{ boxShadow: "var(--o2-card-shadow)" }}
            className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col overflow-hidden rounded-t-lg border-t border-[var(--o2-border)] bg-[var(--o2-surface)] outline-none"
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--o2-border)]" aria-hidden="true" />
            <QuickViewBody row={row} onClose={onClose} onViewOrder={handleViewOrder} titleId={titleId} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
