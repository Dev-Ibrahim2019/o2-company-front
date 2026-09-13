export type InvoiceStatus = "draft" | "pending" | "partial" | "paid" | "cancelled";

export type Currency = "ILS" | "JOD" | "USD";

export type EntityType = "customer" | "employee" | "supplier";

export type InvoiceType = "فاتورة ضريبية" | "فاتورة بسيطة" | "إشعار دائن" | "إشعار مدين";

export type PaymentMethodType = "cash" | "credit_card" | "app" | "bank_transfer" | "account";

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  ILS: { code: "ILS", symbol: "₪", name: "الشيكل الإسرائيلي" },
  JOD: { code: "JOD", symbol: "JD", name: "الدينار الأردني" },
  USD: { code: "USD", symbol: "$", name: "الدولار الأمريكي" },
};

export const DEFAULT_CURRENCY: Currency = "ILS";

export const INVOICE_TYPES: InvoiceType[] = ["فاتورة ضريبية", "فاتورة بسيطة", "إشعار دائن", "إشعار مدين"];

export const PAYMENT_METHODS: { value: PaymentMethodType; label: string }[] = [
  { value: "cash", label: "نقدي" },
  { value: "credit_card", label: "بطاقة ائتمان" },
  { value: "app", label: "تطبيق دفع" },
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "account", label: "حساب مفتوح" },
];

export interface FinancialInvoiceItem {
  id?: number;
  item_id?: number;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_before_tax: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  account_id?: number;
  branch_id?: number;
}

export interface PaymentEntry {
  id?: number;
  method: PaymentMethodType;
  amount: number;
  reference_number?: string;
  notes?: string;
  paid_at?: string;
}

export interface FinancialInvoice {
  id: number;
  number: string;
  type: InvoiceType;
  entity_type?: EntityType;
  entity_id?: number;
  entity_name?: string;
  branch_id: number;
  branch_name?: string;
  customer_id?: number;
  order_id?: number;
  status: InvoiceStatus;
  currency: Currency;
  payment_method?: string;
  subtotal: number;
  tax_total: number;
  discount: number;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  invoice_date?: string;
  due_date?: string;
  delivery_date?: string;
  expected_payment_date?: string;
  notes?: string;
  items: FinancialInvoiceItem[];
  payments: PaymentEntry[];
  created_at?: string;
  updated_at?: string;
}

export interface FinancialInvoiceFormData {
  type: InvoiceType;
  entity_type?: EntityType;
  entity_id?: number;
  branch_id: number;
  currency: Currency;
  subtotal: number;
  tax_total: number;
  discount: number;
  total: number;
  invoice_date?: string;
  due_date?: string;
  delivery_date?: string;
  expected_payment_date?: string;
  notes?: string;
  items: FinancialInvoiceItem[];
  payments?: PaymentEntry[];
}

export const EMPTY_INVOICE_ITEM: FinancialInvoiceItem = {
  item_name: "",
  quantity: 1,
  unit_price: 0,
  discount: 0,
  total_before_tax: 0,
  tax_rate: 15,
  tax_amount: 0,
  total: 0,
};

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "مسودة",
  pending: "بانتظار التعميد",
  partial: "بانتظار السداد",
  paid: "مدفوعة",
  cancelled: "ملغاة",
};

export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-100 text-yellow-700",
  partial: "bg-orange-100 text-orange-700",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function formatCurrency(amount: number, currency: Currency = DEFAULT_CURRENCY): string {
  return `${CURRENCIES[currency].symbol} ${amount.toFixed(2)}`;
}

export const ENTITY_LABELS: Record<EntityType, string> = {
  customer: "عميل",
  employee: "موظف",
  supplier: "مورد",
};
