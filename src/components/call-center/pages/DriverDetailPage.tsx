import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight, Loader2, AlertCircle, Bike, Phone, Truck, Play, Square, Power, PowerOff,
  CheckCircle2, WifiOff, PackageCheck, Clock, ShoppingBag,
} from "lucide-react";
import { colors, typography, radius, shadows } from "../design/tokens";
import { employeeService, type EmployeeFromApi, type VehicleType } from "../../../services/employeeService";
import { orderService, type OrderFromApi } from "../../../services/orderService";
import { formatShekel, deriveWorkflowStage, workflowStageLabel, WORKFLOW_STAGE_COLORS } from "../activeOrdersView";
import { toast } from "../../shared/Toast";

// صفحة تفاصيل سائق — ملف كامل: بيانات الاتصال، توفر حي، إحصاءات محسوبة، وسجل طلبات التوصيل
// المُسنَدة له فعليًا (orders.driver_id)، بدل الاكتفاء بكارد مختصر بقائمة إدارة الديليفري.

const VEHICLE_LABELS: Record<VehicleType, string> = {
  bicycle: "دراجة هوائية", electric_bike: "دراجة كهربائية", motorcycle: "دراجة نارية", external: "توصيل خارجي",
};

const isActiveStatus = (d: EmployeeFromApi) => (d.status || "").toUpperCase() === "ACTIVE";

const AVAILABILITY_META: Record<"available" | "on_delivery" | "offline", { label: string; color: string; icon: React.ReactNode }> = {
  available: { label: "متاح", color: colors.semantic.success, icon: <CheckCircle2 size={13} /> },
  on_delivery: { label: "مع التوصيل", color: "#F97316", icon: <Bike size={13} /> },
  offline: { label: "غير متصل", color: colors.neutral[400], icon: <WifiOff size={13} /> },
};

const formatDateTime = (d?: string | null) => d
  ? new Date(d).toLocaleString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  : "—";

