import { describe, expect, it } from "vitest";
import {
  buildSlotCells, detectReleased, parseSlotJump, isCellDimmed, countByFilter, formatWait, formatCountdown,
  occupiedStateOf, type ReleasingSlot,
} from "./slotBoardView";
import type { ActiveCallCenterOrder, SlotBoard } from "./services/callCenterService";

const NOW = new Date("2027-02-09T12:00:00Z").getTime();
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();
const minutesAhead = (m: number) => new Date(NOW + m * 60_000).toISOString();

const order = (id: number, overrides: Partial<ActiveCallCenterOrder> = {}): ActiveCallCenterOrder => ({
  id, order_number: `ORD-20270209-000${id}`, status: "pending", order_type: "takeaway", customer_id: null,
  customer_name: `عميل ${id}`, customer_phone: `05000000${id}`, total: 50, branch: { id: 1, name: "الرئيسي" },
  created_at: minutesAgo(1), scopes: ["operational_active", "awaiting_payment"],
  payment_state: "unpaid", execution_status: "pending", ready_to_close: false, ...overrides,
});
const readyOrder = (id: number, overrides: Partial<ActiveCallCenterOrder> = {}) =>
  order(id, { payment_state: "paid", execution_status: "executed", ready_to_close: true, ...overrides });
const scheduledOrder = (id: number, overrides: Partial<ActiveCallCenterOrder> = {}) =>
  order(id, { payment_state: "paid", execution_status: "scheduled", scheduled_at: minutesAhead(30), ...overrides });

const board = (overrides: Partial<SlotBoard> = {}): SlotBoard => ({
  branch_id: 1, capacity: 5, occupied: 0, slots: [], cooling: [], queue: [], ...overrides,
});

const slot = (n: number, o: ActiveCallCenterOrder) => ({ slot_number: n, assigned_at: o.created_at, order: o });

describe("occupiedStateOf", () => {
  it("جاهز للإغلاق يغلب المجدول، والمجدول يغلب المفتوح", () => {
    expect(occupiedStateOf(order(1))).toBe("open");
    expect(occupiedStateOf(scheduledOrder(2))).toBe("scheduled");
    expect(occupiedStateOf(readyOrder(3))).toBe("ready");
    expect(occupiedStateOf(readyOrder(4, { execution_status: "scheduled" }))).toBe("ready");
  });
});

describe("buildSlotCells", () => {
  it("بيرسم كل الخانات من 1 لحد السعة، الفاضية بحالة empty", () => {
    const cells = buildSlotCells(board({ capacity: 3 }), new Map(), NOW);
    expect(cells.map(c => [c.slotNumber, c.state])).toEqual([[1, "empty"], [2, "empty"], [3, "empty"]]);
  });

  it("بيميّز مفتوح/مجدول/جاهز للإغلاق ويعكس الدفع والتنفيذ كخصائص مستقلة", () => {
    const cells = buildSlotCells(board({ slots: [slot(1, order(1)), slot(2, scheduledOrder(2)), slot(3, readyOrder(3))] }), new Map(), NOW);

    expect(cells[0]).toMatchObject({ state: "open", paid: false, executed: false });
    expect(cells[1]).toMatchObject({ state: "scheduled", paid: true, executed: false });
    expect(cells[2]).toMatchObject({ state: "ready", paid: true, executed: true });
  });

  it("متأخر تحذير إضافي بس للمفتوح — مش للمجدول ولا للجاهز للإغلاق", () => {
    const cells = buildSlotCells(board({
      slots: [
        slot(1, order(1, { created_at: minutesAgo(45) })),
        slot(2, scheduledOrder(2, { created_at: minutesAgo(45) })),
        slot(3, readyOrder(3, { created_at: minutesAgo(45) })),
      ],
    }), new Map(), NOW);
    expect(cells.slice(0, 3).map(c => c.delayed)).toEqual([true, false, false]);
  });

  it("خانة فوق السعة (بعد تصغيرها) بتضل ظاهرة ومعلّمة overCapacity", () => {
    const cells = buildSlotCells(board({ capacity: 2, slots: [slot(4, order(1))] }), new Map(), NOW);
    expect(cells).toHaveLength(4);
    expect(cells[3]).toMatchObject({ slotNumber: 4, overCapacity: true, state: "open" });
    expect(cells[2]).toMatchObject({ slotNumber: 3, state: "empty" });
  });

  it("خانة بفترة الانتظار بتظهر cooling، والمحرَّرة للتو بتظهر بحالة تلاشي حسب السبب", () => {
    const releasing = new Map<number, ReleasingSlot>([
      [1, { reason: "closed", order: readyOrder(1) }],
      [2, { reason: "cancelled", order: order(2) }],
    ]);
    const cells = buildSlotCells(board({ capacity: 3, cooling: [{ slot_number: 3, reason: "closed", released_at: minutesAgo(0) }] }), releasing, NOW);
    expect(cells.map(c => c.state)).toEqual(["released_closed", "released_cancelled", "cooling"]);
  });

  it("خانة مشغولة بتغلب حالة التلاشي لو انعطت لطلب جديد", () => {
    const releasing = new Map<number, ReleasingSlot>([[1, { reason: "closed", order: order(9) }]]);
    const cells = buildSlotCells(board({ slots: [slot(1, order(1))] }), releasing, NOW);
    expect(cells[0]).toMatchObject({ state: "open" });
    expect(cells[0].order?.id).toBe(1);
  });
});

