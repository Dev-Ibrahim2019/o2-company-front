import type { OrderFeedback, OrderFeedbackPayload } from "./services/callCenterService";

export interface FeedbackDraft {
  food_quality: number;
  service_quality: number;
  delivery_speed: number;
  notes: string;
}

export const feedbackDraftFrom = (feedback?: OrderFeedback | null): FeedbackDraft => ({
  food_quality: feedback?.food_quality ?? 0,
  service_quality: feedback?.service_quality ?? 0,
  delivery_speed: feedback?.delivery_speed ?? 0,
  notes: feedback?.notes ?? "",
});

export const feedbackValidationMessage = (draft: FeedbackDraft, orderType?: string | null) =>
  !draft.food_quality || !draft.service_quality || (orderType === "delivery" && !draft.delivery_speed)
    ? "اختر تقييم الطعام والخدمة وسرعة التوصيل عند الطلب."
    : null;

export const feedbackPayload = (draft: FeedbackDraft, orderType?: string | null): OrderFeedbackPayload => ({
  food_quality: draft.food_quality,
  service_quality: draft.service_quality,
  delivery_speed: orderType === "delivery" ? draft.delivery_speed : null,
  notes: draft.notes.trim() || undefined,
});
