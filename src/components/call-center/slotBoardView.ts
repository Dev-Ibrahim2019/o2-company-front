// لوحة الخانات — دوال صافية (بدون React) لبناء خلايا اللوحة من استجابة الباك اند، ومختبرة بمعزل عن الواجهة.
//
// الفكرة: الخانات بالباك اند بتتخزّن "المشغولة بس"، والواجهة بترسم 1..السعة بنفسها. طلب ما بيتحرك
// من خانته طول عمره (من الإنشاء لحد الإغلاق أو الإلغاء)، فالترتيب هون ثابت بالرقم.
//
// حالة الخانة (لون): مفتوح = أخضر، مجدول = بنفسجي بعدّاد، جاهز للإغلاق (مدفوع + منفّذ) = أخضر بإطار لامع.
// الدفع والتنفيذ أيقونتين مستقلتين على الكارد (رمادي = لسا، ملوّن = تم)، و"متأخر" تحذير إضافي مش حالة.

import type { ActiveCallCenterOrder, SlotBoard, SlotReleaseReason } from "./services/callCenterService";
import { getOrderDelayReferenceTime, getOrderSlaLevel } from "./activeOrdersView";

export type SlotCellState = "empty" | "cooling" | "open" | "scheduled" | "ready" | "released_closed" | "released_cancelled";
export type SlotFilter = "all" | "unpaid" | "scheduled" | "ready" | "delayed";

export interface SlotCell {
  slotNumber: number;
  state: SlotCellState;
  order: ActiveCallCenterOrder | null;
  /** تحذير إضافي فوق لون الحالة: طلب مفتوح مستني أكتر من عتبة SLA (مش للمجدول ولا الجاهز للإغلاق) */
  delayed: boolean;
  paid: boolean;
  executed: boolean;
  /** فوق السعة الحالية (بعد تصغيرها) — بتضل ظاهرة لحد ما تفرغ وبعدها بتختفي */
  overCapacity: boolean;
}

/** خانة انحرّرت للتو وبنعرض تلاشيها/وميضها لثواني قبل ما تصير فاضية */
export interface ReleasingSlot { reason: SlotReleaseReason; order: ActiveCallCenterOrder }

/** مدة عرض تلاشي/وميض الخانة المحرَّرة (ms) — تتطابق مع animation-duration بـ index.css */
export const RELEASE_ANIMATION_MS = 4000;

export const SLOT_FILTER_LABELS: Record<SlotFilter, string> = {
  all: "الكل", unpaid: "غير مدفوع", scheduled: "مجدول", ready: "جاهز للإغلاق", delayed: "متأخر",
};

export function isOrderDelayed(order: ActiveCallCenterOrder, now: number = Date.now()): boolean {
  return getOrderSlaLevel(getOrderDelayReferenceTime(order), now) !== "normal";
}

/** لون/حالة الخانة المشغولة من محاور الطلب — مصدر واحد للـUI والفلاتر */
export function occupiedStateOf(order: ActiveCallCenterOrder): "open" | "scheduled" | "ready" {
  if (order.ready_to_close) return "ready";
  if (order.execution_status === "scheduled") return "scheduled";
  return "open";
}

export function buildSlotCells(
  board: SlotBoard,
  releasing: ReadonlyMap<number, ReleasingSlot> = new Map(),
  now: number = Date.now(),
): SlotCell[] {
  const occupied = new Map(board.slots.map(s => [s.slot_number, s.order]));
  const cooling = new Set(board.cooling.map(c => c.slot_number));

  let maxNumber = board.capacity;
  occupied.forEach((_, n) => { if (n > maxNumber) maxNumber = n; });
  releasing.forEach((_, n) => { if (n > maxNumber) maxNumber = n; });

  const cells: SlotCell[] = [];
  for (let n = 1; n <= maxNumber; n++) {
    const order = occupied.get(n) ?? null;
    const ghost = releasing.get(n);
    if (order) {
      const state = occupiedStateOf(order);
      cells.push({
        slotNumber: n, order, state, overCapacity: n > board.capacity,
        delayed: state === "open" && isOrderDelayed(order, now),
        paid: order.payment_state === "paid",
        executed: order.execution_status === "executed",
      });
    } else if (ghost) {
      cells.push({
        slotNumber: n, order: ghost.order, overCapacity: n > board.capacity, delayed: false, paid: true, executed: true,
        state: ghost.reason === "cancelled" ? "released_cancelled" : "released_closed",
      });
    } else {
      cells.push({
        slotNumber: n, order: null, overCapacity: false, delayed: false, paid: false, executed: false,
        state: cooling.has(n) ? "cooling" : "empty",
      });
    }
  }
  return cells;
}

