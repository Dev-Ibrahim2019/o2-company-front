import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight, Loader2, Save, Plus, Minus, Trash2, Edit3, X,
  Phone, Clock, CreditCard,
  AlertCircle, Search, CheckCircle2, XCircle, ChefHat, Truck, Ban, Receipt, Keyboard, Bike,
} from "lucide-react";
import { colors, typography, radius, shadows, transitions } from "../design/tokens";
import { orderService, type OrderFromApi, type OrderItemFromApi } from "../../../services/orderService";
import { employeeService, type EmployeeFromApi } from "../../../services/employeeService";
import api from "../../../api/axios";
import { toast } from "../../shared/Toast";
import { determineOrderLifecycle, getOrderReference, formatShekel, PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "../activeOrdersView";
import { InvoicePreviewDrawer } from "../components/InvoicePreviewDrawer";
import { RecordPaymentModal } from "../components/RecordPaymentModal";
import { printOrderInvoice } from "../printInvoice";
import { ConfirmModal } from "../../shared/ConfirmModal";

// ============================================================================
// TYPES
// ============================================================================

interface MenuItem {
  id: number;
  name: string;
  name_ar?: string;
  price: number;
  category?: string;
  is_available: boolean;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:               { label: "قيد الانتظار", color: colors.semantic.warning, icon: <Clock size={14} /> },
  pending_confirmation:  { label: "بانتظار التأكيد", color: colors.semantic.warning, icon: <Clock size={14} /> },
  confirmed:             { label: "مؤكد", color: colors.semantic.info, icon: <CheckCircle2 size={14} /> },
  in_progress:           { label: "قيد التنفيذ", color: colors.semantic.info, icon: <ChefHat size={14} /> },
  ready:                 { label: "جاهز", color: colors.semantic.success, icon: <CheckCircle2 size={14} /> },
  PREPARATION:           { label: "قيد التحضير", color: "#8b5cf6", icon: <ChefHat size={14} /> },
  ASSEMBLING:            { label: "جاري التجهيز", color: "#8b5cf6", icon: <ChefHat size={14} /> },
  served:                { label: "تم التقديم", color: colors.semantic.success, icon: <CheckCircle2 size={14} /> },
  paid:                  { label: "مدفوع", color: colors.semantic.success, icon: <CheckCircle2 size={14} /> },
  pending_payment:       { label: "بانتظار الدفع", color: colors.semantic.warning, icon: <CreditCard size={14} /> },
  READY_FOR_DELIVERY:    { label: "جاهز للتوصيل", color: colors.semantic.success, icon: <Truck size={14} /> },
  OUT_FOR_DELIVERY:      { label: "خرج للتوصيل", color: colors.semantic.success, icon: <Truck size={14} /> },
  DELIVERED:             { label: "تم التوصيل", color: colors.semantic.success, icon: <CheckCircle2 size={14} /> },
  cancelled:             { label: "ملغي", color: colors.semantic.error, icon: <XCircle size={14} /> },
  CANCELLED:             { label: "ملغي", color: colors.semantic.error, icon: <XCircle size={14} /> },
  FAILED_DELIVERY:       { label: "فشل التوصيل", color: colors.semantic.error, icon: <Ban size={14} /> },
};

const ORDER_TYPE_MAP: Record<string, string> = { dine_in: "محلي", takeaway: "فوري", delivery: "توصيل" };

const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
const formatTime = (d: string) => new Date(d).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: typography.weight.bold, color: colors.neutral[400],
  textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8, display: "block",
};

const kbdStyle: React.CSSProperties = {
  display: "inline-block", padding: "1px 6px", borderRadius: radius.sm, margin: "0 3px",
  background: colors.neutral[100], border: `1px solid ${colors.border.default}`,
  fontFamily: typography.fontFamily.mono, fontSize: "10px", fontWeight: typography.weight.bold,
  color: colors.neutral[700],
};

