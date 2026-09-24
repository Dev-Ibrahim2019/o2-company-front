import React, { useState } from "react";
import { ArrowLeft, User, Phone, Bike, CalendarClock, Loader2, ChevronDown, AlertCircle, ChefHat, CheckCircle2 } from "lucide-react";
import { colors, typography, radius, shadows, transitions } from "../design/tokens";
import type { ActiveCallCenterOrder } from "../services/callCenterService";
import type { EmployeeFromApi } from "../../../services/employeeService";
import {
  getOrderReference, formatShekel, LATIN_DIGITS_LOCALE, derivePaymentStatus, PAYMENT_STATUS_LABELS,
  deriveWorkflowStage, getOrderSlaLevel, getDelayMinutes, getOrderDelayReferenceTime, WORKFLOW_STAGE_COLORS,
} from "../activeOrdersView";
import { OrderStatusBadge, DelayIndicator } from "./OrderStatusBadge";

export type CardDensity = "compact" | "normal" | "large";

const ORDER_TYPE_MAP: Record<string, string> = { dine_in: "محلي", takeaway: "فوري", delivery: "توصيل" };

const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString(LATIN_DIGITS_LOCALE, { hour: "2-digit", minute: "2-digit" });
const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins} د`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs} س ${mins % 60} د` : `${Math.floor(hrs / 24)} يوم`;
};

const scheduleCountdown = (scheduledAt: string) => {
  const diffMin = Math.round((new Date(scheduledAt).getTime() - Date.now()) / 60000);
  if (diffMin <= 0) return "حان موعده";
  if (diffMin < 60) return `بعد ${diffMin} دقيقة`;
  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `بعد ${hrs} ساعة${mins > 0 ? ` و${mins} دقيقة` : ""}`;
};

const DENSITY_PADDING: Record<CardDensity, string> = { compact: "10px 12px", normal: "14px 16px", large: "18px 20px" };
const DENSITY_GAP: Record<CardDensity, number> = { compact: 6, normal: 9, large: 12 };
const DENSITY_TITLE_SIZE: Record<CardDensity, string> = { compact: typography.size.base, normal: typography.size.lg, large: typography.size.xl };

