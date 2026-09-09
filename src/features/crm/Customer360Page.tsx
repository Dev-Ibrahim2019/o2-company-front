import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useParams } from "react-router-dom";
import { ArrowRight, Award, Banknote, CalendarClock, Copy, MoreVertical, Plus, Wallet } from "lucide-react";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS, CUSTOMER_FINANCIAL_READ_PERMISSIONS } from "../../auth/permissions";
import { crmApi } from "./api";
import { CrmState, getCrmError, StatusChip } from "./components";
import "./customers-ui/crmx.css";
import { CrmKpiCard, CrmProfileCard } from "./customers-ui";
import { engagementLabel } from "./customers-ui/engagementOptions";
import { CRM_CUSTOMER_SOURCE_LABELS, CRM_GENDER_LABELS } from "./customers-ui/sourceOptions";
import { date as formatDate, money as formatMoney, num } from "./format";
import type { CrmCustomerProfile } from "./types";

// GET /crm/customers/{id} (Customer360QueryService::profile()) returns
// {id, identity: {...}, summary: {...}, permissions: {...}} — see
// CrmCustomerProfile in ./types.
//
// Also note: identity.default_address is a plain string (customers.address
// is a text column) — not a related Address object. Customer.php has both
// an `address` column and an `address()` relation of the same name; Eloquent
// resolves the column first, so `$customer->address` in
// Customer360QueryService::profile() always returns the column string.


// Relative label for the KPI strip's "آخر نشاط" hint — coarse buckets are
// enough here, this isn't a precision timestamp.
function relativeFromNow(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return "اليوم";
  if (days === 1) return "منذ يوم";
  if (days === 2) return "منذ يومين";
  if (days < 11) return `منذ ${num(days)} أيام`;
  if (days < 30) { const w = Math.floor(days / 7); return `منذ ${num(w)} ${w === 1 ? "أسبوع" : "أسابيع"}`; }
  if (days < 365) { const m = Math.floor(days / 30); return `منذ ${num(m)} ${m === 1 ? "شهر" : "أشهر"}`; }
  const y = Math.floor(days / 365);
  return `منذ ${num(y)} ${y === 1 ? "سنة" : "سنوات"}`;
}

const TABS = [
  ["overview", "نظرة عامة"], ["orders", "الطلبات"], ["activity", "النشاطات"],
  ["complaints", "الشكاوى"], ["addresses", "العناوين"], ["notes", "الملاحظات والمناسبات"],
  ["loyalty", "الولاء"], ["financial", "المالية"],
] as const;

const OverviewTab = lazy(() => import("./tabs/OverviewTab"));
const OrdersTab = lazy(() => import("./tabs/OrdersTab"));
const ActivityTab = lazy(() => import("./tabs/ActivityTab"));
const AddressesTab = lazy(() => import("./tabs/AddressesTab"));
const ComplaintsTab = lazy(() => import("./tabs/ComplaintsTab"));
const NotesOccasionsTab = lazy(() => import("./tabs/NotesOccasionsTab"));
const FinancialTab = lazy(() => import("./tabs/FinancialTab"));
const LoyaltyTab = lazy(() => import("./tabs/LoyaltyTab"));

