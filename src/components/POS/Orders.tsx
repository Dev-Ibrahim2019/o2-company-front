import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../../store";
import { useAuth } from "../../auth";
import { ROLES } from "../../auth/permissions";
import { useOrders } from "../../hooks/useOrders";
import { orderService } from "../../services/orderService";
import type {
  OrderFromApi,
  OrderStatus as ApiOrderStatus,
  OrderType as ApiOrderType,
} from "../../services/orderService";
import {
  Banknote,
  AlertTriangle,
  Ban,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Columns3,
  CreditCard,
  Edit3,
  FileText,
  Flame,
  Hash,
  LayoutGrid,
  Loader2,
  Landmark,
  PackageOpen,
  Phone,
  Printer,
  RotateCcw,
  Search,
  Table2,
  Timer,
  User,
  Wallet,
  Truck,
  MapPin,
  Zap,
  X,
} from "lucide-react";
import type { AvailableDeliveryDriver } from "../../services/orderService";
import { settlementService, type PaymentMethodDto } from "../../services/settlementService";

type OrdersTab = "ACTIVE" | "CLOSED";
type TypeFilter = ApiOrderType | "ALL";
type StatusFilter = ApiOrderStatus | "ALL";
type ViewMode = "board" | "cards" | "table";
type TimeFilter = "ALL" | "LATE" | "ENDING_SOON" | "URGENT";

const CLOSED_STATUSES: ApiOrderStatus[] = ["CANCELLED", "paid", "cancelled"];
const ACTIVE_STATUSES: ApiOrderStatus[] = [
  "PENDING_PAYMENT",
  "PREPARATION",
  "OUT_FOR_DELIVERY",
  "pending",
  "confirmed",
  "in_progress",
  "ready",
  "DELIVERED",
  "served",
];

const ACTIVE_BOARD_COLUMNS: Array<{
  status: ApiOrderStatus;
  title: string;
  icon: typeof ClipboardList;
}> = [
  { status: "pending", title: "قيد الاستلام", icon: ClipboardList },
  { status: "confirmed", title: "أرسل للمطبخ", icon: Flame },
  { status: "in_progress", title: "قيد التحضير", icon: Loader2 },
  { status: "ready", title: "جاهز للتسليم", icon: CheckCircle2 },
  { status: "served", title: "بانتظار الدفع", icon: Wallet },
];

const getBranchFilter = (currentUser: unknown) => {
  const user = currentUser as { branch_id?: number | string; branchId?: number | string } | null;
  const rawBranchId = user?.branch_id ?? user?.branchId;
  const branchId =
    typeof rawBranchId === "number" ? rawBranchId : Number(rawBranchId);

  return Number.isFinite(branchId) ? { branch_id: branchId } : undefined;
};

const isClosedOrder = (status: ApiOrderStatus) =>
  CLOSED_STATUSES.includes(status);

const normalizeUiStatus = (status: ApiOrderStatus): ApiOrderStatus => {
  if (status === "PENDING_PAYMENT") return "pending";
  if (status === "PREPARATION") return "in_progress";
  if (status === "OUT_FOR_DELIVERY") return "ready";
  if (status === "DELIVERED") return "served";
  if (status === "CANCELLED") return "cancelled";
  return status;
};

const getElapsedMinutes = (order: OrderFromApi) => {
  const timerStart = order.paid_at || order.created_at;
  const createdAt = new Date(timerStart).getTime();
  if (!Number.isFinite(createdAt)) return 0;
  return Math.max(0, Math.floor((Date.now() - createdAt) / 60000));
};

const isUrgentOrder = (order: OrderFromApi) => {
  const text = `${order.note ?? ""} ${order.customer_name ?? ""}`.toLowerCase();
  return (
    text.includes("urgent") ||
    text.includes("vip") ||
    text.includes("مستعجل") ||
    text.includes("عاجل")
  );
};

const getOrderTimeState = (order: OrderFromApi) => {
  const elapsed = getElapsedMinutes(order);
  const activeCooking = ["confirmed", "in_progress"].includes(normalizeUiStatus(order.status));

  if (activeCooking && elapsed >= 15) return "late";
  if (activeCooking && elapsed >= 10) return "endingSoon";
  if (isUrgentOrder(order)) return "urgent";
  return "normal";
};

const matchesTimeFilter = (order: OrderFromApi, filter: TimeFilter) => {
  if (filter === "ALL") return true;
  const timeState = getOrderTimeState(order);
  if (filter === "LATE") return timeState === "late";
  if (filter === "ENDING_SOON") return timeState === "endingSoon";
  if (filter === "URGENT") return timeState === "urgent";
  return true;
};

const getOrderCardClassName = (order: OrderFromApi) => {
  const timeState = getOrderTimeState(order);

  if (isClosedOrder(order.status)) {
    return "border-emerald-500/25 bg-emerald-500/10 shadow-emerald-950/20";
  }

  if (timeState === "late") {
    return "border-red-500/70 bg-red-500/10 shadow-red-950/40 animate-pulse";
  }

  if (timeState === "endingSoon") {
    return "border-amber-400/45 bg-amber-500/10 shadow-amber-950/30";
  }

  if (timeState === "urgent") {
    return "border-fuchsia-400/40 bg-fuchsia-500/10 shadow-fuchsia-950/30";
  }

  switch (normalizeUiStatus(order.status)) {
    case "served":
      return "border-amber-400/35 bg-amber-500/10 shadow-amber-950/20";
    case "in_progress":
      return "border-blue-400/30 bg-blue-500/10 shadow-blue-950/20";
    case "ready":
      return "border-emerald-400/30 bg-emerald-500/10 shadow-emerald-950/20";
    case "confirmed":
      return "border-sky-400/30 bg-sky-500/10 shadow-sky-950/20";
    case "pending":
    default:
      return "border-slate-700/80 bg-slate-900 shadow-black/20";
  }
};

const getTimeBadge = (order: OrderFromApi) => {
  const elapsed = getElapsedMinutes(order);
  const state = getOrderTimeState(order);
  if (state === "late") return { label: `متأخر ${elapsed} د`, className: "bg-red-500 text-white", icon: AlertTriangle };
  if (state === "endingSoon") return { label: `قارب ${elapsed} د`, className: "bg-amber-400 text-slate-950", icon: Timer };
  if (state === "urgent") return { label: "مستعجل", className: "bg-fuchsia-500 text-white", icon: Flame };
  return { label: `${elapsed} د`, className: "bg-slate-800 text-slate-300", icon: Clock3 };
};

const getTimelineSteps = (order: OrderFromApi) => {
  const status = normalizeUiStatus(order.status);
  const firstTicket = order.tickets?.[0];
  const activeTicket = order.tickets?.find((ticket) => ticket.started_at) ?? firstTicket;

  return [
    {
      title: "تم الاستلام",
      time: order.created_at,
      done: true,
      note: `طلب #${order.order_number}`,
    },
    {
      title: "أرسل للمطبخ",
      time: firstTicket?.created_at ?? (["confirmed", "in_progress", "ready", "served", "paid"].includes(status) ? order.updated_at : null),
      done: ["confirmed", "in_progress", "ready", "served", "paid"].includes(status) || Boolean(firstTicket),
      note: firstTicket?.department?.name ?? "تذاكر الإنتاج",
    },
    {
      title: "بدء التحضير",
      time: activeTicket?.started_at ?? (["in_progress", "ready", "served", "paid"].includes(status) ? order.updated_at : null),
      done: ["in_progress", "ready", "served", "paid"].includes(status) || Boolean(activeTicket?.started_at),
      note: activeTicket?.ticket_number ?? "قيد المتابعة",
    },
    {
      title: "جاهز/تم التسليم",
      time: firstTicket?.completed_at ?? (["ready", "served", "paid"].includes(status) ? order.updated_at : null),
      done: ["ready", "served", "paid"].includes(status),
      note: getLifecycleStatusLabel(order.status),
    },
  ];
};

