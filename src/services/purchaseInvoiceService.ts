/**
 * purchaseInvoiceService.ts — فاتورة المشتريات الموحّدة (/inventory/purchases).
 * الترحيل في الخادم = استلام مخزني + ذمة مورّد + قيد + سند صرف للمدفوع؛ والعكس يعكسها كلها.
 * computePurchase تطبّق قواعد PurchaseMath في الخادم نفسها للمعاينة الحية؛ الخادم هو المرجع عند الترحيل.
 */

import api from "../api/axios";
import type { Paginated } from "./inventoryService";

export type PaymentMode = "cash" | "credit" | "partial";
export type PurchaseStatus = "draft" | "pending_approval" | "unpaid" | "partially_paid" | "paid" | "overdue" | "cancelled" | "reversed";
export type PurchaseStatusChip = "" | "draft" | "unpaid" | "partial" | "overdue" | "paid" | "reversed";

interface Named {
  id: number;
  name: string;
  code?: string;
}

export interface PurchaseLine {
  id: number;
  line_no: number | null;
  line_kind: "stock" | "expense";
  stock_item_id: number | null;
  unit_id: number | null;
  description: string;
  quantity: string;
  unit_price: string;
  discount_pct: string;
  discount: string;
  allocated_discount: string;
  tax_rate: string;
  tax_amount: string;
  total_before_tax: string;
  line_total: string;
  expiry_date: string | null;
  account_id: number | null;
  stock_unit_cost: string | null;
  stock_item?: { id: number; code: string; name: string; base_unit_id: number; purchase_unit_id: number | null; tracks_expiry: boolean; base_unit?: Named } | null;
  unit?: Named | null;
  account?: Named | null;
}

export interface PurchaseBill {
  id: number;
  bill_number: string;
  is_inventory: boolean;
  status: PurchaseStatus;
  effective_status: PurchaseStatus;
  supplier_id: number;
  warehouse_id: number | null;
  supplier_invoice_no: string | null;
  bill_date: string;
  due_date: string;
  payment_mode: PaymentMode | null;
  currency: string;
  exchange_rate: string;
  tax_recoverable: boolean;
  subtotal: string;
  tax_total: string;
  discount: string;
  total: string;
  paid_amount: string;
  paid_on_post: string;
  remaining: number;
  cash_account_id: number | null;
  notes: string | null;
  reference: string | null;
  journal_entry_id: number | null;
  stock_document_id: number | null;
  posted_at: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  items_count?: number;
  items?: PurchaseLine[];
  supplier?: Named & { tax_number?: string | null; payment_terms?: string | null };
  warehouse?: Named | null;
  cash_account?: Named | null;
  stock_document?: { id: number; number: string; status: string; lines?: { id: number; line_no: number; stock_item_id: number; created_batch?: { id: number; code: string; expiry_date: string | null } | null }[] } | null;
  vouchers?: { id: number; number: string; amount: string; voucher_date: string; status: string; payment_method_name: string | null }[];
  creator?: Named | null;
  poster?: Named | null;
  reverser?: Named | null;
  prev_id?: number | null;
  next_id?: number | null;
  can?: { edit: boolean; post: boolean; reverse: boolean; pay: boolean };
}

export interface PurchaseListResponse {
  list: Paginated<PurchaseBill>;
  summary: { count: number; total: number; paid: number; remaining: number };
  cards: { month_purchases: number; payable: number; drafts: number; due_soon: number; overdue: number };
}

export interface PurchasesMeta {
  suppliers: (Named & { payment_terms: string | null; tax_number: string | null; currency: string | null })[];
  warehouses: (Named & { branch_id: number })[];
  cash_accounts: Named[];
  expense_accounts: Named[];
  tax_rates: number[];
  currencies: string[];
  price_alert_percent: string;
  today: string;
}

export interface SupplierSummary {
  id: number;
  name: string;
  balance: number;
  last_invoice_date: string | null;
  payment_terms: string | null;
  credit_days: number;
  tax_registered: boolean;
  currency: string;
}

