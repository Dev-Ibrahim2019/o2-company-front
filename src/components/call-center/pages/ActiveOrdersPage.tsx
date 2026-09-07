import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart, Clock, ChefHat, Truck, CreditCard, RefreshCw,
  Loader2, Package, ArrowLeft, User, Phone, Search, AlertCircle, CalendarClock,
} from "lucide-react";
import { colors, typography, radius, shadows, transitions } from "../design/tokens";
import { callCenterService, type ActiveCallCenterOrder, type ActiveOrderScope } from "../services/callCenterService";
import { toast } from "../../shared/Toast";
import {
  dedupeActiveOrders, derivePaymentStatus, getOrderStaleness, getOrderReference, formatShekel,
  PAYMENT_STATUS_LABELS,
} from "../activeOrdersView";

// مدة التحضير الافتراضية (بالدقائق) قبل موعد الطلب المجدول — تُستخدم لتنبيه الموظف مسبقًا.
// MVP بالفرونت عبر polling كل دقيقة؛ الأفضل لاحقًا نقل هذا المنطق لـ cron job بالباك اند.
const SCHEDULED_PREP_MINUTES = 20;

// "نشطة تشغيليًا" = أي طلب نشط أصلاً (نفس نطاق operational_active بكل نقاط الاستخدام الأخرى —
// راجع activeOrderScopeLabels بـ CallCenterWorkspace.tsx). قبل كده كانت مسمّاة هون "قيد التنفيذ"
// وهذا غلط: كل طلب نشط ينتمي لهاد النطاق تلقائيًا بغض النظر عن حالته الفعلية (حتى لو "قيد
// الانتظار")، فكانت التسمية تناقض badge حالة الطلب جوا الكارت نفسه.
const SCOPE_CONFIG: Record<ActiveOrderScope, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  operational_active: { label: "نشطة تشغيليًا", icon: <Package size={18} />, color: colors.semantic.info, bgColor: colors.semantic.infoBg },
  awaiting_payment:   { label: "بانتظار الدفع", icon: <CreditCard size={18} />, color: colors.semantic.warning, bgColor: colors.semantic.warningBg },
  kitchen_active:     { label: "في المطبخ", icon: <ChefHat size={18} />, color: "#8b5cf6", bgColor: "rgba(139,92,246,0.08)" },
  delivery_active:    { label: "قيد التوصيل", icon: <Truck size={18} />, color: colors.semantic.success, bgColor: colors.semantic.successBg },
  no_branch:          { label: "بانتظار الفرع", icon: <AlertCircle size={18} />, color: colors.semantic.error, bgColor: colors.semantic.errorBg },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: colors.semantic.warning },
  pending_confirmation: { label: "بانتظار التأكيد", color: colors.semantic.warning },
  confirmed: { label: "مؤكد", color: colors.semantic.info },
  in_progress: { label: "قيد التنفيذ", color: colors.semantic.info },
  ready: { label: "جاهز", color: colors.semantic.success },
  PREPARATION: { label: "قيد التحضير", color: "#8b5cf6" },
  ASSEMBLING: { label: "جاري التجهيز", color: "#8b5cf6" },
  served: { label: "تم التقديم", color: colors.semantic.success },
  paid: { label: "مدفوع", color: colors.semantic.success },
  pending_payment: { label: "بانتظار الدفع", color: colors.semantic.warning },
  READY_FOR_DELIVERY: { label: "جاهز للتوصيل", color: colors.semantic.success },
  OUT_FOR_DELIVERY: { label: "خرج للتوصيل", color: colors.semantic.success },
  DELIVERED: { label: "تم التوصيل", color: colors.semantic.success },
  cancelled: { label: "ملغي", color: colors.semantic.error },
  CANCELLED: { label: "ملغي", color: colors.semantic.error },
  scheduled: { label: "مجدول", color: "#8b5cf6" },
};

const scheduleCountdown = (scheduledAt: string) => {
  const diffMin = Math.round((new Date(scheduledAt).getTime() - Date.now()) / 60000);
  if (diffMin <= 0) return "حان موعده";
  if (diffMin < 60) return `بعد ${diffMin} دقيقة`;
  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `بعد ${hrs} ساعة${mins > 0 ? ` و${mins} دقيقة` : ""}`;
};