describe("detectReleased", () => {
  it("بيلقط الخانة اللي فرغت بين جلبين وبياخد السبب من cooling", () => {
    const prev = board({ slots: [slot(1, order(1)), slot(2, order(2))] });
    const next = board({ slots: [slot(1, order(1))], cooling: [{ slot_number: 2, reason: "cancelled", released_at: minutesAgo(0) }] });
    const released = detectReleased(prev, next);
    expect([...released.keys()]).toEqual([2]);
    expect(released.get(2)).toMatchObject({ reason: "cancelled" });
  });

  it("بدون سبب معروف بيعتبرها إغلاق", () => {
    const released = detectReleased(board({ slots: [slot(1, order(1))] }), board());
    expect(released.get(1)).toMatchObject({ reason: "closed" });
  });

  it("ما بيلقط شي بأول جلب أو لما يتغير الفرع", () => {
    expect(detectReleased(null, board({ slots: [slot(1, order(1))] })).size).toBe(0);
    expect(detectReleased(board({ branch_id: 1, slots: [slot(1, order(1))] }), board({ branch_id: 2 })).size).toBe(0);
  });

  it("خانة انعطت لطلب مختلف بنفس الرقم بتنحسب محرَّرة", () => {
    const released = detectReleased(board({ slots: [slot(1, order(1))] }), board({ slots: [slot(1, order(7))] }));
    expect(released.has(1)).toBe(true);
  });
});

describe("parseSlotJump", () => {
  it("رقم ضمن النطاق = قفز، وأي شي غيره = بحث نصي", () => {
    expect(parseSlotJump("37", 200)).toBe(37);
    expect(parseSlotJump(" 5 ", 200)).toBe(5);
    expect(parseSlotJump("0", 200)).toBeNull();
    expect(parseSlotJump("201", 200)).toBeNull();
    expect(parseSlotJump("0599123456", 200)).toBeNull();
    expect(parseSlotJump("أحمد", 200)).toBeNull();
  });
});

describe("isCellDimmed — الفلترة والبحث بيبهّتوا ولا بيخفوا", () => {
  const cells = buildSlotCells(board({ capacity: 4, slots: [slot(1, order(1)), slot(2, readyOrder(2)), slot(3, scheduledOrder(3))] }), new Map(), NOW);
  const base = { query: "", filter: "all" as const, jumpTo: null, now: NOW };

  it("بدون بحث أو فلتر ما بهتان أي خانة", () => {
    expect(cells.some(c => isCellDimmed(c, base))).toBe(false);
  });

  it("فلتر جاهز للإغلاق بيبهّت الباقي والفاضي وبيبقي الجاهز", () => {
    expect(cells.map(c => isCellDimmed(c, { ...base, filter: "ready" }))).toEqual([true, false, true, true]);
  });

  it("فلتر غير مدفوع بيبقي المفتوح بس", () => {
    expect(cells.map(c => isCellDimmed(c, { ...base, filter: "unpaid" }))).toEqual([false, true, true, true]);
  });

  it("البحث بالاسم بيبهّت غير المطابق", () => {
    expect(cells.map(c => isCellDimmed(c, { ...base, query: "عميل 2" }))).toEqual([true, false, true, true]);
  });

  it("القفز لخانة بيبقيها واضحة حتى لو فاضية", () => {
    expect(cells.map(c => isCellDimmed(c, { ...base, query: "4", jumpTo: 4 }))).toEqual([true, true, true, false]);
  });
});

describe("countByFilter / formatWait / formatCountdown", () => {
  it("بيعد المشغولة فقط حسب كل فلتر", () => {
    const cells = buildSlotCells(board({
      capacity: 5,
      slots: [
        slot(1, order(1)), slot(2, order(2, { created_at: minutesAgo(50) })),
        slot(3, scheduledOrder(3)), slot(4, readyOrder(4)),
      ],
    }), new Map(), NOW);
    expect(countByFilter(cells, NOW)).toEqual({ all: 4, unpaid: 2, scheduled: 1, ready: 1, delayed: 1 });
  });

  it("بيصيغ الانتظار بشكل مختصر", () => {
    expect(formatWait(minutesAgo(0), NOW)).toBe("الآن");
    expect(formatWait(minutesAgo(12), NOW)).toBe("12 د");
    expect(formatWait(minutesAgo(65), NOW)).toBe("1 س 5 د");
  });

  it("بيصيغ العدّاد التنازلي للجدولة", () => {
    expect(formatCountdown(minutesAhead(12), NOW)).toBe("بعد 12 د");
    expect(formatCountdown(minutesAhead(65), NOW)).toBe("بعد 1 س 5 د");
    expect(formatCountdown(minutesAgo(1), NOW)).toBe("حان موعده");
    expect(formatCountdown(new Date(NOW + 20_000).toISOString(), NOW)).toBe("بعد 1 د");
  });
});
