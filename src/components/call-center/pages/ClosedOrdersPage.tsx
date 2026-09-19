import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, Loader2, Package, User, Phone, Search, Eye, Receipt,
  AlertCircle, RefreshCw, CheckCircle2, XCircle,
} from "lucide-react";
import { colors, typography, radius, shadows, transitions } from "../design/tokens";
import { callCenterService, type ClosedCallCenterOrder } from "../services/callCenterService";
import { dedupeById, getOrderReference, formatShekel, PAYMENT_STATUS_LABELS } from "../activeOrdersView";

// ============================================================================
// STATUS MAPS
// ============================================================================

// طلب "مغلق" هون معناه: انصنّف closed فعليًا بالباك اند (CallCenterService::determineLifecycle) —
// إما ملغي، أو حالته اكتملت (تم التقديم/التوصيل) والفاتورة مدفوعة بالكامل معًا. الدفع وحده
// أبدًا ما يغلق الطلب (لهيك الفلتر هون على status الطلب نفسه بس، مش على "مدفوع").
const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  served:    { label: "تم التقديم", color: colors.semantic.success, icon: <CheckCircle2 size={14} /> },
  DELIVERED: { label: "تم التوصيل", color: colors.semantic.success, icon: <CheckCircle2 size={14} /> },
  cancelled: { label: "ملغي", color: colors.semantic.error, icon: <XCircle size={14} /> },
  CANCELLED: { label: "ملغي", color: colors.semantic.error, icon: <XCircle size={14} /> },
};

const ORDER_TYPE_MAP: Record<string, string> = {
  dine_in: "محلي", takeaway: "فوري", delivery: "توصيل",
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
};
const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
};

// ============================================================================
// CLOSED ORDERS PAGE
// ============================================================================

