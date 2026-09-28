import { Star } from "lucide-react";
import { CrmStatusBadge, CrmYesNoBadge, type CrmColumn } from "../customers-ui";
import { CRM_ORDER_SOURCE_LABELS } from "../customers-ui/sourceOptions";
import { date, money, text, type Row } from "./shared";

/**
 * Five-star rating, matching the mockup's "التقييم" column.
 *
 * The value is the mean of order_feedback's three 1–5 scores, so it is
 * fractional (4.3, not 4) — rendered by filling round(value) stars rather
 * than inventing half-star glyphs the design doesn't use. The exact number
 * stays available in the title attribute.
 */
function Rating({ value }: { value?: number | null }) {
  if (value == null) return <span className="text-[13px] text-[var(--crmx-text-muted)]">—</span>;
  const filled = Math.round(value);
  return (
    <span className="flex items-center gap-0.5" title={`${value} / 5`} dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= filled ? "fill-[var(--crmx-gold)] text-[var(--crmx-gold)]" : "text-[var(--crmx-border)]"
          }`}
        />
      ))}
    </span>
  );
}

// One column set for both the table and the cards (CrmDataView). Exported:
// Overview's "آخر 5 طلبات" shows the same columns minus rating/complaint.
export const customerOrderColumns: CrmColumn<Row>[] = [
  {
    key: "number",
    label: "رقم الطلب",
    card: "title",
    cellClassName: "font-semibold",
    render: (r) => <span dir="ltr">{text(r.number ?? r.order_number ?? r.code)}</span>,
  },
  { key: "created_at", label: "تاريخ الطلب", card: "subtitle", cellClassName: "text-[var(--crmx-text-secondary)]", render: (r) => date(r.created_at) },
  { key: "status", label: "الحالة", card: "badge", render: (r) => <CrmStatusBadge value={String(r.status ?? "")} /> },
  {
    key: "branch",
    label: "الفرع / المصدر",
    card: "wide",
    cellClassName: "text-[13px] text-[var(--crmx-text-secondary)]",
    render: (r) => {
      const branchName = text(r.branch_name ?? (r.branch as { name?: unknown })?.name);
      const source = r.source ? CRM_ORDER_SOURCE_LABELS[String(r.source)] || String(r.source) : null;
      return (
        <>
          {branchName}
          {source && <span className="text-[var(--crmx-text-muted)]"> · {source}</span>}
          {Boolean(r.is_other_branch_read_only) && (
            <span
              className="ms-1.5 inline-flex items-center rounded-full bg-[var(--crmx-warning-soft)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--crmx-warning-text)]"
              title="طلب من فرع آخر — عرض فقط، لا يمكن تعديله"
            >
              فرع آخر · قراءة فقط
            </span>
          )}
        </>
      );
    },
  },
  { key: "total", label: "الإجمالي", cellClassName: "font-bold", render: (r) => money(r.total) },
  { key: "rating", label: "التقييم", render: (r) => <Rating value={r.rating as number | null | undefined} /> },
  { key: "has_complaint", label: "وجود مشكلة", render: (r) => <CrmYesNoBadge value={Boolean(r.has_complaint)} /> },
];
