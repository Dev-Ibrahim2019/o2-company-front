import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CalendarClock, Clock, CreditCard, Flame, Loader2, Printer, RefreshCw, Search, Settings2 } from "lucide-react";
import { colors, typography, radius, shadows, transitions } from "../design/tokens";
import { toast } from "../../shared/Toast";
import { useSlotBoard } from "../../../hooks/useSlotBoard";
import { formatShekel, getOrderReference } from "../activeOrdersView";
import {
  SLOT_FILTER_LABELS, buildSlotCells, countByFilter, formatCountdown, formatWait, isCellDimmed, parseSlotJump,
  type SlotCell, type SlotCellState, type SlotFilter,
} from "../slotBoardView";
import type { CardDensity } from "./OrderCard";
import { OrderDrawer } from "./OrderDrawer";

// ============================================================================
// SLOT BOARD — لوحة خانات الطلبات النشطة: كل طلب بانتظار الدفع بيمسك خانة برقم ثابت ما بتتحرك
// طول عمره، فالموظف بيحفظ مكان الطلب بدل ما يدوّر عليه كل ما تتحدث الشاشة. الفلترة والبحث بيبهّتوا
// الخانات ولا بيخفوها، ورقم بالبحث ("37") بيقفز للخانة.
// ============================================================================

const CELL_MIN_WIDTH: Record<CardDensity, number> = { compact: 64, normal: 132, large: 180 };
const CELL_HEIGHT: Record<CardDensity, number> = { compact: 56, normal: 96, large: 132 };
const FILTERS: SlotFilter[] = ["all", "unpaid", "scheduled", "ready", "delayed"];

// بنفسجي للمجدول: مافي token بنفسجي بالتصميم الحالي، فبنستخدم لون ثابت مقروء بالثيمين (نص/إطار) وخلفية شفافة
const SCHEDULED_COLOR = "#7c3aed";

interface StateStyle { background: string; border: string; number: string }
const STATE_STYLE: Record<SlotCellState, StateStyle> = {
  open: { background: colors.semantic.successBg, border: `1.5px solid ${colors.semantic.success}`, number: colors.semantic.success },
  scheduled: { background: "rgba(124, 58, 237, 0.10)", border: `1.5px solid ${SCHEDULED_COLOR}`, number: SCHEDULED_COLOR },
  // جاهز للإغلاق: أخضر أغمق بإطار لامع (class o2-slot-ready) عشان الموظف يعرف مين يسكّر
  ready: { background: colors.semantic.successBg, border: `2.5px solid ${colors.semantic.success}`, number: colors.semantic.success },
  released_closed: { background: colors.semantic.success, border: `1.5px solid ${colors.semantic.success}`, number: "#fff" },
  released_cancelled: { background: colors.semantic.error, border: `1.5px solid ${colors.semantic.error}`, number: "#fff" },
  cooling: { background: "transparent", border: `1.5px dashed ${colors.semantic.warningBorder}`, number: colors.neutral[400] },
  empty: { background: "transparent", border: `1.5px dashed ${colors.neutral[300]}`, number: colors.neutral[400] },
};

const STATE_LABEL: Record<SlotCellState, string> = {
  open: "مفتوح", scheduled: "مجدول", ready: "جاهز للإغلاق", released_closed: "أُغلق", released_cancelled: "ملغي",
  cooling: "فاضية مؤقتًا", empty: "فاضية",
};

const prefersReducedMotion = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

