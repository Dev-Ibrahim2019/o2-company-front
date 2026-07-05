export type SalesInvoiceStatus = "draft" | "awaiting_approval" | "awaiting_payment" | "partial" | "paid" | "cancelled";
export type SalesInvoiceType = "tax_invoice" | "simple_invoice" | "credit_note" | "debit_note";
export type TaxTreatment = "inclusive" | "exclusive";
export type PaymentMethodType = "cash" | "credit_card" | "bank_transfer" | "app" | "account";

export interface SalesInvoiceItem {
  id?: number;
  item_id?: number;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  price?: number;
  discount: number;
  discount_percent: number;
  tax_rate: number;
  tax_amount: number;
  total_before_tax: number;
  total: number;
  account_id?: number;
  branch_id?: number;
  tracking_name?: string;
  tracking_option?: string;
}

export interface SalesInvoicePayment {
  id?: number;
  method: PaymentMethodType;
  amount: number;
  reference_number?: string;
  paid_at?: string;
  notes?: string;
}

export interface SalesInvoice {
  id: number;
  number: string;
  uuid?: string;
  reference_number?: string;
  account_number?: string;
  type: SalesInvoiceType;
  status: SalesInvoiceStatus;
  tax_treatment?: TaxTreatment;
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_vat_number?: string;
  entity_type?: string;
  entity_id?: number;
  invoice_date: string;
  due_date?: string;
  supply_date?: string;
  currency: string;
  exchange_rate?: number;
  subtotal: number;
  discount_total?: number;
  discount?: number;
  tax_total: number;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  branch_id: number;
  source?: "manual" | "pos_sync" | "excel_import";
  notes?: string;
  approved_by?: number;
  approved_at?: string;
  transaction_id?: number;
  created_at: string;
  updated_at: string;
  // Relations
  customer?: any;
  branch?: any;
  items?: SalesInvoiceItem[];
  payments?: SalesInvoicePayment[];
}

export type EntityType = "customer" | "supplier" | "employee";

export interface SalesInvoiceFormData {
  type: SalesInvoiceType;
  status?: "draft" | "awaiting_approval";
  tax_treatment?: TaxTreatment;
  entity_type?: EntityType;
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_vat_number?: string;
  invoice_date: string;
  due_date?: string;
  supply_date?: string;
  currency: string;
  exchange_rate?: number;
  branch_id: number;
  reference_number?: string;
  notes?: string;
  items: SalesInvoiceItem[];
  payments?: SalesInvoicePayment[];
}

export const SALES_INVOICE_STATUS_LABELS: Record<SalesInvoiceStatus, string> = {
  draft: "مسودة",
  awaiting_approval: "بانتظار التعميد",
  awaiting_payment: "بانتظار السداد",
  partial: "سداد جزئي",
  paid: "مدفوعة",
  cancelled: "ملغاة",
};

export const SALES_INVOICE_STATUS_COLORS: Record<SalesInvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  awaiting_approval: "bg-yellow-100 text-yellow-700",
  awaiting_payment: "bg-orange-100 text-orange-700",
  partial: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export const INVOICE_TYPES: { value: SalesInvoiceType; label: string }[] = [
  { value: "simple_invoice", label: "فاتورة مبيعات" },
  { value: "tax_invoice", label: "فاتورة ضريبية" },
  { value: "credit_note", label: "إشعار دائن" },
  { value: "debit_note", label: "إشعار مدين" },
];

export const INVOICE_TYPE_LABELS: Record<string, string> = {
  simple_invoice: "فاتورة مبيعات",
  tax_invoice: "فاتورة ضريبية",
  credit_note: "إشعار دائن",
  debit_note: "إشعار مدين",
};

export const PAYMENT_METHODS: { value: PaymentMethodType; label: string }[] = [
  { value: "cash", label: "نقدي" },
  { value: "credit_card", label: "بطاقة ائتمان" },
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "app", label: "تطبيق دفع" },
  { value: "account", label: "حساب مفتوح" },
];

export const TAX_RATES = [0, 5, 15];

export function formatCurrency(amount: number | string, currency: string = "ILS"): string {
  const symbols: Record<string, string> = { ILS: "₪", JOD: "JD", USD: "$", SAR: "﷼" };
  return `${symbols[currency] || "₪"} ${Number(amount || 0).toFixed(2)}`;
}

export const EMPTY_INVOICE_ITEM: SalesInvoiceItem = {
  item_name: "",
  description: "",
  quantity: 1,
  unit_price: 0,
  discount: 0,
  discount_percent: 0,
  tax_rate: 15,
  tax_amount: 0,
  total_before_tax: 0,
  total: 0,
};
