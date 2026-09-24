// منطق صافي لصفحة تعديل الطلب (بدون React) — مختبر بمعزل عن الواجهة. القواعد هون مرآة لقواعد الباك اند
// (OrderAmendmentService)، والباك اند هو اللي بيفرضها فعليًا؛ الواجهة بتنبّه مسبقًا وبتوضّح شو المطلوب.

import type {
  EditOrderPayload, FlowExecutionStatus, FlowPaymentState, OrderDetailItem,
} from "./services/callCenterService";
import { removalRequirements } from "./orderDrawerView";

export interface EditLine {
  itemId: number;
  name: string;
  price: number;
  quantity: number;
  notes: string | null;
  /** الكمية الأصلية بالطلب — 0 لصنف مضاف جديد */
  original: number;
}

export interface EditDiff {
  added: EditLine[];
  /** كمية صارت 0 (إزالة كاملة) */
  removed: EditLine[];
  increased: EditLine[];
  decreased: EditLine[];
  hasRemovals: boolean;
  hasAdditions: boolean;
  changed: boolean;
}

/** الأصناف الفعّالة (مش الملغاة) مجمّعة بـitem_id — نفس منطق الباك اند بالـdiff. */
export function buildInitialLines(items: OrderDetailItem[]): EditLine[] {
  const byItem = new Map<number, EditLine>();
  for (const item of items) {
    if (item.status === "cancelled" || item.item_id == null) continue;
    const existing = byItem.get(item.item_id);
    if (existing) {
      existing.quantity += item.quantity;
      existing.original += item.quantity;
    } else {
      byItem.set(item.item_id, {
        itemId: item.item_id, name: item.item_name_ar || item.item_name || "", price: item.price,
        quantity: item.quantity, notes: item.notes, original: item.quantity,
      });
    }
  }
  return [...byItem.values()];
}

export function diffLines(lines: EditLine[]): EditDiff {
  const added = lines.filter(l => l.original === 0 && l.quantity > 0);
  const removed = lines.filter(l => l.original > 0 && l.quantity <= 0);
  const increased = lines.filter(l => l.original > 0 && l.quantity > l.original);
  const decreased = lines.filter(l => l.original > 0 && l.quantity > 0 && l.quantity < l.original);
  const hasRemovals = removed.length > 0 || decreased.length > 0;
  const hasAdditions = added.length > 0 || increased.length > 0;
  return { added, removed, increased, decreased, hasRemovals, hasAdditions, changed: hasRemovals || hasAdditions };
}

/**
 * نفس OrderAmendmentService: الطلب المدفوع ممنوع تعديله نهائيًا (blocked)، والإزالة بعد التنفيذ بتحتاج سبب.
 */
export function editRequirements(diff: EditDiff, execution: FlowExecutionStatus, payment: FlowPaymentState): { reason: boolean; blocked: boolean } {
  const { reason, blocked } = removalRequirements(execution, payment);
  return { reason: diff.hasRemovals && reason, blocked };
}

/** تقدير الإجمالي بالأسعار المعروضة (بدون خصومات المحرك) — الإجمالي الفعلي بيحسبه الباك اند بعد الحفظ. */
export function estimateTotal(lines: EditLine[]): number {
  return Math.round(lines.reduce((sum, l) => sum + l.price * Math.max(0, l.quantity), 0) * 100) / 100;
}

export function payloadFromLines(lines: EditLine[], notes: string | null, reason: string): EditOrderPayload {
  return {
    items: lines.map(l => ({ item_id: l.itemId, quantity: Math.max(0, l.quantity), notes: l.original === 0 ? l.notes : null })),
    notes,
    reason: reason.trim() || undefined,
  };
}

/** الطلب لازم يضل فيه صنف واحد على الأقل بعد التعديل — إزالة الكل = إلغاء الطلب (إجراء تاني). */
export function hasAnyItem(lines: EditLine[]): boolean {
  return lines.some(l => l.quantity > 0);
}