const SlotCellView = React.memo(function SlotCellView({ cell, density, dimmed, highlighted, selected, now, onOpenOrder }: {
  cell: SlotCell; density: CardDensity; dimmed: boolean; highlighted: boolean; selected: boolean; now: number;
  onOpenOrder: (orderId: number) => void;
}) {
  const style = STATE_STYLE[cell.state];
  const order = cell.order;
  const occupied = (cell.state === "open" || cell.state === "scheduled" || cell.state === "ready") && !!order;
  const classes = [
    "o2-slot",
    occupied && cell.delayed && "o2-slot-delayed",
    cell.state === "ready" && "o2-slot-ready",
    cell.state === "released_closed" && "o2-slot-released-closed",
    cell.state === "released_cancelled" && "o2-slot-released-cancelled",
    highlighted && "o2-slot-jump",
  ].filter(Boolean).join(" ");

  const boxStyle: React.CSSProperties = {
    width: "100%", height: CELL_HEIGHT[density], padding: density === "compact" ? "4px 6px" : "8px 10px",
    borderRadius: radius.lg, background: style.background, border: style.border, color: colors.neutral[800],
    display: "flex", flexDirection: "column", justifyContent: density === "compact" ? "center" : "flex-start",
    alignItems: density === "compact" ? "center" : "stretch", gap: 2, textAlign: "start", overflow: "hidden",
    opacity: dimmed ? 0.28 : 1, filter: dimmed ? "grayscale(0.5)" : "none",
    transition: `opacity ${transitions.normal}, box-shadow ${transitions.fast}`,
    fontFamily: "inherit", cursor: occupied ? "pointer" : "default",
    outline: selected ? `3px solid ${colors.neutral[900]}` : undefined, outlineOffset: selected ? 2 : undefined,
  };

  const numberEl = (
    <span style={{ fontSize: density === "compact" ? typography.size.lg : typography.size.xl, fontWeight: typography.weight.extrabold, color: style.number, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
      {cell.slotNumber}
    </span>
  );
  // الدفع (💳) والتنفيذ (🖨): رمادي = لسا، ملوّن = تم — مستقلين عن بعض ولون الخانة
  const iconsEl = occupied && (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <CreditCard size={13} color={cell.paid ? colors.semantic.success : colors.neutral[300]} aria-hidden />
      <Printer size={13} color={cell.executed ? colors.semantic.success : colors.neutral[300]} aria-hidden />
      {cell.state === "scheduled" && <CalendarClock size={13} color={SCHEDULED_COLOR} aria-hidden />}
      {cell.delayed && <Flame size={13} color={colors.semantic.error} aria-hidden />}
    </span>
  );

  const label = occupied && order
    ? `خانة ${cell.slotNumber}، طلب ${getOrderReference(order.order_number)}، ${order.customer_name || "بدون اسم"}، ${STATE_LABEL[cell.state]}، ${cell.paid ? "مدفوع" : "غير مدفوع"}، ${cell.executed ? "منفّذ" : "غير منفّذ"}${cell.delayed ? "، متأخر" : ""}${cell.state === "scheduled" && order.scheduled_at ? `، ${formatCountdown(order.scheduled_at, now)}` : `، انتظار ${formatWait(order.created_at, now)}`}`
    : `خانة ${cell.slotNumber}، ${STATE_LABEL[cell.state]}`;

  const body = density === "compact" || !order ? (
    <>{numberEl}{iconsEl}</>
  ) : (
    <>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>{numberEl}{iconsEl}</span>
      <span style={{ fontFamily: typography.fontFamily.mono, fontSize: "11px", color: colors.neutral[500] }}>{getOrderReference(order.order_number)}</span>
      <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {order.customer_name || "بدون اسم"}
      </span>
      {density === "large" && (
        <>
          <span dir="ltr" style={{ fontSize: "11px", color: colors.neutral[500], textAlign: "end" }}>{order.customer_phone}</span>
          <span style={{ fontSize: "11px", color: colors.neutral[600] }}>{formatShekel(order.total)}</span>
        </>
      )}
      {cell.state === "scheduled" && order.scheduled_at ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "11px", fontWeight: typography.weight.bold, color: SCHEDULED_COLOR, marginTop: "auto" }}>
          <CalendarClock size={11} aria-hidden /> {formatCountdown(order.scheduled_at, now)}
        </span>
      ) : (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "11px", color: cell.delayed ? colors.semantic.error : colors.neutral[500], marginTop: "auto" }}>
          <Clock size={11} aria-hidden /> {formatWait(order.created_at, now)}
        </span>
      )}
    </>
  );

  return (
    <li id={`o2-slot-${cell.slotNumber}`} style={{ listStyle: "none", minWidth: 0 }} aria-label={occupied ? undefined : label}>
      {occupied && order ? (
        <button type="button" className={classes} style={boxStyle} aria-label={label} onClick={() => onOpenOrder(order.id)}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = shadows.md; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; }}>
          {body}
        </button>
      ) : (
        <div className={classes} style={boxStyle} title={cell.overCapacity ? "فوق السعة الحالية — بتختفي لما تفرغ" : undefined}>{body}</div>
      )}
    </li>
  );
});

