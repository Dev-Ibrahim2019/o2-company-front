import React from "react";
import { Clock, ChefHat, CheckCircle2, Bike, AlertTriangle, Flame } from "lucide-react";
import { colors, typography, radius } from "../design/tokens";
import { WORKFLOW_STAGE_COLORS, workflowStageLabel, type WorkflowStage } from "../activeOrdersView";

// شارة حالة موحّدة — لون + أيقونة + نص معًا دائمًا (مش لون بس)، عشان الحالة تُفهم بأقل من ثانية
// حتى لمن لا يميّز الألوان. تُستخدم بكارد الطلب وبأي مكان تاني يحتاج يعرض نفس الحالة (ودجت
// الكول سنتر مثلاً) — مصدر واحد للتصميم البصري لكل خمس المراحل.

const STAGE_ICONS: Record<WorkflowStage, React.ReactNode> = {
  new: <AlertTriangle size={12} />,
  preparing: <ChefHat size={12} />,
  ready: <CheckCircle2 size={12} />,
  out_for_delivery: <Bike size={12} />,
  completed: <CheckCircle2 size={12} />,
};

export const OrderStatusBadge: React.FC<{ stage: WorkflowStage; orderType: string; size?: "sm" | "md" }> = ({
  stage, orderType, size = "md",
}) => {
  const color = WORKFLOW_STAGE_COLORS[stage];
  const padding = size === "sm" ? "2px 8px" : "4px 10px";
  const fontSize = size === "sm" ? "10px" : "12px";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding, borderRadius: radius.full,
      fontSize, fontWeight: typography.weight.bold,
      background: `color-mix(in srgb, ${color} 16%, transparent)`, color,
      border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
    }}>
      {STAGE_ICONS[stage]} {workflowStageLabel(stage, orderType)}
    </span>
  );
};

// مؤشر تأخر — تحذيري وليس عدائي بصريًا (خلفية خفيفة، بدون وميض صارخ)، يوضّح "متأخر X دقيقة"
// بالاعتماد على وقت حقيقي (getDelayMinutes) بدل نص عام.
// نص مدة قابل للقراءة — طلب متأخر بضع دقائق يختلف فعليًا عن طلب متأخر أيام (بيانات تجريبية قديمة
// غالبًا)، والنص لازم يعكس الفرق بدل "متأخر 15840 دقيقة" غير المفهوم بلمحة.
const formatDelay = (minutes: number): string => {
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعة${minutes % 60 > 0 ? ` و${minutes % 60} دقيقة` : ""}`;
  return `${Math.floor(hours / 24)} يوم`;
};

// شدّة التأخير تُميَّز بصريًا بوضوح (لون مختلف تمامًا، مش نفس البادج لكل حالات التأخير): تحذيري
// (أصفر) لتجاوز بسيط، حرج (أحمر + 🔥) لتجاوز كبير — حتى ما يختفي طلب متأخر يوم كامل وسط عشرات
// الطلبات المتأخرة بضع دقائق بنفس اللون بالضبط.
export const DelayIndicator: React.FC<{ delayMinutes: number; critical?: boolean }> = ({ delayMinutes, critical }) => {
  const color = critical ? colors.semantic.error : colors.semantic.warning;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: radius.full,
      fontSize: "10px", fontWeight: typography.weight.bold,
      background: `color-mix(in srgb, ${color} ${critical ? 16 : 14}%, transparent)`,
      color,
      border: `1px solid color-mix(in srgb, ${color} ${critical ? 40 : 30}%, transparent)`,
    }}>
      {critical ? <Flame size={11} /> : <Clock size={11} />}
      متأخر {formatDelay(delayMinutes)}
    </span>
  );
};

export default OrderStatusBadge;
