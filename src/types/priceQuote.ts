export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";

export interface QuoteItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  discount_percent: number;
  tax_rate: number;
  tax_amount: number;
  total_before_tax: number;
  total: number;
  item_id?: number;
  sort_order: number;
}

export interface Quote {
  id: number;
  quote_number: string;
  client_id?: number;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  issuer_id?: number;
  issue_date: string;
  expiry_date?: string;
  currency: string;
  status: QuoteStatus;
  notes?: string;
  terms?: string;
  template_id?: string;
  subtotal: number;
  tax_total: number;
  total: number;
  converted_invoice_id?: number;
  branch_id: number;
  created_at: string;
  updated_at: string;
  items?: QuoteItem[];
}

export interface QuoteFormData {
  client_id?: number;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  issuer_id?: number;
  issue_date: string;
  expiry_date?: string;
  currency: string;
  status?: QuoteStatus;
  notes?: string;
  terms?: string;
  template_id?: string;
  branch_id: number;
  items: QuoteItem[];
}

export interface QuoteFilters {
  status?: QuoteStatus | "all";
  client_id?: number;
  search?: string;
  from_date?: string;
  to_date?: string;
  branch_id?: number;
}

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "مسودة",
  sent: "مُرسل",
  accepted: "مقبول",
  rejected: "مرفوض",
  expired: "منتهي",
  converted: "تم التحويل",
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: "text-slate-400",
  sent: "text-blue-400",
  accepted: "text-emerald-400",
  rejected: "text-red-400",
  expired: "text-amber-400",
  converted: "text-purple-400",
};

export const QUOTE_STATUS_BG: Record<QuoteStatus, string> = {
  draft: "bg-slate-500/10 border-slate-500/20",
  sent: "bg-blue-500/10 border-blue-500/20",
  accepted: "bg-emerald-500/10 border-emerald-500/20",
  rejected: "bg-red-500/10 border-red-500/20",
  expired: "bg-amber-500/10 border-amber-500/20",
  converted: "bg-purple-500/10 border-purple-500/20",
};

export const QUOTE_STATUSES: { value: QuoteStatus | "all"; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "draft", label: "مسودة" },
  { value: "sent", label: "مُرسل" },
  { value: "accepted", label: "مقبول" },
  { value: "rejected", label: "مرفوض" },
  { value: "expired", label: "منتهي" },
  { value: "converted", label: "تم التحويل" },
];

export const TAX_RATES = [0, 5, 15];

export const CURRENCIES: { value: string; label: string; symbol: string }[] = [
  { value: "ILS", label: "الشَّقل الإسرائيلي", symbol: "₪" },
  { value: "JOD", label: "الدينار الأردني", symbol: "د.أ" },
  { value: "USD", label: "الدولار الأمريكي", symbol: "$" },
  { value: "SAR", label: "الريال السعودي", symbol: "ر.س" },
  { value: "AED", label: "الدرهم الإماراتي", symbol: "د.إ" },
];

export const formatQuoteCurrency = (amount: number, currency: string = "ILS"): string => {
  const curr = CURRENCIES.find((c) => c.value === currency);
  const symbol = curr?.symbol || "₪";
  return `${symbol} ${Number(amount || 0).toFixed(2)}`;
};

export const EMPTY_QUOTE_ITEM: QuoteItem = {
  description: "",
  quantity: 1,
  unit_price: 0,
  discount: 0,
  discount_percent: 0,
  tax_rate: 0,
  tax_amount: 0,
  total_before_tax: 0,
  total: 0,
  sort_order: 0,
};

export const calculateQuoteItemTotals = (item: QuoteItem): QuoteItem => {
  const qty = Math.max(0, item.quantity);
  const price = Math.max(0, item.unit_price);
  const discountPct = Math.max(0, Math.min(100, item.discount_percent));

  const baseTotal = qty * price;
  const discountAmount = baseTotal * (discountPct / 100);
  const totalBeforeTax = baseTotal - discountAmount;
  const taxAmount = totalBeforeTax * (item.tax_rate / 100);
  const total = totalBeforeTax + taxAmount;

  return {
    ...item,
    quantity: qty,
    unit_price: price,
    discount_percent: discountPct,
    discount: discountAmount,
    total_before_tax: totalBeforeTax,
    tax_amount: taxAmount,
    total: total,
  };
};

export const calculateQuoteTotals = (
  items: QuoteItem[]
): { subtotal: number; tax_total: number; total: number } => {
  const calculated = items.map(calculateQuoteItemTotals);
  const subtotal = calculated.reduce((sum, i) => sum + i.total_before_tax, 0);
  const tax_total = calculated.reduce((sum, i) => sum + i.tax_amount, 0);
  const total = subtotal + tax_total;
  return { subtotal, tax_total, total };
};

export const generateQuoteNumber = (existingCount: number): string => {
  const num = (existingCount + 1).toString().padStart(5, "0");
  return `QUO-${num}`;
};