// كارد الطلب — أهم معلومة (رقم الطلب + الحالة + وقت الانتظار) بارزة بصريًا، والباقي (وقت
// الطباعة/التعيين/التسليم، بيانات العميل، السائق) أصغر وأخف — عشان يُقرأ بلمحة وليس بقراءة كل سطر.
export const OrderCard: React.FC<{
  order: ActiveCallCenterOrder;
  density: CardDensity;
  availableDrivers: EmployeeFromApi[];
  /** صلاحية call-center.assign-driver (أو دور بوصول كامل) — نفس منطق OrderDetailPage، محسوبة
   * مرة وحدة بالصفحة الأم وتُمرَّر هون بدل تكرار useAuth() بكل كارد. */
  canAssignDriver: boolean;
  /** صلاحية call-center.change-order-status — لزرَّي "بدء التجهيز"/"الطلب جاهز". */
  canChangeStatus: boolean;
  onOpen: () => void;
  onAssignDriver: (orderId: number, driverId: number) => Promise<void>;
  onMarkDelivered: (orderId: number) => Promise<void>;
  onStartPreparing: (orderId: number) => Promise<void>;
  onMarkReady: (orderId: number) => Promise<void>;
}> = ({ order, density, availableDrivers, canAssignDriver: canAssignDriverPermission, canChangeStatus, onOpen, onAssignDriver, onMarkDelivered, onStartPreparing, onMarkReady }) => {
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const workflowStage = deriveWorkflowStage(order.status, order.order_type);
  const stageColor = WORKFLOW_STAGE_COLORS[workflowStage];
  const paymentStatus = derivePaymentStatus(order);
  const paymentColor = paymentStatus === "paid" ? colors.semantic.success
    : paymentStatus === "awaiting_payment" ? colors.semantic.warning
    : colors.neutral[500];
  const delayReferenceTime = getOrderDelayReferenceTime(order);
  const slaLevel = getOrderSlaLevel(delayReferenceTime);
  const delayMinutes = getDelayMinutes(delayReferenceTime);
  const isDelayed = slaLevel !== "normal";

  const canAssignDriver = canAssignDriverPermission && order.order_type === "delivery" && order.status === "ready";
  const canMarkDelivered = canAssignDriverPermission && order.status === "OUT_FOR_DELIVERY";
  // "paid" غامضة (قد تكون قبل أو بعد إرسالها للمطبخ) — الكارد ما عنده بيانات التذاكر لتمييزها
  // (بعكس OrderDetailPage)، فنكتفي هون بالحالات الواضحة ونترك حالة "paid" لصفحة التفاصيل.
  const canStartPreparing = canChangeStatus && ["pending", "pending_confirmation", "scheduled"].includes(order.status);
  const canMarkReady = canChangeStatus && ["confirmed", "in_progress"].includes(order.status);
  const [statusActionBusy, setStatusActionBusy] = useState(false);

  const handleStartPreparing = async () => {
    setStatusActionBusy(true);
    try { await onStartPreparing(order.id); } finally { setStatusActionBusy(false); }
  };
  const handleMarkReady = async () => {
    setStatusActionBusy(true);
    try { await onMarkReady(order.id); } finally { setStatusActionBusy(false); }
  };

  const handleAssign = async (driverId: number) => {
    setActionBusy(true);
    try {
      await onAssignDriver(order.id, driverId);
      setShowDriverPicker(false);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeliver = async () => {
    setActionBusy(true);
    try {
      await onMarkDelivered(order.id);
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div
      style={{
        display: "flex", flexDirection: "column", gap: DENSITY_GAP[density],
        padding: DENSITY_PADDING[density], borderRadius: radius.xl,
        background: colors.neutral[0], border: `1px solid ${colors.border.subtle}`,
        borderTop: `3px solid ${stageColor}`,
        boxShadow: shadows.xs, transition: `all ${transitions.normal}`, position: "relative",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = shadows.md; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = shadows.xs; }}
    >
      {/* السطر الأهم: الحالة بارزة + رقم الطلب */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <OrderStatusBadge stage={workflowStage} orderType={order.order_type} />
        <span title={order.order_number} style={{ fontSize: DENSITY_TITLE_SIZE[density], fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
          {getOrderReference(order.order_number)}
        </span>
      </div>

      {/* نوع الطلب + وقت الانتظار — بارز، أهم من أي تفصيل تاني */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          padding: "2px 8px", borderRadius: radius.full,
          fontSize: "11px", fontWeight: typography.weight.semibold,
          background: colors.neutral[100], color: colors.neutral[600],
        }}>
          {ORDER_TYPE_MAP[order.order_type] || order.order_type}
        </span>
        <span style={{
          display: "flex", alignItems: "center", gap: 4,
          fontSize: typography.size.sm, fontWeight: typography.weight.bold,
          color: isDelayed ? colors.semantic.warning : colors.neutral[700],
        }}>
          ⏱ {timeAgo(order.created_at)}
        </span>
      </div>

      {isDelayed && <DelayIndicator delayMinutes={delayMinutes} critical={slaLevel === "critical"} />}

      {order.status === "scheduled" && order.scheduled_at && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4, alignSelf: "flex-start",
          padding: "2px 8px", borderRadius: radius.full,
          fontSize: "10px", fontWeight: typography.weight.semibold,
          background: "rgba(139,92,246,0.1)", color: "#8b5cf6",
        }}>
          <CalendarClock size={11} /> {formatTime(order.scheduled_at)} · {scheduleCountdown(order.scheduled_at)}
        </span>
      )}

      {order.execution_failed_reason && (
        <span
          title={order.execution_failed_reason}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4, alignSelf: "flex-start",
            padding: "2px 8px", borderRadius: radius.full,
            fontSize: "10px", fontWeight: typography.weight.semibold,
            background: `color-mix(in srgb, ${colors.semantic.error} 12%, transparent)`, color: colors.semantic.error,
          }}
        >
          <AlertCircle size={11} /> فشل التنفيذ التلقائي
        </span>
      )}

      {/* معلومات ثانوية — أصغر وأخف */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: "11px", color: colors.neutral[500] }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{formatShekel(order.total)}</span>
          <span style={{ color: paymentColor, fontWeight: typography.weight.semibold }}>{PAYMENT_STATUS_LABELS[paymentStatus]}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <CalendarClock size={11} /> أُنشئ {formatTime(order.created_at)}
          {order.delivery_assigned_at && <span> · تعيين {formatTime(order.delivery_assigned_at)}</span>}
          {order.delivered_at && <span> · تسليم {formatTime(order.delivered_at)}</span>}
        </div>
        {(order.customer_name || order.customer_phone) && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <User size={11} /> {order.customer_name || "—"}
            {order.customer_phone && <span dir="ltr" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><Phone size={10} /> {order.customer_phone}</span>}
          </div>
        )}
        {order.driver && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#F97316", fontWeight: typography.weight.semibold }}>
            <Bike size={11} /> {order.driver.name}
          </div>
        )}
        {order.branch && <div>{order.branch.name}</div>}
      </div>

      {/* إجراءات */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
        {canStartPreparing && (
          <button onClick={handleStartPreparing} disabled={statusActionBusy} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 12px", borderRadius: radius.lg,
            background: colors.brand[500], color: "#fff", border: "none",
            fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
            cursor: statusActionBusy ? "not-allowed" : "pointer", opacity: statusActionBusy ? 0.7 : 1,
          }}>
            {statusActionBusy ? <Loader2 size={14} className="animate-spin" /> : <ChefHat size={14} />} بدء التجهيز
          </button>
        )}
        {canMarkReady && (
          <button onClick={handleMarkReady} disabled={statusActionBusy} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 12px", borderRadius: radius.lg,
            background: colors.semantic.success, color: "#fff", border: "none",
            fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
            cursor: statusActionBusy ? "not-allowed" : "pointer", opacity: statusActionBusy ? 0.7 : 1,
          }}>
            {statusActionBusy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} الطلب جاهز
          </button>
        )}
        {canAssignDriver && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowDriverPicker(v => !v)}
              disabled={actionBusy}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "8px 12px", borderRadius: radius.lg,
                background: `color-mix(in srgb, #F97316 8%, transparent)`, border: `1px solid color-mix(in srgb, #F97316 25%, transparent)`,
                color: "#F97316", fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
                cursor: actionBusy ? "not-allowed" : "pointer",
              }}
            >
              {actionBusy ? <Loader2 size={14} className="animate-spin" /> : <Bike size={14} />}
              تعيين سائق <ChevronDown size={12} />
            </button>
            {showDriverPicker && (
              <div style={{
                position: "absolute", top: "100%", right: 0, left: 0, marginTop: 4, zIndex: 20,
                background: colors.neutral[0], border: `1px solid ${colors.border.default}`, borderRadius: radius.lg,
                boxShadow: shadows.lg, maxHeight: 180, overflowY: "auto",
              }}>
                {availableDrivers.length === 0 ? (
                  <p style={{ padding: 12, fontSize: "11px", color: colors.neutral[400], textAlign: "center" }}>لا يوجد سائقون متاحون الآن</p>
                ) : (
                  availableDrivers.map(driver => (
                    <button
                      key={driver.id}
                      onClick={() => handleAssign(driver.id)}
                      style={{
                        width: "100%", textAlign: "right", padding: "8px 12px",
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: "12px", color: colors.neutral[800],
                        borderBottom: `1px solid ${colors.border.subtle}`,
                      }}
                    >
                      {driver.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {canMarkDelivered && (
          <button
            onClick={handleDeliver}
            disabled={actionBusy}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "8px 12px", borderRadius: radius.lg,
              background: colors.semantic.success, color: "#fff", border: "none",
              fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
              cursor: actionBusy ? "not-allowed" : "pointer", opacity: actionBusy ? 0.7 : 1,
            }}
          >
            {actionBusy ? <Loader2 size={14} className="animate-spin" /> : "✓"} تم التسليم
          </button>
        )}

        <button
          onClick={onOpen}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 12px", borderRadius: radius.lg,
            background: colors.neutral[100], color: colors.neutral[700], border: "none",
            fontSize: typography.size.sm, fontWeight: typography.weight.semibold, cursor: "pointer",
          }}
        >
          فتح الطلب <ArrowLeft size={14} />
        </button>
      </div>
    </div>
  );
};

export default OrderCard;
