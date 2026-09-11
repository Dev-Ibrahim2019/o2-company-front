import React from "react";
import { AlertTriangle } from "lucide-react";
import { colors, typography, radius, transitions } from "../design/tokens";
import { WORKFLOW_STAGE_COLORS, workflowStageLabel, type WorkflowStage } from "../activeOrdersView";

export type OrderFilterValue = "all" | WorkflowStage | "delayed";

const STAGES: WorkflowStage[] = ["new", "preparing", "ready", "out_for_delivery"];

// شريط فلاتر الطلبات — نفس منظومة الحالات الخمس (بدون "تم التسليم" لأنه أصلاً خارج قائمة
// الطلبات النشطة)، + فلتر "متأخر" مستقل. الفلتر النشط واضح بصريًا (خلفية + حدّ ملوّن).
export const OrderFiltersBar: React.FC<{
  active: OrderFilterValue;
  onChange: (value: OrderFilterValue) => void;
  total: number;
  countsByStage: Record<WorkflowStage, number>;
  delayedCount: number;
}> = ({ active, onChange, total, countsByStage, delayedCount }) => {
  const Tab: React.FC<{ value: OrderFilterValue; label: string; count: number; color: string }> = ({ value, label, count, color }) => {
    const isActive = active === value;
    return (
      <button
        onClick={() => onChange(value)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 14px", borderRadius: radius.full,
          background: isActive ? `color-mix(in srgb, ${color} 12%, transparent)` : "transparent",
          border: `1.5px solid ${isActive ? `color-mix(in srgb, ${color} 35%, transparent)` : colors.border.subtle}`,
          color: isActive ? color : colors.neutral[500],
          fontSize: typography.size.xs, fontWeight: typography.weight.bold,
          cursor: "pointer", transition: `all ${transitions.fast}`, whiteSpace: "nowrap",
        }}
      >
        {label}
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          minWidth: 20, height: 20, padding: "0 6px", borderRadius: radius.full,
          background: isActive ? `color-mix(in srgb, ${color} 18%, transparent)` : colors.neutral[100],
          fontSize: "10px", fontWeight: typography.weight.extrabold,
        }}>
          {count}
        </span>
      </button>
    );
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Tab value="all" label="الكل" count={total} color={colors.neutral[600]} />
      {STAGES.map(stage => (
        <Tab key={stage} value={stage} label={workflowStageLabel(stage, "")} count={countsByStage[stage] ?? 0} color={WORKFLOW_STAGE_COLORS[stage]} />
      ))}
      {delayedCount > 0 && (
        <button
          onClick={() => onChange("delayed")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: radius.full,
            background: active === "delayed" ? `color-mix(in srgb, ${colors.semantic.warning} 12%, transparent)` : "transparent",
            border: `1.5px solid ${active === "delayed" ? `color-mix(in srgb, ${colors.semantic.warning} 35%, transparent)` : colors.border.subtle}`,
            color: active === "delayed" ? colors.semantic.warning : colors.neutral[500],
            fontSize: typography.size.xs, fontWeight: typography.weight.bold,
            cursor: "pointer", transition: `all ${transitions.fast}`, whiteSpace: "nowrap",
          }}
        >
          <AlertTriangle size={12} /> متأخر
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            minWidth: 20, height: 20, padding: "0 6px", borderRadius: radius.full,
            background: active === "delayed" ? `color-mix(in srgb, ${colors.semantic.warning} 18%, transparent)` : colors.neutral[100],
            fontSize: "10px", fontWeight: typography.weight.extrabold,
          }}>
            {delayedCount}
          </span>
        </button>
      )}
    </div>
  );
};

export default OrderFiltersBar;
