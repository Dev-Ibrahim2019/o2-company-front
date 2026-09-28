import { Copy, Eye, MoreVertical, Pencil, Phone, ScanEye, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { date as fmtDate, lastOrder as fmtLastOrder, num } from "../format";
import type { CrmCustomer, CrmNextOccasion } from "../types";
import type { CrmViewMode } from "./useCrmViewMode";
import { CrmAvatar } from "./CrmAvatar";
import { CrmStatusBadge, CrmYesNoBadge } from "./CrmStatusBadge";

// Column set taken from the approved mockup (screen 1 — إدارة جميع العملاء).
// The mockup labels the yes/no complaint column "إجمالي المشكلة"; that reads
// as a total, but the cell renders نعم/لا, so the label is corrected to
// "لديه مشكلة" here — the column itself is unchanged.
//
// Two columns the mockup does not show were dropped from this table rather
// than kept alongside it: "المصدر" and "إجمالي المشتريات". Neither is lost —
// both still appear in the quick-view drawer and in Customer 360.
//
// "الحالة" is likewise not a mockup column, but a blocked/inactive customer
// must stay visible to an operator scanning the list, so instead of a full
// column the status pill is rendered inside the name cell *only when it is
// not `active`* — normal rows look exactly like the mockup, exceptions still
// announce themselves.
const COLUMNS = [
  "الاسم",
  "الهاتف",
  "البريد الإلكتروني",
  "التصنيف",
  "مناسبة قادمة",
  "لديه مشكلة",
  "الطلبات",
  "آخر طلب",
  "",
];

function NextOccasionCell({ occasion }: { occasion?: CrmNextOccasion | null }) {
  if (!occasion) return <span className="text-[13px] text-[var(--crmx-text-muted)]">لا يوجد</span>;
  return (
    <div className="flex items-start gap-1.5">
      <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-[var(--crmx-gold)] text-[var(--crmx-gold)]" />
      <div className="min-w-0">
        <p className="truncate text-[13px] font-bold text-[var(--crmx-text)]">{occasion.label}</p>
        <p className="whitespace-nowrap text-[12px] text-[var(--crmx-text-muted)]">{fmtDate(occasion.date)}</p>
      </div>
    </div>
  );
}

function CustomerNameCell({ customer: c }: { customer: CrmCustomer }) {
  return (
    <Link to={`/admin/crm/customers/${c.id}`} className="group flex items-center gap-3">
      <CrmAvatar name={c.name} />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[14px] font-bold text-[var(--crmx-text)] transition-colors group-hover:text-[var(--crmx-primary)]">
          <span className="max-w-[170px] truncate sm:max-w-[240px]">{c.name}</span>
          {c.title && <span className="shrink-0 font-normal text-[var(--crmx-text-muted)]">· {c.title}</span>}
        </p>
        <p className="flex items-center gap-1.5 text-[12px] text-[var(--crmx-text-muted)]">
          <span>{c.code || `#${c.id}`}</span>
          {c.status && c.status !== "active" && <CrmStatusBadge value={c.status} />}
        </p>
      </div>
    </Link>
  );
}

export function CrmTable({
  items,
  mode,
  onQuickView,
  onEdit,
}: {
  items: CrmCustomer[];
  /** Chosen by the page's table/cards switch (useCrmViewMode). */
  mode: CrmViewMode;
  onQuickView: (customer: CrmCustomer) => void;
  onEdit?: (customer: CrmCustomer) => void;
}) {
  if (mode === "cards") {
    return (
      <ul className="grid gap-3 p-3 sm:grid-cols-2 2xl:grid-cols-3">
        {items.map((c) => (
          <li key={c.id} className="min-w-0 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]">
            <CrmCustomerCard customer={c} onQuickView={onQuickView} onEdit={onEdit} />
          </li>
        ))}
      </ul>
    );
  }

  // The table needs ~1040px; below that it scrolls inside this box, never the page.
  return (
    <div className="crmx-scrollbar overflow-x-auto">
      <table className="w-full min-w-[1040px] border-collapse text-right">
        <thead>
          <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
            {COLUMNS.map((c, i) => (
              <th key={c || `actions-${i}`} className="whitespace-nowrap px-4 py-3.5 text-[13px] font-bold text-[var(--crmx-text-secondary)]">{c}</th>
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
  );
}

function CrmTableRow({ customer: c, onQuickView, onEdit }: { customer: CrmCustomer; onQuickView: (customer: CrmCustomer) => void; onEdit?: (customer: CrmCustomer) => void }) {
  return (
    <tr className="crmx-table-row border-b border-[var(--crmx-border)] transition-colors last:border-0">
      <td className="px-4 py-3.5"><CustomerNameCell customer={c} /></td>
      <td className="px-4 py-4 text-[14px] text-[var(--crmx-text-secondary)]" dir="ltr">
        {c.primary_phone || c.mobile || c.phone || "—"}
      </td>
      <td className="max-w-[190px] px-4 py-4 text-[14px] text-[var(--crmx-text-secondary)]" dir="ltr">
        <span className="block truncate">{c.email || "—"}</span>
      </td>
      <td className="px-4 py-3.5"><CrmStatusBadge value={c.engagement_status} /></td>
      <td className="px-4 py-3"><NextOccasionCell occasion={c.next_occasion} /></td>
      <td className="px-4 py-3.5"><CrmYesNoBadge value={Boolean(c.open_complaints_count)} /></td>
      <td className="px-4 py-4 text-[14px] font-bold text-[var(--crmx-text)]">{num(c.orders_count)}</td>
      <td className="whitespace-nowrap px-4 py-4 text-[14px] text-[var(--crmx-text-secondary)]">{fmtLastOrder(c.last_order_at)}</td>
      <td className="px-4 py-3.5"><CrmRowActions customer={c} onQuickView={onQuickView} onEdit={onEdit} /></td>
    </tr>
  );
}

function CrmCustomerCard({ customer: c, onQuickView, onEdit }: { customer: CrmCustomer; onQuickView: (customer: CrmCustomer) => void; onEdit?: (customer: CrmCustomer) => void }) {
  return (
    <div className="flex h-full flex-col p-4">
      <CustomerNameCell customer={c} />
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12.5px]">
        <div className="min-w-0">
          <dt className="text-[11.5px] text-[var(--crmx-text-muted)]">الهاتف</dt>
          <dd className="text-[var(--crmx-text)]" dir="ltr">{c.primary_phone || c.mobile || c.phone || "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11.5px] text-[var(--crmx-text-muted)]">البريد</dt>
          <dd className="truncate text-[var(--crmx-text)]" dir="ltr">{c.email || "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11.5px] text-[var(--crmx-text-muted)]">الطلبات</dt>
          <dd className="font-bold text-[var(--crmx-text)]">{num(c.orders_count)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11.5px] text-[var(--crmx-text-muted)]">آخر طلب</dt>
          <dd className="text-[var(--crmx-text)]">{fmtLastOrder(c.last_order_at)}</dd>
        </div>
      </dl>
      {c.next_occasion && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-[var(--crmx-radius-control)] bg-[var(--crmx-warning-soft)] px-2.5 py-1.5">
          <Star className="h-3.5 w-3.5 shrink-0 fill-[var(--crmx-gold)] text-[var(--crmx-gold)]" />
          <span className="text-[12px] font-bold text-[var(--crmx-warning-text)]">{c.next_occasion.label}</span>
          <span className="text-[12px] text-[var(--crmx-warning-text)]/70">· {fmtDate(c.next_occasion.date)}</span>
        </div>
      )}
      {/* Status + actions share the footer. The actions used to sit beside
          the name, where four touch-sized buttons pushed the "⋮" menu past
          the card's edge on a phone. A bare نعم/لا pill (the table's
          "لديه مشكلة" column) means nothing without its header, so the card
          says it in words — and only when there is an open complaint. */}
      <div className="mt-auto pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--crmx-border)] pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {c.engagement_status && <CrmStatusBadge value={c.engagement_status} />}
          {Boolean(c.open_complaints_count) && (
            <span className="inline-flex items-center rounded-full bg-[var(--crmx-danger-soft)] px-2.5 py-1 text-[12px] font-bold text-[var(--crmx-danger-text)]">
              شكوى مفتوحة
            </span>
          )}
        </div>
        <CrmRowActions customer={c} onQuickView={onQuickView} onEdit={onEdit} />
      </div>
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
          className="flex h-10 w-10 items-center justify-center rounded-lg lg:h-8 lg:w-8 text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-primary-soft)] hover:text-[var(--crmx-primary-text)]"
        >
          <Phone className="h-4 w-4" />
        </a>
      )}
      <button
        title="نظرة سريعة"
        onClick={() => onQuickView(c)}
        className="flex h-10 w-10 items-center justify-center rounded-lg lg:h-8 lg:w-8 text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)]"
      >
        <ScanEye className="h-4 w-4" />
      </button>
      {onEdit && (
        <button
          title="تعديل"
          onClick={() => onEdit(c)}
          className="flex h-10 w-10 items-center justify-center rounded-lg lg:h-8 lg:w-8 text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)]"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      <div className="relative">
        <button
          title="المزيد"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg lg:h-8 lg:w-8 text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)]"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {open && (
          <div className="absolute end-0 top-full z-10 mt-1 w-48 rounded-xl border border-[var(--crmx-border)] bg-white py-1.5 shadow-lg">
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
