import { AlertTriangle, ChevronDown, Clock, Search, X } from "lucide-react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth";
import { branchService, type Branch } from "../../services/branchService";
import { crmApi } from "./api";
import { getCrmError } from "./components";
import "./customers-ui/crmx.css";
import { CrmOrderExpandedPanel, CrmPageHeader, CrmPagination, CrmSearchBar, CrmStatusBadge, CrmToolbarSkeleton } from "./customers-ui";
import { CRM_ORDER_SOURCE_LABELS } from "./customers-ui/sourceOptions";
import type { CrmOrderRow, CrmPage } from "./types";

// Real orders.status values this filter exposes — matches CrmStatusBadge's
// own mapping exactly (see database/migrations/..._create_orders_table.php).
// pending_confirmation/pending_payment are real but transitional/edge-case
// states (QR ordering, table-transfer) and are intentionally left out of
// this general filter to avoid two statuses with no distinct badge styling.
const STATUS_FILTER_OPTIONS: Array<[string, string]> = [
  ["", "كل الحالات"], ["pending", "قيد الانتظار"], ["confirmed", "مؤكد"],
  ["in_progress", "قيد التنفيذ"], ["ready", "جاهز"], ["served", "تم التسليم"],
  ["paid", "مدفوع"], ["cancelled", "ملغي"],
];
// Real orders.payment_status values (Order::PAYMENT_STATUSES) — only ever
// populated for Call Center orders today (POS folds payment into `status`
// directly); "processing" is the closest real equivalent to "جزئي".
const PAYMENT_STATUS_FILTER_OPTIONS: Array<[string, string]> = [
  ["", "كل حالات الدفع"], ["unpaid", "غير مدفوع"], ["awaiting_confirmation", "بانتظار تأكيد التحويل"],
  ["processing", "جزئي / قيد المعالجة"], ["paid", "مدفوع"], ["failed", "فشل الدفع"],
];
// Real orders.source values — see CRM_ORDER_SOURCE_LABELS (pos/call_center
// only). Deliberately NOT the Customer Source values (website/fawri/
// families/walk_in) — those describe how a customer first registered, a
// separate concept from which channel created a given order.
const SOURCE_FILTER_OPTIONS: Array<[string, string]> = [
  ["", "كل المصادر"],
  ...(Object.entries(CRM_ORDER_SOURCE_LABELS) as Array<[string, string]>),
];

// CRM is a read-only monitoring surface over the existing Order domain —
// see the Order Domain Audit. This page never creates, confirms, serves,
// pays, or cancels an order; it only displays what CrmController::
// ordersIndex()/ordersDelayed() already computed from the real `orders`
// table. "All"/"Active"/"Delayed" are the same component with different
// query params, not three separate implementations.

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: "صالة",
  takeaway: "سفري",
  delivery: "توصيل",
};

function formatMoney(value?: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("ar-PS", { style: "currency", currency: "ILS" }).format(value);
}

