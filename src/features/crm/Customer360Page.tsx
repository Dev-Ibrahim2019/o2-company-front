import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle, ArrowRight, Award, Building2, Banknote, CalendarClock, Copy, Mail, MapPin,
  MessageCircle, MoreVertical, Pencil, Phone, Plus, Wallet,
} from "lucide-react";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { crmApi } from "./api";
import { CrmState, getCrmError, StatusChip } from "./components";
import "./customers-ui/crmx.css";
import { CrmAvatar, CrmKpiCard } from "./customers-ui";
import { categoryLabel } from "./customers-ui/categoryOptions";
import { CRM_CUSTOMER_SOURCE_LABELS, CRM_GENDER_LABELS } from "./customers-ui/sourceOptions";
import type { CrmCustomerProfile, CrmFinancialSummary } from "./types";

// GET /crm/customers/{id} (Customer360QueryService::profile()) returns
// {id, identity: {...}, summary: {...}, permissions: {...}} — see
// CrmCustomerProfile in ./types.
//
// Also note: identity.default_address is a plain string (customers.address
// is a text column) — not a related Address object. Customer.php has both
// an `address` column and an `address()` relation of the same name; Eloquent
// resolves the column first, so `$customer->address` in
// Customer360QueryService::profile() always returns the column string.

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

function formatMoney(value?: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("ar-PS", { style: "currency", currency: "ILS" }).format(value);
}

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
  if (days < 11) return `منذ ${days.toLocaleString("ar")} أيام`;
  if (days < 30) { const w = Math.floor(days / 7); return `منذ ${w.toLocaleString("ar")} ${w === 1 ? "أسبوع" : "أسابيع"}`; }
  if (days < 365) { const m = Math.floor(days / 30); return `منذ ${m.toLocaleString("ar")} ${m === 1 ? "شهر" : "أشهر"}`; }
  const y = Math.floor(days / 365);
  return `منذ ${y.toLocaleString("ar")} ${y === 1 ? "سنة" : "سنوات"}`;
}

const TABS = [
  ["overview", "نظرة عامة"], ["orders", "الطلبات"], ["activity", "النشاطات"],
  ["complaints", "الشكاوى"], ["addresses", "العناوين"], ["notes", "الملاحظات والمناسبات"],
  ["financial", "المالية"],
] as const;

const OverviewTab = lazy(() => import("./tabs/OverviewTab"));
const OrdersTab = lazy(() => import("./tabs/OrdersTab"));
const ActivityTab = lazy(() => import("./tabs/ActivityTab"));
const AddressesTab = lazy(() => import("./tabs/AddressesTab"));
const ComplaintsTab = lazy(() => import("./tabs/ComplaintsTab"));
const NotesOccasionsTab = lazy(() => import("./tabs/NotesOccasionsTab"));
const FinancialTab = lazy(() => import("./tabs/FinancialTab"));

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
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--crmx-border)] text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)]"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-11 z-10 w-52 rounded-xl border border-[var(--crmx-border)] bg-white py-1.5 shadow-lg">
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
function SidebarFact({ icon: Icon, children, ltr }: { icon: typeof Mail; children: React.ReactNode; ltr?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px] text-[var(--crmx-text-secondary)]">
      <Icon className="h-4 w-4 shrink-0 text-[var(--crmx-text-muted)]" />
      <span dir={ltr ? "ltr" : undefined} className="truncate">{children}</span>
    </div>
  );
}

