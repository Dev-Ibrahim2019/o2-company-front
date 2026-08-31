import { dateTime } from "../format";
import type { CrmActivityEvent } from "../types";

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
            {ev.user?.name || "النظام"} · {dateTime(ev.timestamp)}
          </p>
        </li>
      ))}
    </ul>
  );
}
