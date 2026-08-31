import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { date as formatDate, money as formatMoney, num } from "../format";
import { crmApi } from "../api";
import type { CrmCustomer, CrmId } from "../types";

/** Loose row shape — the orders endpoint returns denormalised order records. */
type Row = Record<string, unknown>;
import { engagementLabel } from "./engagementOptions";
import { CRM_CUSTOMER_SOURCE_LABELS, CRM_GENDER_LABELS } from "./sourceOptions";
import { CrmAvatar } from "./CrmAvatar";
import { CrmStatusBadge } from "./CrmStatusBadge";

type Fact = { label: string; value: string; ltr?: boolean; strong?: boolean };

// A borderless label/value row — the section header + a single top divider
// between sections carries the grouping, so individual facts don't each
// need their own box (fewer borders, calmer reading rhythm).
function FactRow({ label, value, ltr, strong }: Fact) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
      <dt className="shrink-0 text-[var(--crmx-text-secondary)]">{label}</dt>
      <dd
        className={`truncate text-left ${strong ? "font-bold" : "font-semibold"} text-[var(--crmx-text)]`}
        dir={ltr ? "ltr" : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-[var(--crmx-border)] py-4 first:border-t-0 first:pt-0">
      <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--crmx-text-muted)]">{title}</h3>
      <dl>{children}</dl>
    </section>
  );
}

/**
 * Quick view for a customer row.
 *
 * Deliberately NOT the Call Center's CustomerProfileDrawer, despite that
 * component being richer: it reads /call-center/* endpoints, whose route group
 * is gated on role_or_permission:call-center|super-admin|accountant|
 * branch-manager|… — a crm-manager, the primary user of this screen, gets 403
 * on every one of them (verified: full-profile, favorites, occasions all 403
 * while /crm/customers/1 returns 200). Wiring it here would open an empty
 * drawer for exactly the people who need it.
 *
 * So the richer content is reproduced from /crm/* endpoints instead, reusing
 * the same chart components the Overview and Financial tabs already render.
 * The Call Center drawer is left untouched.
 */
export function CrmQuickViewDrawer({ customer, onClose }: { customer: CrmCustomer | null; onClose: () => void }) {
  if (!customer) return null;

  const phone = customer.primary_phone || customer.mobile || customer.phone;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="نظرة سريعة على العميل">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/40" onClick={onClose} />
      <div dir="rtl" className="crmx-drawer-panel relative flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
          <h2 className="text-[16px] font-bold text-[var(--crmx-text)]">نظرة سريعة</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex items-center gap-3">
            <CrmAvatar name={customer.name} size={52} />
            <div className="min-w-0">
              <p className="truncate text-[16px] font-bold text-[var(--crmx-text)]">
                {customer.name}
                {customer.title && <span className="font-normal text-[var(--crmx-text-muted)]"> · {customer.title}</span>}
              </p>
              <p className="text-[12px] text-[var(--crmx-text-muted)]">{customer.code || `#${customer.id}`}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <CrmStatusBadge value={customer.status} />
            {customer.engagement_status && <span className="text-[12px] text-[var(--crmx-text-secondary)]">{engagementLabel(customer.engagement_status)}</span>}
          </div>

          <div className="mt-2">
            <Section title="التواصل">
              <FactRow label="الهاتف" value={String(phone || "غير مسجل")} ltr={Boolean(phone)} />
              <FactRow label="البريد الإلكتروني" value={customer.email || "غير مسجل"} ltr={Boolean(customer.email)} />
            </Section>

            <Section title="بيانات العميل">
              <FactRow label="الكنية" value={customer.title || "غير متوفر"} />
              <FactRow label="الجنس" value={customer.gender ? CRM_GENDER_LABELS[customer.gender] : "غير محدد"} />
              <FactRow label="مصدر العميل" value={customer.source ? CRM_CUSTOMER_SOURCE_LABELS[customer.source] : "غير محدد"} />
              <FactRow label="الفرع" value={customer.branch?.name || "غير محدد"} />
            </Section>

            <Section title="النشاط">
              <FactRow label="عدد الطلبات" value={num(customer.orders_count)} />
              <FactRow label="إجمالي المشتريات" value={formatMoney(customer.total_purchases)} strong />
              <FactRow label="آخر طلب" value={customer.last_order_at ? formatDate(customer.last_order_at) : "لا يوجد نشاط"} />
              <FactRow label="نقاط الولاء" value={num(customer.loyalty_points)} />
              <FactRow label="تاريخ التسجيل" value={formatDate(customer.created_at)} />
            </Section>

            {customer.balance != null && (
              <Section title="الماليات">
                <FactRow label="الرصيد" value={formatMoney(customer.balance)} strong />
              </Section>
            )}

            <RecentOrders customerId={customer.id} />
          </div>
        </div>

        <footer className="border-t border-[var(--crmx-border)] px-5 py-4">
          <Link
            to={`/admin/crm/customers/${customer.id}`}
            className="flex h-11 items-center justify-center rounded-xl bg-[var(--crmx-primary)] text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]"
          >
            عرض الملف الكامل
          </Link>
        </footer>
      </div>
    </div>
  );
}

/**
 * The last few orders, from /crm/customers/{id}/orders — the same endpoint the
 * Orders tab uses, so no new backend surface and no call-center dependency.
 *
 * Failure is silent: a quick view that cannot fetch orders should still show
 * the identity facts it already has, not turn into an error panel.
 */
function RecentOrders({ customerId }: { customerId: CrmId }) {
  const [rows, setRows] = useState<Row[]>();

  useEffect(() => {
    let cancelled = false;
    crmApi
      .section<unknown>(customerId, "orders")
      .then((d) => {
        if (cancelled) return;
        const value = d as { data?: unknown } | unknown[];
        const items = Array.isArray(value) ? value : ((value as { data?: unknown[] })?.data ?? []);
        setRows((items as Row[]).slice(0, 3));
      })
      .catch(() => !cancelled && setRows([]));
    return () => { cancelled = true; };
  }, [customerId]);

  if (!rows?.length) return null;

  return (
    <Section title="آخر الطلبات">
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={String(r.id ?? i)} className="flex items-center justify-between gap-2 text-[12.5px]">
            <span className="min-w-0 truncate text-[var(--crmx-text-secondary)]">
              {String(r.order_number ?? r.number ?? `#${r.id}`)}
              <span className="text-[var(--crmx-text-muted)]"> · {formatDate(String(r.created_at ?? ""))}</span>
            </span>
            <span className="shrink-0 font-bold text-[var(--crmx-text)]">{formatMoney(Number(r.total ?? 0))}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
