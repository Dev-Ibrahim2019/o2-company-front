import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle, Ban, CalendarClock, CheckCircle2, CreditCard, Flame, Loader2, Lock, Pencil, Play, Printer,
  RefreshCw, Trash2, X,
} from "lucide-react";
import { colors, typography, radius, shadows } from "../design/tokens";
import { toast } from "../../shared/Toast";
import { ConfirmModal } from "../../shared/ConfirmModal";
import { orderService, type OrderActivityLogEntry } from "../../../services/orderService";
import { callCenterService, type OrderDetail, type OrderFlow, type OrderFlowTicket } from "../services/callCenterService";
import { LATIN_DIGITS_LOCALE, formatShekel, getOrderReference } from "../activeOrdersView";
import { formatCountdown } from "../slotBoardView";
import {
  MIN_REASON_LENGTH, PAID_EDIT_MESSAGE, formatAddress, fromLocalDateTimeInput, removalRequirements, toLocalDateTimeInput,
} from "../orderDrawerView";
import { TransferPaymentForm } from "./TransferPaymentForm";

// ============================================================================
// ORDER DRAWER — تفاصيل الطلب بلوحة جانبية (مش صفحة كاملة) عشان الخانات تضل قدام الموظف. الأزرار
// بتتفعّل حسب حالة الطلب، والإغلاق (F7) بيضل معطّل وبيوضّح شو الناقص لحد ما يصير مدفوع ومنفّذ.
// ============================================================================

const sectionTitle: React.CSSProperties = { fontSize: "12px", fontWeight: typography.weight.bold, color: colors.neutral[500], marginBottom: 6 };
const card: React.CSSProperties = { padding: 12, borderRadius: radius.lg, background: colors.neutral[0], border: `1px solid ${colors.border.subtle}` };
const ghostButton: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 38, padding: "0 12px",
  borderRadius: radius.md, border: `1px solid ${colors.border.default}`, background: colors.neutral[0],
  color: colors.neutral[800], fontSize: typography.size.sm, fontWeight: typography.weight.semibold, cursor: "pointer",
};
const solidButton = (bg: string): React.CSSProperties => ({ ...ghostButton, background: bg, color: "#fff", border: "none" });

const Chip: React.FC<{ label: string; tone: "success" | "warning" | "neutral" | "info" | "error" }> = ({ label, tone }) => {
  const map = {
    success: [colors.semantic.successBg, colors.semantic.success], warning: [colors.semantic.warningBg, colors.semantic.warning],
    info: [colors.semantic.infoBg, colors.semantic.info], error: [colors.semantic.errorBg, colors.semantic.error],
    neutral: [colors.neutral[100], colors.neutral[600]],
  } as const;
  return <span style={{ padding: "3px 10px", borderRadius: radius.full, fontSize: "11px", fontWeight: typography.weight.bold, background: map[tone][0], color: map[tone][1] }}>{label}</span>;
};

const formatDateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString(LATIN_DIGITS_LOCALE, { dateStyle: "short", timeStyle: "short" }) : "");