function formatElapsed(minutes: number) {
  if (minutes < 60) return `منذ ${minutes.toLocaleString("ar")} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0
    ? `منذ ${hours.toLocaleString("ar")} س ${rest.toLocaleString("ar")} د`
    : `منذ ${hours.toLocaleString("ar")} ساعة`;
}

// Graduated delay severity — a flat "everything past the threshold is red"
// treatment makes every delayed order look like the same emergency. Tiers
// are relative to the chosen threshold, not a fixed minute count, so they
// stay meaningful whether the operator picks 10 minutes or 60.
type DelaySeverity = "attention" | "delayed" | "critical";
function delaySeverity(elapsedMinutes: number, thresholdMinutes: number): DelaySeverity {
  const ratio = thresholdMinutes > 0 ? elapsedMinutes / thresholdMinutes : 1;
  if (ratio >= 2) return "critical";
  if (ratio >= 1.5) return "delayed";
  return "attention";
}
const SEVERITY_STYLE: Record<DelaySeverity, { row: string; time: string; icon: boolean }> = {
  attention: { row: "", time: "text-[var(--crmx-warning-text)]", icon: false },
  delayed: { row: "bg-[var(--crmx-warning-soft)]/40", time: "text-[var(--crmx-warning-text)]", icon: true },
  critical: { row: "bg-[var(--crmx-danger-soft)]/40", time: "text-[var(--crmx-danger-text)]", icon: true },
};

function orderTypeLabel(order: CrmOrderRow) {
  if (order.table?.zone || order.table?.table_number) {
    const parts = [order.table.zone, order.table.table_number ? `طاولة ${order.table.table_number}` : null].filter(Boolean);
    return parts.join(" · ");
  }
  return ORDER_TYPE_LABELS[order.order_type] || order.order_type;
}

const COLUMNS = ["", "رقم الطلب", "العميل", "المصدر", "النوع / الطاولة", "الفرع", "الحالة", "الدفع", "الإجمالي", "منذ"];

const PAYMENT_BADGE_TONE_CLASS: Record<"success" | "warning" | "neutral", string> = {
  success: "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]",
  warning: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]",
  neutral: "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]",
};

// `is_paid` is the backend-derived source of truth (status === 'paid' ||
// payment_status === 'paid') — raw payment_status alone is blank for most
// actually-paid orders (POS path never writes it), so it must not be read
// directly here.
function PaymentBadge({ order }: { order: CrmOrderRow }) {
  let tone: "success" | "warning" | "neutral" = "neutral";
  let label = "غير مدفوع";
  if (order.is_paid) {
    tone = "success";
    label = "مدفوع";
  } else if (order.payment_status && order.payment_status !== "unpaid") {
    tone = "warning";
    label = PAYMENT_STATUS_FILTER_OPTIONS.find(([v]) => v === order.payment_status)?.[1] || order.payment_status;
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap ${PAYMENT_BADGE_TONE_CLASS[tone]}`}>
      {label}
    </span>
  );
}