const getStatusColor = (status: ApiOrderStatus) => {
  switch (normalizeUiStatus(status)) {
    case "pending":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "confirmed":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "in_progress":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "ready":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "served":
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    case "paid":
      return "bg-slate-500/10 text-slate-300 border-slate-500/20";
    case "cancelled":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
};

const getStatusDotColor = (status: ApiOrderStatus) => {
  switch (normalizeUiStatus(status)) {
    case "pending":
      return "bg-yellow-400";
    case "confirmed":
      return "bg-blue-400";
    case "in_progress":
      return "bg-orange-400";
    case "ready":
      return "bg-emerald-400";
    case "served":
      return "bg-cyan-400";
    case "paid":
      return "bg-slate-300";
    case "cancelled":
      return "bg-red-400";
    default:
      return "bg-slate-400";
  }
};

const getStatusLabel = (status: ApiOrderStatus) => {
  switch (normalizeUiStatus(status)) {
    case "pending":
      return "محفوظ";
    case "confirmed":
      return "مرسل للأقسام";
    case "in_progress":
      return "قيد التحضير";
    case "ready":
      return "جاهز";
    case "served":
      return "تم التسليم";
    case "paid":
      return "مغلق ماليا";
    case "cancelled":
      return "ملغي";
    default:
      return "غير معروف";
  }
};

const getOrderTypeLabel = (type: ApiOrderType) =>
  type === "dine_in" ? "محلي" : "سفري";

const getLifecycleStatusLabel = (status: ApiOrderStatus) => {
  switch (normalizeUiStatus(status)) {
    case "pending":
      return "محفوظ / بانتظار الدفع";
    case "confirmed":
    case "in_progress":
      return "قيد التحضير";
    case "ready":
      return "جاهز / مع الدليفري";
    case "served":
    case "paid":
      return "مكتمل / تم التسليم";
    case "cancelled":
      return "ملغي";
    default:
      return "غير معروف";
  }
};

const getLifecycleStatusColor = (status: ApiOrderStatus) => {
  switch (normalizeUiStatus(status)) {
    case "pending":
      return "bg-orange-500/10 text-orange-300 border-orange-400/25";
    case "confirmed":
    case "in_progress":
      return "bg-blue-500/10 text-blue-300 border-blue-400/25";
    case "ready":
      return "bg-yellow-500/10 text-yellow-300 border-yellow-400/25";
    case "served":
    case "paid":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-400/25";
    case "cancelled":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
};

const getLifecycleStatusDotColor = (status: ApiOrderStatus) => {
  switch (normalizeUiStatus(status)) {
    case "pending":
      return "bg-orange-300";
    case "confirmed":
    case "in_progress":
      return "bg-blue-300";
    case "ready":
      return "bg-yellow-300";
    case "served":
    case "paid":
      return "bg-emerald-300";
    case "cancelled":
      return "bg-red-400";
    default:
      return "bg-slate-400";
  }
};

const getLifecycleCardClassName = (order: OrderFromApi) => {
  const timeState = getOrderTimeState(order);

  if (timeState === "late") return "border-red-500/70 bg-red-500/10 shadow-red-950/40";
  if (timeState === "endingSoon") return "border-amber-400/45 bg-amber-500/10 shadow-amber-950/30";
  if (timeState === "urgent") return "border-fuchsia-400/40 bg-fuchsia-500/10 shadow-fuchsia-950/30";

  switch (normalizeUiStatus(order.status)) {
    case "pending":
      return "border-orange-300/30 bg-orange-500/10 shadow-orange-950/20";
    case "confirmed":
    case "in_progress":
      return "border-blue-400/30 bg-blue-500/10 shadow-blue-950/20";
    case "ready":
      return "border-yellow-400/35 bg-yellow-500/10 shadow-yellow-950/20";
    case "served":
    case "paid":
      return "border-emerald-400/30 bg-emerald-500/10 shadow-emerald-950/20";
    case "cancelled":
      return "border-red-500/35 bg-red-500/10 shadow-red-950/20";
    default:
      return "border-slate-700/80 bg-slate-900 shadow-black/20";
  }
};

const getLifecycleOrderTypeLabel = (type: ApiOrderType) =>
  type === "dine_in" ? "محلي" : type === "delivery" ? "دليفري" : "سفري";

const LIFECYCLE_BOARD_COLUMNS: Array<{
  key: string;
  statuses: ApiOrderStatus[];
  title: string;
  icon: typeof ClipboardList;
}> = [
  { key: "waiting-payment", statuses: ["PENDING_PAYMENT", "pending"], title: "محفوظ / بانتظار الدفع", icon: Wallet },
  { key: "preparing", statuses: ["PREPARATION", "confirmed", "in_progress"], title: "قيد التحضير", icon: Loader2 },
  { key: "with-delivery", statuses: ["OUT_FOR_DELIVERY", "ready"], title: "جاهز / مع الدليفري", icon: CheckCircle2 },
  { key: "delivered", statuses: ["DELIVERED", "served"], title: "تم التسليم للعميل", icon: PackageOpen },
];

const getPaymentIcon = (method?: string | null) => {
  switch (method) {
    case "credit_card":
    case "card":
      return <CreditCard size={14} />;
    case "wallet":
      return <Wallet size={14} />;
    case "bank_transfer":
    case "bank":
      return <Landmark size={14} />;
    case "cash":
    default:
      return <Banknote size={14} />;
  }
};

const getPaymentLabel = (method?: string | null) => {
  switch (method) {
    case "cash":
      return "كاش";
    case "credit_card":
    case "card":
      return "بطاقة";
    case "wallet":
      return "محفظة";
    case "bank_transfer":
    case "bank":
      return "بنكي";
    default:
      return "لم يحدد";
  }
};

const formatMoney = (value: number) => `${Number(value || 0).toFixed(2)} ₪`;
const RATING_LABELS = ["سيئ", "ضعيف", "جيد", "جيد جداً", "ممتاز"];
const StarRating = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => (
  <fieldset className="mt-5"><legend className="text-sm font-black text-slate-200">{label} — {RATING_LABELS[value - 1]}</legend>
    <div role="radiogroup" aria-label={`تقييم ${label}`} className="mt-3 grid grid-cols-5 gap-2">
      {RATING_LABELS.map((description, index) => { const rating = index + 1; const selected = value === rating; return <button key={rating} type="button" role="radio" aria-checked={selected} aria-label={`${description}، ${rating} من 5`} tabIndex={selected ? 0 : -1} onClick={() => onChange(rating)} onKeyDown={(event) => { if (!["ArrowRight","ArrowLeft","ArrowUp","ArrowDown"].includes(event.key)) return; event.preventDefault(); const next = Math.min(5, Math.max(1, rating + (["ArrowRight","ArrowUp"].includes(event.key) ? 1 : -1))); onChange(next); (event.currentTarget.parentElement?.children[next - 1] as HTMLElement | undefined)?.focus(); }} className={`min-h-20 rounded-2xl border p-2 focus:outline-none focus:ring-2 focus:ring-amber-300 ${selected ? "border-amber-200 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-lg" : "border-white/10 bg-slate-950/70 text-slate-400"}`}><span aria-hidden="true" className="block text-2xl">★</span><span className="mt-2 block text-[10px] font-black leading-tight">{description}</span></button>; })}
    </div>
  </fieldset>
);

const formatDeliveryAddress = (snapshot: OrderFromApi["delivery_address_snapshot"]) => {
  if (!snapshot) return "لا يوجد عنوان محفوظ";
  if (typeof snapshot === "string") { try { return formatDeliveryAddress(JSON.parse(snapshot) as Record<string, unknown>); } catch { return snapshot; } }
  const keys = ["label", "city", "area", "street", "building_no", "floor", "apartment", "landmark", "delivery_notes"];
  return keys.map((key) => snapshot[key]).filter(Boolean).join("، ") || "لا يوجد عنوان محفوظ";
};

export const OrdersView = () => {
  const { currentShift, currentUser } = useApp();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const branchFilter = useMemo(() => getBranchFilter(currentUser), [currentUser]);
  const { orders, loading, error, refetch } = useOrders(branchFilter);

  const [activeTab, setActiveTab] = useState<OrdersTab>("ACTIVE");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [transferredOrderIds, setTransferredOrderIds] = useState<number[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderFromApi | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<OrderFromApi | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDto[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number | null>(null);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderFromApi | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [deliveryTarget, setDeliveryTarget] = useState<OrderFromApi | null>(null);
  const [drivers, setDrivers] = useState<AvailableDeliveryDriver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [deliveryDetailsTarget, setDeliveryDetailsTarget] = useState<OrderFromApi | null>(null);
  const [deliveryConfirmTarget, setDeliveryConfirmTarget] = useState<OrderFromApi | null>(null);
  const [performanceTarget, setPerformanceTarget] = useState<OrderFromApi | null>(null);
  const [feedbackPanelTarget, setFeedbackPanelTarget] = useState<OrderFromApi | null>(null);
  const [feedback, setFeedback] = useState({ food_rating: 5, delivery_rating: 5, speed_rating: 5, notes: "", contacted: true });
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const qualityDialogRef = useRef<HTMLElement | null>(null);
  const qualityTriggerRef = useRef<HTMLElement | null>(null);
  const [, setClockTick] = useState(0);
  const cancelReasonRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => { if (!deliveryDetailsTarget) return; const timer = window.setInterval(() => setClockTick((value) => value + 1), 30000); return () => window.clearInterval(timer); }, [deliveryDetailsTarget]);
  useEffect(() => {
    if (!performanceTarget && !feedbackPanelTarget) return;
    qualityDialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { setPerformanceTarget(null); setFeedbackPanelTarget(null); qualityTriggerRef.current?.focus(); } };
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  }, [performanceTarget, feedbackPanelTarget]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = new Date(order.created_at);
      const isInShift = currentShift
        ? orderDate >= new Date(currentShift.startTime)
        : true;

      if (!isInShift) return false;

      const matchesTab =
        activeTab === "ACTIVE"
          ? !isClosedOrder(order.status)
          : isClosedOrder(order.status);

      const matchesStatus =
        statusFilter === "ALL" || order.status === statusFilter;
      const matchesType =
        typeFilter === "ALL" || order.order_type === typeFilter;

      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        order.order_number.toLowerCase().includes(normalizedSearch) ||
        (order.customer_name ?? "").toLowerCase().includes(normalizedSearch) ||
        (order.customer_phone ?? "").includes(normalizedSearch);

      const matchesTime =
        activeTab !== "ACTIVE" || matchesTimeFilter(order, timeFilter);

      return matchesTab && matchesStatus && matchesType && matchesSearch && matchesTime;
    });
  }, [activeTab, currentShift, orders, searchTerm, statusFilter, timeFilter, typeFilter]);

  const activeCount = orders.filter((order) => !isClosedOrder(order.status)).length;
  const closedCount = orders.filter((order) => isClosedOrder(order.status)).length;
  const lateCount = orders.filter((order) => !isClosedOrder(order.status) && getOrderTimeState(order) === "late").length;
  const endingSoonCount = orders.filter((order) => !isClosedOrder(order.status) && getOrderTimeState(order) === "endingSoon").length;
  const urgentCount = orders.filter((order) => !isClosedOrder(order.status) && getOrderTimeState(order) === "urgent").length;

  const refreshOrders = () => refetch(branchFilter);

  const editOrderInPos = (order: OrderFromApi) => {
    const isCallCenter = authUser?.roles?.includes(ROLES.CALL_CENTER);
    navigate(`${isCallCenter ? "/pos/call-center/pos" : "/pos"}?editOrderId=${order.id}`);
  };

  const closeOrder = async (order: OrderFromApi) => {
    if (isClosedOrder(order.status)) return;
    setPaymentTarget(order);
    setPaymentReference("");
    setPaymentError(null);
    setPaymentMethodsLoading(true);
    setSelectedPaymentMethodId(null);
    try {
      const methods = (await settlementService.getPaymentMethods(authUser?.roles?.includes(ROLES.CALL_CENTER))).filter((method) => method.is_active);
      setPaymentMethods(methods);
      if (!methods.length) setPaymentError("لا توجد طرق دفع فعالة مرتبطة بحسابات مالية");
    } catch (e: unknown) {
      setPaymentMethods([]);
      setPaymentError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "تعذر تحميل طرق الدفع والحسابات من الخادم");
    } finally { setPaymentMethodsLoading(false); }
  };

  const confirmOrderPayment = async () => {
    if (!paymentTarget) return;
    const selectedMethod = paymentMethods.find((method) => method.id === selectedPaymentMethodId);
    if (!selectedMethod) { setPaymentError("اختر طريقة الدفع والصندوق أو الحساب المستلم"); return; }
    const transactionId = paymentReference.trim();
    if (selectedMethod.type !== "cash" && !transactionId) {
      setPaymentError("الرقم المرجعي لعملية الدفع مطلوب");
      return;
    }

    setActionError(null);
    setPaymentError(null);
    setBusyOrderId(paymentTarget.id);
    try {
      console.debug("POS.Orders.closeOrder", {
        received_entity_type: null,
        received_entity_id: null,
        received_subledger_type: null,
        received_subledger_id: null,
      });
      const result = await settlementService.settle(paymentTarget.id, [{ payment_method_id: selectedMethod.id, amount: paymentTarget.total, reference_number: transactionId || undefined }], authUser?.roles?.includes(ROLES.CALL_CENTER));
      const settledStatus = result.order?.status as ApiOrderStatus | undefined;
      if (settledStatus && ["PENDING_PAYMENT", "pending"].includes(settledStatus)) await orderService.confirm(paymentTarget.id);
      setPaymentTarget(null);
      await refreshOrders();
      setActiveTab("ACTIVE");
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? (e instanceof Error ? e.message : "فشل تأكيد الدفع وإرسال الطلب للمطبخ");
      setPaymentError(message);
    } finally {
      setBusyOrderId(null);
    }
  };

  const expediteOrder = async (order: OrderFromApi) => {
    setActionError(null); setBusyOrderId(order.id);
    try { await orderService.expedite(order.id, "استعجال من شاشة الطلبات النشطة"); await refreshOrders(); }
    catch (e: unknown) { setActionError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "تعذر إرسال إشارة الاستعجال؛ قد لا يدعم الخادم هذا المسار بعد."); }
    finally { setBusyOrderId(null); }
  };

  const openDeliveryAssignment = async (order: OrderFromApi) => {
    setDeliveryTarget(order); setDeliveryError(null); setSelectedDriverId(null); setDrivers([]);
    try { setDrivers(await orderService.getAvailableDeliveryDrivers({ branch_id: order.branch_id, order_id: order.id })); }
    catch (e: unknown) { setDeliveryError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "تعذر تحميل موظفي الدليفري المتاحين"); }
  };

  const assignDriver = async () => {
    if (!deliveryTarget || !selectedDriverId) { setDeliveryError("اختر موظف الدليفري المناسب"); return; }
    setBusyOrderId(deliveryTarget.id);
    try { await orderService.assignDeliveryDriver(deliveryTarget.id, selectedDriverId); setDeliveryTarget(null); await refreshOrders(); }
    catch (e: unknown) { setDeliveryError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "فشل تحويل الطلب للدليفري"); }
    finally { setBusyOrderId(null); }
  };

  const submitFeedback = async () => {
    const target = feedbackPanelTarget; if (!target) return; setBusyOrderId(target.id); setFeedbackError(null);
    try { await orderService.submitCustomerExperience(target.id, feedback); setFeedbackPanelTarget(null); }
    catch (e: unknown) { setFeedbackError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "تعذر حفظ تقييم العميل؛ قد لا يدعم الخادم المسار بعد."); }
    finally { setBusyOrderId(null); }
  };
  const openFeedback = (order: OrderFromApi, trigger: HTMLElement) => { qualityTriggerRef.current = trigger; setFeedback({ food_rating: 5, delivery_rating: 5, speed_rating: 5, notes: "", contacted: true }); setFeedbackError(null); setFeedbackPanelTarget(order); };

  const transferClosedOrder = async (order: OrderFromApi) => {
    if (order.status !== "paid" || transferredOrderIds.includes(order.id)) {
      return;
    }
    setActionError(null);
    setBusyOrderId(order.id);
    try {
      await orderService.transferClosedOrderToSales(order);
      setTransferredOrderIds((prev) => [...prev, order.id]);
      await refreshOrders();
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "فشل ترحيل الطلب إلى المبيعات";
      setActionError(message);
    } finally {
      setBusyOrderId(null);
    }
  };

  const markDelivered = async (order: OrderFromApi) => {
    if (isClosedOrder(order.status)) return;

    setActionError(null);
    setBusyOrderId(order.id);
    try {
      await orderService.markDelivered(order.id, {
        delivered_at: new Date().toISOString(),
      }, authUser?.roles?.includes(ROLES.CALL_CENTER));
      setSelectedOrder(null);
      setDeliveryConfirmTarget(null);
      setDeliveryDetailsTarget(null);
      await refreshOrders();
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? (e instanceof Error ? e.message : "فشل تأكيد تسليم الطلب");
      setActionError(message);
    } finally {
      setBusyOrderId(null);
    }
  };

  const cancelOrderWithReason = async () => {
    if (!cancelTarget) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setCancelError("يرجى إدخال سبب الإلغاء");
      cancelReasonRef.current?.focus();
      return;
    }

    setActionError(null);
    setCancelError(null);
    setBusyOrderId(cancelTarget.id);
    try {
      await orderService.void(cancelTarget.id, reason);
      setCancelTarget(null);
      setCancelReason("");
      setSelectedOrder(null);
      await refreshOrders();
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? (e instanceof Error ? e.message : "فشل إلغاء الطلب");
      setCancelError(message);
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="space-y-5 w-full p-3 sm:p-5 lg:p-6 bg-slate-950 h-full overflow-y-auto rounded-[2rem] custom-scrollbar">
      {/* التعديل يفتح الطلب المحفوظ بكامل محتوياته في واجهة POS. */}

      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-black text-white tracking-tight">
            إدارة الطلبات
          </h2>
          <p className="text-slate-500 font-bold text-[11px]">
            {currentShift
              ? `طلبات الشفت الحالي منذ ${new Date(currentShift.startTime).toLocaleTimeString("ar-EG")}`
              : "تابع الطلبات النشطة والمغلقة من قاعدة البيانات مباشرة"}
          </p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            size={16}
          />
          <input
            type="text"
            placeholder="بحث برقم الطلب، اسم الزبون أو الجوال..."
            className="w-full pr-10 pl-4 py-3 bg-slate-900 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-red-600 text-xs font-bold text-white shadow-xl placeholder:text-slate-600"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </header>

      {(actionError || error) && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl px-4 py-3 text-xs font-bold">
          {actionError || error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5 w-fit shadow-xl">
          <button
            onClick={() => {
              setActiveTab("ACTIVE");
              setStatusFilter("ALL");
              setTimeFilter("ALL");
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs transition-all ${
              activeTab === "ACTIVE"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <ClipboardList size={14} />
            الطلبات النشطة
            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px]">
              {activeCount}
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("CLOSED");
              setStatusFilter("ALL");
              setTimeFilter("ALL");
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs transition-all ${
              activeTab === "CLOSED"
                ? "bg-slate-800 text-white shadow-lg"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <CheckCircle2 size={14} />
            الطلبات المغلقة
            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px]">
              {closedCount}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap bg-slate-900 p-1 rounded-xl border border-white/5 w-fit shadow-2xl gap-1">
          <button
            onClick={() => setTypeFilter("ALL")}
            className={`h-9 px-3 rounded-lg font-black text-[10px] transition-all ${
              typeFilter === "ALL"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setTypeFilter("dine_in")}
            className={`h-9 px-3 rounded-lg font-black text-[10px] transition-all ${
              typeFilter === "dine_in"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            محلي
          </button>
          <button
            onClick={() => setTypeFilter("takeaway")}
            className={`h-9 px-3 rounded-lg font-black text-[10px] transition-all ${
              typeFilter === "takeaway"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            سفري
          </button>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5 shadow-xl">
          <button
            onClick={() => setViewMode("board")}
            className={`h-9 px-3 rounded-lg font-black text-[10px] flex items-center gap-1.5 transition-all ${
              viewMode === "board"
                ? "bg-red-600 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Columns3 size={14} />
            لوحة
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`h-9 px-3 rounded-lg font-black text-[10px] flex items-center gap-1.5 transition-all ${
              viewMode === "cards"
                ? "bg-red-600 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <LayoutGrid size={14} />
            كاردس
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`h-9 px-3 rounded-lg font-black text-[10px] flex items-center gap-1.5 transition-all ${
              viewMode === "table"
                ? "bg-red-600 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Table2 size={14} />
            جدول
          </button>
        </div>
      </div>

      {activeTab === "ACTIVE" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { key: "ALL" as const, label: "كل الطلبات", value: activeCount, icon: ClipboardList, cls: "border-white/5 bg-slate-900 text-slate-300" },
            { key: "LATE" as const, label: "طلبات متأخرة فقط", value: lateCount, icon: AlertTriangle, cls: "border-red-500/30 bg-red-500/10 text-red-300" },
            { key: "ENDING_SOON" as const, label: "قاربت على الانتهاء", value: endingSoonCount, icon: Timer, cls: "border-amber-400/30 bg-amber-500/10 text-amber-200" },
            { key: "URGENT" as const, label: "الطلبات المستعجلة", value: urgentCount, icon: Flame, cls: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200" },
          ].map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setTimeFilter(filter.key)}
                className={`min-h-16 rounded-2xl border px-4 py-3 text-right transition-all ${
                  timeFilter === filter.key
                    ? `${filter.cls} ring-2 ring-red-600/30`
                    : "border-white/5 bg-slate-900/70 text-slate-500 hover:text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon size={16} />
                    <span className="text-[10px] font-black">{filter.label}</span>
                  </div>
                  <span className="text-lg font-black">{filter.value}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`px-3 py-2 rounded-xl border text-[10px] font-black whitespace-nowrap ${
            statusFilter === "ALL"
              ? "bg-white/10 border-white/20 text-white"
              : "bg-slate-900 border-white/5 text-slate-500"
          }`}
        >
          كل الحالات
        </button>
        {(activeTab === "ACTIVE" ? ACTIVE_STATUSES : CLOSED_STATUSES).map(
          (status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-xl border text-[10px] font-black whitespace-nowrap ${
                statusFilter === status
                  ? getLifecycleStatusColor(status)
                  : "bg-slate-900 border-white/5 text-slate-500"
              }`}
            >
              {getLifecycleStatusLabel(status)}
            </button>
          ),
        )}
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4 text-slate-500">
          <Loader2 className="animate-spin text-red-500" size={32} />
          <p className="text-sm font-black">جاري تحميل الطلبات...</p>
        </div>
      ) : viewMode === "board" && activeTab === "ACTIVE" ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 items-start">
          {LIFECYCLE_BOARD_COLUMNS.map((column) => {
            const ColumnIcon = column.icon;
            const columnOrders = filteredOrders.filter(
              (order) => column.statuses.includes(order.status),
            );
            const accentStatus = column.statuses[0];

            return (
              <section
                key={column.key}
                className="min-h-[360px] rounded-2xl border border-white/5 bg-slate-900/55 overflow-hidden"
              >
                <div className={`p-3 border-b border-white/5 ${getLifecycleStatusColor(accentStatus)}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ColumnIcon
                        size={16}
                        className={column.key === "preparing" ? "animate-spin" : ""}
                      />
                      <h3 className="text-xs font-black">{column.title}</h3>
                    </div>
                    <span className="rounded-lg bg-black/20 px-2 py-0.5 text-[10px] font-black">
                      {columnOrders.length}
                    </span>
                  </div>
                  {column.key === "preparing" && (
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-blue-950/60">
                      <div className="h-full w-2/3 rounded-full bg-blue-400 animate-pulse" />
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-3">
                  {columnOrders.map((order) => {
                    const busy = busyOrderId === order.id;
                    const badge = getTimeBadge(order);
                    const BadgeIcon = badge.icon;

                    return (
                      <div
                        key={order.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedOrder(order)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedOrder(order);
                          }
                        }}
                        className={`w-full rounded-2xl border p-3 text-right shadow-xl transition-all hover:-translate-y-0.5 hover:border-red-500/40 ${getLifecycleCardClassName(order)}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-black text-slate-500">#{order.order_number}</p>
                            <h4 className="mt-0.5 text-sm font-black text-white">
                              {order.customer_name || "عميل نقدي"}
                            </h4>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-black ${badge.className}`}>
                            <BadgeIcon size={11} />
                            {badge.label}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1.5">
                          {order.items.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center justify-between rounded-xl bg-black/15 px-2 py-1.5">
                              <span className="truncate text-[10px] font-bold text-slate-200">
                                {item.item_name_ar || item.item_name}
                              </span>
                              <span className="rounded bg-white/10 px-1.5 text-[9px] font-black text-white">
                                x{item.quantity}
                              </span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <p className="text-[9px] font-bold text-slate-500">
                              +{order.items.length - 3} أصناف أخرى
                            </p>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                          <div>
                            <p className="text-[8px] font-black text-slate-500">الإجمالي</p>
                            <p className="text-sm font-black text-red-400">{formatMoney(order.total)}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-slate-500">الدفع</p>
                            <p className="flex items-center gap-1 text-[10px] font-black text-slate-300">
                              {getPaymentIcon(order.payment_method)}
                              {getPaymentLabel(order.payment_method)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3" aria-label={`مؤشر زمن الطلب ${getElapsedMinutes(order)} من 15 دقيقة`}>
                          <div className="mb-1 flex justify-between text-[8px] font-black text-slate-500"><span>زمن المرحلة</span><span>{getElapsedMinutes(order)} / 15 دقيقة</span></div>
                          <div className="h-1.5 overflow-hidden rounded bg-slate-800"><div className={`h-full transition-all ${getElapsedMinutes(order) >= 15 ? "bg-red-500" : getElapsedMinutes(order) >= 10 ? "bg-amber-400" : "bg-blue-400"}`} style={{ width: `${Math.min(100, (getElapsedMinutes(order) / 15) * 100)}%` }} /></div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {["DELIVERED", "served", "paid"].includes(order.status) ? (<><button type="button" onClick={(event) => { event.stopPropagation(); qualityTriggerRef.current=event.currentTarget; setPerformanceTarget(order); }} className="min-h-10 rounded-xl bg-cyan-500/10 px-2 py-2 text-xs font-black text-cyan-200">تقرير الأداء والوقت</button><button type="button" onClick={(event) => { event.stopPropagation(); openFeedback(order,event.currentTarget); }} className="min-h-10 rounded-xl bg-emerald-600 px-2 py-2 text-xs font-black text-white">تقييم تجربة العميل</button></>) : ["PENDING_PAYMENT", "pending"].includes(order.status) ? (<>
                            <button type="button" onClick={(event) => { event.stopPropagation(); editOrderInPos(order); }} className="rounded-xl border border-white/5 bg-slate-800 px-3 py-2 text-center text-[10px] font-black text-slate-200 hover:bg-slate-700">تعديل</button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void closeOrder(order);
                              }}
                              className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-center text-[10px] font-black text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 size={14} />
                              تأكيد الدفع
                            </button>
                          </>) : ["PREPARATION", "confirmed", "in_progress"].includes(order.status) ? (<>
                            <button type="button" disabled={busy} onClick={(event) => { event.stopPropagation(); void expediteOrder(order); }} className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-2 py-2 text-[10px] font-black text-amber-200 disabled:opacity-40"><Zap size={13} className="inline ml-1" />استعجال الطلب</button>
                            {order.order_type === "delivery" ? <button type="button" onClick={(event) => { event.stopPropagation(); void openDeliveryAssignment(order); }} className="rounded-xl bg-violet-600 px-2 py-2 text-[10px] font-black text-white"><Truck size={13} className="inline ml-1" />تحويل للدليفري</button> : <span className="rounded-xl border border-white/5 px-2 py-2 text-center text-[9px] font-bold text-slate-500">طلب {getLifecycleOrderTypeLabel(order.order_type)}</span>}
                          </>) : (["ready", "OUT_FOR_DELIVERY"].includes(order.status) && !order.driver_id && !order.driver) ? (
                            <button type="button" onClick={(event) => { event.stopPropagation(); void openDeliveryAssignment(order); }} className="col-span-2 rounded-xl bg-violet-600 px-2 py-2 text-[10px] font-black text-white"><Truck size={13} className="inline ml-1" />اختيار كابتن الدليفري</button>
                          ) : (<>
                            <button type="button" onClick={(event) => { event.stopPropagation(); setDeliveryDetailsTarget(order); }} className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 px-2 py-2 text-[10px] font-black text-yellow-200"><MapPin size={13} className="inline ml-1" />تفاصيل التوصيل</button>
                            <button type="button" disabled={busy} onClick={(event) => { event.stopPropagation(); setDeliveryConfirmTarget(order); }} className="rounded-xl bg-emerald-600 px-2 py-2 text-[10px] font-black text-white disabled:opacity-40">تأكيد الاستلام</button>
                          </>)}
                        </div>
                      </div>
                    );
                  })}

                  {columnOrders.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-[10px] font-bold text-slate-600">
                      لا توجد طلبات هنا
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[820px]">
              <thead className="bg-slate-950/50 text-slate-500 text-[10px] font-black">
                <tr>
                  <th className="p-4">رقم الطلب</th>
                  <th className="p-4">العميل</th>
                  <th className="p-4">النوع</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">الإجمالي</th>
                  <th className="p-4">الوقت</th>
                  <th className="p-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.map((order) => {
                  const busy = busyOrderId === order.id;
                  const transferred = transferredOrderIds.includes(order.id);
                  return (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-black text-white">
                        #{order.order_number}
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-white">
                          {order.customer_name || "عميل نقدي"}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {order.customer_phone || "---"}
                        </p>
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-300">
                        {getLifecycleOrderTypeLabel(order.order_type)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black ${getLifecycleStatusColor(order.status)}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${getLifecycleStatusDotColor(order.status)}`}
                          />
                          {getLifecycleStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-black text-red-500">
                        {formatMoney(order.total)}
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {new Date(order.created_at).toLocaleTimeString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-4">
                        {activeTab === "ACTIVE" ? (
                          <div className="flex items-center gap-2">
                            {["PENDING_PAYMENT", "pending"].includes(order.status) ? <><button onClick={() => editOrderInPos(order)} className="rounded-xl bg-slate-800 px-3 py-2 text-[10px] font-black text-white">تعديل</button><button onClick={() => closeOrder(order)} className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white">تأكيد الدفع</button></> : ["PREPARATION", "confirmed", "in_progress"].includes(order.status) ? <><button disabled={busy} onClick={() => void expediteOrder(order)} className="rounded-xl bg-amber-500/10 px-3 py-2 text-[10px] font-black text-amber-200">استعجال</button>{order.order_type === "delivery" && <button onClick={() => void openDeliveryAssignment(order)} className="rounded-xl bg-violet-600 px-3 py-2 text-[10px] font-black text-white">للدليفري</button>}</> : (!order.driver_id && !order.driver) ? <button onClick={() => void openDeliveryAssignment(order)} className="rounded-xl bg-violet-600 px-3 py-2 text-[10px] font-black text-white">اختيار كابتن</button> : <><button onClick={() => setDeliveryDetailsTarget(order)} className="rounded-xl bg-yellow-500/10 px-3 py-2 text-[10px] font-black text-yellow-200">التفاصيل</button><button onClick={() => setDeliveryConfirmTarget(order)} className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white">استلام</button></>}
                          </div>
                        ) : (
                          <button
                            onClick={() => transferClosedOrder(order)}
                            disabled={busy || order.status !== "paid" || transferred}
                            className="px-3 py-2 rounded-xl bg-orange-600/10 border border-orange-500/20 text-orange-400 hover:bg-orange-600 hover:text-white text-[10px] font-black flex items-center gap-1.5 disabled:opacity-40"
                          >
                            {busy ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <RotateCcw size={14} />
                            )}
                            {transferred ? "تم الترحيل" : "ترحيل للمبيعات"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-16 text-center text-slate-500 font-bold">
                      لا توجد طلبات حاليا
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredOrders.map((order) => {
            const busy = busyOrderId === order.id;
            const transferred = transferredOrderIds.includes(order.id);

            return (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedOrder(order)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedOrder(order);
                  }
                }}
                className={`rounded-[1.5rem] border shadow-xl hover:border-red-600/30 transition-all group overflow-hidden flex flex-col text-right ${getLifecycleCardClassName(order)}`}
              >
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Hash size={10} />
                        <span className="text-[8px] font-black uppercase tracking-widest">
                          رقم الطلب
                        </span>
                      </div>
                      <p className="text-xl font-black text-white">
                        #{order.order_number}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-xl border text-[9px] font-black flex items-center gap-1.5 ${getLifecycleStatusColor(order.status)}`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${getLifecycleStatusDotColor(order.status)}`}
                      />
                      {getLifecycleStatusLabel(order.status)}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                      <ClipboardList size={10} />
                      <span className="text-[8px] font-black uppercase tracking-widest">
                        الأصناف
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center bg-slate-800/30 p-2 rounded-xl border border-white/5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-slate-200">
                              {item.item_name_ar || item.item_name}
                            </span>
                            <span className="text-[9px] font-black bg-red-600/20 text-red-500 px-1 py-0.5 rounded">
                              x{item.quantity}
                            </span>
                          </div>
                          <span className="text-[11px] font-black text-white">
                            {formatMoney(item.total_price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                        النوع
                      </p>
                      <p className="text-[9px] font-black text-slate-300">
                        {getLifecycleOrderTypeLabel(order.order_type)}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        {getPaymentIcon(order.payment_method)}
                        <span className="text-[8px] font-black uppercase tracking-widest">
                          الدفع
                        </span>
                      </div>
                      <p className="text-[9px] font-black text-slate-300">
                        {getPaymentLabel(order.payment_method)}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                        طاولة
                      </p>
                      <p className="text-[9px] font-black text-red-500">
                        {order.order_type === "dine_in"
                          ? order.table_number || "---"
                          : "سفري"}
                      </p>
                    </div>
                  </div>

                  {(activeTab === "CLOSED" || order.customer_name) && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <User size={12} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            الزبون
                          </span>
                        </div>
                        <p className="text-xs font-black text-slate-300 truncate">
                          {order.customer_name || "غير محدد"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Phone size={12} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            الجوال
                          </span>
                        </div>
                        <p className="text-xs font-black text-slate-300">
                          {order.customer_phone || "---"}
                        </p>
                      </div>
                    </div>
                  )}

                  {order.note && (
                    <div className="pt-4 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                        <FileText size={12} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          الملاحظة
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 bg-slate-800/30 p-3 rounded-xl border border-white/5">
                        {order.note}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      الإجمالي النهائي
                    </span>
                    <p className="text-xl font-black text-red-600">
                      {formatMoney(order.total)}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/30 border-t border-white/5 flex gap-2">
                  {activeTab === "ACTIVE" ? (
                    <>
                      {["PENDING_PAYMENT", "pending"].includes(order.status) && <button
                        onClick={(event) => {
                          event.stopPropagation();
                          editOrderInPos(order);
                        }}
                        disabled={busy}
                        className="flex-1 bg-slate-800 border border-white/5 text-slate-300 py-2.5 rounded-xl font-black text-[10px] hover:bg-slate-700 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40"
                      >
                        <Edit3 size={14} />
                        تعديل
                      </button>}
                      {["PENDING_PAYMENT", "pending"].includes(order.status) ? (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            void closeOrder(order);
                          }}
                          disabled={busy}
                          className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-black text-[10px] hover:bg-emerald-700 flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-40"
                        >
                          <CheckCircle2 size={14} />
                          تأكيد الدفع
                        </button>
                      ) : ["PREPARATION", "confirmed", "in_progress"].includes(order.status) ? <><button onClick={(event) => { event.stopPropagation(); void expediteOrder(order); }} className="flex-1 rounded-xl bg-amber-500/10 py-2.5 text-[10px] font-black text-amber-200">استعجال</button>{order.order_type === "delivery" && <button onClick={(event) => { event.stopPropagation(); void openDeliveryAssignment(order); }} className="flex-1 rounded-xl bg-violet-600 py-2.5 text-[10px] font-black text-white">للدليفري</button>}</> : (!order.driver_id && !order.driver) ? <button onClick={(event) => { event.stopPropagation(); void openDeliveryAssignment(order); }} className="flex-1 rounded-xl bg-violet-600 py-2.5 text-[10px] font-black text-white">اختيار كابتن</button> : <><button onClick={(event) => { event.stopPropagation(); setDeliveryDetailsTarget(order); }} className="flex-1 rounded-xl bg-yellow-500/10 py-2.5 text-[10px] font-black text-yellow-200">تفاصيل التوصيل</button><button onClick={(event) => { event.stopPropagation(); setDeliveryConfirmTarget(order); }} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-[10px] font-black text-white">تأكيد الاستلام</button></>}
                    </>
                  ) : (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        transferClosedOrder(order);
                      }}
                      disabled={busy || order.status !== "paid" || transferred}
                      className="flex-1 bg-orange-600/10 border border-orange-500/20 text-orange-400 py-2.5 rounded-xl font-black text-[10px] hover:bg-orange-600 hover:text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40"
                    >
                      {busy ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RotateCcw size={14} />
                      )}
                      {transferred ? "تم الترحيل" : "ترحيل للمبيعات"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredOrders.length === 0 && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-red-600 blur-[60px] opacity-20 rounded-full" />
                <div className="relative w-32 h-32 bg-slate-900 rounded-full flex items-center justify-center border border-white/5 shadow-2xl">
                  <PackageOpen
                    size={64}
                    className="text-slate-700"
                    strokeWidth={1}
                  />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-white">
                  لا توجد طلبات حاليا
                </h3>
                <p className="text-slate-500 font-bold text-sm max-w-xs mx-auto">
                  {searchTerm
                    ? "لم نجد نتائج تطابق البحث الحالي"
                    : "هذه القائمة ستعرض الطلبات المحفوظة من قاعدة البيانات"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedOrder && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-y-auto rounded-3xl border border-white/10 bg-slate-950 shadow-2xl custom-scrollbar lg:grid lg:grid-cols-[0.85fr_1.15fr] lg:overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <aside className="border-b border-white/10 bg-slate-900/80 p-5 lg:border-b-0 lg:border-l">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black text-slate-500">تتبع الطلب</p>
                  <h3 className="mt-1 text-xl font-black text-white">
                    #{selectedOrder.order_number}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-xl border border-white/10 bg-slate-800 p-2 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {getTimelineSteps(selectedOrder).map((step, index) => (
                  <div key={`${step.title}-${index}`} className="relative flex gap-3">
                    {index < getTimelineSteps(selectedOrder).length - 1 && (
                      <div className="absolute right-[13px] top-7 h-full w-px bg-white/10" />
                    )}
                    <div
                      className={`relative z-10 mt-1 h-7 w-7 shrink-0 rounded-full border flex items-center justify-center ${
                        step.done
                          ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                          : "border-white/10 bg-slate-800 text-slate-600"
                      }`}
                    >
                      <CheckCircle2 size={14} />
                    </div>
                    <div className="min-w-0 flex-1 rounded-2xl border border-white/5 bg-slate-950/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-black text-white">{step.title}</p>
                        <span className="text-[10px] font-bold text-slate-500">
                          {step.time
                            ? new Date(step.time).toLocaleTimeString("ar-EG", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "--:--"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[10px] font-bold text-slate-500">
                        {step.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <section className="flex min-h-0 flex-col bg-slate-950">
              <div className="border-b border-white/10 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black text-slate-500">فاتورة العميل</p>
                    <h3 className="mt-1 text-lg font-black text-white">
                      {selectedOrder.customer_name || "عميل نقدي"}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {selectedOrder.customer_phone || "لا يوجد رقم هاتف"}
                    </p>
                  </div>
                  <div className={`rounded-2xl border px-3 py-2 text-[10px] font-black ${getLifecycleStatusColor(selectedOrder.status)}`}>
                    {getLifecycleStatusLabel(selectedOrder.status)}
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5 custom-scrollbar">
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl border border-white/5 bg-slate-900/70 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {item.item_name_ar || item.item_name}
                        </p>
                        {item.notes && (
                          <p className="mt-1 text-[10px] font-bold text-slate-500">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <span className="rounded-lg bg-red-600/15 px-2 py-1 text-[10px] font-black text-red-300">
                        x{item.quantity}
                      </span>
                      <span className="text-sm font-black text-slate-200">
                        {formatMoney(item.total_price)}
                      </span>
                    </div>
                  ))}
                </div>

                {selectedOrder.note && (
                  <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                    <p className="text-[10px] font-black text-amber-200">ملاحظة الطلب</p>
                    <p className="mt-1 text-xs font-bold text-amber-100">{selectedOrder.note}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 bg-slate-900/80 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500">الإجمالي النهائي</span>
                  <span className="text-2xl font-black text-red-500">
                    {formatMoney(selectedOrder.total)}
                  </span>
                </div>
                <div className="hidden" aria-hidden="true">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-2xl border border-white/10 bg-slate-800 py-3 text-[10px] font-black text-slate-200 hover:bg-slate-700 flex items-center justify-center gap-2"
                  >
                    <Printer size={14} />
                    طباعة فاتورة ثانية
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editOrderInPos(selectedOrder);
                      setSelectedOrder(null);
                    }}
                    className="rounded-2xl bg-blue-600 py-3 text-[10px] font-black text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Edit3 size={14} />
                    تعديل الطلب
                  </button>
                  <button
                    type="button"
                    onClick={() => markDelivered(selectedOrder)}
                    disabled={!["OUT_FOR_DELIVERY", "ready"].includes(selectedOrder.status) || busyOrderId === selectedOrder.id}
                    className="rounded-2xl bg-emerald-600 py-3 text-[10px] font-black text-white hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={14} />
                    تم التسليم للزبون
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCancelTarget(selectedOrder);
                      setCancelReason("");
                      setCancelError(null);
                    }}
                    disabled={isClosedOrder(selectedOrder.status)}
                    className="rounded-2xl bg-red-600 py-3 text-[10px] font-black text-white hover:bg-red-700 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Ban size={14} />
                    إلغاء وتحديد السبب
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {performanceTarget && (() => {
        const minutes = (start?: string | null, end?: string | null) => { if (!start || !end) return null; const value = Math.floor((Date.parse(end) - Date.parse(start)) / 60000); return Number.isFinite(value) && value >= 0 ? value : null; };
        const waiting = minutes(performanceTarget.created_at, performanceTarget.paid_at);
        const latestTicketCompletion = performanceTarget.tickets?.map((t) => t.completed_at).filter((v): v is string => Boolean(v)).sort((a,b)=>Date.parse(b)-Date.parse(a))[0] ?? null;
        const preparation = minutes(performanceTarget.assembly_started_at || performanceTarget.paid_at, performanceTarget.assembled_at || latestTicketCompletion);
        const delivery = minutes(performanceTarget.delivery_started_at, performanceTarget.delivered_at);
        const total = minutes(performanceTarget.created_at, performanceTarget.delivered_at);
        const kitchenRating = preparation == null ? "غير متاح" : preparation <= 15 ? "ممتاز" : preparation <= 20 ? "مقبول" : "متأخر";
        const steps=[["إنشاء الطلب",performanceTarget.created_at,null],["تأكيد الدفع",performanceTarget.paid_at,waiting],["اكتمال التحضير",performanceTarget.assembled_at||latestTicketCompletion,preparation],["خروج الدليفري",performanceTarget.delivery_started_at,null],["تسليم العميل",performanceTarget.delivered_at,delivery]] as const;
        return <div className="fixed inset-0 z-[148] flex items-center justify-center bg-slate-950/85 p-4" onClick={() => {setPerformanceTarget(null);qualityTriggerRef.current?.focus();}}><section ref={qualityDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="performance-title" className="w-full max-w-2xl rounded-3xl border border-cyan-400/20 bg-slate-900 p-5 outline-none" onClick={(e) => e.stopPropagation()}><div className="flex justify-between"><div><p className="text-xs font-black text-cyan-300">رحلة الطلب الزمنية</p><h3 id="performance-title" className="text-xl font-black text-white">الطلب #{performanceTarget.order_number}</h3></div><button aria-label="إغلاق تقرير الأداء" onClick={() => {setPerformanceTarget(null);qualityTriggerRef.current?.focus();}} className="rounded-xl bg-slate-800 p-3 text-slate-400"><X size={18}/></button></div><ol className="mt-6 space-y-0">{steps.map(([label,time,duration],index)=><li key={label} className="relative flex gap-4 pb-5"><div className="flex flex-col items-center"><span className={`h-4 w-4 rounded-full border-4 ${time?'border-cyan-300 bg-cyan-500':'border-slate-600 bg-slate-800'}`}/>{index<steps.length-1&&<span className="h-full w-0.5 bg-slate-700"/>}</div><div className="pb-2"><p className="text-sm font-black text-white">{label}</p><p className="text-xs text-slate-400">{time?new Date(time).toLocaleString('ar-EG'):'غير متاح'}</p>{duration!=null&&<span className="mt-1 inline-block rounded-lg bg-cyan-500/10 px-2 py-1 text-xs font-black text-cyan-200">استغرقت {duration} دقيقة</span>}</div></li>)}</ol><div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-950/60 p-3 text-sm font-black">إجمالي الرحلة: {total==null?'غير متاح':`${total} دقيقة`}</div><div className="rounded-xl bg-slate-950/60 p-3 text-sm font-black">المطبخ: <span className={preparation != null && preparation > 20 ? "text-red-300" : "text-emerald-300"}>{kitchenRating}</span></div></div></section></div>;
      })()}


      {feedbackPanelTarget && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/85 p-4" onClick={() => setFeedbackPanelTarget(null)}><section ref={qualityDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="rating-panel-title" className="w-full max-w-lg rounded-3xl border border-emerald-400/20 bg-slate-900 p-5 outline-none" onClick={(event) => event.stopPropagation()}><div className="flex justify-between"><h3 id="rating-panel-title" className="text-xl font-black text-white">تقييم تجربة العميل</h3><button type="button" aria-label="إغلاق استبيان التقييم" onClick={() => setFeedbackPanelTarget(null)} className="rounded-xl bg-slate-800 p-3 text-slate-400"><X size={18}/></button></div><StarRating label="الأكل" value={feedback.food_rating} onChange={(value) => setFeedback({...feedback,food_rating:value})}/><StarRating label="الدليفري" value={feedback.delivery_rating} onChange={(value) => setFeedback({...feedback,delivery_rating:value})}/><StarRating label="السرعة" value={feedback.speed_rating} onChange={(value) => setFeedback({...feedback,speed_rating:value})}/><label className="mt-5 flex gap-2 text-sm font-bold text-slate-300"><input type="checkbox" checked={feedback.contacted} onChange={(e)=>setFeedback({...feedback,contacted:e.target.checked})}/>تم التواصل مع العميل</label><textarea aria-label="ملاحظات التقييم" value={feedback.notes} onChange={(e)=>setFeedback({...feedback,notes:e.target.value})} placeholder="ملاحظات اختيارية" className="mt-4 w-full rounded-xl bg-slate-950 p-3 text-sm text-white"/>{feedbackError&&<p role="alert" className="mt-2 text-xs font-bold text-red-300">{feedbackError}</p>}<button disabled={busyOrderId===feedbackPanelTarget.id} onClick={()=>void submitFeedback()} className="mt-4 min-h-11 w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-40">حفظ التقييم</button></section></div>}

      {paymentTarget && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={() => setPaymentTarget(null)}>
          <section dir="rtl" className="w-full max-w-md rounded-3xl border border-blue-400/20 bg-slate-900 p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black text-blue-300">تأكيد المعاملة المالية</p>
                <h3 className="mt-1 text-lg font-black text-white">الطلب #{paymentTarget.order_number}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">بعد التأكيد سيُرسل الطلب مباشرة إلى المطبخ.</p>
              </div>
              <button type="button" onClick={() => setPaymentTarget(null)} className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/5 bg-slate-950/60 p-3 text-xs font-bold">
              <span className="text-slate-500">وجهة الأموال</span><span className="text-left text-white">{currentShift ? "صندوق الشفت الحالي" : `فرع الطلب #${paymentTarget.branch_id}`}</span>
              <span className="text-slate-500">المبلغ</span><span className="text-left font-black text-blue-300">{formatMoney(paymentTarget.total)}</span>
            </div>
            <label htmlFor="payment-method" className="mb-2 block text-xs font-black text-slate-300">طريقة الدفع</label>
            <select id="payment-method" value={selectedPaymentMethodId ?? ""} disabled={paymentMethodsLoading} onChange={(event) => { setSelectedPaymentMethodId(Number(event.target.value)); setPaymentError(null); }} className="mb-4 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500 disabled:opacity-50">
              <option value="">{paymentMethodsLoading ? "جاري تحميل الحسابات..." : "اختر الصندوق أو الحساب"}</option>
              {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name} — {method.account ? `${method.account.code} · ${method.account.name}` : "غير مرتبط بحساب"}</option>)}
            </select>
            <label htmlFor="payment-reference" className="mb-2 block text-xs font-black text-slate-300">الرقم المرجعي للعملية</label>
            <input
              id="payment-reference"
              autoFocus
              value={paymentReference}
              onChange={(event) => { setPaymentReference(event.target.value); setPaymentError(null); }}
              onKeyDown={(event) => { if (event.key === "Enter") void confirmOrderPayment(); }}
              aria-invalid={Boolean(paymentError)}
              aria-describedby={paymentError ? "payment-error" : undefined}
              required={paymentMethods.find((method) => method.id === selectedPaymentMethodId)?.type !== "cash"}
              placeholder={paymentMethods.find((method) => method.id === selectedPaymentMethodId)?.type === "cash" ? "اختياري للدفع النقدي" : "مطلوب لهذه الطريقة"}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500"
            />
            {paymentError && <p id="payment-error" role="alert" className="mt-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200">{paymentError}</p>}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setPaymentTarget(null)} className="flex-1 rounded-2xl border border-white/10 bg-slate-800 py-3 text-xs font-black text-slate-300 hover:bg-slate-700">تراجع</button>
              <button type="button" onClick={() => void confirmOrderPayment()} disabled={busyOrderId === paymentTarget.id || !selectedPaymentMethodId || paymentMethodsLoading} className="flex-1 rounded-2xl bg-blue-600 py-3 text-xs font-black text-white hover:bg-blue-500 disabled:opacity-40">
                {busyOrderId === paymentTarget.id ? "جار التأكيد..." : "تنفيذ وإرسال للمطبخ"}
              </button>
            </div>
          </section>
        </div>
      )}

      {deliveryDetailsTarget && (
        <div className="fixed inset-0 z-[146] flex items-center justify-center bg-slate-950/85 p-4" onClick={() => setDeliveryDetailsTarget(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="delivery-details-title" dir="rtl" className="w-full max-w-2xl rounded-3xl border border-yellow-400/20 bg-slate-900 p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex justify-between"><div><p className="text-[10px] font-black text-yellow-300">متابعة رحلة التوصيل</p><h3 id="delivery-details-title" className="text-lg font-black text-white">الطلب #{deliveryDetailsTarget.order_number}</h3></div><button aria-label="إغلاق" onClick={() => setDeliveryDetailsTarget(null)} className="rounded-xl bg-slate-800 p-2 text-slate-400"><X size={18} /></button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-950/60 p-4"><p className="text-[10px] font-black text-slate-500">العميل</p><p className="mt-1 font-black text-white">{deliveryDetailsTarget.customer_name || "غير محدد"}</p><p className="text-xs text-slate-300">{deliveryDetailsTarget.customer_mobile || deliveryDetailsTarget.customer_phone || "لا يوجد جوال"}</p></div>
              <div className="rounded-2xl bg-slate-950/60 p-4"><p className="text-[10px] font-black text-slate-500">الكابتن</p><p className="mt-1 font-black text-white">{deliveryDetailsTarget.driver?.name || deliveryDetailsTarget.delivery_employee_name || "غير محدد"}</p><p className="text-xs text-slate-300">{deliveryDetailsTarget.driver?.phone || "لا يوجد جوال"} · {deliveryDetailsTarget.driver?.vehicle_type || "المركبة غير محددة"}</p></div>
              <div className="sm:col-span-2 rounded-2xl border border-yellow-400/10 bg-yellow-500/5 p-4"><p className="text-[10px] font-black text-yellow-300">عنوان التوصيل</p><p className="mt-1 text-sm font-bold leading-6 text-white">{formatDeliveryAddress(deliveryDetailsTarget.delivery_address_snapshot)}</p></div>
              <div className="rounded-2xl bg-slate-950/60 p-4"><p className="text-[10px] font-black text-slate-500">وقت الخروج</p><p className="mt-1 font-black text-white">{deliveryDetailsTarget.delivery_started_at ? new Date(deliveryDetailsTarget.delivery_started_at).toLocaleString("ar-EG") : "غير مسجل"}</p><p className="text-xs text-yellow-300">على الطريق: {deliveryDetailsTarget.delivery_started_at ? `${Math.max(0, Math.floor((Date.now() - new Date(deliveryDetailsTarget.delivery_started_at).getTime()) / 60000))} دقيقة` : "—"}</p></div>
              <div className="rounded-2xl bg-slate-950/60 p-4"><p className="text-[10px] font-black text-slate-500">الوجبات الخارجة</p>{deliveryDetailsTarget.items.map((item) => <p key={item.id} className="mt-1 flex justify-between text-xs font-bold text-slate-200"><span>{item.item_name_ar || item.item_name}</span><span>× {item.quantity}</span></p>)}</div>
            </div>
          </section>
        </div>
      )}

      {deliveryConfirmTarget && (
        <div className="fixed inset-0 z-[147] flex items-center justify-center bg-slate-950/85 p-4" onClick={() => setDeliveryConfirmTarget(null)}><section role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-3xl border border-emerald-400/20 bg-slate-900 p-5" onClick={(event) => event.stopPropagation()}><h3 className="text-lg font-black text-white">تأكيد استلام العميل</h3><p className="mt-2 text-sm font-bold leading-6 text-slate-400">تأكد من التواصل مع الكابتن أو العميل قبل تسكير الطلب. سيُسجل الطلب كمُسلّم، بينما يبقى الترحيل المالي مسؤولية مسار التسوية في الخادم لمنع تكرار الدفع.</p><div className="mt-5 flex gap-2"><button onClick={() => setDeliveryConfirmTarget(null)} className="flex-1 rounded-2xl bg-slate-800 py-3 text-xs font-black text-slate-300">تراجع</button><button disabled={busyOrderId === deliveryConfirmTarget.id} onClick={() => void markDelivered(deliveryConfirmTarget)} className="flex-1 rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white disabled:opacity-40">نعم، تم الاستلام</button></div></section></div>
      )}

      {deliveryTarget && (
        <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-950/85 p-4" onClick={() => setDeliveryTarget(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="driver-dialog-title" dir="rtl" className="w-full max-w-lg rounded-3xl border border-violet-400/20 bg-slate-900 p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between"><div><p className="text-[10px] font-black text-violet-300">توزيع الدليفري</p><h3 id="driver-dialog-title" className="text-lg font-black text-white">الطلب #{deliveryTarget.order_number}</h3></div><button aria-label="إغلاق" onClick={() => setDeliveryTarget(null)} className="rounded-xl bg-slate-800 p-2 text-slate-400"><X size={18} /></button></div>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {drivers.map((driver) => <button key={driver.id} type="button" onClick={() => setSelectedDriverId(driver.id)} className={`w-full rounded-2xl border p-3 text-right ${selectedDriverId === driver.id ? "border-violet-400 bg-violet-500/15" : "border-white/5 bg-slate-950/60"}`}><span className="block text-sm font-black text-white">{driver.name}</span><span className="mt-1 block text-[10px] font-bold text-slate-400">{driver.phone || "لا يوجد جوال"} · {driver.vehicle_type} · {driver.active_orders_count} طلب نشط</span></button>)}
              {!deliveryError && drivers.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">لا يوجد موظفو دليفري متاحون حالياً</p>}
            </div>
            {deliveryError && <p role="alert" className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs font-bold text-red-200">{deliveryError}</p>}
            <button type="button" disabled={!selectedDriverId || busyOrderId === deliveryTarget.id} onClick={() => void assignDriver()} className="mt-4 w-full rounded-2xl bg-violet-600 py-3 text-xs font-black text-white disabled:opacity-40">اعتماد وتحويل للدليفري</button>
          </section>
        </div>
      )}

      {cancelTarget && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setCancelTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-red-300">إلغاء الطلب</p>
                <h3 className="text-lg font-black text-white">#{cancelTarget.order_number}</h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <textarea
              ref={cancelReasonRef}
              autoFocus
              id="cancel-reason"
              value={cancelReason}
              onChange={(event) => {
                setCancelReason(event.target.value);
                setCancelError(null);
              }}
              aria-invalid={Boolean(cancelError)}
              aria-describedby={cancelError ? "cancel-error" : undefined}
              placeholder="اكتب سبب الإلغاء..."
              className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 p-3 text-sm font-bold text-white outline-none focus:border-red-500"
            />
            {cancelError && (
              <p id="cancel-error" role="alert" className="mt-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200">
                {cancelError}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="flex-1 rounded-2xl border border-white/10 bg-slate-800 py-3 text-xs font-black text-slate-300 hover:bg-slate-700"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={cancelOrderWithReason}
                disabled={busyOrderId === cancelTarget.id}
                className="flex-1 rounded-2xl bg-red-600 py-3 text-xs font-black text-white hover:bg-red-700 disabled:opacity-40"
              >
                {busyOrderId === cancelTarget.id ? "جار الإلغاء..." : "تأكيد الإلغاء"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