export const DriverDetailPage: React.FC = () => {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();

  const [driver, setDriver] = useState<EmployeeFromApi | null>(null);
  const [orders, setOrders] = useState<OrderFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDriver = useCallback(async () => {
    if (!driverId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await employeeService.getOne(Number(driverId));
      setDriver(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "تعذر تحميل بيانات السائق");
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  const fetchOrders = useCallback(async () => {
    if (!driverId) return;
    setOrdersLoading(true);
    try {
      const list = await orderService.getAll({ driver_id: Number(driverId) });
      setOrders(list);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [driverId]);

  useEffect(() => { fetchDriver(); fetchOrders(); }, [fetchDriver, fetchOrders]);

  const handleToggleShift = async () => {
    if (!driver) return;
    try {
      if (driver.on_shift_now) await employeeService.endShift(driver.id);
      else await employeeService.startShift(driver.id);
      fetchDriver();
    } catch (err: any) {
      toast.error("فشل تحديث حالة الشفت", err?.response?.data?.message);
    }
  };

  const handleToggleActive = async () => {
    if (!driver) return;
    const newStatus = isActiveStatus(driver) ? "SUSPENDED" : "ACTIVE";
    try {
      const updated = await employeeService.update(driver.id, {
        name: driver.name, phone: driver.phone, branch_id: driver.branch_id,
        role: driver.role, operational_role: "delivery_driver",
        vehicle_type: driver.vehicle_type, status: newStatus, employee_code: driver.employee_code,
      });
      setDriver(updated);
      toast.success(newStatus === "ACTIVE" ? "تم تفعيل السائق" : "تم إيقاف السائق");
    } catch (err: any) {
      toast.error("فشل تحديث حالة السائق", err?.response?.data?.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: colors.brand[500] }} />
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0",
        background: colors.semantic.errorBg, borderRadius: radius.xl, border: `1px solid ${colors.semantic.errorBorder}`,
      }}>
        <AlertCircle size={32} style={{ color: colors.semantic.error, marginBottom: 12 }} />
        <p style={{ fontSize: typography.size.sm, color: colors.semantic.error }}>{error || "السائق غير موجود"}</p>
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

  const active = isActiveStatus(driver);
  const availability = driver.availability || "offline";
  const meta = AVAILABILITY_META[availability];

  return (
    <div dir="rtl" style={{ fontFamily: typography.fontFamily.sans, minHeight: "100%", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} style={{
          width: 36, height: 36, borderRadius: radius.lg,
          background: colors.neutral[100], border: `1px solid ${colors.border.subtle}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: colors.neutral[600], flexShrink: 0,
        }}>
          <ArrowRight size={18} />
        </button>
        <h1 style={{ fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
          ملف السائق
        </h1>
      </div>

      {/* بطاقة الملف */}
      <div style={{
        background: colors.neutral[0], borderRadius: radius["2xl"], border: `1px solid ${colors.border.subtle}`,
        boxShadow: shadows.sm, padding: 24, marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{
              width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: `color-mix(in srgb, #F97316 12%, transparent)`, color: "#F97316", flexShrink: 0,
            }}>
              <Bike size={26} />
            </span>
            <div>
              <h2 style={{ fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
                {driver.name}
              </h2>
              <p style={{ fontSize: "12px", color: colors.neutral[400], fontFamily: typography.fontFamily.mono, marginTop: 2 }}>
                {driver.employee_code || "—"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: radius.full,
              background: active ? `color-mix(in srgb, ${colors.semantic.success} 12%, transparent)` : colors.neutral[100],
              color: active ? colors.semantic.success : colors.neutral[400],
              fontSize: "11px", fontWeight: typography.weight.bold,
            }}>
              ● {active ? "نشط" : "غير نشط"}
            </span>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: radius.full,
              background: `color-mix(in srgb, ${meta.color} 12%, transparent)`, color: meta.color,
              fontSize: "11px", fontWeight: typography.weight.bold,
            }}>
              {meta.icon} {meta.label}
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginTop: 20 }}>
          <InfoItem icon={<Phone size={13} />} label="الهاتف" value={driver.phone} dir="ltr" />
          <InfoItem icon={<Truck size={13} />} label="المركبة" value={driver.vehicle_type ? VEHICLE_LABELS[driver.vehicle_type] : "—"} />
          <InfoItem icon={<ShoppingBag size={13} />} label="الفرع" value={driver.branch?.name || "—"} />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          <button
            onClick={handleToggleShift}
            disabled={availability === "on_delivery"}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: radius.lg,
              background: driver.on_shift_now ? colors.semantic.warningBg : colors.semantic.successBg,
              border: `1px solid ${driver.on_shift_now ? colors.semantic.warningBorder : colors.semantic.successBorder}`,
              color: driver.on_shift_now ? colors.semantic.warning : colors.semantic.success,
              fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
              cursor: availability === "on_delivery" ? "not-allowed" : "pointer",
              opacity: availability === "on_delivery" ? 0.5 : 1,
            }}
          >
            {driver.on_shift_now ? <Square size={14} /> : <Play size={14} />}
            {driver.on_shift_now ? "إنهاء الشفت" : "بدء الشفت"}
          </button>
          <button onClick={handleToggleActive} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: radius.lg,
            background: colors.neutral[100], border: `1px solid ${colors.border.subtle}`,
            color: active ? colors.neutral[600] : colors.semantic.success,
            fontSize: typography.size.sm, fontWeight: typography.weight.semibold, cursor: "pointer",
          }}>
            {active ? <PowerOff size={14} /> : <Power size={14} />}
            {active ? "إيقاف السائق" : "تفعيل السائق"}
          </button>
        </div>
      </div>

      {/* الإحصاءات */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard icon={<ShoppingBag size={16} />} label="طلبات حالية" value={driver.current_orders_count ?? 0} color={colors.semantic.info} />
        <StatCard icon={<PackageCheck size={16} />} label="توصيلات مكتملة" value={driver.completed_deliveries ?? 0} color={colors.semantic.success} />
        <StatCard icon={<Clock size={16} />} label="آخر توصيلة" value={formatDateTime(driver.last_delivery_at)} color={colors.neutral[600]} isText />
      </div>

      {/* سجل الطلبات */}
      <div style={{
        background: colors.neutral[0], borderRadius: radius.xl, border: `1px solid ${colors.border.subtle}`,
        boxShadow: shadows.sm, overflow: "hidden",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.border.subtle}` }}>
          <h3 style={{ fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
            سجل طلبات التوصيل ({orders.length})
          </h3>
        </div>
        {ordersLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 30 }}>
            <Loader2 size={22} className="animate-spin" style={{ color: colors.brand[500] }} />
          </div>
        ) : orders.length === 0 ? (
          <p style={{ textAlign: "center", color: colors.neutral[400], padding: 30, fontSize: typography.size.sm }}>
            لا توجد طلبات مُسنَدة لهذا السائق بعد
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.size.sm, minWidth: 560 }}>
              <thead>
                <tr style={{ background: colors.neutral[50] }}>
                  <th style={thStyle}>رقم الطلب</th>
                  <th style={thStyle}>العميل</th>
                  <th style={thStyle}>الحالة</th>
                  <th style={thStyle}>الإجمالي</th>
                  <th style={thStyle}>وقت التسليم</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => {
                  const stage = deriveWorkflowStage(order.status, order.order_type);
                  return (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/call-center/orders/${order.id}`)}
                      style={{
                        cursor: "pointer", borderTop: `1px solid ${colors.border.subtle}`,
                        background: idx % 2 === 1 ? colors.neutral[50] : "transparent",
                      }}
                    >
                      <td style={tdStyle}>{order.order_number}</td>
                      <td style={tdStyle}>{order.customer_name || "—"}</td>
                      <td style={tdStyle}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: radius.full,
                          background: `color-mix(in srgb, ${WORKFLOW_STAGE_COLORS[stage]} 12%, transparent)`,
                          color: WORKFLOW_STAGE_COLORS[stage], fontSize: "10px", fontWeight: typography.weight.bold,
                        }}>
                          ● {workflowStageLabel(stage, order.order_type)}
                        </span>
                      </td>
                      <td style={tdStyle}>{formatShekel(order.total)}</td>
                      <td style={{ ...tdStyle, fontSize: "11px", color: colors.neutral[400] }}>{formatDateTime(order.delivered_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = { padding: "8px 12px", textAlign: "right", fontSize: "11px", color: colors.neutral[500], fontWeight: typography.weight.bold };
const tdStyle: React.CSSProperties = { padding: "10px 12px", color: colors.neutral[700] };

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: string; dir?: "ltr" | "rtl" }> = ({ icon, label, value, dir }) => (
  <div>
    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "10px", fontWeight: typography.weight.bold, color: colors.neutral[400], marginBottom: 4 }}>
      {icon} {label}
    </span>
    <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.neutral[800] }} dir={dir}>{value}</p>
  </div>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string; color: string; isText?: boolean }> = ({ icon, label, value, color, isText }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10, padding: "14px 16px",
    background: colors.neutral[0], borderRadius: radius.lg, border: `1px solid ${colors.border.subtle}`,
  }}>
    <span style={{
      width: 36, height: 36, borderRadius: radius.md, display: "flex", alignItems: "center", justifyContent: "center",
      background: `color-mix(in srgb, ${color} 12%, transparent)`, color, flexShrink: 0,
    }}>
      {icon}
    </span>
    <div style={{ minWidth: 0 }}>
      <p style={{ fontSize: isText ? typography.size.sm : typography.size.lg, fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
        {value}
      </p>
      <p style={{ fontSize: "10px", color: colors.neutral[500], fontWeight: typography.weight.semibold }}>{label}</p>
    </div>
  </div>
);

export default DriverDetailPage;
