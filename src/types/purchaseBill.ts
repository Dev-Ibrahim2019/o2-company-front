// src/types/purchaseBill.ts

export type PurchaseBillStatus = "draft" | "pending_approval" | "unpaid" | "partially_paid" | "paid" | "overdue" | "cancelled";

export type PurchaseBillItem = {
  id?: number;
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  total_before_tax: number;
  line_total: number;
  account_id?: number | null;
  product?: { id: number; name: string; name_ar: string; code: string };
  account?: { id: number; name: string; code: string };
};

export type PurchaseBillAttachment = {
  id?: number;
  file_path: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
};

export type PurchaseBill = {
  id: number;
  bill_number: string;
  supplier_id: number;
  currency: string;
  bill_date: string;
  due_date: string;
  status: PurchaseBillStatus;
  subtotal: number;
  tax_total: number;
  discount: number;
  total: number;
  paid_amount: number;
  reference: string | null;
  notes: string | null;
  branch_id: number | null;
  journal_entry_id: number | null;
  created_by: number | null;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  supplier?: { id: number; name: string; code: string };
  items?: PurchaseBillItem[];
  attachments?: PurchaseBillAttachment[];
  creator?: { id: number; name: string };
  approver?: { id: number; name: string };
  branch?: { id: number; name: string };
};

export type PurchaseBillFormData = {
  supplier_id: number;
  currency: string;
  bill_date: string;
  due_date: string;
  status?: "draft" | "pending_approval";
  discount?: number;
  reference?: string;
  notes?: string;
  branch_id?: number | null;
  items: {
    product_id?: number | null;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    discount: number;
    account_id: number | null;
  }[];
};

export type PurchaseBillStats = {
  total: number;
  draft: number;
  pending: number;
  unpaid: number;
  overdue: number;
  partial: number;
  paid: number;
  totalAmount: number;
  totalPaid: number;
};

// ── Constants ──

export const PURCHASE_BILL_STATUS_LABELS: Record<PurchaseBillStatus, string> = {
  draft: "مسودة",
  pending_approval: "جاهزة للاعتماد",
  unpaid: "غير مدفوعة",
  partially_paid: "مدفوعة جزئيًا",
  paid: "مدفوعة",
  overdue: "متأخرة",
  cancelled: "ملغاة",
};

export const PURCHASE_BILL_STATUS_COLORS: Record<PurchaseBillStatus, string> = {
  draft: "#6b7280",
  pending_approval: "#d97706",
  unpaid: "#dc2626",
  partially_paid: "#2563eb",
  paid: "#16a34a",
  overdue: "#dc2626",
  cancelled: "#6b7280",
};

export const PURCHASE_BILL_STATUS_BG: Record<PurchaseBillStatus, string> = {
  draft: "#f3f4f6",
  pending_approval: "#fef3c7",
  unpaid: "#fee2e2",
  partially_paid: "#dbeafe",
  paid: "#dcfce7",
  overdue: "#fee2e2",
  cancelled: "#f3f4f6",
};

export const TAX_RATES = [0, 5, 16];

export const CURRENCIES = [
  { value: "ILS", label: "شيكل إسرائيلي", symbol: "₪" },
  { value: "USD", label: "دولار أمريكي", symbol: "$" },
  { value: "EUR", label: "يورو", symbol: "€" },
  { value: "JOD", label: "دينار أردني", symbol: "JD" },
];

export const EMPTY_BILL_ITEM = {
  product_id: null,
  description: "",
  quantity: 1,
  unit_price: 0,
  tax_rate: 0,
  discount: 0,
  account_id: null,
};

export function formatBillCurrency(amount: number, currency: string = "ILS"): string {
  const c = CURRENCIES.find((c) => c.value === currency);
  const sym = c?.symbol || currency;
  return `${Number(amount).toFixed(2)} ${sym}`;
}

export function calcItemTotals(item: { quantity: number; unit_price: number; tax_rate: number; discount: number }) {
  const total_before_tax = (item.quantity * item.unit_price) - item.discount;
  const tax_amount = total_before_tax * (item.tax_rate / 100);
  const line_total = total_before_tax + tax_amount;
  return { total_before_tax, tax_amount, line_total };
}