export const SlotBoard: React.FC<{
  branchId: number;
  density: CardDensity;
  /** مدير كول سنتر/فرع/سوبر أدمن — بس هدول بيغيّروا عدد الخانات */
  canManageCapacity: boolean;
}> = ({ branchId, density, canManageCapacity }) => {
  const { board, releasing, loading, error, refresh, setCapacity } = useSlotBoard(branchId);
  // الكرت بيفتح Drawer التفاصيل (مش صفحة كاملة) عشان الخانات تضل قدام الموظف
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const onOpenOrder = setSelectedOrderId;
  const [filter, setFilter] = useState<SlotFilter>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [capacityOpen, setCapacityOpen] = useState(false);
  const [capacityInput, setCapacityInput] = useState("");
  const [savingCapacity, setSavingCapacity] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const { cells, now } = useMemo(() => {
    const at = Date.now();
    return { cells: board ? buildSlotCells(board, releasing, at) : [], now: at };
  }, [board, releasing]);
  const counts = useMemo(() => countByFilter(cells, now), [cells, now]);

  const jumpTo = parseSlotJump(debouncedQuery, cells.length);
  useEffect(() => {
    if (jumpTo === null) return;
    document.getElementById(`o2-slot-${jumpTo}`)?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    setHighlighted(jumpTo);
    const t = window.setTimeout(() => setHighlighted(null), 2500);
    return () => window.clearTimeout(t);
  }, [jumpTo]);

  // تنبيه لما الفرع يمتلي وأول طلب بيروح للطابور (بدل ما ينرفض) — الموظف لازم ينتبه
  const lastQueueLength = useRef(0);
  const queueLength = board?.queue.length ?? 0;
  useEffect(() => {
    if (board && queueLength > lastQueueLength.current) {
      toast.warning("الخانات ممتلئة", `${queueLength} طلب بالانتظار — بياخد خانة أول ما تفرغ وحدة`);
    }
    lastQueueLength.current = queueLength;
  }, [board, queueLength]);
  useEffect(() => { lastQueueLength.current = 0; }, [branchId]);

  const saveCapacity = async () => {
    const value = Number(capacityInput);
    if (!Number.isInteger(value) || value < 1 || value > 1000) {
      toast.error("عدد غير صالح", "اكتب رقم صحيح من 1 إلى 1000");
      return;
    }
    setSavingCapacity(true);
    try {
      await setCapacity(value);
      toast.success("تم تحديث عدد الخانات");
      setCapacityOpen(false);
    } catch (err: any) {
      toast.error("فشل تحديث عدد الخانات", err?.response?.data?.message);
    } finally {
      setSavingCapacity(false);
    }
  };

  if (!board) {
    return error ? (
      <div role="alert" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", background: colors.semantic.errorBg, borderRadius: radius.xl, border: `1px solid ${colors.semantic.errorBorder}` }}>
        <AlertCircle size={32} style={{ color: colors.semantic.error, marginBottom: 12 }} />
        <p style={{ fontSize: typography.size.sm, color: colors.semantic.error }}>{error}</p>
        <button type="button" onClick={() => void refresh()} style={{ marginTop: 12, padding: "8px 16px", borderRadius: radius.lg, background: colors.semantic.error, color: "#fff", border: "none", fontSize: typography.size.sm, fontWeight: typography.weight.semibold, cursor: "pointer" }}>
          إعادة المحاولة
        </button>
      </div>
    ) : (
      <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }} role="status" aria-label="جاري تحميل الخانات">
        <Loader2 size={32} className="animate-spin" style={{ color: colors.brand[500] }} />
      </div>
    );
  }

  const fillPercent = board.capacity > 0 ? Math.min(100, Math.round((board.occupied / board.capacity) * 100)) : 100;
  const fillColor = fillPercent >= 90 ? colors.semantic.error : fillPercent >= 70 ? colors.semantic.warning : colors.semantic.success;
  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: radius.full,
    border: `1px solid ${active ? colors.neutral[800] : colors.border.default}`,
    background: active ? colors.neutral[800] : colors.neutral[0], color: active ? colors.neutral[0] : colors.neutral[700],
    fontSize: typography.size.sm, fontWeight: typography.weight.semibold, cursor: "pointer",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* شريط الأدوات — ثابت أعلى الشاشة أثناء تمرير الخانات */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: colors.surface.page, paddingBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ minWidth: 200, flex: "1 1 240px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.extrabold, color: colors.neutral[900], fontVariantNumeric: "tabular-nums" }}>
                {board.occupied} / {board.capacity}
              </span>
              <span style={{ fontSize: typography.size.sm, color: colors.neutral[500] }}>خانة مشغولة</span>
            </div>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={board.capacity} aria-valuenow={board.occupied} aria-label="امتلاء الخانات"
              style={{ height: 8, borderRadius: radius.full, background: colors.neutral[100], overflow: "hidden" }}>
              <div style={{ width: `${fillPercent}%`, height: "100%", background: fillColor, transition: `width ${transitions.slow}` }} />
            </div>
          </div>

          <div style={{ position: "relative", flex: "2 1 280px" }}>
            <Search size={16} aria-hidden style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: colors.neutral[400] }} />
            <input
              value={query} onChange={e => setQuery(e.target.value)} inputMode="search" aria-label="بحث في الخانات"
              placeholder="ابحث برقم الطلب أو العميل، أو اكتب رقم الخانة (مثلاً 37)"
              style={{ width: "100%", height: 44, paddingInline: "40px 12px", border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, fontSize: typography.size.sm, outline: "none", background: colors.neutral[0], color: colors.neutral[900] }}
              onFocus={e => { e.currentTarget.style.borderColor = colors.border.focus; }}
              onBlur={e => { e.currentTarget.style.borderColor = colors.border.default; }}
            />
          </div>

          <button type="button" onClick={() => void refresh()} disabled={loading} aria-label="تحديث الخانات" style={{ display: "flex", alignItems: "center", gap: 6, height: 44, padding: "0 14px", borderRadius: radius.lg, background: colors.neutral[0], border: `1px solid ${colors.border.default}`, color: colors.neutral[700], fontSize: typography.size.sm, fontWeight: typography.weight.semibold, cursor: loading ? "not-allowed" : "pointer" }}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> تحديث
          </button>
          {canManageCapacity && (
            <button type="button" aria-expanded={capacityOpen} onClick={() => { setCapacityInput(String(board.capacity)); setCapacityOpen(o => !o); }}
              style={{ display: "flex", alignItems: "center", gap: 6, height: 44, padding: "0 14px", borderRadius: radius.lg, background: colors.neutral[0], border: `1px solid ${colors.border.default}`, color: colors.neutral[700], fontSize: typography.size.sm, fontWeight: typography.weight.semibold, cursor: "pointer" }}>
              <Settings2 size={16} aria-hidden /> عدد الخانات
            </button>
          )}
        </div>

        {capacityOpen && (
          <form onSubmit={e => { e.preventDefault(); void saveCapacity(); }} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: 12, borderRadius: radius.lg, background: colors.neutral[50], border: `1px solid ${colors.border.subtle}` }}>
            <label htmlFor="o2-slot-capacity" style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold }}>عدد الخانات للفرع</label>
            <input id="o2-slot-capacity" type="number" min={1} max={1000} value={capacityInput} onChange={e => setCapacityInput(e.target.value)}
              style={{ width: 100, height: 36, padding: "0 10px", border: `1px solid ${colors.border.default}`, borderRadius: radius.md, background: colors.neutral[0], color: colors.neutral[900] }} />
            <button type="submit" disabled={savingCapacity} style={{ height: 36, padding: "0 16px", borderRadius: radius.md, background: colors.neutral[800], color: colors.neutral[0], border: "none", fontWeight: typography.weight.semibold, cursor: savingCapacity ? "not-allowed" : "pointer" }}>
              {savingCapacity ? "جاري الحفظ..." : "حفظ"}
            </button>
            <span style={{ fontSize: "12px", color: colors.neutral[500], flex: "1 1 260px" }}>
              التصغير مسموح: الطلبات بالخانات الأعلى بتضل مكانها والخانات الزايدة بتختفي لحالها لما تفرغ.
            </span>
          </form>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }} role="group" aria-label="فلترة الخانات">
          {FILTERS.map(f => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} style={chipStyle(filter === f)}>
              {SLOT_FILTER_LABELS[f]} <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.8 }}>{counts[f]}</span>
            </button>
          ))}
          <span aria-hidden style={{ marginInlineStart: "auto", display: "flex", gap: 12, fontSize: "11px", color: colors.neutral[500], flexWrap: "wrap" }}>
            <LegendDot color={colors.semantic.success} label="مفتوح" />
            <LegendDot color={SCHEDULED_COLOR} label="مجدول" />
            <LegendDot color={colors.semantic.success} label="جاهز للإغلاق (لامع)" />
            <LegendDot color={colors.semantic.error} label="متأخر (وميض)" />
            <LegendDot color={colors.neutral[300]} label="فاضية" dashed />
          </span>
        </div>
        {error && <p role="status" style={{ fontSize: "12px", color: colors.semantic.warning }}>تعذر التحديث الأخير — عم نعرض آخر بيانات وصلت.</p>}
      </div>

      {queueLength > 0 && board && (
        <section role="status" aria-live="polite" style={{ padding: "12px 14px", borderRadius: radius.lg, background: colors.semantic.warningBg, border: `1px solid ${colors.semantic.warningBorder}` }}>
          <strong style={{ fontSize: typography.size.base, color: colors.neutral[900] }}>الخانات ممتلئة — {queueLength} طلب بالانتظار</strong>
          <div style={{ fontSize: "12px", color: colors.neutral[600], marginTop: 2 }}>الطلب ما بينرفض، بياخد خانة تلقائيًا أول ما تفرغ وحدة (الأقدم أول).</div>
          <ul style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, padding: 0 }}>
            {board.queue.slice(0, 8).map((o, i) => (
              <li key={o.id} style={{ listStyle: "none" }}>
                <button type="button" onClick={() => onOpenOrder(o.id)} style={{ padding: "4px 10px", borderRadius: radius.full, background: colors.neutral[0], border: `1px solid ${colors.semantic.warningBorder}`, fontSize: "12px", cursor: "pointer", color: colors.neutral[800] }}>
                  {i + 1}. {getOrderReference(o.order_number)} · {o.customer_name || "بدون اسم"} · {formatWait(o.created_at, now)}
                </button>
              </li>
            ))}
            {queueLength > 8 && <li style={{ listStyle: "none", fontSize: "12px", color: colors.neutral[500], alignSelf: "center" }}>+{queueLength - 8}</li>}
          </ul>
        </section>
      )}

      <ul aria-label="خانات الطلبات النشطة" style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${CELL_MIN_WIDTH[density]}px, 1fr))`, gap: density === "compact" ? 8 : 12, padding: 0, margin: 0 }}>
        {cells.map(cell => (
          <SlotCellView key={cell.slotNumber} cell={cell} density={density} now={now} onOpenOrder={onOpenOrder}
            highlighted={highlighted === cell.slotNumber}
            selected={!!cell.order && cell.order.id === selectedOrderId}
            dimmed={isCellDimmed(cell, { query: debouncedQuery, filter, jumpTo, now })} />
        ))}
      </ul>

      {selectedOrderId !== null && (
        <OrderDrawer
          orderId={selectedOrderId}
          slotNumber={cells.find(c => c.order?.id === selectedOrderId && c.state !== "released_closed" && c.state !== "released_cancelled")?.slotNumber ?? null}
          onClose={() => setSelectedOrderId(null)}
          onChanged={() => { void refresh(); }}
        />
      )}
    </div>
  );
};

const LegendDot: React.FC<{ color: string; label: string; dashed?: boolean }> = ({ color, label, dashed }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
    <span style={{ width: 10, height: 10, borderRadius: 3, border: `1.5px ${dashed ? "dashed" : "solid"} ${color}`, background: dashed ? "transparent" : color }} />
    {label}
  </span>
);

export default SlotBoard;
