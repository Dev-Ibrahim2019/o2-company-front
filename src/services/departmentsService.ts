/**
 * departmentsService.ts — صفحة الأقسام في لوحة المخازن (/api/inventory/departments/*).
 *
 * كل الأرقام مجمّعة في الخادم (مبيعات، استهلاك من حركات "استهلاك بيع"، جرد القسم). الكميات بالوحدة الأساسية
 * للمادة (base_unit بجانب كل رقم)، والقيم المشتقة من التكلفة تأتي null لمن لا يملك صلاحية التكاليف.
 */

import api from "../api/axios";

const BASE = "/inventory/departments";

/** معاملات الفترة والفرع (الفارغ يُحذف؛ الفترة الافتراضية في الخادم: الشهر الحالي حتى اليوم). */
export interface DeptQuery {
  from?: string;
  to?: string;
  branch_id?: number | null;
}

export interface Period {
  from: string;
  to: string;
  days: number;
}

interface Envelope {
  filters: Period;
  costs_visible: boolean;
}

export interface Ref {
  id: number;
  name: string;
  code?: string | null;
}

/* ── القائمة ── */

export interface DepartmentSummaryRow {
  key: string;
  department: Ref;
  branch: Ref;
  warehouse: Ref | null;
  sale_items_count: number;
  orders: number;
  sales: string;
  cost: string | null;
  profit: string | null;
  food_cost_percent: string | null;
  undeducted_orders: number;
}

export interface DepartmentSummary extends Envelope {
  rows: DepartmentSummaryRow[];
  totals: {
    departments: number;
    orders: number;
    sales: string;
    cost: string | null;
    profit: string | null;
    food_cost_percent: string | null;
    undeducted_orders: number;
  };
}

/* ── رأس صفحة القسم ── */

export interface DepartmentUnit {
  department: Ref;
  branch: Ref;
  warehouse: Ref | null;
  can_edit_warehouse: boolean;
  branches: Ref[];
  costs_visible: boolean;
}

/* ── أصناف البيع ── */

export interface SaleItemMaterial {
  stock_item_id: number;
  code: string;
  name: string;
  base_unit: string;
  quantity: string;
  cost: string | null;
}

export interface DepartmentSaleItem {
  item_id: number;
  code: string | null;
  name: string;
  is_active: boolean;
  has_recipe: boolean;
  quantity: string;
  orders: number;
  sales: string;
  cost: string | null;
  profit: string | null;
  food_cost_percent: string | null;
  share_percent: string | null;
  materials: SaleItemMaterial[];
}

export interface SaleItemsResult extends Envelope {
  rows: DepartmentSaleItem[];
  totals: { quantity: string; sales: string; cost: string | null; profit: string | null; food_cost_percent: string | null };
  undeducted_orders: number;
}

/* ── استهلاك المواد ── */

export interface ConsumptionRow {
  stock_item_id: number;
  code: string;
  name: string;
  base_unit: string;
  quantity: string;
  cost: string | null;
  unit_cost: string | null;
  cost_share_percent: string | null;
  items: { item_id: number; code: string | null; name: string; quantity: string; cost: string | null; share_percent: string | null }[];
}

export interface ConsumptionResult extends Envelope {
  rows: ConsumptionRow[];
  totals: { cost: string | null; materials: number };
  undeducted_orders: number;
}

/* ── الإحصائيات ── */

export interface RankedItem {
  item_id: number;
  code: string | null;
  name: string;
  quantity: string;
  sales: string;
}

export interface StatsResult extends Envelope {
  totals: {
    sales: string;
    orders: number;
    avg_order: string;
    cost: string | null;
    profit: string | null;
    food_cost_percent: string | null;
    items_sold: number;
  };
  top: RankedItem[];
  bottom: RankedItem[];
  daily: { day: string; sales: string; cost: string | null; orders: number }[];
  undeducted_orders: number;
}

/* ── الجرد ── */

export type CountColumn = "transfers_in" | "transfers_out" | "sale" | "waste" | "other";
export type CountStatus = "draft" | "posted" | "reversed";

export interface CountInfo {
  id: number;
  number: string;
  status: CountStatus;
  notes: string | null;
  count_date: string | null;
  created_at: string | null;
  posted_at: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  creator: string | null;
  poster: string | null;
  reverser: string | null;
}

export interface CountLine {
  stock_item_id: number;
  code: string;
  name: string;
  base_unit: string;
  start: { kind: "count"; count_id: number; number: string; at: string } | { kind: "period"; day: string };
  opening: string;
  transfers_in: string;
  transfers_out: string;
  sale: string;
  waste: string;
  other: string;
  expected: string;
  unit_cost: string | null;
  expected_value: string | null;
  counted: string | null;
  variance_quantity: string | null;
  variance_value: string | null;
  variance_percent: string | null;
}

export interface CountPreview extends Envelope {
  lines: CountLine[];
  totals: {
    lines: number;
    counted_lines: number;
    expected_value: string | null;
    variance_value: string | null;
    shortage_value: string | null;
    surplus_value: string | null;
  };
  threshold: string;
  count: CountInfo | null;
}

export interface PostedCountLine {
  stock_item_id: number;
  code: string;
  name: string;
  base_unit: string;
  expected: string;
  counted: string;
  variance_quantity: string;
  unit_cost: string | null;
  variance_value: string | null;
  variance_percent: string | null;
  movement_id: number | null;
}

export interface PostedCount extends Envelope {
  count: CountInfo;
  lines: PostedCountLine[];
  totals: { counted_lines?: number; variance_value?: string | null; shortage_value?: string | null; surplus_value?: string | null };
  threshold?: string;
}