export function CrmOrdersPage({ mode }: { mode: "all" | "active" | "delayed" }) {
  const { user } = useAuth();
  const isGlobal = !user?.branch_id;
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState<CrmPage<CrmOrderRow>>();
  const [error, setError] = useState<{ status?: number; message: string }>();
  const [loading, setLoading] = useState(true);
  const [openOrderId, setOpenOrderId] = useState<string | number | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const toggle = (id: string | number) => setOpenOrderId((cur) => (cur === id ? null : id));

  useEffect(() => {
    if (!isGlobal) return;
    branchService.getAll().then(setBranches).catch(() => setBranches([]));
  }, [isGlobal]);

  const search = params.get("search") || "";
  const status = params.get("status") || "";
  const paymentStatus = params.get("payment_status") || "";
  const source = params.get("source") || "";
  const branchId = params.get("branch_id") || "";
  const dateFrom = params.get("date_from") || "";
  const dateTo = params.get("date_to") || "";
  const minutes = Number(params.get("minutes") || 30);
  const perPage = Number(params.get("per_page") || 20);

  const hasFilters = Boolean(search || status || paymentStatus || source || branchId || dateFrom || dateTo);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const resetFilters = () => {
    const next = new URLSearchParams();
    if (mode === "delayed") next.set("minutes", String(minutes));
    setParams(next);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      if (mode === "delayed") {
        const next = new URLSearchParams(params);
        next.set("minutes", String(minutes));
        setResult(await crmApi.delayedOrders(next));
      } else {
        const next = new URLSearchParams(params);
        if (mode === "active") next.set("active", "1");
        setResult(await crmApi.orders(next));
      }
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, params.toString(), minutes]);
  useEffect(() => { void load(); }, [load]);

  const titles: Record<typeof mode, { title: string; description: string }> = {
    all: { title: "جميع الطلبات", description: "متابعة الطلبات الواردة من جميع القنوات — عرض ومراقبة فقط، دون إنشاء أو تعديل." },
    active: { title: "الطلبات النشطة", description: "الطلبات التي لم تُدفع أو تُسلَّم أو تُلغَ بعد، أينما كانت." },
    delayed: { title: "الطلبات المتأخرة", description: "طلبات نشطة تجاوز وقتها منذ الإنشاء الحد المحدد أدناه — إشارة تشغيلية، وليست حكماً على أحد." },
  };

  return (
    <section className="crmx-root space-y-6 p-4 sm:p-6">
      <CrmPageHeader breadcrumb="CRM / الطلبات" title={titles[mode].title} description={titles[mode].description} />

      {loading && !result ? (
        <CrmToolbarSkeleton />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <CrmSearchBar value={search} onChange={(v) => set("search", v)} placeholder="ابحث برقم الطلب أو اسم العميل أو الهاتف..." />
          {mode === "delayed" && (
            <select
              value={minutes}
              onChange={(e) => set("minutes", e.target.value)}
              className="h-11 rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-navy)] focus:ring-2 focus:ring-[var(--crmx-navy)]/10"
            >
              <option value={10}>أكثر من 10 دقائق</option>
              <option value={20}>أكثر من 20 دقيقة</option>
              <option value={30}>أكثر من 30 دقيقة</option>
              <option value={60}>أكثر من ساعة</option>
            </select>
          )}

          {mode !== "delayed" && (
            <select
              value={status}
              onChange={(e) => set("status", e.target.value)}
              className="h-11 min-w-[140px] rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-navy)] focus:ring-2 focus:ring-[var(--crmx-navy)]/10"
            >
              {STATUS_FILTER_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          )}

          {mode !== "delayed" && (
            <select
              value={paymentStatus}
              onChange={(e) => set("payment_status", e.target.value)}
              className="h-11 min-w-[150px] rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-navy)] focus:ring-2 focus:ring-[var(--crmx-navy)]/10"
            >
              {PAYMENT_STATUS_FILTER_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          )}

          <select
            value={source}
            onChange={(e) => set("source", e.target.value)}
            className="h-11 min-w-[140px] rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-navy)] focus:ring-2 focus:ring-[var(--crmx-navy)]/10"
            aria-label="مصدر الطلب"
          >
            {SOURCE_FILTER_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          {isGlobal && (
            <select
              value={branchId}
              onChange={(e) => set("branch_id", e.target.value)}
              className="h-11 min-w-[140px] rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-navy)] focus:ring-2 focus:ring-[var(--crmx-navy)]/10"
            >
              <option value="">كل الفروع</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}

          {mode !== "delayed" && (
            <>
              <label className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
                من
                <input
                  type="date" value={dateFrom} onChange={(e) => set("date_from", e.target.value)}
                  className="h-11 rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-navy)] focus:ring-2 focus:ring-[var(--crmx-navy)]/10"
                />
              </label>
              <label className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
                إلى
                <input
                  type="date" value={dateTo} onChange={(e) => set("date_to", e.target.value)}
                  className="h-11 rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-navy)] focus:ring-2 focus:ring-[var(--crmx-navy)]/10"
                />
              </label>
            </>
          )}

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex h-11 items-center gap-1.5 rounded-xl border border-[var(--crmx-border)] bg-white px-3.5 text-[13px] font-semibold text-[var(--crmx-text-secondary)] transition hover:border-[var(--crmx-navy)] hover:text-[var(--crmx-text)]"
            >
              <X className="h-3.5 w-3.5" /> إعادة تعيين
            </button>
          )}
        </div>
      )}

      {loading && !result ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]">
          <div className="crmx-skeleton h-12 w-full rounded-none" />
          <div className="divide-y divide-[var(--crmx-border)]">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="crmx-skeleton m-3 h-12 rounded-xl" />)}
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] py-16 text-center">
          <AlertTriangle className="h-8 w-8 text-[var(--crmx-danger)]" />
          <p className="text-[15px] font-bold text-[var(--crmx-text)]">{error.message}</p>
          <button onClick={load} className="h-10 rounded-xl bg-[var(--crmx-navy)] px-4 text-[13px] font-bold text-white">إعادة المحاولة</button>
        </div>
      ) : !result?.items.length ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-muted)]">
            <Search className="h-6 w-6" />
          </span>
          <p className="text-[16px] font-bold text-[var(--crmx-text)]">
            {hasFilters
              ? "لا توجد نتائج مطابقة للفلاتر الحالية"
              : mode === "delayed" ? "لا توجد طلبات متأخرة حالياً" : mode === "active" ? "لا توجد طلبات نشطة حالياً" : "لا توجد طلبات"}
          </p>
          <p className="max-w-xs text-[14px] text-[var(--crmx-text-secondary)]">
            {hasFilters
              ? "جرّب تعديل أو إعادة تعيين الفلاتر."
              : mode === "delayed" ? "كل الطلبات النشطة ضمن الوقت المحدد." : "لا توجد طلبات مسجلة بعد."}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-1 h-10 rounded-xl border border-[var(--crmx-border)] px-4 text-[13px] font-semibold text-[var(--crmx-text)] hover:bg-[var(--crmx-neutral-soft)]"
            >
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]">
          <div className="crmx-scrollbar overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-right">
              <thead>
                <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
                  {COLUMNS.map((c) => (
                    <th key={c} className="whitespace-nowrap px-4 py-3.5 text-[13px] font-bold text-[var(--crmx-text-secondary)]">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.items.map((order) => {
                  const isOpen = openOrderId === order.id;
                  const isFlagged = mode === "delayed" && order.is_delayed;
                  const severity = isFlagged ? delaySeverity(order.elapsed_minutes, minutes) : null;
                  const style = severity ? SEVERITY_STYLE[severity] : null;
                  return (
                    <Fragment key={order.id}>
                      <tr
                        onClick={() => toggle(order.id)}
                        className={`crmx-table-row cursor-pointer border-b border-[var(--crmx-border)] transition-colors last:border-0 ${style?.row ?? ""}`}
                      >
                        <td className="px-2 text-center">
                          <ChevronDown className={`mx-auto h-4 w-4 text-[var(--crmx-text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </td>
                        <td className="px-4 py-4 text-[14px] font-bold text-[var(--crmx-text)]" dir="ltr">{order.order_number}</td>
                        <td className="px-4 py-4 text-[14px] text-[var(--crmx-text-secondary)]">
                          {order.customer?.name ? (
                            <span className="font-semibold text-[var(--crmx-text)]">{order.customer.name}</span>
                          ) : (
                            <span className="text-[var(--crmx-text-muted)]">غير مرتبط بعميل</span>
                          )}
                          {order.customer_phone && <div className="text-[12.5px] text-[var(--crmx-text-muted)]" dir="ltr">{order.customer_phone}</div>}
                        </td>
                        <td className="px-4 py-4 text-[14px] text-[var(--crmx-text-secondary)]">{CRM_ORDER_SOURCE_LABELS[order.source ?? ""] || order.source || "—"}</td>
                        <td className="px-4 py-4 text-[14px] text-[var(--crmx-text-secondary)]">{orderTypeLabel(order)}</td>
                        <td className="px-4 py-4 text-[14px] text-[var(--crmx-text-secondary)]">{order.branch?.name || "—"}</td>
                        <td className="px-4 py-4"><CrmStatusBadge value={order.status} /></td>
                        <td className="px-4 py-4"><PaymentBadge order={order} /></td>
                        <td className="px-4 py-4 text-[14px] font-bold text-[var(--crmx-text)]">{formatMoney(order.total)}</td>
                        <td className={`px-4 py-4 text-[14px] font-semibold ${style?.time ?? "text-[var(--crmx-text-secondary)]"}`}>
                          <span className="flex items-center gap-1.5">
                            {style?.icon && <Clock className="h-3.5 w-3.5" />}
                            {formatElapsed(order.elapsed_minutes)}
                          </span>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-[var(--crmx-border)] bg-[var(--crmx-bg)] last:border-0">
                          <td colSpan={COLUMNS.length} className="p-0">
                            <CrmOrderExpandedPanel orderId={order.id} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <CrmPagination
            currentPage={result.currentPage}
            lastPage={result.lastPage}
            total={result.total}
            perPage={perPage}
            onPageChange={(p) => set("page", String(p))}
            onPerPageChange={(size) => set("per_page", String(size))}
          />
        </div>
      )}
    </section>
  );
}
