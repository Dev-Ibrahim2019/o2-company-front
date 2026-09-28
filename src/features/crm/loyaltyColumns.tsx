import { Link } from "react-router-dom";
import type { CrmColumn } from "./customers-ui";
import { date as fmtDate, num } from "./format";
import { TXN_STATUS_LABELS, TXN_TYPE_LABELS, TXN_TYPE_TONE } from "./loyaltyLabels";
import type { CrmLoyaltyTransaction } from "./types";

const pill = "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap";

/**
 * Loyalty ledger columns for the table/cards view — shared by the CRM-wide
 * ledger (LoyaltyPage, with the owner column) and a single customer's or
 * group's ledger (LoyaltyPanel, where the owner is the page itself).
 */
export function loyaltyTxnColumns({ withOwner }: { withOwner: boolean }): CrmColumn<CrmLoyaltyTransaction>[] {
  const owner: CrmColumn<CrmLoyaltyTransaction> = {
    key: "owner",
    label: "المالك",
    card: "title",
    cellClassName: "text-[13px]",
    render: (t) => (
      <>
        <Link
          to={t.owner_type === "customer" ? `/admin/crm/customers/${t.owner_id}/loyalty` : `/admin/crm/groups/${t.owner_id}`}
          className="font-semibold text-[var(--crmx-primary)] hover:underline"
        >
          {t.owner_name ?? `#${t.owner_id}`}
        </Link>
        <span className="ms-1.5 text-[11.5px] font-normal text-[var(--crmx-text-muted)]">
          {t.owner_type === "customer" ? "عميل" : "مجموعة"}
        </span>
      </>
    ),
  };

  const points: CrmColumn<CrmLoyaltyTransaction> = {
    key: "points",
    label: "النقاط",
    // Without an owner the points ARE the headline of the card.
    card: withOwner ? "field" : "title",
    render: (t) => {
      const positive = Number(t.points) >= 0;
      return (
        <span className={`text-[13px] font-bold ${positive ? "text-[var(--crmx-success-text)]" : "text-[var(--crmx-danger-text)]"}`} dir="ltr">
          {positive ? "+" : ""}{num(Number(t.points))}
        </span>
      );
    },
  };

  return [
    ...(withOwner ? [owner] : []),
    { key: "type", label: "النوع", card: "badge", render: (t) => <span className={`${pill} ${TXN_TYPE_TONE[t.type]}`}>{TXN_TYPE_LABELS[t.type]}</span> },
    points,
    { key: "status", label: "الحالة", cellClassName: "text-[12.5px] text-[var(--crmx-text-secondary)]", render: (t) => TXN_STATUS_LABELS[t.status] },
    { key: "order", label: "الطلب", cellClassName: "text-[13px] text-[var(--crmx-text-secondary)]", render: (t) => <span dir="ltr">{t.order?.order_number ?? "—"}</span> },
    {
      key: "notes",
      label: "ملاحظات",
      card: "wide",
      wrap: true,
      cellClassName: "max-w-[220px] text-[13px] text-[var(--crmx-text-secondary)]",
      render: (t) => <span className="line-clamp-2" title={t.notes ?? undefined}>{t.notes ?? "—"}</span>,
    },
    { key: "created_at", label: "التاريخ", card: withOwner ? "field" : "subtitle", cellClassName: "text-[12.5px] text-[var(--crmx-text-muted)]", render: (t) => fmtDate(t.created_at) },
  ];
}