export interface CountHistoryRow extends CountInfo {
  lines_count: number;
  counted_lines_count: number;
  variance_value: string | null;
}

export interface CountMovement {
  id: number;
  type: string;
  type_label: string;
  is_reversal: boolean;
  number: string | null;
  source: { kind: "document"; type: string; id: number } | { kind: "count"; id: number } | { kind: "order"; id: number } | null;
  occurred_at: string;
  accounting_day: string;
  quantity: string;
  unit_cost: string | null;
  total_cost: string | null;
  notes: string | null;
}

export interface CountMovementsResult extends Envelope {
  rows: CountMovement[];
  total: string;
  truncated: boolean;
}

/* ── الطلبات ── */

async function unwrap<T>(p: Promise<{ data: { data?: T } }>): Promise<T> {
  const { data } = await p;
  return data.data as T;
}

function params(q: DeptQuery, extra: Record<string, string | number | null | undefined> = {}): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries({ ...q, ...extra })) {
    if (v !== undefined && v !== null && v !== "") out[k] = v as string | number;
  }
  return out;
}

async function download(url: string, p: Record<string, string | number>, name: string): Promise<void> {
  const res = await api.get(url, { params: p, responseType: "blob" });
  const href = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  URL.revokeObjectURL(href);
}

export const departmentsService = {
  summary: (q: DeptQuery) => unwrap<DepartmentSummary>(api.get(`${BASE}/summary`, { params: params(q) })),
  exportSummary: (q: DeptQuery) => download(`${BASE}/summary/export`, params(q), "departments.xlsx"),

  unit: (id: number, branchId: number) => unwrap<DepartmentUnit>(api.get(`${BASE}/${id}`, { params: { branch_id: branchId } })),
  saleItems: (id: number, q: DeptQuery) => unwrap<SaleItemsResult>(api.get(`${BASE}/${id}/sale-items`, { params: params(q) })),
  consumption: (id: number, q: DeptQuery) => unwrap<ConsumptionResult>(api.get(`${BASE}/${id}/consumption`, { params: params(q) })),
  stats: (id: number, q: DeptQuery) => unwrap<StatsResult>(api.get(`${BASE}/${id}/stats`, { params: params(q) })),
  exportTable: (id: number, q: DeptQuery, table: "sale_items" | "consumption" | "count", countId?: number | null) =>
    download(`${BASE}/${id}/export`, params(q, { table, count_id: countId ?? undefined }), `department-${id}-${table}.xlsx`),

  countPreview: (id: number, q: DeptQuery, countId?: number | null) =>
    unwrap<CountPreview>(api.get(`${BASE}/${id}/stock-count/preview`, { params: params(q, { count_id: countId ?? undefined }) })),
  countMovements: (id: number, q: DeptQuery, stockItemId: number, column: CountColumn) =>
    unwrap<CountMovementsResult>(api.get(`${BASE}/${id}/stock-count/movements`, { params: params(q, { stock_item_id: stockItemId, column }) })),
  countHistory: (id: number, q: DeptQuery) =>
    unwrap<Envelope & { rows: CountHistoryRow[] }>(api.get(`${BASE}/${id}/stock-counts`, { params: params(q) })),
  countShow: (id: number, q: DeptQuery, countId: number) =>
    unwrap<PostedCount>(api.get(`${BASE}/${id}/stock-counts/${countId}`, { params: params(q) })),
  saveCount: (
    id: number,
    q: DeptQuery,
    body: { count_id?: number | null; notes?: string | null; lines: { stock_item_id: number; quantity: number | null }[] },
  ) => unwrap<CountInfo>(api.post(`${BASE}/${id}/stock-counts`, body, { params: params(q) })),
  /** الاعتماد بالمسار الموجود لكل أوراق الجرد (يسجّل تسويات الفروق). */
  approveCount: (countId: number) => api.post(`/inventory/counts/${countId}/post`),
  reverseCount: (countId: number, reason: string) => api.post(`/inventory/counts/${countId}/reverse`, { reason }),
};

/* ── أدوات مشتركة ── */

const iso = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

/** اليوم المحاسبي الحالي على جهاز المستخدم (اليوم يبدأ 02:00). */
export function accountingToday(now = new Date()): string {
  return iso(new Date(now.getTime() - 2 * 60 * 60 * 1000));
}

export type RangePreset = "today" | "week" | "month" | "last_month";

/** فترات جاهزة: اليوم، آخر 7 أيام، الشهر الحالي، الشهر الماضي. */
export function presetRange(preset: RangePreset, today = accountingToday()): { from: string; to: string } {
  const [y, m, d] = today.split("-").map(Number);
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week":
      return { from: iso(new Date(y, m - 1, d - 6)), to: today };
    case "last_month":
      return { from: iso(new Date(y, m - 2, 1)), to: iso(new Date(y, m - 1, 0)) };
    default:
      return { from: iso(new Date(y, m - 1, 1)), to: today };
  }
}

/** تصنيف الفرق: عجز (أحمر) / زيادة (أخضر) / مطابق، و"كبير" إن بلغت نسبته حد التنبيه. */
export function varianceTone(
  quantity: string | null,
  percent: string | null,
  threshold: string,
): { kind: "none" | "match" | "shortage" | "surplus"; big: boolean } {
  if (quantity === null) return { kind: "none", big: false };
  const q = Number(quantity);
  if (q === 0) return { kind: "match", big: false };
  // بلا رصيد متوقع (النسبة غير معرّفة) أي فرق يُعتبر كبيراً.
  const big = percent === null ? true : Math.abs(Number(percent)) >= (Number(threshold) || 0);
  return { kind: q < 0 ? "shortage" : "surplus", big };
}