export interface PurchasePayload {
  supplier_id: number;
  warehouse_id: number;
  supplier_invoice_no?: string | null;
  bill_date?: string | null;
  due_date?: string | null;
  payment_mode: PaymentMode;
  currency?: string;
  exchange_rate?: number;
  tax_recoverable?: boolean;
  discount?: number;
  paid_on_post?: number;
  cash_account_id?: number | null;
  notes?: string | null;
  lines: {
    kind: "stock" | "expense";
    stock_item_id?: number | null;
    unit_id?: number | null;
    description?: string | null;
    account_id?: number | null;
    quantity?: number;
    unit_price: number;
    discount_pct?: number;
    tax_rate?: number;
    expiry_date?: string | null;
  }[];
}

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  draft: "مسودة",
  pending_approval: "بانتظار الاعتماد",
  unpaid: "غير مدفوعة",
  partially_paid: "مدفوعة جزئياً",
  paid: "مدفوعة",
  overdue: "متأخرة",
  cancelled: "ملغاة",
  reversed: "معكوسة",
};

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = { cash: "نقدي", credit: "آجل", partial: "جزئي" };

const BASE = "/inventory/purchases";

async function unwrap<T>(p: Promise<{ data: { data?: T } }>): Promise<T> {
  const { data } = await p;
  return data.data as T;
}

export const purchaseInvoiceService = {
  meta: () => unwrap<PurchasesMeta>(api.get(`${BASE}/meta`)),
  list: (params: Record<string, string | number | undefined>) => unwrap<PurchaseListResponse>(api.get(BASE, { params })),
  get: (id: number) => unwrap<PurchaseBill>(api.get(`${BASE}/${id}`)),
  create: (data: PurchasePayload) => unwrap<PurchaseBill>(api.post(BASE, data)),
  update: (id: number, data: PurchasePayload) => unwrap<PurchaseBill>(api.put(`${BASE}/${id}`, data)),
  remove: (id: number) => unwrap<null>(api.delete(`${BASE}/${id}`)),
  post: (id: number) => unwrap<PurchaseBill>(api.post(`${BASE}/${id}/post`)),
  reverse: (id: number, reason: string) => unwrap<PurchaseBill>(api.post(`${BASE}/${id}/reverse`, { reason })),
  pay: (id: number, data: { amount: number; cash_account_id: number; date?: string | null }) => unwrap<PurchaseBill>(api.post(`${BASE}/${id}/pay`, data)),
  duplicate: (id: number) => unwrap<PurchaseBill>(api.post(`${BASE}/${id}/duplicate`)),
  supplierSummary: (supplierId: number) => unwrap<SupplierSummary>(api.get(`${BASE}/supplier-summary/${supplierId}`)),
  /** آخر سعر من المورّد نفسه بالشيكل للوحدة الأساسية، لكل صنف. */
  lastPrices: (supplierId: number, itemIds: number[]) =>
    unwrap<Record<string, { price_base: string; source: "invoice" | "receipt" | "supplier"; date: string | null }>>(
      api.get(`${BASE}/last-prices`, { params: { supplier_id: supplierId, item_ids: itemIds } }),
    ),
  checkInvoiceNo: (supplierId: number, no: string, except?: number) =>
    unwrap<{ id: number; bill_number: string; bill_date: string; status: PurchaseStatus }[]>(
      api.get(`${BASE}/check-invoice-no`, { params: { supplier_id: supplierId, no, except } }),
    ),
};

/** رسالة الخادم كاملة (العكس يذكر كل صنف ينقص في الرسالة نفسها). */
export function purchaseErrorMessage(error: unknown): string {
  const res = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  if (res?.errors?.shortages) return res.message ?? res.errors.shortages.join("، ");
  const firstFieldError = res?.errors ? Object.values(res.errors)[0]?.[0] : undefined;
  return firstFieldError || res?.message || "حدث خطأ غير متوقع";
}

/* ── قواعد الحساب (نسخة الخادم PurchaseMath) ── */

/** تقريب نصف للأعلى بعيداً عن الصفر (الأسعار 4 منازل، والمبالغ 2). */
export function roundTo(value: number, scale: number): number {
  const f = 10 ** scale;
  return (Math.sign(value) * Math.round(Math.abs(value) * f + 1e-9)) / f;
}

export interface CalcLine {
  kind: "stock" | "expense";
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
}