function HeaderMoreMenu({ code }: { code?: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="مزيد من الإجراءات"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)]"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-11 z-10 w-52 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] py-1.5 shadow-lg">
          {code && (
            <button
              role="menuitem"
              onClick={() => { navigator.clipboard?.writeText(String(code)); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] text-[var(--crmx-text)] hover:bg-[var(--crmx-neutral-soft)]"
            >
              <Copy className="h-3.5 w-3.5" /> نسخ كود العميل
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// [label, value, ltr?] — omit an entry entirely (don't call push) when the
// underlying field has no value, per the "hide, don't show a placeholder
// dash, for missing personal fields" rule.

/**
 * Customer facts, laid out as one full-width strip instead of the old 30%
 * right-hand sidebar.
 *
 * The mockup's customer screen has no sidebar — content below the tabs runs
 * the full width — and the sidebar's "بيانات التواصل" card had become a
 * straight duplicate of the profile card's phone/email once that card was
 * introduced. What is NOT duplicated (نسب، مصدر، جنس، تواريخ، عناوين) is kept
 * here rather than dropped.
 */
function CustomerFacts({ customer }: { customer: CrmCustomerProfile }) {
  const { identity } = customer;
  const workAddress = identity.work_address
    ? [identity.work_address.street, identity.work_address.building_no ? `مبنى ${identity.work_address.building_no}` : null, identity.work_address.area, identity.work_address.city]
        .filter(Boolean).join("، ")
    : null;

  const facts: Array<[string, string]> = [
    ...(identity.title ? [["الكنية", identity.title] as [string, string]] : []),
    ...(identity.source ? [["المصدر", CRM_CUSTOMER_SOURCE_LABELS[identity.source] || identity.source] as [string, string]] : []),
    ...(identity.gender ? [["الجنس", CRM_GENDER_LABELS[identity.gender]] as [string, string]] : []),
    ...(identity.birth_date ? [["تاريخ الميلاد", formatDate(identity.birth_date)] as [string, string]] : []),
    ...(identity.created_at ? [["تاريخ التسجيل", formatDate(identity.created_at)] as [string, string]] : []),
    // customers.salesperson_id was already round-tripped by the edit form
    // (see that form's own comment on the field) but never shown anywhere
    // read-only — profile() already resolves the name via the salesperson
    // relation, this is just the first place that reads it.
    ...(identity.salesperson?.name ? [["الموظف المسؤول", identity.salesperson.name] as [string, string]] : []),
    ["العنوان الرئيسي", identity.default_address || "لا يوجد عنوان مسجل"],
    ...(workAddress ? [["عنوان العمل", workAddress] as [string, string]] : []),
  ];

  if (!facts.length) return null;

  return (
    <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-5 py-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[12px] text-[var(--crmx-text-muted)]">{label}</dt>
            <dd className="mt-0.5 truncate text-[13px] font-semibold text-[var(--crmx-text)]" title={value}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function Customer360Page() {
  const { customerId = "" } = useParams();
  const { hasPermission } = useAuth();
  // Any of the three permissions the backend treats as equivalent for
  // reading receivables data — checking only the CRM one would hide the
  // tab from Accounting users who are entitled to it.
  const canFinancial = CUSTOMER_FINANCIAL_READ_PERMISSIONS.some((p) => hasPermission(p));
  const canLoyalty = hasPermission(CRM_PERMISSIONS.LOYALTY_VIEW);
  const [customer, setCustomer] = useState<CrmCustomerProfile>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string }>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setCustomer(await crmApi.customer<CrmCustomerProfile>(customerId));
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, [customerId]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <CrmState kind="loading" title="جارٍ فتح ملف العميل" />;
  if (error) return <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />;
  if (!customer) return <CrmState kind="empty" title="العميل غير موجود" />;

  const { identity, summary } = customer;
  return (
    <div className="crmx-root space-y-5 p-4 sm:p-6">
      <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--crmx-text-muted)]">
        <Link to="/admin/crm/customers" className="flex items-center gap-1 hover:text-[var(--crmx-navy)]">
          <ArrowRight className="h-3.5 w-3.5" /> العملاء
        </Link>
        <span>/</span>
        <span className="text-[var(--crmx-text-secondary)]">{identity.name}</span>
      </div>

      {/* ── Title row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="min-w-0">
            <h1 className="text-[24px] font-extrabold text-[var(--crmx-text)]">{identity.name}</h1>
            {/* Small secondary line under the Arabic name, only when set —
                customers.name_en was accepted and persisted since this
                module's first version but never displayed anywhere read-only
                (see the field-inventory audit); this is that first display. */}
            {identity.name_en && (
              <p className="text-[13px] text-[var(--crmx-text-muted)]" dir="ltr">{identity.name_en}</p>
            )}
          </div>
          <StatusChip value={identity.status} />
          {identity.engagement_status && (
            <span className="text-[12.5px] font-semibold text-[var(--crmx-text-secondary)]">{engagementLabel(identity.engagement_status)}</span>
          )}
          <span className="text-[12.5px] text-[var(--crmx-text-muted)]" dir="ltr">{identity.code || `#${customer.id}`}</span>
          {identity.branch?.name && <span className="text-[12.5px] text-[var(--crmx-text-muted)]">· {identity.branch.name}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/call-center/pos"
            title="إنشاء طلب جديد لهذا العميل عبر نقطة بيع الكول سنتر"
            className="flex h-11 items-center gap-2 rounded-xl bg-[var(--crmx-primary)] px-4 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]"
          >
            <Plus className="h-4 w-4" /> طلب جديد
          </Link>
          <HeaderMoreMenu code={identity.code} />
        </div>
      </div>

      {/* ── Identity card + KPI strip, one row (mockup screen 3) ──
          The mockup's four figures are: آخر طلب · إجمالي المشتريات ·
          إجمالي الطلبات · متوسط الطلب. The balance KPI that used to occupy
          the fourth slot is not dropped from the product — it remains on the
          Financial tab, which is the only place it is permission-gated
          anyway. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <CrmProfileCard
          group={identity.group ? { id: identity.group.id, name: identity.group.name } : null}
          name={identity.name}
          code={identity.code}
          phone={identity.primary_phone}
          normalizedPhone={identity.phones?.find((p) => p.is_primary)?.normalized_phone
            ?? identity.phones?.[0]?.normalized_phone}
          email={identity.email}
          editHref={`/admin/crm/customers/${customer.id}/edit`}
        />
        <CrmKpiCard
            icon={<CalendarClock className="h-5 w-5" />}
            label="آخر طلب"
            value={formatDate(summary.last_order_at)}
            hint={relativeFromNow(summary.last_order_at)}
            tone="warning"
        />
        <CrmKpiCard
            icon={<Wallet className="h-5 w-5" />}
            label="إجمالي المشتريات"
            value={formatMoney(summary.total_purchases)}
            tone="info"
        />
        <CrmKpiCard
            icon={<Award className="h-5 w-5" />}
            label="إجمالي الطلبات"
            value={num(summary.orders_count)}
            tone="success"
        />
        <CrmKpiCard
            icon={<Banknote className="h-5 w-5" />}
            label="متوسط الطلب"
            value={formatMoney(summary.average_order_value)}
            tone="accent"
        />
      </div>

      <CustomerFacts customer={customer} />

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-1.5 border-b border-[var(--crmx-border)] pb-0.5">
        {TABS.filter(([key]) => (key !== "financial" || canFinancial) && (key !== "loyalty" || canLoyalty)).map(([key, label]) => {
          const count = key === "orders" ? summary.orders_count : key === "complaints" ? summary.open_complaints_count : undefined;
          return (
            <NavLink
              key={key}
              // Absolute, not relative. This page is mounted on the splat route
              // `customers/:customerId/*`, and React Router resolves a relative
              // `to` against the whole matched pathname — splat segment
              // included. From /customers/1/overview a relative "orders"
              // becomes /customers/1/overview/orders, which falls through to
              // the catch-all and renders "القسم غير موجود".
              to={`/admin/crm/customers/${customer.id}/${key}`}
              className={({ isActive }) =>
                `rounded-t-xl px-4 py-2.5 text-[14px] font-bold transition-colors ${
                  isActive
                    ? "border-b-2 border-[var(--crmx-primary)] text-[var(--crmx-primary-text)]"
                    : "text-[var(--crmx-text-secondary)] hover:text-[var(--crmx-text)]"
                }`
              }
            >
              {label}
              {count != null && <span className="ms-1 text-[var(--crmx-text-muted)]">({num(count)})</span>}
            </NavLink>
          );
        })}
      </div>

      {/* ── Workspace: full width, matching the mockup (no context sidebar) ── */}
      <div className="min-w-0">
          <Suspense fallback={<CrmState kind="loading" title="جارٍ تجهيز القسم" />}>
            <Routes>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<OverviewTab />} />
              <Route path="orders" element={<OrdersTab />} />
              <Route path="activity" element={<ActivityTab />} />
              <Route path="addresses" element={<AddressesTab />} />
              <Route path="complaints" element={<ComplaintsTab />} />
              {/* The customer's phone travels down so the occasions half can
                  offer call/WhatsApp. It is read here rather than re-fetched
                  in the tab: this page already holds the identity payload,
                  including the E.164 value the wa.me link needs. */}
              <Route
                path="notes"
                element={
                  <NotesOccasionsTab
                    contact={{
                      name: identity.name,
                      phone: identity.primary_phone,
                      normalizedPhone:
                        identity.phones?.find((p) => p.is_primary)?.normalized_phone
                        ?? identity.phones?.[0]?.normalized_phone,
                    }}
                  />
                }
              />
              {canLoyalty && <Route path="loyalty" element={<LoyaltyTab />} />}
              {canFinancial && <Route path="financial" element={<FinancialTab />} />}
              <Route path="*" element={<CrmState kind="empty" title="القسم غير موجود" />} />
            </Routes>
          </Suspense>
      </div>
    </div>
  );
}
