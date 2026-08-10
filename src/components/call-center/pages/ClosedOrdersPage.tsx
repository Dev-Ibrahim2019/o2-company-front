import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, Loader2, Package, ArrowLeft, User, Search, Eye, Edit3,
  AlertCircle, RefreshCw, CheckCircle2, XCircle, Ban, Filter,
} from "lucide-react";
import { colors, typography, radius, shadows, transitions } from "../design/tokens";
import { useAuth } from "../../../auth";
import { ROLES } from "../../../auth/permissions";
import api from "../../../api/axios";

// ============================================================================
// TYPES
// ============================================================================

interface ClosedOrder {
  id: number;
  order_number: string;
  status: string;
  order_type: string;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  branch?: { id: number; name: string } | null;
  items?: Array<{
    id: number;
    item_name: string;
    item_name_ar?: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const CLOSED_STATUSES = ["served", "paid", "cancelled", "DELIVERED", "CANCELLED", "FAILED_DELIVERY"];

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  served:          { label: "تم التقديم", color: colors.semantic.success, icon: <CheckCircle2 size={14} /> },
  paid:            { label: "مدفوع", color: colors.semantic.success, icon: <CheckCircle2 size={14} /> },
  DELIVERED:       { label: "تم التوصيل", color: colors.semantic.success, icon: <CheckCircle2 size={14} /> },
  cancelled:       { label: "ملغي", color: colors.semantic.error, icon: <XCircle size={14} /> },
  CANCELLED:       { label: "ملغي", color: colors.semantic.error, icon: <XCircle size={14} /> },
  FAILED_DELIVERY: { label: "فشل التوصيل", color: colors.semantic.error, icon: <Ban size={14} /> },
};

const ORDER_TYPE_MAP: Record<string, string> = {
  dine_in: "محلي", takeaway: "فوري", delivery: "توصيل",
};

const PAYMENT_MAP: Record<string, string> = {
  cash: "نقدي", card: "بطاقة", wallet: "محفظة", bank: "تحويل", account: "حساب",
};

const formatCurrency = (n: number) => `${n.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} د.إ`;
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
  const { hasRole } = useAuth();
  const [orders, setOrders] = useState<ClosedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const canEditClosedOrders = hasRole(ROLES.SUPER_ADMIN) || hasRole(ROLES.BRANCH_MANAGER) || hasRole(ROLES.ACCOUNTANT);

  const fetchOrders = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, any> = { page, per_page: 20 };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== "all") params.status = statusFilter;
      else params.statuses = CLOSED_STATUSES.join(",");

      const { data } = await api.get("/orders", { params });
      const raw = data?.data;
      if (Array.isArray(raw)) {
        setOrders(raw);
        setPagination(data?.meta || null);
      } else if (raw?.data) {
        setOrders(raw.data);
        setPagination(raw?.meta || data?.meta || null);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "تعذر تحميل الطلبات المغلقة");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => { fetchOrders(currentPage); }, [currentPage, fetchOrders]);

  const filtered = orders.filter(o => CLOSED_STATUSES.includes(o.status));

  return (
    <div dir="rtl" style={{ fontFamily: typography.fontFamily.sans, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
            الطلبات المغلقة
          </h1>
          <p style={{ fontSize: typography.size.sm, color: colors.neutral[500], marginTop: 4 }}>
            {pagination?.total || filtered.length} طلب مغلق
            {!canEditClosedOrders && (
              <span style={{ color: colors.semantic.warning, marginRight: 8 }}>
                — للقراءة فقط
              </span>
            )}
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
        {/* Search */}
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
        {/* Status filter */}
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
          <option value="paid">مدفوع</option>
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
      ) : filtered.length === 0 ? (
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
          {/* Orders table */}
          <div style={{
            background: colors.neutral[0], borderRadius: radius.xl,
            border: `1px solid ${colors.border.subtle}`, overflow: "hidden",
          }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "80px 100px 1fr 100px 100px 120px 100px 80px",
              gap: 12, padding: "12px 20px", background: colors.neutral[50],
              borderBottom: `1px solid ${colors.border.subtle}`,
              fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.neutral[500],
            }}>
              <span>رقم</span>
              <span>الحالة</span>
              <span>العميل</span>
              <span>النوع</span>
              <span>الدفع</span>
              <span>التاريخ</span>
              <span style={{ textAlign: "left" }}>المبلغ</span>
              <span style={{ textAlign: "center" }}>إجراءات</span>
            </div>

            {/* Rows */}
            {filtered.map(order => {
              const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: colors.neutral[500], icon: null };
              return (
                <div
                  key={order.id}
                  style={{
                    display: "grid", gridTemplateColumns: "80px 100px 1fr 100px 100px 120px 100px 80px",
                    gap: 12, padding: "14px 20px", alignItems: "center",
                    borderBottom: `1px solid ${colors.border.subtle}`,
                    fontSize: typography.size.sm, transition: `background ${transitions.fast}`,
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = colors.neutral[50]}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  onClick={() => navigate(`/call-center/orders/${order.id}`)}
                >
                  <span style={{ fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                    #{order.order_number}
                  </span>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 8px", borderRadius: radius.full, width: "fit-content",
                    background: `${statusInfo.color}12`, color: statusInfo.color,
                    fontSize: "11px", fontWeight: typography.weight.semibold,
                  }}>
                    {statusInfo.icon}
                    {statusInfo.label}
                  </span>
                  <div>
                    <p style={{ fontWeight: typography.weight.semibold, color: colors.neutral[800] }}>
                      {order.customer_name || "بدون اسم"}
                    </p>
                    {order.customer_phone && (
                      <p style={{ fontSize: "11px", color: colors.neutral[400], fontFamily: typography.fontFamily.mono }}>
                        {order.customer_phone}
                      </p>
                    )}
                  </div>
                  <span style={{ color: colors.neutral[600] }}>
                    {ORDER_TYPE_MAP[order.order_type] || order.order_type}
                  </span>
                  <span style={{ color: colors.neutral[600] }}>
                    {PAYMENT_MAP[order.payment_method || ""] || "—"}
                  </span>
                  <div>
                    <p style={{ color: colors.neutral[700] }}>{formatDate(order.created_at)}</p>
                    <p style={{ fontSize: "11px", color: colors.neutral[400] }}>{formatTime(order.created_at)}</p>
                  </div>
                  <span style={{ fontWeight: typography.weight.extrabold, color: colors.neutral[900], textAlign: "left" }}>
                    {formatCurrency(order.total)}
                  </span>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {canEditClosedOrders ? (
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/call-center/orders/${order.id}?edit=true`); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "4px 10px", borderRadius: radius.md,
                          background: `${colors.brand[500]}08`, border: `1px solid ${colors.brand[500]}20`,
                          color: colors.brand[600], fontSize: "11px", fontWeight: typography.weight.semibold,
                          cursor: "pointer", transition: `all ${transitions.fast}`,
                        }}
                      >
                        <Edit3 size={12} /> تعديل
                      </button>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/call-center/orders/${order.id}`); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "4px 10px", borderRadius: radius.md,
                          background: colors.neutral[100], border: `1px solid ${colors.border.subtle}`,
                          color: colors.neutral[600], fontSize: "11px", fontWeight: typography.weight.semibold,
                          cursor: "pointer", transition: `all ${transitions.fast}`,
                        }}
                      >
                        <Eye size={12} /> عرض
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
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

export default ClosedOrdersPage;