const TicketRow: React.FC<{ ticket: OrderFlowTicket; onReprint: (id: number) => void; busy: boolean }> = ({ ticket, onReprint, busy }) => (
  <li style={{ listStyle: "none", display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", padding: "6px 0", borderBottom: `1px dashed ${colors.border.subtle}` }}>
    <span style={{ fontSize: typography.size.sm }}>
      {ticket.type === "cancellation" ? "إلغاء — " : ""}{ticket.department ?? "قسم"}
      <span style={{ color: colors.neutral[400], fontSize: "11px", marginInlineStart: 6 }} dir="ltr">{ticket.ticket_number}</span>
      {ticket.print_status === "failed" && ticket.print_error && (
        <span role="alert" style={{ display: "block", fontSize: "11px", color: colors.semantic.error }}>{ticket.print_error}</span>
      )}
    </span>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {ticket.print_status === "printed" && <Chip label="تمت الطباعة" tone="success" />}
      {ticket.print_status === "failed" && <Chip label="فشلت الطباعة" tone="error" />}
      {ticket.print_status === null && <Chip label="لم تُطبع" tone="neutral" />}
      {ticket.print_status !== "printed" && (
        <button type="button" onClick={() => onReprint(ticket.id)} disabled={busy} aria-label={`إعادة طباعة تذكرة ${ticket.department ?? ""}`} style={{ ...ghostButton, height: 30, padding: "0 8px" }}>
          <Printer size={13} aria-hidden /> إعادة
        </button>
      )}
    </span>
  </li>
);

export const OrderDrawer: React.FC<{
  orderId: number;
  slotNumber?: number | null;
  onClose: () => void;
  /** بعد أي تغيير (دفع، تنفيذ، إغلاق...) — اللوحة بتعيد جلب الخانات */
  onChanged: () => void;
}> = ({ orderId, slotNumber, onClose, onChanged }) => {
  const navigate = useNavigate();

  const [details, setDetails] = useState<OrderDetail | null>(null);
  const [flow, setFlow] = useState<OrderFlow | null>(null);
  const [log, setLog] = useState<OrderActivityLogEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [showPayment, setShowPayment] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleInput, setScheduleInput] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{ id: number; name: string } | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const [d, f, l] = await Promise.all([
        callCenterService.getOrderDetails(orderId),
        callCenterService.getOrderFlow(orderId),
        orderService.getActivityLog(orderId).catch(() => [] as OrderActivityLogEntry[]),
      ]);
      if (mine !== seq.current) return;
      setDetails(d.data);
      setFlow(f.data);
      setLog(l);
      setLoadError(null);
      setScheduleInput(prev => prev || toLocalDateTimeInput(f.data.scheduled_at));
    } catch (err: any) {
      if (mine === seq.current) setLoadError(err?.response?.data?.message || "تعذر تحميل تفاصيل الطلب");
    }
  }, [orderId]);

  useEffect(() => {
    setDetails(null); setFlow(null); setShowPayment(false); setShowSchedule(false); setRemoveTarget(null);
    setScheduleInput(""); setConfirmClose(false); setShowCancel(false);
    void load();
  }, [load]);

  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(t); }, []);

  const refreshAll = useCallback(async () => { await load(); onChanged(); }, [load, onChanged]);

  const run = async (key: string, fn: () => Promise<void>, failure: string) => {
    setBusy(key);
    try { await fn(); } catch (err: any) {
      const errors = err?.response?.data?.errors;
      toast.error(failure, errors ? Object.values(errors).flat().join(" ") : err?.response?.data?.message || err?.message);
    } finally { setBusy(null); }
  };

  const open = flow?.lifecycle === "open";

  // F7 = إغلاق الطلب المفتوح بالـDrawer. لو مو جاهز بنقول شو الناقص بدل ما نتجاهل الضغطة بصمت.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F7") {
        e.preventDefault();
        if (!flow || flow.lifecycle !== "open") return;
        if (flow.ready_to_close) setConfirmClose(true);
        else toast.warning("لا يمكن إغلاق الطلب بعد", flow.close_blockers.join(" و"));
      } else if (e.key === "Escape" && !confirmClose && !showCancel && !removeTarget) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [flow, confirmClose, showCancel, removeTarget, onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  const doExecute = () => run("execute", async () => {
    const res = await callCenterService.executeOrder(orderId);
    toast.success(res.message);
    await refreshAll();
  }, "فشل تنفيذ الطلب");

  const doSchedule = () => run("schedule", async () => {
    const iso = fromLocalDateTimeInput(scheduleInput);
    if (!iso) { toast.error("اختر وقت الجدولة"); return; }
    const res = await callCenterService.scheduleOrder(orderId, iso);
    toast.success(res.message);
    setShowSchedule(false);
    await refreshAll();
  }, "فشلت الجدولة");

  const doUnschedule = () => run("unschedule", async () => {
    const res = await callCenterService.unscheduleOrder(orderId);
    toast.success(res.message);
    setScheduleInput("");
    setShowSchedule(false);
    await refreshAll();
  }, "فشل إلغاء الجدولة");

  const doReprint = (ticketId: number) => run(`reprint-${ticketId}`, async () => {
    const res = await callCenterService.reprintTicket(orderId, ticketId);
    (res.message.includes("فشلت") ? toast.error : toast.success)(res.message);
    await refreshAll();
  }, "فشلت إعادة الطباعة");

  const doClose = () => run("close", async () => {
    const res = await callCenterService.closeOrder(orderId);
    toast.success(res.message, "الخانة رح تتفرّغ والطلب بينبعت للتيك أواي");
    setConfirmClose(false);
    onChanged();
    onClose();
  }, "تعذر إغلاق الطلب");

  const doCancel = () => run("cancel", async () => {
    await orderService.cancel(orderId, cancelReason.trim() || undefined);
    toast.success("تم إلغاء الطلب");
    setShowCancel(false);
    onChanged();
    onClose();
  }, "فشل إلغاء الطلب");

  // الطلب المدفوع ممنوع تعديله: أزرار التعديل والإزالة بتختفي كليًا (والباك اند بيرفض كمان)
  const requirements = flow ? removalRequirements(flow.execution_status, flow.payment_state) : { reason: false, blocked: true };
  const canEditItems = open && !requirements.blocked;

  const doRemove = () => {
    if (!removeTarget) return;
    if (requirements.reason && removeReason.trim().length < MIN_REASON_LENGTH) {
      toast.error("سبب الإزالة مطلوب", `${MIN_REASON_LENGTH} أحرف على الأقل`);
      return;
    }
    return run("remove", async () => {
      const res = await callCenterService.removeOrderItem(orderId, removeTarget.id, removeReason.trim() || undefined);
      toast.success(res.message);
      (res.data.warnings ?? []).forEach(w => toast.warning("تنبيه بالمبلغ", w));
      setRemoveTarget(null);
      setRemoveReason("");
      await refreshAll();
    }, "فشلت إزالة الصنف");
  };

  const activeItems = (details?.items ?? []).filter(i => i.status !== "cancelled");
  const cancelledItems = (details?.items ?? []).filter(i => i.status === "cancelled");
  const address = formatAddress(details?.delivery_address_snapshot);
  const paid = flow?.payment_state === "paid";
  const executed = flow?.execution_status === "executed";
  const scheduled = flow?.execution_status === "scheduled";

  return (
    <motion.aside
      role="dialog" aria-modal="false" aria-label={`تفاصيل الطلب ${details ? getOrderReference(details.order_number) : ""}`}
      initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}
      style={{
        position: "fixed", top: 0, bottom: 0, insetInlineEnd: 0, width: "min(460px, 100vw)", zIndex: 40, overflowY: "auto",
        background: colors.surface.raised, boxShadow: shadows["2xl"], borderInlineStart: `1px solid ${colors.border.default}`,
        display: "flex", flexDirection: "column", fontFamily: typography.fontFamily.sans,
      }}
    >
      <header style={{ position: "sticky", top: 0, zIndex: 1, background: colors.surface.raised, padding: "14px 16px", borderBottom: `1px solid ${colors.border.subtle}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: typography.size.lg, fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
            {slotNumber ? `خانة ${slotNumber} · ` : ""}{details ? getOrderReference(details.order_number) : "…"}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {flow && <>
              <Chip label={paid ? "مدفوع" : "غير مدفوع"} tone={paid ? "success" : "warning"} />
              <Chip label={executed ? "منفّذ" : scheduled ? "مجدول" : "بانتظار التنفيذ"} tone={executed ? "success" : scheduled ? "info" : "neutral"} />
              {flow.lifecycle !== "open" && <Chip label={flow.lifecycle === "closed" ? "مغلق" : "ملغي"} tone={flow.lifecycle === "closed" ? "neutral" : "error"} />}
            </>}
          </div>
        </div>
        <button type="button" onClick={() => void refreshAll()} aria-label="تحديث" style={{ ...ghostButton, width: 38, padding: 0 }}><RefreshCw size={15} aria-hidden /></button>
        <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="إغلاق اللوحة" style={{ ...ghostButton, width: 38, padding: 0 }}><X size={16} aria-hidden /></button>
      </header>

      {loadError && !details ? (
        <div role="alert" style={{ padding: 24, textAlign: "center", color: colors.semantic.error }}>
          <AlertTriangle size={24} aria-hidden /> <p>{loadError}</p>
          <button type="button" onClick={() => void load()} style={{ ...ghostButton, marginTop: 8 }}>إعادة المحاولة</button>
        </div>
      ) : !details || !flow ? (
        <div role="status" aria-label="جاري التحميل" style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={28} className="animate-spin" style={{ color: colors.brand[500] }} /></div>
      ) : (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {open && (
            <div role="status" style={{
              display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: radius.lg, fontSize: typography.size.sm,
              background: flow.ready_to_close ? colors.semantic.successBg : colors.neutral[50],
              border: `1px solid ${flow.ready_to_close ? colors.semantic.success : colors.border.subtle}`, color: colors.neutral[800],
            }}>
              {flow.ready_to_close ? <CheckCircle2 size={16} aria-hidden color={colors.semantic.success} /> : <Lock size={16} aria-hidden />}
              <span>{flow.ready_to_close ? "الطلب مدفوع ومنفّذ — جاهز للإغلاق (F7)." : `الإغلاق معطّل — الناقص: ${flow.close_blockers.join(" و")}.`}</span>
            </div>
          )}

          <section aria-label="العميل" style={card}>
            <div style={sectionTitle}>العميل</div>
            <div style={{ fontWeight: typography.weight.bold }}>{details.customer_name || "بدون اسم"}</div>
            {details.customer_phone && <div dir="ltr" style={{ color: colors.neutral[600], fontSize: typography.size.sm, textAlign: "end" }}>{details.customer_phone}</div>}
            {address && <div style={{ fontSize: typography.size.sm, color: colors.neutral[600], marginTop: 4 }}>{address}</div>}
            {details.note && <div style={{ fontSize: "12px", color: colors.semantic.warning, marginTop: 4 }}>ملاحظة: {details.note}</div>}
          </section>

          <section aria-label="الأصناف" style={card}>
            <div style={sectionTitle}>الأصناف</div>
            <ul style={{ margin: 0, padding: 0 }}>
              {activeItems.map(item => (
                <li key={item.id} style={{ listStyle: "none", display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px dashed ${colors.border.subtle}` }}>
                  <span style={{ flex: 1, fontSize: typography.size.sm }}>
                    <strong>{item.quantity}×</strong> {item.item_name_ar || item.item_name}
                    {item.notes && <span style={{ display: "block", fontSize: "11px", color: colors.semantic.warning }}>{item.notes}</span>}
                  </span>
                  <span style={{ fontSize: typography.size.sm, color: colors.neutral[600] }}>{formatShekel(item.total)}</span>
                  {canEditItems && activeItems.length > 1 && (
                    <button type="button" onClick={() => { setRemoveTarget({ id: item.id, name: item.item_name_ar || item.item_name || "" }); setRemoveReason(""); }}
                      aria-label={`إزالة ${item.item_name_ar || item.item_name}`} style={{ ...ghostButton, width: 32, height: 32, padding: 0, color: colors.semantic.error }}>
                      <Trash2 size={14} aria-hidden />
                    </button>
                  )}
                </li>
              ))}
              {cancelledItems.map(item => (
                <li key={item.id} style={{ listStyle: "none", padding: "4px 0", fontSize: "12px", color: colors.neutral[400] }}>
                  <s>{item.quantity}× {item.item_name_ar || item.item_name}</s> — أُلغي{item.cancel_reason ? `: ${item.cancel_reason}` : ""}
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontWeight: typography.weight.extrabold }}>
              <span>الإجمالي</span><span>{formatShekel(details.total)}</span>
            </div>
            {open && requirements.blocked && (
              <p style={{ fontSize: "11px", color: colors.neutral[500], marginTop: 6 }}>{PAID_EDIT_MESSAGE}</p>
            )}
            {removeTarget && canEditItems && (
              <div style={{ marginTop: 10, padding: 10, borderRadius: radius.md, background: colors.semantic.errorBg, border: `1px solid ${colors.semantic.errorBorder}` }}>
                <div style={{ fontSize: typography.size.sm, fontWeight: typography.weight.bold, marginBottom: 6 }}>إزالة «{removeTarget.name}»</div>
                <label htmlFor="remove-reason" style={{ fontSize: "12px" }}>{requirements.reason ? "السبب (إلزامي)" : "السبب (اختياري)"}</label>
                <input id="remove-reason" value={removeReason} onChange={e => setRemoveReason(e.target.value)} maxLength={500}
                  style={{ width: "100%", height: 36, padding: "0 10px", borderRadius: radius.md, border: `1px solid ${colors.border.default}`, marginBottom: 8 }} />
                {requirements.reason && <p style={{ fontSize: "11px", marginBottom: 6 }}>بعد التنفيذ بتطلع تذكرة إلغاء للقسم المعني.</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={doRemove} disabled={busy === "remove"} style={solidButton(colors.semantic.error)}>{busy === "remove" && <Loader2 size={14} className="animate-spin" aria-hidden />} تأكيد الإزالة</button>
                  <button type="button" onClick={() => setRemoveTarget(null)} style={ghostButton}>تراجع</button>
                </div>
              </div>
            )}
          </section>

          <section aria-label="الدفع" style={card}>
            <div style={sectionTitle}>الدفع</div>
            {paid ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: colors.semantic.success, fontWeight: typography.weight.bold }}><CreditCard size={16} aria-hidden /> تم الدفع</div>
            ) : open ? (
              showPayment
                ? <TransferPaymentForm order={details} onCancel={() => setShowPayment(false)} onPaid={() => { setShowPayment(false); void refreshAll(); }} onFailed={() => { void load(); }} />
                : <button type="button" onClick={() => setShowPayment(true)} style={solidButton(colors.brand[600])}><CreditCard size={15} aria-hidden /> تسجيل دفع بنكي</button>
            ) : <span style={{ color: colors.neutral[500], fontSize: typography.size.sm }}>غير مدفوع</span>}
          </section>

          <section aria-label="التنفيذ" style={card}>
            <div style={sectionTitle}>التنفيذ (طباعة الأقسام)</div>
            {executed ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: colors.semantic.success, fontWeight: typography.weight.bold, marginBottom: 6 }}>
                <CheckCircle2 size={16} aria-hidden /> تم التنفيذ {formatDateTime(flow.executed_at)}
              </div>
            ) : (
              <>
                {scheduled && flow.scheduled_at && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontWeight: typography.weight.bold, color: colors.semantic.info }}>
                    <CalendarClock size={16} aria-hidden /> مجدول {formatDateTime(flow.scheduled_at)} ({formatCountdown(flow.scheduled_at, now)})
                  </div>
                )}
                {flow.execution_failed_reason && <p role="alert" style={{ fontSize: "12px", color: colors.semantic.error, marginBottom: 6 }}>تعذّر التنفيذ: {flow.execution_failed_reason}</p>}
                {open && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={doExecute} disabled={!paid || busy === "execute"} title={paid ? undefined : "بعد الدفع"} style={{ ...solidButton(colors.semantic.success), opacity: paid ? 1 : 0.5 }}>
                      {busy === "execute" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Play size={14} aria-hidden />} تنفيذ فوري
                    </button>
                    <button type="button" onClick={() => setShowSchedule(s => !s)} aria-expanded={showSchedule} style={ghostButton}>
                      <CalendarClock size={14} aria-hidden /> {scheduled ? "تعديل الجدولة" : "جدولة"}
                    </button>
                    {scheduled && <button type="button" onClick={doUnschedule} disabled={busy === "unschedule"} style={ghostButton}>إلغاء الجدولة</button>}
                  </div>
                )}
                {!paid && open && <p style={{ fontSize: "11px", color: colors.neutral[500], marginTop: 6 }}>التنفيذ الفوري بعد الدفع. الطلب المجدول بيتنفّذ تلقائيًا من السيرفر بوقته (بشرط يكون مدفوع).</p>}
                {showSchedule && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                    <label htmlFor="schedule-at" style={{ fontSize: "12px" }}>وقت التنفيذ</label>
                    <input id="schedule-at" type="datetime-local" value={scheduleInput} min={toLocalDateTimeInput(new Date(now + 60_000).toISOString())} onChange={e => setScheduleInput(e.target.value)}
                      style={{ height: 36, padding: "0 10px", borderRadius: radius.md, border: `1px solid ${colors.border.default}` }} />
                    <button type="button" onClick={doSchedule} disabled={busy === "schedule"} style={solidButton(colors.brand[600])}>حفظ</button>
                  </div>
                )}
              </>
            )}
            {flow.tickets.length > 0 && (
              <ul aria-label="تذاكر الأقسام" style={{ margin: "8px 0 0", padding: 0 }}>
                {flow.tickets.map(t => <TicketRow key={t.id} ticket={t} onReprint={doReprint} busy={busy?.startsWith("reprint") ?? false} />)}
              </ul>
            )}
          </section>

          <section aria-label="سجل الأحداث" style={card}>
            <div style={sectionTitle}>سجل الأحداث</div>
            {log.length === 0 ? <p style={{ fontSize: "12px", color: colors.neutral[400] }}>لا يوجد أحداث بعد</p> : (
              <ol style={{ margin: 0, padding: 0 }}>
                {log.slice(0, 20).map(entry => (
                  <li key={entry.id} style={{ listStyle: "none", padding: "5px 0", borderBottom: `1px dashed ${colors.border.subtle}`, fontSize: "12px" }}>
                    <span style={{ color: colors.neutral[800] }}>{entry.note || entry.action_type}</span>
                    <span style={{ display: "block", color: colors.neutral[400] }}>{entry.actor ?? "النظام"} · {formatDateTime(entry.created_at)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {open && (
            <footer style={{ position: "sticky", bottom: 0, background: colors.surface.raised, paddingBlock: 10, display: "flex", gap: 8, flexWrap: "wrap", borderTop: `1px solid ${colors.border.subtle}` }}>
              {canEditItems && (
                <button type="button" onClick={() => navigate(`/call-center/order/${orderId}/edit`)} style={ghostButton}><Pencil size={14} aria-hidden /> تعديل</button>
              )}
              <button type="button" onClick={() => setConfirmClose(true)} disabled={!flow.ready_to_close}
                aria-describedby="close-help" style={{ ...solidButton(colors.semantic.success), opacity: flow.ready_to_close ? 1 : 0.5, flex: 1 }}>
                <Flame size={14} aria-hidden /> إغلاق الطلب (F7)
              </button>
              <button type="button" onClick={() => setShowCancel(true)} style={{ ...ghostButton, color: colors.semantic.error }}><Ban size={14} aria-hidden /> إلغاء</button>
              <span id="close-help" style={{ flexBasis: "100%", fontSize: "11px", color: colors.neutral[500] }}>
                {flow.ready_to_close ? "الإغلاق بيفرّغ الخانة وبينبعت الطلب للتيك أواي." : `الإغلاق يحتاج: ${flow.close_blockers.join(" و")}.`}
              </span>
            </footer>
          )}
        </div>
      )}

      <ConfirmModal open={confirmClose} title="إغلاق الطلب" variant="success" loading={busy === "close"} confirmLabel="إغلاق"
        message="بعد الإغلاق بتتفرّغ الخانة وبينبعت الطلب لبرنامج التيك أواي لتعيين السائق. متأكد؟"
        onConfirm={doClose} onCancel={() => setConfirmClose(false)} />

      {showCancel && (
        <div role="dialog" aria-modal="true" aria-label="إلغاء الطلب" style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ ...card, width: "min(420px, 100%)", padding: 16 }}>
            <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, marginBottom: 8 }}>إلغاء الطلب</h2>
            <label htmlFor="cancel-reason" style={{ fontSize: "12px" }}>سبب الإلغاء</label>
            <input id="cancel-reason" value={cancelReason} onChange={e => setCancelReason(e.target.value)} autoFocus maxLength={500}
              style={{ width: "100%", height: 38, padding: "0 10px", borderRadius: radius.md, border: `1px solid ${colors.border.default}`, margin: "4px 0 12px" }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowCancel(false)} style={ghostButton}>تراجع</button>
              <button type="button" onClick={doCancel} disabled={busy === "cancel"} style={solidButton(colors.semantic.error)}>{busy === "cancel" && <Loader2 size={14} className="animate-spin" aria-hidden />} إلغاء الطلب</button>
            </div>
          </div>
        </div>
      )}
    </motion.aside>
  );
};

export default OrderDrawer;
