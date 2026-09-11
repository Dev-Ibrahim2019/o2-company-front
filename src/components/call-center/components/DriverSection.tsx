import React, { useState } from "react";
import { Bike, ChevronDown, ChevronUp, Package } from "lucide-react";
import { colors, typography, radius, transitions } from "../design/tokens";
import type { EmployeeFromApi } from "../../../services/employeeService";

// قسم سائقي التوصيل — مضغوط عمدًا (شبكة أفقية قابلة للطي)، ما بيصير يستهلك معظم الشاشة حتى
// لو عدد السائقين كبير. الحالة الأربعة كلها مبنية على بيانات حقيقية (driver_shifts +
// عدد الطلبات النشطة المحسوب من نفس قائمة الطلبات المحمّلة أصلاً — بدون endpoint إضافي):
// متاح / استراحة (شفت مفتوح لكن available_now=false) / مشغول (عنده طلب OUT_FOR_DELIVERY حاليًا) / غير متصل.
export type DriverOpsStatus = "available" | "on_break" | "busy" | "offline";

const STATUS_META: Record<DriverOpsStatus, { label: string; color: string }> = {
  available: { label: "متاح", color: colors.semantic.success },
  on_break: { label: "استراحة", color: colors.semantic.warning },
  busy: { label: "مشغول", color: colors.semantic.error },
  offline: { label: "غير متصل", color: colors.neutral[400] },
};

export function deriveDriverStatus(driver: EmployeeFromApi, activeOrderCount: number): DriverOpsStatus {
  if (!driver.on_shift_now) return "offline";
  if (!driver.available_now) return "on_break";
  if (activeOrderCount > 0) return "busy";
  return "available";
}

const DriverCard: React.FC<{ driver: EmployeeFromApi; activeOrderCount: number }> = ({ driver, activeOrderCount }) => {
  const status = deriveDriverStatus(driver, activeOrderCount);
  const meta = STATUS_META[status];
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 4, minWidth: 132, flexShrink: 0,
      padding: "8px 12px", borderRadius: radius.lg,
      background: colors.neutral[50], border: `1px solid ${colors.border.subtle}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Bike size={13} style={{ color: "#F97316", flexShrink: 0 }} />
        <span style={{ fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.neutral[800], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {driver.name}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "10px", fontWeight: typography.weight.bold, color: meta.color }}>
          ● {meta.label}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "10px", color: colors.neutral[500] }}>
          <Package size={10} /> {activeOrderCount}
        </span>
      </div>
    </div>
  );
};

export const DriverSection: React.FC<{
  drivers: EmployeeFromApi[];
  driverOrderCounts: Map<number, number>;
}> = ({ drivers, driverOrderCounts }) => {
  const [collapsed, setCollapsed] = useState(false);
  const availableCount = drivers.filter(d => deriveDriverStatus(d, driverOrderCounts.get(d.id) || 0) === "available").length;

  if (drivers.length === 0) return null;

  return (
    <div style={{ borderRadius: radius.lg, background: colors.neutral[0], border: `1px solid ${colors.border.subtle}`, overflow: "hidden" }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", background: "none", border: "none", cursor: "pointer",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.neutral[800] }}>
          <Bike size={15} style={{ color: "#F97316" }} /> سائقو التوصيل — {availableCount} متاح
        </span>
        {collapsed ? <ChevronDown size={16} style={{ color: colors.neutral[400] }} /> : <ChevronUp size={16} style={{ color: colors.neutral[400] }} />}
      </button>
      {!collapsed && (
        <div style={{
          display: "flex", gap: 8, padding: "0 14px 12px",
          overflowX: "auto", transition: `all ${transitions.fast}`,
        }}>
          {drivers.map(driver => (
            <DriverCard key={driver.id} driver={driver} activeOrderCount={driverOrderCounts.get(driver.id) || 0} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverSection;
