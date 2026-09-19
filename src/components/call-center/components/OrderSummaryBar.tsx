import React from "react";
import { ListChecks, AlertTriangle } from "lucide-react";
import { colors, typography, radius } from "../design/tokens";
import { WORKFLOW_STAGE_COLORS, workflowStageLabel, type WorkflowStage } from "../activeOrdersView";

// شريط ملخص تشغيلي مضغوط — عدد إجمالي + عدد كل مرحلة + عدد المتأخر، عشان الموظف يفهم وضع
// الطلبات كلها بنظرة وحدة بدون ما يفتح لوحة تحليلات كاملة (مقصود يبقى بسيط حسب الطلب).

const STAGES: WorkflowStage[] = ["new", "preparing", "ready", "out_for_delivery", "completed"];

export const OrderSummaryBar: React.FC<{
  total: number;
  countsByStage: Record<WorkflowStage, number>;
  delayedCount: number;
}> = ({ total, countsByStage, delayedCount }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
    padding: "10px 14px", borderRadius: radius.lg,
    background: colors.neutral[0], border: `1px solid ${colors.border.subtle}`,
  }}>
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: radius.md,
      background: colors.neutral[100], color: colors.neutral[700],
      fontSize: typography.size.xs, fontWeight: typography.weight.bold,
    }}>
      <ListChecks size={13} /> الإجمالي {total}
    </span>

    {STAGES.map(stage => (
      <span key={stage} style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "4px 10px", borderRadius: radius.md,
        background: `color-mix(in srgb, ${WORKFLOW_STAGE_COLORS[stage]} 10%, transparent)`,
        color: WORKFLOW_STAGE_COLORS[stage],
        fontSize: typography.size.xs, fontWeight: typography.weight.bold,
      }}>
        ● {workflowStageLabel(stage, "")} {countsByStage[stage] ?? 0}
      </span>
    ))}

    {delayedCount > 0 && (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "4px 10px", borderRadius: radius.md,
        background: `color-mix(in srgb, ${colors.semantic.warning} 12%, transparent)`,
        color: colors.semantic.warning,
        fontSize: typography.size.xs, fontWeight: typography.weight.bold,
      }}>
        <AlertTriangle size={12} /> متأخر {delayedCount}
      </span>
    )}
  </div>
);

export default OrderSummaryBar;
