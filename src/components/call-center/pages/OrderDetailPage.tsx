import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight, Loader2, Save, Plus, Trash2, Edit3, X, Check,
  User, Phone, MapPin, Clock, Package, ShoppingCart, CreditCard,
  AlertCircle, RefreshCw, StickyNote, Percent, DollarSign, Search,
  ChevronDown, CheckCircle2, XCircle, Ban, ChefHat, Truck,
} from "lucide-react";
import { colors, typography, radius, shadows, transitions } from "../design/tokens";
import { useAuth } from "../../../auth";
import { ROLES } from "../../../auth/permissions";
import { orderService, type OrderFromApi, type OrderItemFromApi } from "../../../services/orderService";
import api from "../../../api/axios";
import { toast } from "../../shared/Toast";

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

const CLOSED_STATUSES = new Set(["paid", "cancelled", "DELIVERED", "CANCELLED", "FAILED_DELIVERY"]);

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
const PAYMENT_MAP: Record<string, string> = { cash: "نقدي", card: "بطاقة", wallet: "محفظة", bank: "تحويل", account: "حساب" };

const formatCurrency = (n: number) => `${n.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} د.إ`;
const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
const formatTime = (d: string) => new Date(d).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

// ============================================================================
// ORDER DETAIL PAGE
// ============================================================================

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasRole } = useAuth();

  const [order, setOrder] = useState<OrderFromApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editNote, setEditNote] = useState("");
  const [editDiscountValue, setEditDiscountValue] = useState(0);
  const [editDiscountType, setEditDiscountType] = useState<"amount" | "percent">("amount");
  const [saving, setSaving] = useState(false);

  // Add item state
  const [showAddItem, setShowAddItem] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [menuLoading, setMenuLoading] = useState(false);

  const isClosed = order ? CLOSED_STATUSES.has(order.status) : false;

  // Permission check: can edit this order?
  const canEditOrder = useMemo(() => {
    if (!order) return false;
    // Active orders: call-center users can edit
    if (!isClosed) return true;
    // Closed orders: only accountant, branch-manager, super-admin
    return hasRole(ROLES.SUPER_ADMIN) || hasRole(ROLES.BRANCH_MANAGER) || hasRole(ROLES.ACCOUNTANT);
  }, [order, isClosed, hasRole]);

  const shouldStartEditing = searchParams.get("edit") === "true";

  // ── Fetch order ──
  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.getOne(Number(orderId));
      setOrder(data);
      setEditNote(data.note || "");
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

  // ── Save order updates ──
  const saveOrder = async () => {
    if (!order) return;
    setSaving(true);
    try {
      await orderService.syncPricing(order.id, {
        note: editNote,
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

  // ── Cancel order ──
  const cancelOrder = async () => {
    if (!order || !confirm("هل أنت متأكد من إلغاء هذا الطلب؟")) return;
    try {
      await orderService.cancel(order.id);
      toast.success("تم إلغاء الطلب");
      fetchOrder();
    } catch (err: any) {
      toast.error("فشل إلغاء الطلب", err?.response?.data?.message);
    }
  };

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
  const subtotal = order.items?.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0) || order.subtotal;
  const discount = order.discount_amount || order.discount_value || 0;
  const total = order.total;

  return (
    <div dir="rtl" style={{ fontFamily: typography.fontFamily.sans, minHeight: "100%", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 36, height: 36, borderRadius: radius.lg,
              background: colors.neutral[100], border: `1px solid ${colors.border.subtle}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: colors.neutral[600],
            }}
          >
            <ArrowRight size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
              طلب #{order.order_number}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 10px", borderRadius: radius.full,
                background: `color-mix(in srgb, ${statusInfo.color} 12%, transparent)`, color: statusInfo.color,
                fontSize: "11px", fontWeight: typography.weight.semibold,
              }}>
                {statusInfo.icon} {statusInfo.label}
              </span>
              <span style={{ fontSize: typography.size.xs, color: colors.neutral[400] }}>
                {formatDate(order.created_at)} — {formatTime(order.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {canEditOrder && !isClosed && (
            <>
              {editing ? (
                <>
                  <button onClick={() => setEditing(false)} style={{
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
            </>
          )}
          {canEditOrder && !isClosed && order.status !== "cancelled" && (
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
        </div>
      </div>

      {/* Read-only badge for closed orders */}
      {isClosed && !canEditOrder && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", marginBottom: 20,
          background: colors.semantic.warningBg, borderRadius: radius.lg, border: `1px solid ${colors.semantic.warningBorder}`,
          fontSize: typography.size.sm, color: colors.semantic.warning, fontWeight: typography.weight.semibold,
        }}>
          <AlertCircle size={16} />
          هذا الطلب مغلق — للقراءة فقط. يمكن التعديل فقط من قبل المحاسب أو مدير الفرع.
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        {/* Left: Items */}
        <div>
          {/* Items section */}
          <div style={{
            background: colors.neutral[0], borderRadius: radius.xl,
            border: `1px solid ${colors.border.subtle}`, overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 20px", borderBottom: `1px solid ${colors.border.subtle}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                أصناف الطلب ({order.items?.length || 0})
              </h2>
              {canEditOrder && !isClosed && (
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

            {/* Items list */}
            {order.items && order.items.length > 0 ? (
              <div>
                {order.items.map((item, idx) => (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
                    borderBottom: idx < order.items!.length - 1 ? `1px solid ${colors.border.subtle}` : "none",
                  }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: radius.md,
                      background: colors.neutral[100], display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", fontWeight: typography.weight.bold, color: colors.neutral[500],
                      flexShrink: 0,
                    }}>
                      {idx + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.neutral[800] }}>
                        {item.item_name_ar || item.item_name}
                      </p>
                      {item.notes && (
                        <p style={{ fontSize: "11px", color: colors.neutral[400], marginTop: 2 }}>📝 {item.notes}</p>
                      )}
                    </div>
                    <span style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>
                      {item.quantity} × {formatCurrency(item.price || 0)}
                    </span>
                    <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.neutral[900], minWidth: 80, textAlign: "left" }}>
                      {formatCurrency(item.total || (item.price || 0) * item.quantity)}
                    </span>
                    {canEditOrder && !isClosed && (
                      <button
                        onClick={() => removeItem(item.id)}
                        style={{
                          width: 28, height: 28, borderRadius: radius.md,
                          background: `color-mix(in srgb, ${colors.semantic.error} 3%, transparent)`, border: `1px solid ${colors.semantic.errorBorder}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", color: colors.semantic.error, flexShrink: 0,
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center", color: colors.neutral[400], fontSize: typography.size.sm }}>
                لا توجد أصناف في هذا الطلب
              </div>
            )}
          </div>
        </div>

        {/* Right: Order info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Customer info */}
          <div style={{
            background: colors.neutral[0], borderRadius: radius.xl,
            border: `1px solid ${colors.border.subtle}`, padding: 20,
          }}>
            <h3 style={{ fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.neutral[900], marginBottom: 12 }}>
              بيانات العميل
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <User size={14} style={{ color: colors.neutral[400] }} />
                <span style={{ fontSize: typography.size.sm, color: colors.neutral[700] }}>
                  {order.customer_name || "—"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Phone size={14} style={{ color: colors.neutral[400] }} />
                <span style={{ fontSize: typography.size.sm, color: colors.neutral[700], fontFamily: typography.fontFamily.mono }}>
                  {order.customer_phone || "—"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Package size={14} style={{ color: colors.neutral[400] }} />
                <span style={{ fontSize: typography.size.sm, color: colors.neutral[700] }}>
                  {ORDER_TYPE_MAP[order.order_type] || order.order_type}
                </span>
              </div>
              {order.branch && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MapPin size={14} style={{ color: colors.neutral[400] }} />
                  <span style={{ fontSize: typography.size.sm, color: colors.neutral[700] }}>{order.branch.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Note (editable) */}
          <div style={{
            background: colors.neutral[0], borderRadius: radius.xl,
            border: `1px solid ${colors.border.subtle}`, padding: 20,
          }}>
            <h3 style={{ fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.neutral[900], marginBottom: 8 }}>
              ملاحظات
            </h3>
            {editing ? (
              <textarea
                value={editNote}
                onChange={e => setEditNote(e.target.value)}
                placeholder="أضف ملاحظة..."
                rows={3}
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

          {/* Discount (editable) */}
          {editing && (
            <div style={{
              background: colors.neutral[0], borderRadius: radius.xl,
              border: `1px solid ${colors.border.subtle}`, padding: 20,
            }}>
              <h3 style={{ fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.neutral[900], marginBottom: 8 }}>
                الخصم
              </h3>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number"
                  value={editDiscountValue || ""}
                  onChange={e => setEditDiscountValue(Number(e.target.value))}
                  placeholder="قيمة الخصم"
                  style={{
                    flex: 1, height: 38, padding: "0 12px", borderRadius: radius.lg,
                    border: `1px solid ${colors.border.default}`, fontSize: typography.size.sm, outline: "none",
                  }}
                />
                <select
                  value={editDiscountType}
                  onChange={e => setEditDiscountType(e.target.value as "amount" | "percent")}
                  style={{
                    height: 38, padding: "0 10px", borderRadius: radius.lg,
                    border: `1px solid ${colors.border.default}`, fontSize: typography.size.sm,
                    background: colors.neutral[0], cursor: "pointer",
                  }}
                >
                  <option value="amount">مبلغ ثابت</option>
                  <option value="percent">نسبة مئوية</option>
                </select>
              </div>
            </div>
          )}

          {/* Totals */}
          <div style={{
            background: colors.neutral[0], borderRadius: radius.xl,
            border: `1px solid ${colors.border.subtle}`, padding: 20,
          }}>
            <h3 style={{ fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.neutral[900], marginBottom: 12 }}>
              ملخص المبلغ
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.sm }}>
                <span style={{ color: colors.neutral[500] }}>المجموع الفرعي</span>
                <span style={{ fontWeight: typography.weight.semibold, color: colors.neutral[800] }}>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.sm }}>
                  <span style={{ color: colors.semantic.error }}>الخصم</span>
                  <span style={{ fontWeight: typography.weight.semibold, color: colors.semantic.error }}>
                    -{formatCurrency(discount)}
                  </span>
                </div>
              )}
              <div style={{ borderTop: `1px solid ${colors.border.subtle}`, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                  {"\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A"}
                </span>
                <span style={{ fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, color: colors.brand[600] }}>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Payment info */}
          {order.payment_method && (
            <div style={{
              background: colors.neutral[0], borderRadius: radius.xl,
              border: `1px solid ${colors.border.subtle}`, padding: 20,
            }}>
              <h3 style={{ fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.neutral[900], marginBottom: 8 }}>
                الدفع
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CreditCard size={14} style={{ color: colors.neutral[400] }} />
                <span style={{ fontSize: typography.size.sm, color: colors.neutral[700] }}>
                  {PAYMENT_MAP[order.payment_method] || order.payment_method}
                </span>
                {order.paid_at && (
                  <span style={{ fontSize: "11px", color: colors.neutral[400], marginRight: "auto" }}>
                    {formatDate(order.paid_at)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
                      {formatCurrency(item.price)}
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

export default OrderDetailPage;