// ============================================================================
// ORDER DETAIL PAGE
// ============================================================================

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [order, setOrder] = useState<OrderFromApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editNote, setEditNote] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editDiscountValue, setEditDiscountValue] = useState(0);
  const [editDiscountType, setEditDiscountType] = useState<"amount" | "percent">("amount");
  const [saving, setSaving] = useState(false);

  // Add item state
  const [showAddItem, setShowAddItem] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [menuLoading, setMenuLoading] = useState(false);

  // تعديل كمية صنف موجود — بالاعتماد على endpoints الإضافة/الحذف الحالية (لا يوجد PATCH
  // مخصص للكمية بالباك اند): نحذف السطر القديم ونعيد إضافته بنفس item_id/سعر وكمية جديدة.
  const [itemBusyId, setItemBusyId] = useState<number | null>(null);

  // تعيين موظف توصيل — قائمة سائقي delivery_driver المتاحين الآن فقط (شفت مفتوح)
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [drivers, setDrivers] = useState<EmployeeFromApi[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [assigningDriverId, setAssigningDriverId] = useState<number | null>(null);

  // معاينة الفاتورة وتسجيل الدفع
  const [showInvoice, setShowInvoice] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // تأكيد إغلاق الفاتورة (اختصار F7) — ConfirmModal بدل window.confirm() (إجراء لا رجعة فيه)
  const [confirmServe, setConfirmServe] = useState<{ open: boolean; loading: boolean }>({ open: false, loading: false });

  // مصدر الحقيقة الوحيد لـ Active/Closed: الدفع وحده لا يغلق الطلب أبدًا — فقط لما تكتمل حالة
  // الطلب (تم التقديم/التوصيل) وتكون الفاتورة مدفوعة بالكامل معًا، أو يكون الطلب ملغي.
  const isClosed = order ? determineOrderLifecycle(order.status, order.invoice?.status) === "closed" : false;

  // Edit/Add Item/Cancel مسموحة فقط على طلب نشط — طلب مغلق للقراءة فقط دائمًا، بلا استثناء أدوار
  // (View Details وView Invoice يبقوا متاحين دائمًا بغض النظر عن isClosed).
  const canEditOrder = !!order && !isClosed;

  const shouldStartEditing = searchParams.get("edit") === "true";
  const shouldOpenInvoice = searchParams.get("invoice") === "true";

  // ── Fetch order ──
  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.getOne(Number(orderId));
      setOrder(data);
      setEditNote(data.note || "");
      setEditCustomerName(data.customer_name || "");
      setEditCustomerPhone(data.customer_phone || "");
      setEditDiscountValue(data.discount_value || 0);
      setEditDiscountType(data.discount_type || "amount");
    } catch (err: any) {
      setError(err?.response?.data?.message || "تعذر تحميل تفاصيل الطلب");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  useEffect(() => {
    if (shouldStartEditing && canEditOrder) setEditing(true);
  }, [shouldStartEditing, canEditOrder]);

  // "عرض الفاتورة" مسموح دائمًا (حتى على الطلبات المغلقة) — بعكس التعديل/الإضافة/الإلغاء.
  useEffect(() => {
    if (shouldOpenInvoice) setShowInvoice(true);
  }, [shouldOpenInvoice]);

  // ── Fetch menu for add item ──
  const fetchMenu = useCallback(async () => {
    setMenuLoading(true);
    try {
      const { data } = await api.get("/menu", { params: { branch_id: order?.branch_id || 1 } });
      const items: MenuItem[] = [];
      const raw = data?.data || data || [];
      if (Array.isArray(raw)) {
        raw.forEach((cat: any) => {
          if (cat.items) {
            cat.items.forEach((item: any) => {
              items.push({
                id: item.id, name: item.name, name_ar: item.name_ar,
                price: item.price, category: cat.name, is_available: item.is_available !== false,
              });
            });
          }
        });
      }
      setMenuItems(items);
    } catch { setMenuItems([]); }
    finally { setMenuLoading(false); }
  }, [order?.branch_id]);

  useEffect(() => { if (showAddItem) fetchMenu(); }, [showAddItem, fetchMenu]);

  // ── جلب سائقي التوصيل المتاحين الآن (لقائمة "تعيين موظف توصيل") ──
  const fetchDrivers = useCallback(async () => {
    if (!order) return;
    setDriversLoading(true);
    try {
      const list = await employeeService.getAll({
        branch_id: order.branch_id,
        operational_role: "delivery_driver",
        available_only: true,
      });
      setDrivers(list);
    } catch {
      setDrivers([]);
    } finally {
      setDriversLoading(false);
    }
  }, [order?.branch_id]);

  useEffect(() => { if (showAssignDriver) fetchDrivers(); }, [showAssignDriver, fetchDrivers]);

  // ── تعيين سائق على طلب توصيل جاهز ──
  const assignDriver = async (driverId: number) => {
    if (!order) return;
    setAssigningDriverId(driverId);
    try {
      await orderService.assignDelivery(order.id, driverId);
      toast.success("تم تعيين موظف التوصيل");
      setShowAssignDriver(false);
      fetchOrder();
    } catch (err: any) {
      toast.error("فشل تعيين موظف التوصيل", err?.response?.data?.message);
    } finally {
      setAssigningDriverId(null);
    }
  };

  // ── Save order updates (ملاحظات + بيانات العميل + الخصم) ──
  const saveOrder = async () => {
    if (!order) return;
    setSaving(true);
    try {
      await orderService.syncPricing(order.id, {
        note: editNote,
        customer_name: editCustomerName || undefined,
        customer_phone: editCustomerPhone || undefined,
        discount_value: editDiscountValue || undefined,
        discount_type: editDiscountType,
      });
      toast.success("تم حفظ التعديلات بنجاح");
      setEditing(false);
      fetchOrder();
    } catch (err: any) {
      toast.error("فشل حفظ التعديلات", err?.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Add item to order ──
  const addItem = async (menuItem: MenuItem) => {
    if (!order) return;
    try {
      await orderService.addOrderItem(order.id, {
        item_id: menuItem.id,
        quantity: 1,
        unit_price: menuItem.price,
      });
      toast.success("تمت إضافة الصنف", menuItem.name_ar || menuItem.name);
      setShowAddItem(false);
      setMenuSearch("");
      fetchOrder();
    } catch (err: any) {
      toast.error("فشل إضافة الصنف", err?.response?.data?.message);
    }
  };

  // ── Remove item from order ──
  const removeItem = async (itemId: number) => {
    if (!order) return;
    try {
      await orderService.removeOrderItem(order.id, itemId);
      toast.success("تم حذف الصنف");
      fetchOrder();
    } catch (err: any) {
      toast.error("فشل حذف الصنف", err?.response?.data?.message);
    }
  };

  // ── تعديل كمية صنف موجود — حذف السطر القديم وإعادة إضافته بنفس الصنف/السعر وكمية جديدة.
  // الباك اند يرفض حذف صنف أُرسل فعليًا للمطبخ (status !== pending)، فنفس القيد الموجود أصلاً
  // على زر الحذف ينطبق هون تلقائيًا (يظهر خطأ بدل ما يكسر شي).
  const updateItemQuantity = async (item: OrderItemFromApi, newQuantity: number) => {
    if (!order || newQuantity < 1 || itemBusyId) return;
    setItemBusyId(item.id);
    try {
      await orderService.removeOrderItem(order.id, item.id);
      await orderService.addOrderItem(order.id, {
        item_id: item.item_id,
        quantity: newQuantity,
        unit_price: item.unit_price,
        notes: item.notes || undefined,
      });
      await fetchOrder();
    } catch (err: any) {
      toast.error("فشل تعديل الكمية", err?.response?.data?.message);
      fetchOrder();
    } finally {
      setItemBusyId(null);
    }
  };

  // ── Cancel order ── (تأكيد أولًا، وسبب إلغاء اختياري بعده — العمود cancellation_reason
  // موجود أصلاً بالمشروع، كان غير مستخدم بأي مكان، صرنا نستفيد منه هون)
  const cancelOrder = async () => {
    if (!order || !confirm("هل أنت متأكد من إلغاء هذا الطلب؟")) return;
    const reason = prompt("سبب الإلغاء (اختياري):") || undefined;
    try {
      await orderService.cancel(order.id, reason);
      toast.success("تم إلغاء الطلب");
      fetchOrder();
    } catch (err: any) {
      toast.error("فشل إلغاء الطلب", err?.response?.data?.message);
    }
  };

  // ── نجاح تسجيل الدفعة — يحدّث الحالة فورًا من غير إعادة تحميل الصفحة ──
  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    fetchOrder();
  };

  // ── إغلاق الفاتورة (F7) — تسليم الطلب. بما إن الباك اند يمنع confirm() (إرسال للمطبخ) أصلاً
  // إلا لو الطلب مدفوع بالكامل مسبقًا لطلبات الكول سنتر، فبمجرد وصوله served يكون مغلقًا تلقائيًا
  // (نفس منطق determineOrderLifecycle) بدون أي "إغلاق قسري" إضافي مطلوب هون. ──
  const serveOrder = async () => {
    if (!order) return;
    setConfirmServe(s => ({ ...s, loading: true }));
    try {
      // طلب توصيل مُسنَد لسائق (OUT_FOR_DELIVERY) يُسلَّم عبر markDelivered — غير ذلك serve() العادية.
      if (order.status === "OUT_FOR_DELIVERY") {
        await orderService.markDelivered(order.id);
      } else {
        await orderService.serve(order.id);
      }
      toast.success("تم إغلاق الفاتورة", "تم تسليم الطلب بنجاح");
      setConfirmServe({ open: false, loading: false });
      fetchOrder();
    } catch (err: any) {
      toast.error("فشل إغلاق الفاتورة", err?.response?.data?.message);
      setConfirmServe(s => ({ ...s, loading: false }));
    }
  };

  // ── تنفيذ الطلب بالأقسام (اختصار "-") — نفس orderService.confirm المستخدم أصلاً بزر "تأكيد"
  // لو وُجد، حتى ما يصير عندنا منطقان مختلفان لنفس العملية. ──
  const confirmOrderToKitchen = async () => {
    if (!order) return;
    try {
      await orderService.confirm(order.id);
      toast.success("تم تنفيذ الطلب بالأقسام");
      fetchOrder();
    } catch (err: any) {
      toast.error("فشل تنفيذ الطلب", err?.response?.data?.message);
    }
  };

  // ── اختصارات لوحة المفاتيح (F2 حفظ / "-" تنفيذ بالأقسام / F7 إغلاق الفاتورة / F9+F12 طباعة) ──
  // معطّلة أثناء الكتابة بأي حقل إدخال (نفس حارس CallCenterPageWithAside.tsx). الـ listener نفسه
  // يُربط مرة واحدة فقط (مصفوفة deps فاضية) لكنه يقرأ كل شي من ref يتحدّث كل render — لازم يشمل
  // الدوال نفسها (saveOrder/confirmOrderToKitchen) مو بس order/editing/canEditOrder، لأنها closures
  // جديدة كل render بتحمل قيم editNote/editDiscountValue... إلخ الحالية؛ لو استدعيناها مباشرة من
  // جوا الـ listener (بدون المرور بالـ ref) كانت رح تضل عالقة على نسخة أول render (order=null وقتها).
  const shortcutStateRef = useRef({ order, editing, canEditOrder, saveOrder, confirmOrderToKitchen });
  useEffect(() => {
    shortcutStateRef.current = { order, editing, canEditOrder, saveOrder, confirmOrderToKitchen };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;

      const { order: currentOrder, editing: currentEditing, canEditOrder: currentCanEdit, saveOrder: currentSave, confirmOrderToKitchen: currentConfirm } = shortcutStateRef.current;
      if (!currentOrder) return;

      if (e.key === "F2") {
        if (!currentEditing) return;
        e.preventDefault();
        currentSave();
      } else if (e.key === "-") {
        if (!currentCanEdit) return;
        e.preventDefault();
        currentConfirm();
      } else if (e.key === "F7") {
        if (!currentCanEdit) return;
        e.preventDefault();
        setConfirmServe({ open: true, loading: false });
      } else if (e.key === "F9" || e.key === "F12") {
        e.preventDefault();
        printOrderInvoice(currentOrder);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered menu
  const filteredMenu = useMemo(() => {
    if (!menuSearch) return menuItems.filter(i => i.is_available);
    const q = menuSearch.toLowerCase();
    return menuItems.filter(i => i.is_available && (
      (i.name || "").toLowerCase().includes(q) || (i.name_ar || "").toLowerCase().includes(q)
    ));
  }, [menuItems, menuSearch]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: colors.brand[500] }} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0",
        background: colors.semantic.errorBg, borderRadius: radius.xl, border: `1px solid ${colors.semantic.errorBorder}`,
      }}>
        <AlertCircle size={32} style={{ color: colors.semantic.error, marginBottom: 12 }} />
        <p style={{ fontSize: typography.size.sm, color: colors.semantic.error }}>{error || "الطلب غير موجود"}</p>
        <button onClick={() => navigate(-1)} style={{
          marginTop: 12, padding: "8px 16px", borderRadius: radius.lg,
          background: colors.neutral[700], color: "#fff", border: "none",
          fontSize: typography.size.sm, fontWeight: typography.weight.semibold, cursor: "pointer",
        }}>
          العودة
        </button>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: colors.neutral[500], icon: null };
  const subtotal = order.items?.reduce((sum, i) => sum + (i.unit_price || 0) * i.quantity, 0) || order.subtotal;
  const discount = order.discount_amount || order.discount_value || 0;
  const deliveryFee = order.delivery_fee || 0;
  const taxAmount = order.tax_amount || 0;
  const total = order.total;

  const invoice = order.invoice;
  const orderRef = getOrderReference(order.order_number);
  const lastPayment = invoice?.payments?.[invoice.payments.length - 1];
  const lastPaidAt = lastPayment?.paid_at;
  const paidMethod = order.payment_status === "paid"
    ? PAYMENT_METHOD_LABELS[invoice?.payment_method || ""] || invoice?.payment_method
    : PAYMENT_METHOD_LABELS[lastPayment?.method || lastPayment?.payment_method || ""] || lastPayment?.method;
  const canPayNow = order.status !== "cancelled";

  return (
    <div dir="rtl" style={{ fontFamily: typography.fontFamily.sans, minHeight: "100%", maxWidth: 960, margin: "0 auto" }}>
      {/* ── Page toolbar (chrome) — منفصل بصريًا عن ورقة الفاتورة تحته ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 36, height: 36, borderRadius: radius.lg,
              background: colors.neutral[100], border: `1px solid ${colors.border.subtle}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: colors.neutral[600], flexShrink: 0,
            }}
          >
            <ArrowRight size={18} />
          </button>
          <h1 style={{ fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
            تفاصيل الطلب
            <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.neutral[400], marginRight: 8 }}>
              طلب {orderRef}
            </span>
          </h1>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowInvoice(true)} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: radius.lg,
            background: colors.neutral[100], border: `1px solid ${colors.border.subtle}`,
            color: colors.neutral[700], fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
            cursor: "pointer",
          }}>
            <Receipt size={14} /> معاينة الفاتورة
          </button>
          {canEditOrder && (
            <>
              {editing ? (
                <>
                  <button onClick={() => { setEditing(false); fetchOrder(); }} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: radius.lg,
                    background: colors.neutral[100], border: `1px solid ${colors.border.subtle}`,
                    color: colors.neutral[600], fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
                    cursor: "pointer",
                  }}>
                    <X size={14} /> إلغاء
                  </button>
                  <button onClick={saveOrder} disabled={saving} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: radius.lg,
                    background: colors.brand[500], color: "#fff", border: "none",
                    fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
                    cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                  }}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    حفظ
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowAddItem(true)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: radius.lg,
                    background: `color-mix(in srgb, ${colors.semantic.success} 6%, transparent)`, border: `1px solid ${colors.semantic.successBorder}`,
                    color: colors.semantic.success, fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
                    cursor: "pointer",
                  }}>
                    <Plus size={14} /> إضافة صنف
                  </button>
                  <button onClick={() => setEditing(true)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: radius.lg,
                    background: `color-mix(in srgb, ${colors.brand[500]} 3%, transparent)`, border: `1px solid color-mix(in srgb, ${colors.brand[500]} 13%, transparent)`,
                    color: colors.brand[600], fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
                    cursor: "pointer",
                  }}>
                    <Edit3 size={14} /> تعديل
                  </button>
                </>
              )}
              {order.order_type === "delivery" && order.status === "ready" && (
                <button onClick={() => setShowAssignDriver(true)} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: radius.lg,
                  background: `color-mix(in srgb, #F97316 6%, transparent)`, border: `1px solid color-mix(in srgb, #F97316 25%, transparent)`,
                  color: "#F97316", fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
                  cursor: "pointer",
                }}>
                  <Bike size={14} /> تعيين موظف توصيل
                </button>
              )}
              {order.status === "OUT_FOR_DELIVERY" && (
                <button onClick={() => setConfirmServe({ open: true, loading: false })} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: radius.lg,
                  background: colors.semantic.success, color: "#fff", border: "none",
                  fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
                  cursor: "pointer",
                }}>
                  <CheckCircle2 size={14} /> تم التسليم
                </button>
              )}
              {order.status !== "cancelled" && (
                <button onClick={cancelOrder} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: radius.lg,
                  background: `color-mix(in srgb, ${colors.semantic.error} 6%, transparent)`, border: `1px solid ${colors.semantic.errorBorder}`,
                  color: colors.semantic.error, fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
                  cursor: "pointer",
                }}>
                  <XCircle size={14} /> إلغاء الطلب
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* شريط تلميح اختصارات لوحة المفاتيح — يعمل فقط لما التركيز خارج أي حقل إدخال */}
      {canEditOrder && (
        <div style={{
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
          padding: "8px 14px", marginBottom: 16, borderRadius: radius.lg,
          background: colors.neutral[50], border: `1px solid ${colors.border.subtle}`,
          fontSize: "11px", color: colors.neutral[500],
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: typography.weight.semibold, color: colors.neutral[400] }}>
            <Keyboard size={12} /> اختصارات:
          </span>
          <span><kbd style={kbdStyle}>F2</kbd> حفظ</span>
          <span><kbd style={kbdStyle}>-</kbd> تنفيذ بالأقسام</span>
          <span><kbd style={kbdStyle}>F7</kbd> إغلاق الفاتورة</span>
          <span><kbd style={kbdStyle}>F9</kbd> طباعة الفاتورة</span>
        </div>
      )}

      {/* Read-only badge for closed orders */}
      {isClosed && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", marginBottom: 16,
          background: colors.semantic.warningBg, borderRadius: radius.lg, border: `1px solid ${colors.semantic.warningBorder}`,
          fontSize: typography.size.sm, color: colors.semantic.warning, fontWeight: typography.weight.semibold,
        }}>
          <AlertCircle size={16} />
          هذا الطلب مغلق (مكتمل ومدفوع بالكامل) — للقراءة فقط. عرض التفاصيل والفاتورة متاح، بدون تعديل أو إضافة صنف أو إلغاء.
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ورقة الفاتورة — مستند واحد متكامل (هيدر / بيانات عميل / أصناف /
          ملخص مبلغ + دفع / فوتر) بدل البطاقات المتفرقة، بنفس تصميم
          InvoicePreviewDrawer حتى تكون معاينة الفاتورة امتداد طبيعي لنفس الشكل.
          ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: colors.neutral[0], borderRadius: radius["2xl"],
        border: `1px solid ${colors.border.subtle}`, boxShadow: shadows.sm, overflow: "hidden",
      }}>
        {/* هيدر الفاتورة: رقم الفاتورة/الطلب والتاريخ يمين — هوية الفرع يسار */}
        <div style={{
          padding: "24px 28px", borderBottom: `2px solid ${colors.neutral[900]}`,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16,
        }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.extrabold, color: colors.brand[600] }}>
              {invoice?.number || "مسودة فاتورة"}
            </p>
            <p style={{ fontSize: typography.size.sm, color: colors.neutral[500], marginTop: 4 }}>
              طلب {orderRef} <span style={{ color: colors.neutral[400] }}>({order.order_number})</span>
            </p>
            <p style={{ fontSize: "11px", color: colors.neutral[400], marginTop: 2 }}>
              {formatDate(order.created_at)} — {formatTime(order.created_at)}
            </p>
          </div>
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
              {order.branch?.name || "RestoMaster"}
            </p>
            {(order.branch?.phone || order.branch?.address) && (
              <p style={{ fontSize: "11px", color: colors.neutral[400], marginTop: 2 }}>
                {[order.branch?.phone, order.branch?.address].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        {/* شريط الحالات */}
        <div style={{
          padding: "12px 28px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          borderBottom: `1px solid ${colors.border.subtle}`, background: colors.neutral[50],
        }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 10px", borderRadius: radius.full,
            background: `color-mix(in srgb, ${statusInfo.color} 12%, transparent)`, color: statusInfo.color,
            fontSize: "11px", fontWeight: typography.weight.semibold,
          }}>
            {statusInfo.icon} {statusInfo.label}
          </span>
          {/* حالة الدفع مستقلة تمامًا عن حالة الطلب أعلاه — مبنية على order.payment_status
              الحقيقي (Invoice.status)، مش افتراض إن تقدّم حالة الطلب يعني الدفع تم. */}
          <PaymentStatusBadge status={order.payment_status} />
        </div>

        {/* بيانات العميل (Bill To) + نوع الطلب/الفرع */}
        <div style={{
          padding: "20px 28px", borderBottom: `1px solid ${colors.border.subtle}`,
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20,
        }}>
          <div>
            <span style={labelStyle}>البيانات إلى (Bill To)</span>
            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  value={editCustomerName}
                  onChange={e => setEditCustomerName(e.target.value)}
                  placeholder="اسم العميل"
                  style={{
                    width: "100%", height: 36, padding: "0 10px", borderRadius: radius.md,
                    border: `1px solid ${colors.border.default}`, fontSize: typography.size.sm, outline: "none",
                  }}
                />
                <input
                  value={editCustomerPhone}
                  onChange={e => setEditCustomerPhone(e.target.value)}
                  placeholder="رقم الهاتف"
                  style={{
                    width: "100%", height: 36, padding: "0 10px", borderRadius: radius.md,
                    border: `1px solid ${colors.border.default}`, fontSize: typography.size.sm, outline: "none",
                    fontFamily: typography.fontFamily.mono,
                  }}
                />
              </div>
            ) : (
              <div>
                <p style={{ fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                  {order.customer_name || "—"}
                </p>
                <p style={{ fontSize: typography.size.sm, color: colors.neutral[600], fontFamily: typography.fontFamily.mono, display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <Phone size={12} style={{ color: colors.neutral[400] }} /> {order.customer_phone || "—"}
                </p>
              </div>
            )}
          </div>
          <div>
            <span style={labelStyle}>نوع الطلب</span>
            <p style={{ fontSize: typography.size.base, color: colors.neutral[800], fontWeight: typography.weight.semibold }}>
              {ORDER_TYPE_MAP[order.order_type] || order.order_type}
            </p>
            <span style={{ ...labelStyle, marginTop: 12 }}>الفرع</span>
            <p style={{ fontSize: typography.size.base, color: colors.neutral[800] }}>{order.branch?.name || "—"}</p>
            {order.driver && (
              <>
                <span style={{ ...labelStyle, marginTop: 12 }}>موظف التوصيل</span>
                <p style={{ fontSize: typography.size.base, color: colors.neutral[800], display: "flex", alignItems: "center", gap: 6 }}>
                  <Bike size={14} style={{ color: "#F97316" }} /> {order.driver.name}
                  {order.driver.phone && <span style={{ fontSize: typography.size.xs, color: colors.neutral[400], fontFamily: typography.fontFamily.mono }}>({order.driver.phone})</span>}
                </p>
              </>
            )}
          </div>
        </div>

        {/* جدول الأصناف */}
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${colors.border.subtle}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={labelStyle}>أصناف الطلب ({order.items?.length || 0})</span>
            {canEditOrder && editing && (
              <button onClick={() => setShowAddItem(true)} style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "4px 10px", borderRadius: radius.md,
                background: `color-mix(in srgb, ${colors.semantic.success} 6%, transparent)`, border: `1px solid ${colors.semantic.successBorder}`,
                color: colors.semantic.success, fontSize: "11px", fontWeight: typography.weight.semibold,
                cursor: "pointer",
              }}>
                <Plus size={12} /> إضافة
              </button>
            )}
          </div>

          {order.items && order.items.length > 0 ? (
            <div style={{ overflowX: "auto", borderRadius: radius.lg, border: `1px solid ${colors.border.subtle}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.size.sm, minWidth: 480 }}>
                <thead>
                  <tr style={{ background: colors.neutral[100] }}>
                    <th style={{ padding: "8px 10px", textAlign: "center", fontSize: "11px", color: colors.neutral[500], fontWeight: typography.weight.bold, width: 32 }}>#</th>
                    <th style={{ padding: "8px 10px", textAlign: "right", fontSize: "11px", color: colors.neutral[500], fontWeight: typography.weight.bold }}>الصنف</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", fontSize: "11px", color: colors.neutral[500], fontWeight: typography.weight.bold }}>الكمية</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", fontSize: "11px", color: colors.neutral[500], fontWeight: typography.weight.bold }}>سعر الوحدة</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", fontSize: "11px", color: colors.neutral[500], fontWeight: typography.weight.bold }}>الإجمالي</th>
                    {editing && <th style={{ padding: "8px 10px", width: 40 }} />}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={item.id} style={{ background: idx % 2 === 1 ? colors.neutral[50] : "transparent", borderTop: `1px solid ${colors.border.subtle}` }}>
                      <td style={{ padding: "10px", textAlign: "center", color: colors.neutral[400], fontSize: "11px" }}>{idx + 1}</td>
                      <td style={{ padding: "10px", color: colors.neutral[800], fontWeight: typography.weight.semibold }}>
                        {item.item_name_ar || item.item_name}
                        {item.notes && <div style={{ fontSize: "11px", color: colors.neutral[400], fontWeight: typography.weight.normal }}>📝 {item.notes}</div>}
                      </td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        {editing ? (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            <button
                              onClick={() => updateItemQuantity(item, item.quantity - 1)}
                              disabled={itemBusyId === item.id || item.quantity <= 1}
                              style={{
                                width: 22, height: 22, borderRadius: radius.sm, display: "flex", alignItems: "center", justifyContent: "center",
                                background: colors.neutral[100], border: `1px solid ${colors.border.subtle}`, color: colors.neutral[600],
                                cursor: itemBusyId === item.id || item.quantity <= 1 ? "not-allowed" : "pointer", opacity: itemBusyId === item.id ? 0.5 : 1,
                              }}
                            >
                              <Minus size={11} />
                            </button>
                            <span style={{ minWidth: 18, textAlign: "center", fontWeight: typography.weight.semibold, color: colors.neutral[800] }}>
                              {itemBusyId === item.id ? <Loader2 size={11} className="animate-spin" /> : item.quantity}
                            </span>
                            <button
                              onClick={() => updateItemQuantity(item, item.quantity + 1)}
                              disabled={itemBusyId === item.id}
                              style={{
                                width: 22, height: 22, borderRadius: radius.sm, display: "flex", alignItems: "center", justifyContent: "center",
                                background: colors.neutral[100], border: `1px solid ${colors.border.subtle}`, color: colors.neutral[600],
                                cursor: itemBusyId === item.id ? "not-allowed" : "pointer", opacity: itemBusyId === item.id ? 0.5 : 1,
                              }}
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: colors.neutral[600] }}>{item.quantity}</span>
                        )}
                      </td>
                      <td style={{ padding: "10px", textAlign: "center", color: colors.neutral[600] }}>{formatShekel(item.unit_price || 0)}</td>
                      <td style={{ padding: "10px", textAlign: "center", color: colors.neutral[900], fontWeight: typography.weight.bold }}>
                        {formatShekel(item.total_price ?? (item.unit_price || 0) * item.quantity)}
                      </td>
                      {editing && (
                        <td style={{ padding: "10px", textAlign: "center" }}>
                          <button
                            onClick={() => removeItem(item.id)}
                            disabled={itemBusyId === item.id}
                            style={{
                              width: 24, height: 24, borderRadius: radius.md,
                              background: `color-mix(in srgb, ${colors.semantic.error} 3%, transparent)`, border: `1px solid ${colors.semantic.errorBorder}`,
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              cursor: itemBusyId === item.id ? "not-allowed" : "pointer", color: colors.semantic.error,
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "32px 0", textAlign: "center", color: colors.neutral[400], fontSize: typography.size.sm }}>
              لا توجد أصناف في هذا الطلب
            </div>
          )}
        </div>

        {/* ملاحظات (قابلة للتعديل) */}
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${colors.border.subtle}` }}>
          <span style={labelStyle}>ملاحظات</span>
          {editing ? (
            <textarea
              value={editNote}
              onChange={e => setEditNote(e.target.value)}
              placeholder="أضف ملاحظة..."
              rows={2}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: radius.lg,
                border: `1px solid ${colors.border.default}`, fontSize: typography.size.sm,
                outline: "none", resize: "vertical", fontFamily: typography.fontFamily.sans,
              }}
            />
          ) : (
            <p style={{ fontSize: typography.size.sm, color: order.note ? colors.neutral[700] : colors.neutral[400] }}>
              {order.note || "لا توجد ملاحظات"}
            </p>
          )}
        </div>

        {/* ملخص المبلغ + الدفع — بمحاذاة الجانب المقابل لبداية القراءة (يمين بالـ RTL)، كتلة واحدة */}
        <div style={{ padding: "20px 28px", display: "flex", justifyContent: "flex-start" }}>
          <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.sm }}>
              <span style={{ color: colors.neutral[500] }}>المجموع الفرعي</span>
              <span style={{ fontWeight: typography.weight.semibold, color: colors.neutral[800] }}>{formatShekel(subtotal)}</span>
            </div>

            {editing ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: typography.size.sm, gap: 8 }}>
                <span style={{ color: colors.semantic.error }}>الخصم</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="number"
                    value={editDiscountValue || ""}
                    onChange={e => setEditDiscountValue(Number(e.target.value))}
                    placeholder="0"
                    style={{
                      width: 80, height: 30, padding: "0 8px", borderRadius: radius.md,
                      border: `1px solid ${colors.border.default}`, fontSize: typography.size.xs, outline: "none", textAlign: "center",
                    }}
                  />
                  <select
                    value={editDiscountType}
                    onChange={e => setEditDiscountType(e.target.value as "amount" | "percent")}
                    style={{
                      height: 30, padding: "0 6px", borderRadius: radius.md,
                      border: `1px solid ${colors.border.default}`, fontSize: typography.size.xs,
                      background: colors.neutral[0], cursor: "pointer",
                    }}
                  >
                    <option value="amount">₪</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </div>
            ) : discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.sm }}>
                <span style={{ color: colors.semantic.error }}>الخصم</span>
                <span style={{ fontWeight: typography.weight.semibold, color: colors.semantic.error }}>-{formatShekel(discount)}</span>
              </div>
            )}

            {deliveryFee > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.sm }}>
                <span style={{ color: colors.neutral[500] }}>رسوم التوصيل</span>
                <span style={{ color: colors.neutral[800] }}>{formatShekel(deliveryFee)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.sm }}>
                <span style={{ color: colors.neutral[500] }}>الضريبة</span>
                <span style={{ color: colors.neutral[800] }}>{formatShekel(taxAmount)}</span>
              </div>
            )}

            <div style={{ borderTop: `2px solid ${colors.neutral[900]}`, paddingTop: 10, marginTop: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>الإجمالي</span>
              <span style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.extrabold, color: colors.brand[600] }}>{formatShekel(total)}</span>
            </div>

            {/* قسم الدفع — جزء من نفس بطاقة الملخص، مو بطاقة منفصلة */}
            <div style={{ marginTop: 8, paddingTop: 14, borderTop: `1px dashed ${colors.border.default}` }}>
              {order.payment_status === "paid" && invoice ? (
                <div style={{
                  background: colors.semantic.successBg, border: `1px solid ${colors.semantic.successBorder}`,
                  borderRadius: radius.lg, padding: 12, display: "flex", flexDirection: "column", gap: 6,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: colors.semantic.success, fontWeight: typography.weight.bold, fontSize: typography.size.sm }}>
                    <CheckCircle2 size={14} /> تم الدفع بالكامل
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.xs, color: colors.neutral[600] }}>
                    <span>طريقة الدفع</span>
                    <span style={{ fontWeight: typography.weight.semibold }}>{paidMethod || "—"}</span>
                  </div>
                  {lastPaidAt && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.xs, color: colors.neutral[600] }}>
                      <span>تاريخ الدفع</span>
                      <span>{formatDate(lastPaidAt)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.xs, color: colors.neutral[600] }}>
                    <span>رقم الفاتورة</span>
                    <span style={{ fontWeight: typography.weight.semibold }}>{invoice.number}</span>
                  </div>
                </div>
              ) : order.payment_status === "pending" && invoice ? (
                <div style={{
                  background: colors.semantic.warningBg, border: `1px solid ${colors.semantic.warningBorder}`,
                  borderRadius: radius.lg, padding: 12, display: "flex", flexDirection: "column", gap: 6,
                }}>
                  <div style={{ fontWeight: typography.weight.bold, color: colors.semantic.warning, fontSize: typography.size.sm }}>مدفوع جزئيًا</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.xs, color: colors.neutral[600] }}>
                    <span>المحصّل ({paidMethod || "—"})</span>
                    <span style={{ fontWeight: typography.weight.semibold }}>{formatShekel(invoice.paid_amount || 0)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.xs, color: colors.semantic.warning }}>
                    <span>المتبقي</span>
                    <span style={{ fontWeight: typography.weight.bold }}>{formatShekel(invoice.remaining_amount || 0)}</span>
                  </div>
                  {canPayNow && (
                    <button onClick={() => setShowPaymentModal(true)} style={{
                      marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "8px 12px", borderRadius: radius.lg,
                      background: colors.brand[500], color: "#fff", border: "none",
                      fontSize: typography.size.sm, fontWeight: typography.weight.semibold, cursor: "pointer",
                    }}>
                      <CreditCard size={14} /> تسجيل دفعة إضافية
                    </button>
                  )}
                </div>
              ) : (
                <div style={{
                  background: colors.neutral[50], border: `1px dashed ${colors.border.default}`,
                  borderRadius: radius.lg, padding: 12, textAlign: "center",
                }}>
                  <p style={{ fontSize: typography.size.sm, color: colors.neutral[500], marginBottom: canPayNow ? 10 : 0 }}>
                    لم يتم تحصيل الدفع بعد لهذا الطلب
                  </p>
                  {canPayNow && (
                    <button onClick={() => setShowPaymentModal(true)} style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
                      padding: "9px 12px", borderRadius: radius.lg,
                      background: colors.brand[500], color: "#fff", border: "none",
                      fontSize: typography.size.sm, fontWeight: typography.weight.bold, cursor: "pointer",
                    }}>
                      <CreditCard size={14} /> تسجيل الدفع
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {order.cancellation_reason && (
          <div style={{
            margin: "0 28px 20px", padding: 14,
            background: colors.semantic.errorBg, borderRadius: radius.lg, border: `1px solid ${colors.semantic.errorBorder}`,
          }}>
            <p style={{ fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.semantic.error, marginBottom: 4 }}>
              سبب الإلغاء
            </p>
            <p style={{ fontSize: typography.size.sm, color: colors.neutral[700] }}>{order.cancellation_reason}</p>
          </div>
        )}

        {/* فوتر الفاتورة */}
        <div style={{ padding: "14px 28px", borderTop: `1px dashed ${colors.border.default}`, background: colors.neutral[50], textAlign: "center" }}>
          <p style={{ fontSize: "11px", color: colors.neutral[400] }}>شكرًا لتعاملكم معنا</p>
        </div>
      </div>

      {showInvoice && (
        <InvoicePreviewDrawer
          order={order}
          onClose={() => setShowInvoice(false)}
          onRecordPayment={canPayNow ? () => setShowPaymentModal(true) : undefined}
        />
      )}

      {showPaymentModal && (
        <RecordPaymentModal
          order={order}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      <ConfirmModal
        open={confirmServe.open}
        title="إغلاق الفاتورة"
        message={`سيتم تسليم الطلب ${orderRef} وإغلاق فاتورته — هذا الإجراء لا رجعة فيه. هل أنت متأكد؟`}
        confirmLabel="إغلاق الفاتورة"
        variant="warning"
        loading={confirmServe.loading}
        onConfirm={serveOrder}
        onCancel={() => setConfirmServe({ open: false, loading: false })}
      />

      {/* Assign Driver Modal */}
      {showAssignDriver && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
        }} onClick={() => setShowAssignDriver(false)}>
          <div
            style={{
              width: "100%", maxWidth: 420, maxHeight: "70vh",
              background: colors.neutral[0], borderRadius: radius.xl,
              boxShadow: shadows["2xl"], overflow: "hidden", display: "flex", flexDirection: "column",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.border.subtle}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>تعيين موظف توصيل</h3>
              <button onClick={() => setShowAssignDriver(false)} style={{ background: "none", border: "none", cursor: "pointer", color: colors.neutral[400] }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {driversLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 30 }}>
                  <Loader2 size={24} className="animate-spin" style={{ color: colors.brand[500] }} />
                </div>
              ) : drivers.length === 0 ? (
                <p style={{ textAlign: "center", color: colors.neutral[400], padding: 30, fontSize: typography.size.sm }}>
                  لا يوجد سائقو توصيل متاحون حاليًا (بشفت مفتوح)
                </p>
              ) : (
                drivers.map(driver => (
                  <button
                    key={driver.id}
                    onClick={() => assignDriver(driver.id)}
                    disabled={assigningDriverId !== null}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 14px", borderRadius: radius.lg, marginBottom: 6,
                      background: colors.neutral[50], border: `1px solid ${colors.border.subtle}`, cursor: assigningDriverId !== null ? "not-allowed" : "pointer",
                      textAlign: "right", opacity: assigningDriverId !== null && assigningDriverId !== driver.id ? 0.5 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Bike size={16} style={{ color: "#F97316" }} />
                      <div>
                        <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.neutral[800] }}>{driver.name}</p>
                        {driver.phone && <p style={{ fontSize: "11px", color: colors.neutral[400], fontFamily: typography.fontFamily.mono }}>{driver.phone}</p>}
                      </div>
                    </div>
                    {assigningDriverId === driver.id && <Loader2 size={14} className="animate-spin" style={{ color: colors.brand[500] }} />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
        }} onClick={() => { setShowAddItem(false); setMenuSearch(""); }}>
          <div
            style={{
              width: "100%", maxWidth: 480, maxHeight: "80vh",
              background: colors.neutral[0], borderRadius: radius.xl,
              boxShadow: shadows["2xl"], overflow: "hidden", display: "flex", flexDirection: "column",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.border.subtle}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>إضافة صنف</h3>
              <button onClick={() => { setShowAddItem(false); setMenuSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: colors.neutral[400] }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "12px 20px" }}>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: colors.neutral[400] }} />
                <input
                  value={menuSearch}
                  onChange={e => setMenuSearch(e.target.value)}
                  placeholder="ابحث عن صنف..."
                  autoFocus
                  style={{
                    width: "100%", height: 40, padding: "0 40px 0 12px",
                    border: `1px solid ${colors.border.default}`, borderRadius: radius.lg,
                    fontSize: typography.size.sm, outline: "none",
                  }}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
              {menuLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 30 }}>
                  <Loader2 size={24} className="animate-spin" style={{ color: colors.brand[500] }} />
                </div>
              ) : filteredMenu.length === 0 ? (
                <p style={{ textAlign: "center", color: colors.neutral[400], padding: 30, fontSize: typography.size.sm }}>
                  لا توجد أصناف مطابقة
                </p>
              ) : (
                filteredMenu.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 12px", borderRadius: radius.lg, marginBottom: 4,
                      background: "transparent", border: "none", cursor: "pointer",
                      transition: `background ${transitions.fast}`, textAlign: "right",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = colors.neutral[50]}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div>
                      <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.neutral[800] }}>
                        {item.name_ar || item.name}
                      </p>
                      {item.category && (
                        <p style={{ fontSize: "11px", color: colors.neutral[400] }}>{item.category}</p>
                      )}
                    </div>
                    <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.brand[600] }}>
                      {formatShekel(item.price)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// حالة الدفع مستقلة تمامًا عن حالة الطلب — badge منفصل بلون ونص معًا (مش لون بس)، مبني على
// order.payment_status الحقيقي (Invoice.status)، مش تخمين من order.status.
const PaymentStatusBadge: React.FC<{ status?: "paid" | "pending" | "unpaid" }> = ({ status }) => {
  const derived = status === "paid" ? "paid" : status === "pending" ? "awaiting_payment" : "unpaid";
  const color = derived === "paid" ? colors.semantic.success
    : derived === "awaiting_payment" ? colors.semantic.warning
    : colors.neutral[500];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: radius.full,
      background: `color-mix(in srgb, ${color} 12%, transparent)`, color,
      fontSize: "11px", fontWeight: typography.weight.semibold,
    }}>
      ● {PAYMENT_STATUS_LABELS[derived]}
    </span>
  );
};

export default OrderDetailPage;