export const ClosedOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ClosedCallCenterOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pagination, setPagination] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchOrders = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await callCenterService.getClosedOrders({
        page, perPage: 20,
        search: searchQuery || undefined,
        status: statusFilter,
      });
      // إزالة تكرار دفاعية بالاعتماد على id الحقيقي — راجع activeOrdersView.ts للتفاصيل.
      setOrders(dedupeById(res.data.data));
      setPagination(res.data.meta);
    } catch (err: any) {
      setError(err?.response?.data?.message || "تعذر تحميل الطلبات المغلقة");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => { fetchOrders(currentPage); }, [currentPage, fetchOrders]);

  return (
    <div dir="rtl" style={{ fontFamily: typography.fontFamily.sans, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
            الطلبات المغلقة
          </h1>
          <p style={{ fontSize: typography.size.sm, color: colors.neutral[500], marginTop: 4 }}>
            {pagination?.total ?? orders.length} طلب مغلق
            <span style={{ color: colors.semantic.warning, marginRight: 8 }}>— للقراءة فقط</span>
          </p>
        </div>
        <button
          onClick={() => fetchOrders(currentPage)}
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

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 250, position: "relative" }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: colors.neutral[400] }} />
          <input
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="بحث برقم الطلب، اسم العميل..."
            style={{
              width: "100%", height: 40, padding: "0 40px 0 12px",
              border: `1px solid ${colors.border.default}`, borderRadius: radius.lg,
              fontSize: typography.size.sm, outline: "none", background: colors.neutral[0],
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          style={{
            height: 40, padding: "0 12px", borderRadius: radius.lg,
            border: `1px solid ${colors.border.default}`, background: colors.neutral[0],
            fontSize: typography.size.sm, color: colors.neutral[700], cursor: "pointer",
          }}
        >
          <option value="all">جميع الحالات</option>
          <option value="served">تم التقديم</option>
          <option value="DELIVERED">تم التوصيل</option>
          <option value="cancelled">ملغي</option>
        </select>
      </div>

      {/* Content */}
      {loading && orders.length === 0 ? (
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
        </div>
      ) : orders.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0",
          background: colors.neutral[50], borderRadius: radius.xl,
        }}>
          <Package size={32} style={{ color: colors.neutral[300], marginBottom: 12 }} />
          <p style={{ fontSize: typography.size.sm, color: colors.neutral[500] }}>
            {searchQuery ? "لا توجد نتائج مطابقة" : "لا توجد طلبات مغلقة"}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {orders.map(order => (
              <ClosedOrderCard
                key={order.id}
                order={order}
                onOpen={() => navigate(`/call-center/orders/${order.id}`)}
                onViewInvoice={() => navigate(`/call-center/orders/${order.id}?invoice=true`)}
              />
            ))}
          </div>

          {pagination && pagination.last_page > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
              {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    minWidth: 36, height: 36, borderRadius: radius.lg,
                    background: page === currentPage ? colors.brand[500] : colors.neutral[0],
                    border: `1px solid ${page === currentPage ? colors.brand[500] : colors.border.default}`,
                    color: page === currentPage ? "#fff" : colors.neutral[700],
                    fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
                    cursor: "pointer", transition: `all ${transitions.fast}`,
                  }}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ============================================================================
// CLOSED ORDER CARD — للقراءة فقط لغالبية الموظفين: بدون Edit/Add Item/Cancel/Delete إطلاقًا،
// فقط View Details (فتح الطلب) وView Invoice (من داخل صفحة التفاصيل). التعديل يبقى محصور
// بالأدوار المُصرّح لها فقط (نفس القاعدة الموجودة أصلاً بالمشروع) بزر منفصل واضح.
// ============================================================================

export const ClosedOrderCard: React.FC<{
  order: ClosedCallCenterOrder; onOpen: () => void; onViewInvoice: () => void;
}> = ({ order, onOpen, onViewInvoice }) => {
  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: colors.neutral[500], icon: null };
  const paymentColor = order.payment_status === "paid" ? colors.semantic.success
    : order.payment_status === "pending" ? colors.semantic.warning
    : colors.neutral[500];
  const paymentLabel = order.payment_status === "paid" ? PAYMENT_STATUS_LABELS.paid
    : order.payment_status === "pending" ? PAYMENT_STATUS_LABELS.awaiting_payment
    : PAYMENT_STATUS_LABELS.unpaid;

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 10,
      padding: "16px 18px", borderRadius: radius.xl,
      background: colors.neutral[0], border: `1px solid ${colors.border.subtle}`,
      boxShadow: shadows.xs,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span title={order.order_number} style={{ fontSize: typography.size.lg, fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
          {getOrderReference(order.order_number)}
        </span>
        <span style={{
          padding: "2px 8px", borderRadius: radius.full,
          fontSize: "11px", fontWeight: typography.weight.semibold,
          background: colors.neutral[100], color: colors.neutral[600],
        }}>
          {ORDER_TYPE_MAP[order.order_type] || order.order_type}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.neutral[800] }}>
          <User size={13} style={{ color: colors.neutral[400] }} /> {order.customer_name || "بدون اسم"}
        </span>
        {order.customer_phone && (
          <span dir="ltr" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: typography.size.xs, color: colors.neutral[500] }}>
            <Phone size={12} style={{ color: colors.neutral[400] }} /> {order.customer_phone}
          </span>
        )}
      </div>

      <span style={{ fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
        {formatShekel(order.total)}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 9px", borderRadius: radius.full,
          fontSize: "11px", fontWeight: typography.weight.semibold,
          background: `color-mix(in srgb, ${statusInfo.color} 12%, transparent)`, color: statusInfo.color,
        }}>
          {statusInfo.icon} {statusInfo.label}
        </span>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 9px", borderRadius: radius.full,
          fontSize: "11px", fontWeight: typography.weight.semibold,
          background: `color-mix(in srgb, ${paymentColor} 12%, transparent)`, color: paymentColor,
        }}>
          ● {paymentLabel}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: typography.size.xs, color: colors.neutral[500] }}>
        <Clock size={12} /> {formatDate(order.created_at)} — {formatTime(order.created_at)}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={onOpen}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "9px 12px", borderRadius: radius.lg,
            background: colors.neutral[100], border: `1px solid ${colors.border.subtle}`,
            color: colors.neutral[700], fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
            cursor: "pointer", transition: `all ${transitions.fast}`,
          }}
        >
          <Eye size={14} /> عرض التفاصيل
        </button>
        {/* طلب مغلق = للقراءة فقط دائمًا، بلا استثناء أدوار: عرض التفاصيل وعرض الفاتورة بس —
            بدون تعديل/إضافة صنف/إلغاء إطلاقًا. */}
        <button
          onClick={onViewInvoice}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "9px 12px", borderRadius: radius.lg,
            background: `color-mix(in srgb, ${colors.brand[500]} 3%, transparent)`, border: `1px solid color-mix(in srgb, ${colors.brand[500]} 13%, transparent)`,
            color: colors.brand[600], fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
            cursor: "pointer",
          }}
        >
          <Receipt size={14} /> عرض الفاتورة
        </button>
      </div>
    </div>
  );
};

export default ClosedOrdersPage;
