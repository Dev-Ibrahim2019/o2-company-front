import type { CrmLoyaltyScopeType, CrmLoyaltyTxnStatus, CrmLoyaltyTxnType } from "./types";

/** Mirrors LoyaltyRule::SCOPE_RANK — product is the most specific, global the least. */
export const SCOPE_TYPE_LABELS: Record<CrmLoyaltyScopeType, string> = {
  product: "منتج",
  category: "قسم",
  customer: "عميل محدَّد",
  group: "مجموعة",
  global: "عام",
};

export const SCOPE_TYPE_HINTS: Record<CrmLoyaltyScopeType, string> = {
  product: "تُطبَّق على بند مطابق لمنتج محدَّد فقط.",
  category: "تُطبَّق على أي بند من هذا القسم.",
  customer: "تُطبَّق على هذا العميل تحديداً، أينما اشترى.",
  group: "تُطبَّق على كل عميل عضو بهذه المجموعة.",
  global: "تُطبَّق على الجميع ما لم تفز قاعدة أكثر تخصصاً.",
};

export const TXN_TYPE_LABELS: Record<CrmLoyaltyTxnType, string> = {
  earn: "اكتساب",
  redeem: "استبدال",
  referral_bonus: "مكافأة إحالة",
  manual_adjustment: "تعديل يدوي",
  campaign_reversal: "عكس حملة",
};

export const TXN_TYPE_TONE: Record<CrmLoyaltyTxnType, string> = {
  earn: "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]",
  redeem: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]",
  referral_bonus: "bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]",
  manual_adjustment: "bg-[var(--crmx-accent-soft)] text-[var(--crmx-accent)]",
  campaign_reversal: "bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]",
};

export const TXN_STATUS_LABELS: Record<CrmLoyaltyTxnStatus, string> = {
  pending: "معلَّقة",
  confirmed: "مؤكَّدة",
  reversed: "معكوسة",
};
