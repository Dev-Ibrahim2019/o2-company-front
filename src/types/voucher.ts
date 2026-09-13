// src/types/voucher.ts

export type VoucherType = "receipt" | "payment";
export type VoucherStatus = "draft" | "active" | "cancelled" | "reversed";
export type EntityType = "customer" | "supplier";

export type VoucherAllocation = {
  id?: number;
  voucher_id: number;
  invoice_id: number;
  amount: number;
  invoice?: {
    id: number;
    number: string;
    total: number;
    paid_amount: number;
    remaining_amount: number;
    invoice_date: string;
  };
};

export type Voucher = {
  id: number;
  number: string;
  type: VoucherType;
  entity_type: EntityType;
  entity_id: number;
  entity_name: string;
  amount: number;
  balance_before: number;
  currency: string;
  payment_method_id: number | null;
  payment_method_name: string | null;
  reference_number: string | null;
  branch_id: number | null;
  shift_id: number | null;
  accounting_day_id: number | null;
  voucher_date: string;
  status: VoucherStatus;
  notes: string | null;
  created_by: number | null;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  branch?: { id: number; name: string };
  paymentMethod?: { id: number; name: string };
  creator?: { id: number; name: string };
  approver?: { id: number; name: string };
  allocations?: VoucherAllocation[];
};

export type VoucherFormData = {
  type: VoucherType;
  entity_type: EntityType;
  entity_id: number;
  entity_name?: string;
  amount: number;
  currency?: string;
  payment_method_id?: number | null;
  payment_method_name?: string;
  reference_number?: string;
  branch_id?: number;
  shift_id?: number;
  accounting_day_id?: number;
  voucher_date: string;
  status?: VoucherStatus;
  notes?: string;
  allocations?: { invoice_id: number; amount: number }[];
};

export type VoucherStats = {
  total: number;
  draft: number;
  active: number;
  cancelled: number;
  receipts: number;
  payments: number;
};

// ── Constants ──

export const VOUCHER_TYPE_LABELS: Record<VoucherType, string> = {
  receipt: "سند قبض",
  payment: "سند صرف",
};

export const VOUCHER_STATUS_LABELS: Record<VoucherStatus, string> = {
  draft: "مسودة",
  active: "نشط",
  cancelled: "ملغي",
  reversed: "معكوس",
};

export const VOUCHER_STATUS_COLORS: Record<VoucherStatus, string> = {
  draft: "#6b7280",
  active: "#16a34a",
  cancelled: "#dc2626",
  reversed: "#d97706",
};

export const VOUCHER_STATUS_BG: Record<VoucherStatus, string> = {
  draft: "#f3f4f6",
  active: "#dcfce7",
  cancelled: "#fee2e2",
  reversed: "#fef3c7",
};

export const VOUCHER_PAYMENT_METHODS = [
  { value: "cash", label: "نقدي" },
  { value: "credit_card", label: "بطاقة ائتمان" },
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "cheque", label: "شيك" },
  { value: "app", label: "تطبيق دفع" },
  { value: "other", label: "أخرى" },
];

export const VOUCHER_CURRENCIES = [
  { value: "ILS", label: "شيكل إسرائيلي", symbol: "₪" },
  { value: "USD", label: "دولار أمريكي", symbol: "$" },
  { value: "EUR", label: "يورو", symbol: "€" },
  { value: "JOD", label: "دينار أردني", symbol: "JD" },
];

export function formatVoucherCurrency(amount: number, currency: string = "ILS"): string {
  const c = VOUCHER_CURRENCIES.find((c) => c.value === currency);
  const sym = c?.symbol || currency;
  return `${Number(amount).toFixed(2)} ${sym}`;
}
