import type { CrmActivityEvent } from "../types";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Shared visual pattern with CrmOrderExpandedPanel's per-order timeline —
// a dotted vertical rail with one dot per event — reused here for the
// customer-level activity feed (GET /crm/customers/{id}/activity).
export function CrmActivityFeed({ events, emptyLabel = "لا يوجد نشاط مسجل لهذا العميل" }: { events: CrmActivityEvent[]; emptyLabel?: string }) {
  if (!events.length) {
    return <p className="py-6 text-center text-[13px] text-[var(--crmx-text-muted)]">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-4 border-s-2 border-[var(--crmx-border)] ps-4">
      {events.map((ev) => (
        <li key={ev.id} className="relative">
          <span className="absolute -start-[21px] top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--crmx-primary)]" />
          <p className="text-[13.5px] font-semibold text-[var(--crmx-text)]">{ev.label}</p>
          <p className="mt-0.5 text-[12px] text-[var(--crmx-text-muted)]">
            {ev.user?.name || "النظام"} · {formatDate(ev.timestamp)}
          </p>
        </li>
      ))}
    </ul>
  );
}