export interface CalcResult {
  lines: { gross: number; lineDiscount: number; net: number; allocated: number; taxable: number; tax: number; total: number; costIls: number }[];
  totals: { itemsCount: number; gross: number; lineDiscounts: number; billDiscount: number; netBeforeTax: number; tax: number; total: number; stockCost: number; expenses: number; inputVat: number };
  error: string | null;
}

/**
 * إجمالي السطر = الكمية × السعر × (1 − خصم%). خصم الفاتورة يوزَّع على الأسطر المخزنية نسبةً إلى صافيها
 * (فرق التقريب لأكبر سطر). الضريبة القابلة للخصم خارج التكلفة. التكلفة بالشيكل = × سعر الصرف.
 */
export function computePurchase(lines: CalcLine[], billDiscount: number, taxRecoverable: boolean, rate: number): CalcResult {
  const discount = roundTo(billDiscount || 0, 2);
  const out = lines.map((l) => {
    const price = roundTo(l.unitPrice || 0, 4);
    const gross = roundTo((l.quantity || 0) * price, 2);
    const lineDiscount = roundTo((gross * (l.discountPct || 0)) / 100, 2);
    return { gross, lineDiscount, net: roundTo(gross - lineDiscount, 2), allocated: 0, taxable: 0, tax: 0, total: 0, costIls: 0 };
  });

  let error: string | null = null;
  const stockIdx = lines.map((l, i) => (l.kind === "stock" ? i : -1)).filter((i) => i >= 0);
  const stockNet = roundTo(stockIdx.reduce((s, i) => s + out[i].net, 0), 2);
  if (discount > 0) {
    if (stockNet <= 0) error = "خصم الفاتورة يوزَّع على الأصناف المخزنية — لا أصناف مخزنية.";
    else if (discount > stockNet + 1e-9) error = "خصم الفاتورة أكبر من صافي الأصناف المخزنية.";
    else {
      let allocated = 0;
      let largest = stockIdx[0];
      for (const i of stockIdx) {
        out[i].allocated = roundTo((discount * out[i].net) / stockNet, 2);
        allocated = roundTo(allocated + out[i].allocated, 2);
        if (out[i].net > out[largest].net) largest = i;
      }
      out[largest].allocated = roundTo(out[largest].allocated + (discount - allocated), 2);
    }
  }

  const t = { itemsCount: 0, gross: 0, lineDiscounts: 0, billDiscount: discount, netBeforeTax: 0, tax: 0, total: 0, stockCost: 0, expenses: 0, inputVat: 0 };
  lines.forEach((l, i) => {
    const o = out[i];
    o.taxable = roundTo(o.net - o.allocated, 2);
    o.tax = roundTo((o.taxable * (l.taxRate || 0)) / 100, 2);
    o.total = roundTo(o.taxable + o.tax, 2);
    o.costIls = roundTo((taxRecoverable ? o.taxable : o.total) * rate, 2);
    if (l.kind === "stock") {
      t.itemsCount++;
      t.stockCost = roundTo(t.stockCost + o.costIls, 2);
    } else {
      t.expenses = roundTo(t.expenses + o.costIls, 2);
    }
    if (taxRecoverable) t.inputVat = roundTo(t.inputVat + roundTo(o.tax * rate, 2), 2);
    t.gross = roundTo(t.gross + o.gross, 2);
    t.lineDiscounts = roundTo(t.lineDiscounts + o.lineDiscount, 2);
    t.netBeforeTax = roundTo(t.netBeforeTax + o.taxable, 2);
    t.tax = roundTo(t.tax + o.tax, 2);
    t.total = roundTo(t.total + o.total, 2);
  });

  return { lines: out, totals: t, error };
}

/** "net30" → 30، "cash" → 0، وغير المعروف → 30 (نفس PurchaseInvoiceService::creditDays). */
export function creditDays(terms: string | null | undefined): number {
  if (!terms) return 30;
  const m = terms.match(/(\d+)/);
  if (m) return Number(m[1]);
  return ["cash", "cod", "immediate"].includes(terms.toLowerCase()) ? 0 : 30;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const fmtMoney = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === "" ? "—" : Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