const ORDER_TYPE_MAP: Record<string, string> = {
  dine_in: "محلي",
  takeaway: "فوري",
  delivery: "توصيل",
};

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
};
const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return `منذ ${Math.floor(hrs / 24)} يوم`;
};

// ============================================================================
// ACTIVE ORDERS PAGE
// ============================================================================

export const ActiveOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Record<ActiveOrderScope, ActiveCallCenterOrder[]>>({
    operational_active: [], awaiting_payment: [], kitchen_active: [], delivery_active: [], no_branch: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeScope, setActiveScope] = useState<ActiveOrderScope | "all">("all");

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await callCenterService.getActiveOrders();
      setOrders(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "تعذر تحميل الطلبات النشطة");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // تنبيه بسيط عند اقتراب موعد الطلبات المجدولة (فرق موعد الجدولة عن الآن أقل من مدة التحضير الافتراضية).
  // MVP بالفرونت via polling كل دقيقة — الأفضل لاحقًا تحويله لـ cron job بالباك اند يغيّر الحالة تلقائيًا.
  const notifiedScheduledIds = useRef<Set<number>>(new Set());
  useEffect(() => {
    const list = Object.values(orders).flat();
    const checkSchedule = () => {
      list.forEach(o => {
        if (o.status !== "scheduled" || !o.scheduled_at) return;
        const prepStartsAt = new Date(o.scheduled_at).getTime() - SCHEDULED_PREP_MINUTES * 60000;
        if (Date.now() >= prepStartsAt && !notifiedScheduledIds.current.has(o.id)) {
          notifiedScheduledIds.current.add(o.id);
          toast.info("طلب مجدول اقترب موعده", `#${o.order_number} — حان وقت بدء التحضير`);
        }
      });
    };
    checkSchedule();
    const interval = setInterval(checkSchedule, 60000);
    return () => clearInterval(interval);
  }, [orders]);

  // نفس الطلب ممكن يرجع من الباك اند تحت أكتر من نطاق واحد (مثلاً "نشطة تشغيليًا" +
  // "بانتظار الدفع" بنفس الوقت) — هاد شرعي ومقصود، لكن لازم يظهر مرة وحدة بس بقائمة "الكل"
  // والعداد. dedupeActiveOrders بتدمج كل النطاقات وتشيل التكرار بالاعتماد على order.id.
  const allOrders = dedupeActiveOrders(orders);
  const filtered = allOrders
    .filter(o => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = (o.customer_name || "").toLowerCase().includes(q)
          || o.order_number.toLowerCase().includes(q)
          || (o.customer_phone || "").includes(q);
        if (!match) return false;
      }
      if (activeScope !== "all") {
        if (!o.scopes.includes(activeScope)) return false;
      }
      return true;
    })
    // الطلبات المجدولة تعلو القائمة، الأقرب موعدًا أولاً — بقية الطلبات تحافظ على ترتيبها الأصلي (الأحدث أولاً من الباك اند)
    .sort((a, b) => {
      const aScheduled = a.status === "scheduled" && a.scheduled_at;
      const bScheduled = b.status === "scheduled" && b.scheduled_at;
      if (aScheduled && bScheduled) return new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime();
      if (aScheduled) return -1;
      if (bScheduled) return 1;
      return 0;
    });

  const totalActive = allOrders.length;
  const scopeCounts = Object.entries(orders).map(([scope, items]) => ({
    scope: scope as ActiveOrderScope,
    count: items.length,
  }));

  return (
    <div dir="rtl" style={{ fontFamily: typography.fontFamily.sans, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
            الطلبات النشطة
          </h1>
          <p style={{ fontSize: typography.size.sm, color: colors.neutral[500], marginTop: 4 }}>
            {totalActive} طلب نشط — يتم التحديث تلقائيًا
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 16px", borderRadius: radius.lg,
            background: colors.neutral[0], border: `1px solid ${colors.border.default}`,
            color: colors.neutral[700], fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
            cursor: loading ? "not-allowed" : "pointer", transition: `all ${transitions.fast}`,
          }}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          تحديث
        </button>
      </div>

      {/* Scope Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <ScopeTab
          label="الكل"
          count={totalActive}
          active={activeScope === "all"}
          color={colors.neutral[600]}
          onClick={() => setActiveScope("all")}
        />
        {scopeCounts.map(({ scope, count }) => {
          const cfg = SCOPE_CONFIG[scope];
          return (
            <ScopeTab
              key={scope}
              label={cfg.label}
              count={count}
              active={activeScope === scope}
              color={cfg.color}
              onClick={() => setActiveScope(scope)}
            />
          );
        })}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, position: "relative" }}>
        <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: colors.neutral[400] }} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="بحث برقم الطلب، اسم العميل، أو رقم الهاتف..."
          style={{
            width: "100%", height: 44, padding: "0 40px 0 12px",
            border: `1px solid ${colors.border.default}`, borderRadius: radius.lg,
            fontSize: typography.size.sm, outline: "none",
            background: colors.neutral[0], transition: `border-color ${transitions.fast}`,
          }}
          onFocus={e => e.currentTarget.style.borderColor = colors.brand[500]}
          onBlur={e => e.currentTarget.style.borderColor = colors.border.default}
        />
      </div>

      {/* Content */}
      {loading && allOrders.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
          <Loader2 size={32} className="animate-spin" style={{ color: colors.brand[500] }} />
        </div>
      ) : error ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0",
          background: colors.semantic.errorBg, borderRadius: radius.xl, border: `1px solid ${colors.semantic.errorBorder}`,
        }}>
          <AlertCircle size={32} style={{ color: colors.semantic.error, marginBottom: 12 }} />
          <p style={{ fontSize: typography.size.sm, color: colors.semantic.error }}>{error}</p>
          <button onClick={fetchOrders} style={{
            marginTop: 12, padding: "8px 16px", borderRadius: radius.lg,
            background: colors.semantic.error, color: "#fff", border: "none",
            fontSize: typography.size.sm, fontWeight: typography.weight.semibold, cursor: "pointer",
          }}>
            إعادة المحاولة
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0",
          background: colors.neutral[50], borderRadius: radius.xl,
        }}>
          <ShoppingCart size={32} style={{ color: colors.neutral[300], marginBottom: 12 }} />
          <p style={{ fontSize: typography.size.sm, color: colors.neutral[500] }}>
            {searchQuery ? "لا توجد نتائج مطابقة" : "لا توجد طلبات نشطة حاليًا"}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filtered.map(order => (
            <OrderCard key={order.id} order={order} onOpen={() => navigate(`/call-center/orders/${order.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SCOPE TAB
// ============================================================================

const ScopeTab: React.FC<{ label: string; count: number; active: boolean; color: string; onClick: () => void }> = ({
  label, count, active, color, onClick,
}) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "8px 14px", borderRadius: radius.full,
      background: active ? `color-mix(in srgb, ${color} 8%, transparent)` : "transparent",
      border: `1.5px solid ${active ? `color-mix(in srgb, ${color} 25%, transparent)` : colors.border.subtle}`,
      color: active ? color : colors.neutral[500],
      fontSize: typography.size.xs, fontWeight: typography.weight.semibold,
      cursor: "pointer", transition: `all ${transitions.fast}`,
    }}
  >
    {label}
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 20, height: 20, padding: "0 6px", borderRadius: radius.full,
      background: active ? `color-mix(in srgb, ${color} 13%, transparent)` : colors.neutral[100],
      fontSize: "11px", fontWeight: typography.weight.bold,
    }}>
      {count}
    </span>
  </button>
);

// ============================================================================
// ORDER CARD — كل كارد = طلب واحد فقط، مع أهم المعلومات ظاهرة بصريًا وزر واحد واضح لفتح الطلب
// ============================================================================

const OrderCard: React.FC<{ order: ActiveCallCenterOrder; onOpen: () => void }> = ({ order, onOpen }) => {
  const primaryScope = order.scopes[0];
  const scopeCfg = primaryScope ? SCOPE_CONFIG[primaryScope] : null;
  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: colors.neutral[500] };
  // حالة الدفع مستقلة عن حالة الطلب أعلاه — معتمد/قيد التحضير لا يعني تلقائيًا إن الدفع تم
  // (دفع عند الاستلام مثلاً)، فبنعرض الاثنين كـ badge منفصل كل واحد.
  const paymentStatus = derivePaymentStatus(order);
  const paymentColor = paymentStatus === "paid" ? colors.semantic.success
    : paymentStatus === "awaiting_payment" ? colors.semantic.warning
    : colors.neutral[500];
  const staleness = getOrderStaleness(order.created_at);
  const timeColor = staleness === "critical" ? colors.semantic.error
    : staleness === "warning" ? colors.semantic.warning
    : colors.neutral[500];

  return (
    <div
      style={{
        display: "flex", flexDirection: "column", gap: 10,
        padding: "16px 18px", borderRadius: radius.xl,
        background: colors.neutral[0], border: `1px solid ${colors.border.subtle}`,
        boxShadow: shadows.xs, transition: `all ${transitions.normal}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = shadows.md; e.currentTarget.style.borderColor = colors.brand[300]; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = shadows.xs; e.currentTarget.style.borderColor = colors.border.subtle; }}
    >
      {/* رأس الكارد: مرجع قصير + نوع الطلب + النطاق */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {scopeCfg && (
            <div style={{
              width: 32, height: 32, borderRadius: radius.md,
              background: scopeCfg.bgColor, display: "flex", alignItems: "center", justifyContent: "center",
              color: scopeCfg.color, flexShrink: 0,
            }}>
              {scopeCfg.icon}
            </div>
          )}
          <span title={order.order_number} style={{ fontSize: typography.size.lg, fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
            {getOrderReference(order.order_number)}
          </span>
        </div>
        <span style={{
          padding: "2px 8px", borderRadius: radius.full,
          fontSize: "11px", fontWeight: typography.weight.semibold,
          background: colors.neutral[100], color: colors.neutral[600],
        }}>
          {ORDER_TYPE_MAP[order.order_type] || order.order_type}
        </span>
      </div>

      {/* العميل */}
      {(order.customer_name || order.customer_phone) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {order.customer_name && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.neutral[800] }}>
              <User size={13} style={{ color: colors.neutral[400] }} /> {order.customer_name}
            </span>
          )}
          {order.customer_phone && (
            <span dir="ltr" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: typography.size.xs, color: colors.neutral[500] }}>
              <Phone size={12} style={{ color: colors.neutral[400] }} /> {order.customer_phone}
            </span>
          )}
        </div>
      )}

      {/* القيمة */}
      <span style={{ fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
        {formatShekel(order.total)}
      </span>

      {/* حالة الطلب + حالة الدفع — مستقلتان، بلون ونص معًا (مش لون بس) */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 9px", borderRadius: radius.full,
          fontSize: "11px", fontWeight: typography.weight.semibold,
          background: `color-mix(in srgb, ${statusInfo.color} 12%, transparent)`, color: statusInfo.color,
        }}>
          ● {statusInfo.label}
        </span>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 9px", borderRadius: radius.full,
          fontSize: "11px", fontWeight: typography.weight.semibold,
          background: `color-mix(in srgb, ${paymentColor} 12%, transparent)`, color: paymentColor,
        }}>
          ● {PAYMENT_STATUS_LABELS[paymentStatus]}
        </span>
        {order.status === "scheduled" && order.scheduled_at && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 9px", borderRadius: radius.full,
            fontSize: "11px", fontWeight: typography.weight.semibold,
            background: "rgba(139,92,246,0.1)", color: "#8b5cf6",
          }}>
            <CalendarClock size={11} /> {formatTime(order.scheduled_at)} · {scheduleCountdown(order.scheduled_at)}
          </span>
        )}
      </div>

      {/* عمر الطلب + الفرع */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: typography.size.xs, color: colors.neutral[500] }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, color: timeColor, fontWeight: staleness === "normal" ? undefined : typography.weight.semibold }}>
          <Clock size={12} /> {timeAgo(order.created_at)}
        </span>
        {order.branch && <span>{order.branch.name}</span>}
      </div>

      {/* فتح الطلب */}
      <button
        onClick={onOpen}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          marginTop: 4, padding: "9px 12px", borderRadius: radius.lg,
          background: colors.brand[500], color: "#fff", border: "none",
          fontSize: typography.size.sm, fontWeight: typography.weight.semibold, cursor: "pointer",
          transition: `all ${transitions.fast}`,
        }}
      >
        فتح الطلب <ArrowLeft size={14} />
      </button>
    </div>
  );
};

export default ActiveOrdersPage;