/** الخانات اللي كانت مشغولة بالجلب السابق وصارت فاضية (أو لطلب تاني) — أساس تلاشي/وميض الإغلاق. */
export function detectReleased(prev: SlotBoard | null, next: SlotBoard): Map<number, ReleasingSlot> {
  const out = new Map<number, ReleasingSlot>();
  if (!prev || prev.branch_id !== next.branch_id) return out;

  const nowOccupiedBy = new Map(next.slots.map(s => [s.slot_number, s.order.id]));
  const reasons = new Map(next.cooling.map(c => [c.slot_number, c.reason]));
  prev.slots.forEach(s => {
    if (nowOccupiedBy.get(s.slot_number) === s.order.id) return;
    out.set(s.slot_number, { reason: reasons.get(s.slot_number) ?? "closed", order: s.order });
  });
  return out;
}

/** "37" → قفز لخانة 37. أرقام فقط وبحد أقصى 4 خانات؛ أي شي أطول (رقم هاتف مثلاً) بيعتبر بحث نصي. */
export function parseSlotJump(query: string, maxNumber: number): number | null {
  const q = query.trim();
  if (!/^\d{1,4}$/.test(q)) return null;
  const n = Number(q);
  return n >= 1 && n <= maxNumber ? n : null;
}

export function orderMatchesQuery(order: ActiveCallCenterOrder, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (order.customer_name || "").toLowerCase().includes(q)
    || order.order_number.toLowerCase().includes(q)
    || (order.customer_phone || "").includes(q);
}

export function orderMatchesFilter(order: ActiveCallCenterOrder, filter: SlotFilter, now: number = Date.now()): boolean {
  const state = occupiedStateOf(order);
  switch (filter) {
    case "unpaid": return order.payment_state !== "paid";
    case "scheduled": return state === "scheduled";
    case "ready": return state === "ready";
    case "delayed": return state === "open" && isOrderDelayed(order, now);
    default: return true;
  }
}

const isOccupied = (cell: SlotCell) => !!cell.order && (cell.state === "open" || cell.state === "scheduled" || cell.state === "ready");

/**
 * الفلترة والبحث بيبهّتوا الخانات ولا بيخفوها — عشان الأماكن ما تتخرب. الخانة بتنعرض عادي لو
 * (بحث فاضي أو طابقت) و(فلتر "الكل" أو طابقت)؛ الفاضية بتتبهّت لما في بحث أو فلتر فعّال.
 */
export function isCellDimmed(
  cell: SlotCell,
  opts: { query: string; filter: SlotFilter; jumpTo: number | null; now?: number },
): boolean {
  const hasQuery = opts.query.trim() !== "";
  const hasFilter = opts.filter !== "all";
  if (!hasQuery && !hasFilter) return false;
  if (hasQuery && cell.slotNumber === opts.jumpTo) return false; // هدف القفز يبقى واضح حتى لو فاضي
  if (!cell.order || !isOccupied(cell)) return true;

  if (hasQuery) {
    const matchesQuery = cell.slotNumber === opts.jumpTo || orderMatchesQuery(cell.order, opts.query);
    if (!matchesQuery) return true;
  }
  return hasFilter && !orderMatchesFilter(cell.order, opts.filter, opts.now);
}

export function countByFilter(cells: SlotCell[], now: number = Date.now()): Record<SlotFilter, number> {
  const occupied = cells.filter(isOccupied);
  const count = (filter: SlotFilter) => occupied.filter(c => orderMatchesFilter(c.order!, filter, now)).length;
  return { all: occupied.length, unpaid: count("unpaid"), scheduled: count("scheduled"), ready: count("ready"), delayed: count("delayed") };
}

/** مدة انتظار الطلب بصيغة مختصرة للخانة ("الآن" / "12 د" / "1 س 5 د"). */
export function formatWait(createdAt: string, now: number = Date.now()): string {
  return formatMinutes(Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60_000)), "الآن");
}

/** عدّاد تنازلي لموعد التنفيذ المجدول ("بعد 12 د" / "بعد 1 س 5 د" / "حان موعده"). */
export function formatCountdown(scheduledAt: string, now: number = Date.now()): string {
  const mins = Math.ceil((new Date(scheduledAt).getTime() - now) / 60_000);
  return mins <= 0 ? "حان موعده" : `بعد ${formatMinutes(mins, "أقل من دقيقة")}`;
}

function formatMinutes(mins: number, zero: string): string {
  if (mins < 1) return zero;
  if (mins < 60) return `${mins} د`;
  return `${Math.floor(mins / 60)} س ${mins % 60} د`;
}
