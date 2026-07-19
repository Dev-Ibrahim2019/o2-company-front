import type { CustomerOccasion } from "../services/callCenterService";

export const OCCASION_TYPE_LABELS: Record<string, string> = {
  birthday: "عيد ميلاد",
  anniversary: "ذكرى زواج",
  wedding_anniversary: "ذكرى الزواج",
  child_birthday: "ميلاد ابن/ابنة",
  company_founding: "تأسيس شركة",
  special: "مناسبة خاصة",
  reminder: "تذكير",
};

export interface UpcomingOccasion {
  occasion: CustomerOccasion;
  daysUntil: number;
}

export function getUpcomingOccasions(
  occasions: CustomerOccasion[],
  withinDays = 30,
): UpcomingOccasion[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return occasions
    .map((occasion) => {
      const baseDate = new Date(occasion.date);
      if (Number.isNaN(baseDate.getTime())) return null;

      const target = new Date(baseDate);
      if (occasion.repeats_annually) {
        target.setFullYear(today.getFullYear());
        if (target < today) target.setFullYear(today.getFullYear() + 1);
      } else if (target < today) {
        return null;
      }

      const daysUntil = Math.ceil((target.getTime() - today.getTime()) / 86400000);
      if (daysUntil < 0 || daysUntil > withinDays) return null;
      return { occasion, daysUntil };
    })
    .filter((item): item is UpcomingOccasion => item !== null)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function formatOccasionReminder({ occasion, daysUntil }: UpcomingOccasion): string {
  const label = OCCASION_TYPE_LABELS[occasion.occasion_type] || occasion.title || "مناسبة";
  const when =
    daysUntil === 0 ? "اليوم" : daysUntil === 1 ? "غداً" : `بعد ${daysUntil} أيام`;

  if (occasion.occasion_type === "birthday" || occasion.occasion_type === "child_birthday") {
    return `تذكير: ${label} ${when} — ممكن تقترح كيكة أو عرض خاص`;
  }

  return `تذكير: ${label} ${when}${occasion.notes ? ` — ${occasion.notes}` : ""}`;
}

export function buildCallCenterOrderMeta(
  isCallCenterMode: boolean,
  agentUserId?: number | string | null,
): { source?: "call_center"; call_center_agent_id?: number } {
  if (!isCallCenterMode) return { source: "pos" };

  const agentId = agentUserId ? Number(agentUserId) : undefined;
  return {
    source: "call_center",
    ...(agentId ? { call_center_agent_id: agentId } : {}),
  };
}
