import { Copy, Eye, MoreVertical, Pencil, Phone, ScanEye } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmCustomer } from "../types";
import { categoryLabel } from "./categoryOptions";
import { CRM_CUSTOMER_SOURCE_LABELS } from "./sourceOptions";
import { CrmAvatar } from "./CrmAvatar";
import { CrmStatusBadge } from "./CrmStatusBadge";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

// "آخر طلب" specifically — a missing value here means the customer has no
// order activity at all, which reads better than a bare dash.
function formatLastOrder(value?: string | null) {
  return value ? formatDate(value) : "لا يوجد نشاط";
}

function formatMoney(value?: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("ar-PS", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(value);
}

function formatCount(value?: number | null) {
  return value != null ? value.toLocaleString("ar") : "—";
}

function sourceLabel(source?: CrmCustomer["source"]) {
  if (!source) return "—";
  return CRM_CUSTOMER_SOURCE_LABELS[source] || source;
}

const COLUMNS = ["العميل", "الهاتف", "المصدر", "التصنيف", "الطلبات", "إجمالي المشتريات", "آخر طلب", "الحالة", ""];

export function CrmTable({
  items,
  onQuickView,
  onEdit,
}: {
  items: CrmCustomer[];
  onQuickView: (customer: CrmCustomer) => void;
  onEdit?: (customer: CrmCustomer) => void;
}) {
  return (
    <div>
      <div className="crmx-scrollbar hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] border-collapse text-right">
          <thead>
            <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
              {COLUMNS.map((c) => (
                <th key={c} className="whitespace-nowrap px-4 py-3.5 text-[13px] font-bold text-[var(--crmx-text-secondary)]">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <CrmTableRow key={c.id} customer={c} onQuickView={onQuickView} onEdit={onEdit} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-[var(--crmx-border)] md:hidden">
        {items.map((c) => (
          <CrmCustomerCard key={c.id} customer={c} onQuickView={onQuickView} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}

function CrmTableRow({ customer: c, onQuickView, onEdit }: { customer: CrmCustomer; onQuickView: (customer: CrmCustomer) => void; onEdit?: (customer: CrmCustomer) => void }) {
  return (
    <tr className="crmx-table-row border-b border-[var(--crmx-border)] transition-colors last:border-0">
      <td className="px-4 py-3.5">
        <Link to={`/admin/crm/customers/${c.id}`} className="group flex items-center gap-3">
          <CrmAvatar name={c.name} />
          <div className="min-w-0">
            <p className="max-w-[180px] truncate text-[14px] font-bold text-[var(--crmx-text)] transition-colors group-hover:text-[var(--crmx-navy)]">
              {c.name}
              {c.title && <span className="font-normal text-[var(--crmx-text-muted)]"> · {c.title}</span>}
            </p>
            <p className="text-[12px] text-[var(--crmx-text-muted)]">{c.code || `#${c.id}`}</p>
          </div>
        </Link>
      </td>
      <td className="px-4 py-4 text-[14px] text-[var(--crmx-text-secondary)]" dir="ltr">
        {c.primary_phone || c.mobile || c.phone || "—"}
      </td>
      <td className="px-4 py-4 text-[14px] text-[var(--crmx-text-secondary)]">{sourceLabel(c.source)}</td>
      <td className="px-4 py-4 text-[14px] text-[var(--crmx-text-secondary)]">{categoryLabel(c.category)}</td>
      <td className="px-4 py-4 text-[14px] font-semibold text-[var(--crmx-text)]">{formatCount(c.orders_count)}</td>
      <td className="px-4 py-4 text-[14px] font-bold text-[var(--crmx-text)]">{formatMoney(c.total_purchases)}</td>
      <td className="px-4 py-4 text-[14px] text-[var(--crmx-text-secondary)]">{formatLastOrder(c.last_order_at)}</td>
      <td className="px-4 py-3.5"><CrmStatusBadge value={c.status} /></td>
      <td className="px-4 py-3.5"><CrmRowActions customer={c} onQuickView={onQuickView} onEdit={onEdit} /></td>
    </tr>
  );
}

function CrmCustomerCard({ customer: c, onQuickView, onEdit }: { customer: CrmCustomer; onQuickView: (customer: CrmCustomer) => void; onEdit?: (customer: CrmCustomer) => void }) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/admin/crm/customers/${c.id}`} className="flex min-w-0 items-center gap-3">
          <CrmAvatar name={c.name} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-[var(--crmx-text)]">
              {c.name}
              {c.title && <span className="font-normal text-[var(--crmx-text-muted)]"> · {c.title}</span>}
            </p>
            <p className="text-[12px] text-[var(--crmx-text-muted)]">{c.code || `#${c.id}`}</p>
          </div>
        </Link>
        <CrmRowActions customer={c} onQuickView={onQuickView} onEdit={onEdit} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-[12px]">
        <span className="text-[var(--crmx-text-secondary)]" dir="ltr">{c.primary_phone || c.mobile || c.phone || "—"}</span>
        <span className="text-left text-[var(--crmx-text-secondary)]">{sourceLabel(c.source)}</span>
        <span className="text-[var(--crmx-text-secondary)]">طلبات: {formatCount(c.orders_count)}</span>
        <span className="text-left font-semibold text-[var(--crmx-text)]">{formatMoney(c.total_purchases)}</span>
        <span className="text-[var(--crmx-text-secondary)]">آخر طلب: {formatLastOrder(c.last_order_at)}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CrmStatusBadge value={c.status} />
        {c.category && <CrmStatusBadge value={c.category} />}
      </div>
    </div>
  );
}

function CrmRowActions({ customer: c, onQuickView, onEdit }: { customer: CrmCustomer; onQuickView: (customer: CrmCustomer) => void; onEdit?: (customer: CrmCustomer) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const phone = c.primary_phone || c.mobile || c.phone;

  return (
    <div className="flex items-center gap-1" ref={ref}>
      {phone && (
        <a
          title="اتصال"
          href={`tel:${phone}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-primary-soft)] hover:text-[var(--crmx-primary-text)]"
        >
          <Phone className="h-4 w-4" />
        </a>
      )}
      <button
        title="نظرة سريعة"
        onClick={() => onQuickView(c)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)]"
      >
        <ScanEye className="h-4 w-4" />
      </button>
      {onEdit && (
        <button
          title="تعديل"
          onClick={() => onEdit(c)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)]"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      <div className="relative">
        <button
          title="المزيد"
          onClick={() => setOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)]"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {open && (
          <div className="absolute start-0 top-9 z-10 w-48 rounded-xl border border-[var(--crmx-border)] bg-white py-1.5 shadow-lg">
            <Link
              to={`/admin/crm/customers/${c.id}`}
              className="flex items-center gap-2 px-3.5 py-2 text-[13px] text-[var(--crmx-text)] hover:bg-[var(--crmx-neutral-soft)]"
            >
              <Eye className="h-3.5 w-3.5" /> عرض الملف
            </Link>
            {phone && (
              <button
                onClick={() => { navigator.clipboard?.writeText(String(phone)); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] text-[var(--crmx-text)] hover:bg-[var(--crmx-neutral-soft)]"
              >
                <Copy className="h-3.5 w-3.5" /> نسخ رقم الهاتف
              </button>
            )}
            {c.code && (
              <button
                onClick={() => { navigator.clipboard?.writeText(String(c.code)); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] text-[var(--crmx-text)] hover:bg-[var(--crmx-neutral-soft)]"
              >
                <Copy className="h-3.5 w-3.5" /> نسخ كود العميل
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