function CustomerSidebar({ customer }: { customer: CrmCustomerProfile }) {
  const { identity } = customer;
  const phone = identity.primary_phone || "";
  const hasContact = Boolean(phone || identity.email);
  const infoRows: Array<[string, string]> = [
    ...(identity.title ? [["الكنية", identity.title] as [string, string]] : []),
    ...(identity.branch?.name ? [["الفرع", identity.branch.name] as [string, string]] : []),
    ...(identity.source ? [["المصدر", CRM_CUSTOMER_SOURCE_LABELS[identity.source] || identity.source] as [string, string]] : []),
    ...(identity.category ? [["الشريحة", categoryLabel(identity.category)] as [string, string]] : []),
    ...(identity.gender ? [["الجنس", CRM_GENDER_LABELS[identity.gender]] as [string, string]] : []),
    ...(identity.birth_date ? [["تاريخ الميلاد", formatDate(identity.birth_date)] as [string, string]] : []),
    ...(identity.created_at ? [["تاريخ التسجيل", formatDate(identity.created_at)] as [string, string]] : []),
  ];
  const workAddress = identity.work_address
    ? [identity.work_address.street, identity.work_address.building_no ? `مبنى ${identity.work_address.building_no}` : null, identity.work_address.area, identity.work_address.city]
        .filter(Boolean).join("، ")
    : null;

  return (
    <aside className="space-y-4">
      {hasContact && (
        <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
          <h3 className="mb-3 text-[15px] font-bold text-[var(--crmx-text)]">بيانات التواصل</h3>
          <dl className="space-y-3">
            {phone && <SidebarFact icon={Phone} ltr>{phone}</SidebarFact>}
            {phone && <SidebarFact icon={MessageCircle} ltr>{phone}</SidebarFact>}
            {identity.email && <SidebarFact icon={Mail} ltr>{identity.email}</SidebarFact>}
          </dl>
        </div>
      )}

      {infoRows.length > 0 && (
        <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
          <h3 className="mb-3 text-[15px] font-bold text-[var(--crmx-text)]">معلومات العميل</h3>
          <dl className="grid grid-cols-2 gap-3 text-[13px]">
            {infoRows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[12px] text-[var(--crmx-text-muted)]">{label}</dt>
                <dd className="mt-0.5 font-semibold text-[var(--crmx-text)]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
        <h3 className="mb-3 text-[15px] font-bold text-[var(--crmx-text)]">العنوان الرئيسي</h3>
        {identity.default_address ? (
          <SidebarFact icon={MapPin}>{identity.default_address}</SidebarFact>
        ) : (
          <p className="text-[13px] text-[var(--crmx-text-muted)]">لا يوجد عنوان مسجل</p>
        )}
      </div>

      {workAddress && (
        <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
          <h3 className="mb-3 text-[15px] font-bold text-[var(--crmx-text)]">عنوان العمل</h3>
          <SidebarFact icon={Building2}>{workAddress}</SidebarFact>
        </div>
      )}
    </aside>
  );
}

export function Customer360Page() {
  const { customerId = "" } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canFinancial = hasPermission(CRM_PERMISSIONS.VIEW_CUSTOMER_FINANCIAL);
  const [customer, setCustomer] = useState<CrmCustomerProfile>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string }>();
  const [balance, setBalance] = useState<number>();

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

  // Balance is a real, existing value (Customer360QueryService::financial(),
  // gated by crm.view-customer-financial) — reused as-is for the 4th KPI
  // rather than being invented; when the user lacks that permission there's
  // nothing to show here, so open complaints fills that slot instead.
  useEffect(() => {
    if (!canFinancial || !customerId) return;
    let cancelled = false;
    crmApi.section<CrmFinancialSummary>(customerId, "financial-summary")
      .then((d) => !cancelled && setBalance(d.balance))
      .catch(() => {});
    return () => { cancelled = true; };
  }, [customerId, canFinancial]);

  if (loading) return <CrmState kind="loading" title="جارٍ فتح ملف العميل" />;
  if (error) return <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />;
  if (!customer) return <CrmState kind="empty" title="العميل غير موجود" />;

  const { identity, summary } = customer;
  const phone = identity.primary_phone || "";
  const whatsappPhone = phone.replace(/\D/g, "");

  return (
    <div className="crmx-root space-y-5 p-4 sm:p-6">
      <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--crmx-text-muted)]">
        <Link to="/admin/crm/customers" className="flex items-center gap-1 hover:text-[var(--crmx-navy)]">
          <ArrowRight className="h-3.5 w-3.5" /> العملاء
        </Link>
        <span>/</span>
        <span className="text-[var(--crmx-text-secondary)]">{identity.name}</span>
      </div>

      {/* ── Header: compact identity + primary actions ── */}
      <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <CrmAvatar name={identity.name} size={48} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[20px] font-bold text-[var(--crmx-text)]">{identity.name}</h1>
                <StatusChip value={identity.status} />
                {identity.category && <span className="text-[12px] font-semibold text-[var(--crmx-text-secondary)]">{categoryLabel(identity.category)}</span>}
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-[var(--crmx-text-muted)]">
                <span dir="ltr">{identity.code || `#${customer.id}`}</span>
                {identity.branch?.name && <span>· {identity.branch.name}</span>}
              </p>
              {(phone || identity.email) && (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12.5px] font-semibold text-[var(--crmx-text-secondary)]">
                  {phone && <span dir="ltr">{phone}</span>}
                  {identity.email && <span dir="ltr">{identity.email}</span>}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/call-center/pos"
              title="إنشاء طلب جديد لهذا العميل عبر نقطة بيع الكول سنتر"
              className="flex h-10 items-center gap-2 rounded-xl bg-[var(--crmx-primary)] px-4 text-[13px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]"
            >
              <Plus className="h-4 w-4" /> طلب جديد
            </Link>
            {phone && (
              <a href={`tel:${phone}`} className="flex h-10 items-center gap-2 rounded-xl border border-[var(--crmx-border)] px-3.5 text-[13px] font-semibold text-[var(--crmx-text)] hover:bg-[var(--crmx-neutral-soft)]">
                <Phone className="h-4 w-4" /> اتصال
              </a>
            )}
            {whatsappPhone && (
              <a href={`https://wa.me/${whatsappPhone}`} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-2 rounded-xl border border-[var(--crmx-border)] px-3.5 text-[13px] font-semibold text-[var(--crmx-text)] hover:bg-[var(--crmx-neutral-soft)]">
                <MessageCircle className="h-4 w-4" /> واتساب
              </a>
            )}
            <button
              type="button"
              onClick={() => navigate(`/admin/crm/customers/${customer.id}/edit`)}
              className="flex h-10 items-center gap-2 rounded-xl border border-[var(--crmx-border)] px-3.5 text-[13px] font-semibold text-[var(--crmx-text)] hover:bg-[var(--crmx-neutral-soft)]"
            >
              <Pencil className="h-4 w-4" /> تعديل
            </button>
            <HeaderMoreMenu code={identity.code} />
          </div>
        </div>
      </div>

      {/* ── KPI strip — 4 equal cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CrmKpiCard
          icon={<Wallet className="h-5 w-5" />}
          label="إجمالي المشتريات"
          value={formatMoney(summary.total_purchases)}
          hint={summary.orders_count != null ? `${summary.orders_count.toLocaleString("ar")} طلبات` : undefined}
          tone="navy"
        />
        <CrmKpiCard
          icon={<Award className="h-5 w-5" />}
          label="متوسط قيمة الطلب"
          value={formatMoney(summary.average_order_value)}
          tone="accent"
        />
        <CrmKpiCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="آخر نشاط"
          value={formatDate(summary.last_order_at)}
          hint={relativeFromNow(summary.last_order_at)}
          tone="warning"
        />
        {canFinancial ? (
          <CrmKpiCard
            icon={<Banknote className="h-5 w-5" />}
            label="الرصيد / المستحقات"
            value={balance != null ? formatMoney(balance) : "—"}
            hint={balance == null ? undefined : balance > 0 ? "مستحق على العميل" : balance < 0 ? "رصيد دائن" : "لا توجد مستحقات"}
            tone="success"
            loading={balance == null}
          />
        ) : (
          <CrmKpiCard
            icon={<AlertCircle className="h-5 w-5" />}
            label="الشكاوى المفتوحة"
            value={summary.open_complaints_count != null ? summary.open_complaints_count.toLocaleString("ar") : "٠"}
            tone="success"
          />
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-1.5 border-b border-[var(--crmx-border)] pb-0.5">
        {TABS.filter(([key]) => key !== "financial" || canFinancial).map(([key, label]) => {
          const count = key === "orders" ? summary.orders_count : key === "complaints" ? summary.open_complaints_count : undefined;
          return (
            <NavLink
              key={key}
              to={key}
              className={({ isActive }) =>
                `rounded-t-xl px-4 py-2.5 text-[13.5px] font-bold transition-colors ${
                  isActive
                    ? "border-b-2 border-[var(--crmx-primary)] text-[var(--crmx-primary-text)]"
                    : "text-[var(--crmx-text-secondary)] hover:text-[var(--crmx-text)]"
                }`
              }
            >
              {label}
              {count != null && <span className="ms-1 text-[var(--crmx-text-muted)]">({count.toLocaleString("ar")})</span>}
            </NavLink>
          );
        })}
      </div>

      {/* ── Workspace: main content (70%) + persistent customer context sidebar (30%) ── */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[7fr_3fr]">
        <div className="min-w-0">
          <Suspense fallback={<CrmState kind="loading" title="جارٍ تجهيز القسم" />}>
            <Routes>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<OverviewTab />} />
              <Route path="orders" element={<OrdersTab />} />
              <Route path="activity" element={<ActivityTab />} />
              <Route path="addresses" element={<AddressesTab />} />
              <Route path="complaints" element={<ComplaintsTab />} />
              <Route path="notes" element={<NotesOccasionsTab />} />
              {canFinancial && <Route path="financial" element={<FinancialTab />} />}
              <Route path="*" element={<CrmState kind="empty" title="القسم غير موجود" />} />
            </Routes>
          </Suspense>
        </div>
        <CustomerSidebar customer={customer} />
      </div>
    </div>
  );
}
