import api from "../api/axios";

/* ── أنواع وحدة المخازن ── */

export type StockItemType = "raw" | "intermediate" | "finished" | "non_stock";

export const STOCK_ITEM_TYPE_LABELS: Record<StockItemType, string> = {
  raw: "مادة خام",
  intermediate: "منتج وسيط",
  finished: "منتج نهائي",
  non_stock: "لا يخضع للمخزون",
};

/** الأنواع التي تمثّل صنفاً مباعاً في O2 ويجب ربطها بصنف من قائمة البيع. */
export const SOLD_TYPES: StockItemType[] = ["finished", "non_stock"];

export interface StockUnit {
  id: number;
  name: string;
  symbol: string | null;
  is_active: boolean;
}

export interface StockCategory {
  id: number;
  parent_id: number | null;
  name: string;
  code: string | null;
  is_active: boolean;
  items_count?: number;
}

export interface StockItemUnit {
  id?: number;
  unit_id: number;
  factor: number | string;
  unit?: StockUnit;
}

export interface SaleItem {
  id: number;
  name: string;
  name_ar: string | null;
  code: string;
  is_active: boolean;
  stock_item_id: number | null;
}

export interface StockItem {
  id: number;
  item_id: number | null;
  type: StockItemType;
  name: string;
  code: string;
  base_unit_id: number;
  is_stored: boolean;
  barcode: string | null;
  supplier_code: string | null;
  safety_stock: string;
  tracks_expiry: boolean;
  is_active: boolean;
  notes: string | null;
  name_en?: string | null;
  purchase_unit_id?: number | null;
  default_warehouse_id?: number | null;
  /** آخر تكلفة شراء لكل وحدة أساسية (يحدّثها ترحيل الاستلام). */
  last_cost?: string | null;
  base_unit?: StockUnit;
  units?: StockItemUnit[];
  categories?: Pick<StockCategory, "id" | "name">[];
  item?: Pick<SaleItem, "id" | "name" | "name_ar" | "code"> | null;
  has_movements?: boolean;
}

export interface StockItemPayload {
  type: StockItemType;
  name?: string;
  code?: string | null;
  item_id?: number | null;
  base_unit_id: number;
  is_stored?: boolean;
  barcode?: string | null;
  supplier_code?: string | null;
  safety_stock?: number;
  tracks_expiry?: boolean;
  is_active?: boolean;
  notes?: string | null;
  units?: { unit_id: number; factor: number }[];
  category_ids?: number[];
  name_en?: string | null;
  purchase_unit_id?: number | null;
  default_warehouse_id?: number | null;
}

export interface Warehouse {
  id: number;
  branch_id: number | null;
  /** القسم الذي تُنسب مبيعاته لهذا المخزن (الاستهلاك النظري). */
  department_id?: number | null;
  department?: { id: number; name: string; nameAr: string | null } | null;
  role?: WarehouseRole;
  name: string;
  code: string;
  type: "standard" | "transit";
  is_default_sales: boolean;
  is_active: boolean;
  notes: string | null;
  branch?: { id: number; name: string } | null;
  users_count?: number;
  has_movements?: boolean;
}

export interface WarehouseUser {
  id: number;
  name: string;
  username: string;
  branch: string | null;
  assigned: boolean;
  access_level?: "view" | "edit" | null;
}

export interface InventoryLookups {
  units: StockUnit[];
  categories: StockCategory[];
  branches: { id: number; name: string; code: string }[];
  types: { value: StockItemType; label: string }[];
}

/* ── محرك المخزون (المرحلة 2) ── */

/** صف رصيد: كل الكميات بالوحدة الأساسية، والتكلفة لكل وحدة أساسية بالشيكل. */
export interface StockBalanceRow {
  warehouse_id: number;
  warehouse_name: string;
  stock_item_id: number;
  code: string;
  name: string;
  type: StockItemType;
  base_unit: string;
  quantity: string;
  avg_cost: string;
  value: string;
  safety_stock: string;
  below_safety: boolean;
  updated_at: string | null;
}

export interface KardexRow {
  id: number;
  occurred_at: string;
  accounting_day: string;
  type: string;
  type_label: string;
  reversal_of_id: number | null;
  is_reversed: boolean;
  can_reverse: boolean;
  quantity: string;
  unit_cost: string;
  total_cost: string;
  avg_cost_after: string;
  running_quantity: string;
  running_value: string;
  entered_quantity: string | null;
  entered_unit: string | null;
  notes: string | null;
  created_by: string | null;
}

export interface Kardex {
  item: { id: number; code: string; name: string; base_unit: string | null };
  warehouse: { id: number; name: string; code: string };
  from: string;
  to: string;
  opening: { quantity: string; value: string };
  totals: { quantity_in: string; quantity_out: string; closing_quantity: string; closing_value: string };
  rows: KardexRow[];
  current_page: number;
  last_page: number;
  total: number;
}

export interface OpeningLine {
  stock_item_id: number;
  quantity: number;
  unit_id?: number | null;
  unit_cost: number;
}

export interface InventorySettings {
  allow_negative_stock: boolean;
  /** حد تنبيه الفرق (فعلي − نظري) % في التحليلات. */
  variance_alert_percent?: string;
  expiry_warning_days?: number;
  expiry_critical_days?: number;
  showroom_max_days?: number;
  spice_grams_per_kg?: string;
  business_timezone: string;
  accounting_day_start: string;
  updated_at: string | null;
}

/* ── المستندات المخزنية وموردو الأصناف (المرحلة 3) ── */

export type StockDocumentType = "receipt" | "transfer" | "waste" | "breakdown" | "production" | "skewer" | "showroom_sale";
export type StockDocumentStatus = "draft" | "posted" | "reversed";

export interface StockDocumentLine {
  id: number;
  line_no: number;
  stock_item_id: number;
  unit_id: number;
  quantity: string;
  unit_cost: string | null;
  waste_reason: string | null;
  notes: string | null;
  posted_cost: string | null;
  batch_id?: number | null;
  direction?: "in" | "out" | null;
  cartons?: string | null;
  production_date?: string | null;
  expiry_date?: string | null;
  value_ratio?: string | null;
  is_prime?: boolean;
  sale_price?: string | null;
  batch?: { id: number; code: string; expiry_date: string | null } | null;
  created_batch?: { id: number; code: string; expiry_date: string | null } | null;
  stock_item?: { id: number; code: string; name: string; base_unit_id: number; tracks_expiry?: boolean; base_unit?: { id: number; name: string } };
  unit?: { id: number; name: string };
}

interface Named {
  id: number;
  name: string;
  code?: string;
}

export interface StockDocument {
  id: number;
  number: string;
  type: StockDocumentType;
  type_label: string;
  status: StockDocumentStatus;
  warehouse_id: number;
  to_warehouse_id: number | null;
  supplier_id: number | null;
  supplier_invoice_no: string | null;
  document_date: string;
  notes: string | null;
  /** null إن كان المستخدم لا يملك رؤية التكاليف. */
  total_cost: string | null;
  costs_visible: boolean;
  posted_at: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  lines_count?: number;
  lines?: StockDocumentLine[];
  destination?: string | null;
  delivery_status?: "delivered" | "undelivered" | null;
  revenue?: string | null;
  breakdown?: { input: string; output: string; loss: string; loss_percent: string | null; prime_percent: string | null } | null;
  warehouse?: Named;
  to_warehouse?: Named | null;
  supplier?: Named | null;
  creator?: Named | null;
  poster?: Named | null;
  reverser?: Named | null;
}

export interface StockDocumentPayload {
  type?: StockDocumentType;
  warehouse_id: number;
  to_warehouse_id?: number | null;
  supplier_id?: number | null;
  supplier_invoice_no?: string | null;
  document_date?: string | null;
  notes?: string | null;
  destination?: string | null;
  delivery_status?: "delivered" | "undelivered" | null;
  lines: {
    stock_item_id: number;
    unit_id?: number | null;
    quantity: number;
    unit_cost?: number | null;
    waste_reason?: string | null;
    notes?: string | null;
    batch_id?: number | null;
    direction?: "in" | "out" | null;
    cartons?: number | null;
    production_date?: string | null;
    expiry_date?: string | null;
    value_ratio?: number | null;
    is_prime?: boolean;
    sale_price?: number | null;
  }[];
}

/* ── الجودة والرقابة (منطق O2) ── */

export type ExpiryStatus = "ok" | "warning" | "critical" | "expired" | "none";

export interface BatchRow {
  id: number;
  code: string;
  source: string;
  stock_item_id: number;
  item: string;
  item_code: string;
  base_unit: string;
  warehouse_id: number;
  warehouse: string;
  supplier: string | null;
  unit_cost: string | null;
  original: string;
  remaining: string;
  cartons: string | null;
  production_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  storage_days: number | null;
  days_to_expiry: number | null;
  status: ExpiryStatus;
  showroom_overdue: boolean;
}

export type Trend = "better" | "worse" | "stable" | null;

export interface ProductivityRow {
  stock_item_id: number;
  name: string;
  code: string | null;
  base_unit: string | null;
  display_unit: DisplayUnit | null;
  opening: string;
  received: string;
  transferred_out: string;
  remaining: string;
  waste: string;
  consumed: string;
  theoretical: string;
  deficit: string;
  deficit_value: string | null;
  deficit_percent: string | null;
  alert: boolean;
  previous_deficit_percent: string | null;
  trend: Trend;
}

export interface ProductivityResult {
  day: string;
  warehouse: { id: number; name: string };
  count: { id: number; number: string; status: "draft" | "posted" } | null;
  rows: ProductivityRow[];
  totals: {
    consumed_value: string | null;
    theoretical_value: string | null;
    deficit_value: string | null;
    deficit_percent: string | null;
    previous_deficit_percent: string | null;
    trend: Trend;
  };
}

export interface WasteMinutes {
  day: string;
  branch: string | null;
  department: string | null;
  warehouse: string;
  rows: { document: string; item: string; code: string; batch: string | null; quantity: string; unit: string; reason: string; value: string | null; posted_by: string | null }[];
  total_value: string | null;
}

export interface ShawarmaDay {
  day: string;
  meat_consumed: string | null;
  meat_details: { name: string; remaining: string; dissected: string; marinated: string; undissected: string }[];
  skewers_count: number;
  skewers_weight: string;
  skewers_exceed_meat: boolean;
  exported_weight: string;
  revenue: string;
  yield_per_kg: string | null;
  spice_theoretical: string | null;
  spice_actual: string | null;
  spice_deficit: string | null;
  counted: boolean;
}

export interface ShawarmaPeriod {
  days: ShawarmaDay[];
  totals: {
    skewers_count: number;
    skewers_weight: string;
    exported_weight: string;
    meat_consumed: string;
    revenue: string;
    yield_per_kg: string | null;
    spice_theoretical: string;
    spice_actual: string;
    spice_deficit: string;
  };
  best_day: ShawarmaDay | null;
  worst_day: ShawarmaDay | null;
}

export interface DepartmentSetting {
  department_id: number;
  branch_id: number;
  department: string;
  branch: string;
  has_meals: boolean;
  has_factory: boolean;
  has_showroom: boolean;
  is_shawarma: boolean;
  meat_category_id: number | null;
  spice_item_id: number | null;
  skewer_item_id: number | null;
  warehouses: { id: number; name: string; role: WarehouseRole }[];
}

export type WarehouseRole = "department" | "factory_raw" | "factory_products" | "showroom";

export const WAREHOUSE_ROLES: Record<WarehouseRole, string> = {
  department: "مخزن القسم",
  factory_raw: "مواد خام المصنع",
  factory_products: "منتجات المصنع",
  showroom: "المعرض",
};

export const EXPIRY_STYLES: Record<ExpiryStatus, string> = {
  ok: "bg-green-500/15 text-green-400",
  warning: "bg-orange-500/15 text-orange-300",
  critical: "bg-red-500/15 text-red-400",
  expired: "bg-red-600/25 text-red-300",
  none: "bg-slate-500/15 text-slate-400",
};

export const TREND_LABELS: Record<Exclude<Trend, null>, { label: string; tone: string }> = {
  better: { label: "أفضل", tone: "text-green-400" },
  worse: { label: "أسوأ", tone: "text-red-400" },
  stable: { label: "مستقر", tone: "text-slate-300" },
};

export interface Option {
  value: string;
  label: string;
}

export interface SupplierLite {
  id: number;
  name: string;
  code: string;
  payment_terms: string | null;
}

export interface DocumentsMeta {
  types: Option[];
  waste_reasons: Option[];
  suppliers: SupplierLite[];
}

export interface SupplierItemLink {
  id: number;
  supplier_id: number;
  unit_id: number | null;
  price: string | null;
  supplier_item_code: string | null;
  is_preferred: boolean;
  supplier?: { id: number; name: string; code: string; phone: string | null; payment_terms: string | null; status: string };
  unit?: { id: number; name: string } | null;
}

/* ── الوصفات والجرد (المرحلة 4) ── */

export type RecipeOwnerType = "product" | "intermediate";

export interface RecipeListRow {
  id: number;
  name: string;
  code: string | null;
  base_unit: string | null;
  has_recipe: boolean;
  effective_from: string | null;
  lines_count: number;
  price: string | null;
  unit_cost: string | null;
  food_cost_percent: string | null;
}

export interface RecipeLineRow {
  id: number;
  stock_item_id: number;
  unit_id: number;
  quantity: string;
  base_quantity: string;
  stock_item?: { id: number; code: string; name: string; type: StockItemType; base_unit_id: number; base_unit?: { id: number; name: string } };
  unit?: { id: number; name: string };
}

export interface RecipeVersion {
  id: number;
  effective_from: string;
  yield_quantity: string;
  notes: string | null;
  lines: RecipeLineRow[];
  creator?: { id: number; name: string } | null;
  is_current: boolean;
  editable: boolean;
}

export interface RecipeDetail {
  type: RecipeOwnerType;
  owner: { id: number; name: string; code: string | null; base_unit: string | null };
  today: string;
  current_id: number | null;
  price: string | null;
  costing: {
    cost: string | null;
    ingredients: { stock_item_id: number; name: string; base_unit: string | null; quantity: string; unit_cost: string | null; cost: string | null }[];
  } | null;
  food_cost_percent: string | null;
  costs_visible: boolean;
  versions: RecipeVersion[];
}

export interface RecipePayload {
  effective_from?: string | null;
  yield_quantity?: number | null;
  notes?: string | null;
  lines: { stock_item_id: number; unit_id?: number | null; quantity: number }[];
}

export interface StockCountLine {
  id: number;
  stock_item_id: number;
  expected_quantity: string;
  unit_id: number | null;
  entered_quantity: string | null;
  counted_quantity: string | null;
  dissected_quantity?: string | null;
  marinated_quantity?: string | null;
  variance_quantity: string | null;
  unit_cost: string | null;
  variance_value: string | null;
  stock_item?: {
    id: number;
    code: string;
    name: string;
    base_unit_id: number;
    base_unit?: { id: number; name: string };
    units?: { id: number; unit_id: number; factor: string; unit?: { id: number; name: string } }[];
  };
}

export interface StockCount {
  id: number;
  number: string;
  warehouse_id: number;
  status: "draft" | "posted";
  kind?: "full" | "daily";
  business_day?: string | null;
  count_date: string | null;
  notes: string | null;
  variance_value: string | null;
  posted_at: string | null;
  lines_count?: number;
  counted_lines_count?: number;
  costs_visible?: boolean;
  lines?: StockCountLine[];
  warehouse?: { id: number; name: string; code?: string };
  creator?: { id: number; name: string } | null;
  poster?: { id: number; name: string } | null;
}

/* ── تحليلات المخزون ── */

export interface AnalyticsFilters {
  period: "today" | "week" | "month" | "custom";
  from?: string;
  to?: string;
  warehouse_id?: number | "";
  category_id?: number | "";
  stock_item_id?: number | "";
  stagnant_days?: number;
}

export interface DisplayUnit {
  name: string;
  factor: number;
}

export interface VarianceRow {
  stock_item_id: number;
  name: string;
  code: string | null;
  base_unit: string | null;
  display_unit: DisplayUnit | null;
  opening: string;
  inflow: string;
  transfers_in: string;
  transfers_out: string;
  closing: string;
  waste: string;
  adjustment: string;
  used: string;
  actual_qty: string;
  theoretical_qty: string;
  actual_value: string | null;
  theoretical_value: string | null;
  variance_qty: string;
  variance_value: string | null;
  variance_percent: string | null;
  alert: boolean;
  last_count_date: string | null;
}

interface AnalyticsMeta {
  filters: { from: string; to: string; days: number; threshold: string };
  costs_visible: boolean;
}

export interface VarianceResult extends AnalyticsMeta {
  rows: VarianceRow[];
  totals: { actual_value: string | null; theoretical_value: string | null; variance_value: string | null; variance_percent: string | null; alert: boolean; threshold: string };
  unrecipe: { item_id: number; name: string; sold: string }[];
  unattributed_qty: string;
}

export interface OverviewResult extends AnalyticsMeta {
  period: { from: string; to: string; days: number };
  kpis: {
    stock_value: string | null;
    actual_value: string | null;
    theoretical_value: string | null;
    variance_value: string | null;
    variance_percent: string | null;
    variance_alert: boolean;
    threshold: string;
    below_safety: number;
    turnover: string | null;
    coverage_days: string | null;
    products_without_recipe: number;
    single_item: { actual_qty: string; theoretical_qty: string; variance_qty: string; base_unit: string | null; display_unit: DisplayUnit | null } | null;
  };
  value_by_warehouse: { warehouse_id: number; name: string; value: number }[];
  value_by_category: { category_id: number | null; name: string; value: number }[];
  movement_series: { day: string; inflow: number; outflow: number; transfers_in: number; transfers_out: number; waste: number; adjustment: number }[];
  value_trend: { day: string; value: number }[];
  top_consumption: { stock_item_id: number; name: string; value: number; quantity: string; base_unit: string | null }[];
  low_stock: {
    stock_item_id: number; code: string; name: string; base_unit: string; warehouse_id: number; warehouse: string;
    quantity: string; safety_stock: string; status: "below" | "near"; suggested: string; supplier: string | null;
  }[];
  stagnant: {
    stock_item_id: number; code: string; name: string; base_unit: string; warehouse: string;
    quantity: string; value: string | null; last_movement_day: string; idle_days: number;
  }[];
}

export interface ItemSeriesResult extends AnalyticsMeta {
  item: { name: string; base_unit: string | null; display_unit: DisplayUnit | null } | null;
  days: { day: string; theoretical: number; actual: number }[];
  avg_cost: { day: string; warehouse_id: number; warehouse: string; avg_cost: number | null }[];
}

export interface IngredientResult extends AnalyticsMeta {
  item: { name: string; base_unit: string | null; display_unit: DisplayUnit | null } | null;
  total_consumed: string;
  total_cost: string | null;
  rows: { item_id: number; name: string; code: string | null; sold: string; per_unit: string | null; consumed: string; cost: string | null; share_percent: string }[];
}

export interface ProductResult extends AnalyticsMeta {
  product: { id: number; name: string; code: string | null } | null;
  sold: string;
  has_recipe: boolean;
  total_cost: string | null;
  unit_cost: string | null;
  price: string | null;
  food_cost_percent: string | null;
  rows: {
    stock_item_id: number; name: string; code: string | null; base_unit: string | null; display_unit: DisplayUnit | null;
    per_unit: string | null; consumed: string; unit_cost: string | null; cost: string | null; cost_per_product: string | null;
  }[];
}

export const DOCUMENT_STATUS_LABELS: Record<StockDocumentStatus, string> = {
  draft: "مسودة",
  posted: "مرحّل",
  reversed: "معكوس",
};

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

/* ── الاستدعاءات ── */

/** GET /inventory/dashboard — ضمن مخازن المستخدم؛ القيم null لمن لا يملك رؤية التكاليف. */
export interface InventoryDashboard {
  items_count: number;
  warehouses_count: number;
  below_safety_count: number;
  below_safety: { id: number; code: string; name: string; base_unit: string; safety_stock: string; quantity: string }[];
  recent_movements: {
    id: number;
    type: string;
    type_label: string;
    occurred_at: string;
    quantity: string;
    total_cost: string | null;
    code: string;
    item_name: string;
    base_unit: string;
    warehouse_name: string;
  }[];
  stock_value: string | null;
}

const BASE = "/inventory";

async function unwrap<T>(p: Promise<{ data: { data?: T } }>): Promise<T> {
  const { data } = await p;
  return data.data as T;
}

/** رسالة الخادم العربية (أول خطأ تحقق إن وُجد) لعرضها في التنبيه. */
export function inventoryErrorMessage(error: unknown): string {
  const res = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  const firstFieldError = res?.errors ? Object.values(res.errors)[0]?.[0] : undefined;
  return firstFieldError || res?.message || "حدث خطأ غير متوقع";
}

export const inventoryService = {
  lookups: () => unwrap<InventoryLookups>(api.get(`${BASE}/lookups`)),
  saleItems: (params: { search?: string; unlinked?: boolean }) =>
    unwrap<SaleItem[]>(api.get(`${BASE}/sale-items`, { params: { search: params.search, unlinked: params.unlinked ? 1 : undefined } })),

  units: () => unwrap<StockUnit[]>(api.get(`${BASE}/units`)),
  createUnit: (data: Partial<StockUnit>) => unwrap<StockUnit>(api.post(`${BASE}/units`, data)),
  updateUnit: (id: number, data: Partial<StockUnit>) => unwrap<StockUnit>(api.put(`${BASE}/units/${id}`, data)),
  deleteUnit: (id: number) => unwrap<null>(api.delete(`${BASE}/units/${id}`)),

  categories: () => unwrap<StockCategory[]>(api.get(`${BASE}/categories`)),
  createCategory: (data: Partial<StockCategory>) => unwrap<StockCategory>(api.post(`${BASE}/categories`, data)),
  updateCategory: (id: number, data: Partial<StockCategory>) => unwrap<StockCategory>(api.put(`${BASE}/categories/${id}`, data)),
  deleteCategory: (id: number) => unwrap<null>(api.delete(`${BASE}/categories/${id}`)),

  items: (params: Record<string, string | number | boolean | undefined>) =>
    unwrap<Paginated<StockItem>>(api.get(`${BASE}/items`, { params })),
  item: (id: number) => unwrap<StockItem>(api.get(`${BASE}/items/${id}`)),
  createItem: (data: StockItemPayload) => unwrap<StockItem>(api.post(`${BASE}/items`, data)),
  updateItem: (id: number, data: Partial<StockItemPayload>) => unwrap<StockItem>(api.put(`${BASE}/items/${id}`, data)),
  deleteItem: (id: number) => unwrap<null>(api.delete(`${BASE}/items/${id}`)),

  warehouses: () => unwrap<Warehouse[]>(api.get(`${BASE}/warehouses`)),
  createWarehouse: (data: Partial<Warehouse>) => unwrap<Warehouse>(api.post(`${BASE}/warehouses`, data)),
  updateWarehouse: (id: number, data: Partial<Warehouse>) => unwrap<Warehouse>(api.put(`${BASE}/warehouses/${id}`, data)),
  deleteWarehouse: (id: number) => unwrap<null>(api.delete(`${BASE}/warehouses/${id}`)),
  warehouseUsers: (id: number) => unwrap<WarehouseUser[]>(api.get(`${BASE}/warehouses/${id}/users`)),
  syncWarehouseUsers: (id: number, userIds: number[], levels: Record<number, "view" | "edit"> = {}) =>
    unwrap<null>(api.put(`${BASE}/warehouses/${id}/users`, { user_ids: userIds, levels })),

  batches: (params: { warehouse_id?: number | ""; stock_item_id?: number | ""; available?: number; search?: string }) =>
    unwrap<BatchRow[]>(api.get(`${BASE}/quality/batches`, { params })),
  productivity: (warehouseId: number, day: string) =>
    unwrap<ProductivityResult>(api.get(`${BASE}/quality/productivity`, { params: { warehouse_id: warehouseId, day } })),
  productivityExport: (warehouseId: number, day: string) => downloadBlob(`${BASE}/quality/productivity`, { warehouse_id: warehouseId, day, export: 1 }, `productivity-${day}.xlsx`),
  dailyCount: (warehouseId: number, day: string) => unwrap<{ id: number }>(api.post(`${BASE}/quality/daily-count`, { warehouse_id: warehouseId, day })),
  wasteMinutes: (warehouseId: number, day: string) =>
    unwrap<WasteMinutes>(api.get(`${BASE}/quality/waste-minutes`, { params: { warehouse_id: warehouseId, day } })),
  shawarma: (warehouseId: number, from: string, to: string) =>
    unwrap<ShawarmaPeriod>(api.get(`${BASE}/quality/shawarma`, { params: { warehouse_id: warehouseId, from, to } })),
  exportSkewer: (batchId: number) => unwrap<unknown>(api.post(`${BASE}/quality/skewers/${batchId}/export`)),
  departmentSettings: () => unwrap<DepartmentSetting[]>(api.get(`${BASE}/quality/department-settings`)),
  saveDepartmentSetting: (data: Omit<DepartmentSetting, "department" | "branch" | "warehouses">) =>
    unwrap<unknown>(api.put(`${BASE}/quality/department-settings`, data)),
  qualityReport: (kind: "main" | "department" | "factory", params: Record<string, string | number | undefined>) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unwrap<Record<string, any>>(api.get(`${BASE}/quality/reports/${kind}`, { params })),
  setDelivery: (documentId: number, delivery_status: "delivered" | "undelivered") =>
    unwrap<StockDocument>(api.patch(`${BASE}/documents/${documentId}/delivery`, { delivery_status })),

  balances: (params: Record<string, string | number | boolean | undefined>) =>
    unwrap<Paginated<StockBalanceRow>>(api.get(`${BASE}/balances`, { params })),
  kardex: (params: { warehouse_id: number; stock_item_id: number; from?: string; to?: string; page?: number }) =>
    unwrap<Kardex>(api.get(`${BASE}/kardex`, { params })),
  postOpening: (data: { warehouse_id: number; lines: OpeningLine[]; notes?: string | null }) =>
    unwrap<unknown[]>(api.post(`${BASE}/movements/opening`, data)),
  reverseMovement: (id: number, reason: string) =>
    unwrap<unknown>(api.post(`${BASE}/movements/${id}/reverse`, { reason })),

  documentsMeta: () => unwrap<DocumentsMeta>(api.get(`${BASE}/documents/meta`)),
  documents: (params: Record<string, string | number | undefined>) =>
    unwrap<Paginated<StockDocument>>(api.get(`${BASE}/documents`, { params })),
  document: (id: number) => unwrap<StockDocument>(api.get(`${BASE}/documents/${id}`)),
  createDocument: (data: StockDocumentPayload) => unwrap<StockDocument>(api.post(`${BASE}/documents`, data)),
  updateDocument: (id: number, data: StockDocumentPayload) => unwrap<StockDocument>(api.put(`${BASE}/documents/${id}`, data)),
  deleteDocument: (id: number) => unwrap<null>(api.delete(`${BASE}/documents/${id}`)),
  postDocument: (id: number) => unwrap<StockDocument>(api.post(`${BASE}/documents/${id}/post`)),
  reverseDocument: (id: number, reason: string) => unwrap<StockDocument>(api.post(`${BASE}/documents/${id}/reverse`, { reason })),

  itemSuppliers: (itemId: number) => unwrap<SupplierItemLink[]>(api.get(`${BASE}/items/${itemId}/suppliers`)),
  syncItemSuppliers: (
    itemId: number,
    links: { supplier_id: number; unit_id?: number | null; price?: number | null; supplier_item_code?: string | null; is_preferred?: boolean }[],
  ) => unwrap<SupplierItemLink[]>(api.put(`${BASE}/items/${itemId}/suppliers`, { links })),

  recipes: (params: { type: RecipeOwnerType; search?: string; missing?: number; page?: number; per_page?: number }) =>
    unwrap<Paginated<RecipeListRow>>(api.get(`${BASE}/recipes`, { params })),
  recipe: (type: RecipeOwnerType, id: number) => unwrap<RecipeDetail>(api.get(`${BASE}/recipes/${type}/${id}`)),
  saveRecipe: (type: RecipeOwnerType, id: number, data: RecipePayload) => unwrap<RecipeVersion>(api.post(`${BASE}/recipes/${type}/${id}`, data)),
  deleteRecipeVersion: (recipeId: number) => unwrap<null>(api.delete(`${BASE}/recipes/versions/${recipeId}`)),

  counts: (params: Record<string, string | number | undefined>) => unwrap<Paginated<StockCount>>(api.get(`${BASE}/counts`, { params })),
  count: (id: number) => unwrap<StockCount>(api.get(`${BASE}/counts/${id}`)),
  createCount: (data: { warehouse_id: number; category_id?: number | null; notes?: string | null }) =>
    unwrap<StockCount>(api.post(`${BASE}/counts`, data)),
  saveCount: (
    id: number,
    data: {
      notes?: string | null;
      lines: { stock_item_id: number; unit_id?: number | null; entered_quantity: number | null; dissected?: number | null; marinated?: number | null }[];
    },
  ) =>
    unwrap<StockCount>(api.put(`${BASE}/counts/${id}`, data)),
  deleteCount: (id: number) => unwrap<null>(api.delete(`${BASE}/counts/${id}`)),
  postCount: (id: number) => unwrap<StockCount>(api.post(`${BASE}/counts/${id}/post`)),

  analyticsOverview: (f: AnalyticsFilters) => unwrap<OverviewResult>(api.get(`${BASE}/analytics/overview`, { params: analyticsParams(f) })),
  analyticsVariance: (f: AnalyticsFilters) => unwrap<VarianceResult>(api.get(`${BASE}/analytics/variance`, { params: analyticsParams(f) })),
  analyticsItemSeries: (f: AnalyticsFilters, stockItemId: number) =>
    unwrap<ItemSeriesResult>(api.get(`${BASE}/analytics/item-series`, { params: { ...analyticsParams(f), stock_item_id: stockItemId } })),
  analyticsIngredient: (f: AnalyticsFilters, stockItemId: number) =>
    unwrap<IngredientResult>(api.get(`${BASE}/analytics/ingredient`, { params: { ...analyticsParams(f), stock_item_id: stockItemId } })),
  analyticsProduct: (f: AnalyticsFilters, itemId: number) =>
    unwrap<ProductResult>(api.get(`${BASE}/analytics/product`, { params: { ...analyticsParams(f), item_id: itemId } })),
  /** تنزيل جدول كملف Excel (.xlsx) يولّده الخادم. */
  analyticsExport: async (f: AnalyticsFilters, table: string, extra: Record<string, number> = {}) => {
    const res = await api.get(`${BASE}/analytics/export`, {
      params: { ...analyticsParams(f), table, ...extra },
      responseType: "blob",
    });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${table}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  dashboard: () => unwrap<InventoryDashboard>(api.get(`${BASE}/dashboard`)),
  settings: () => unwrap<InventorySettings>(api.get(`${BASE}/settings`)),
  updateSettings: (
    data: Partial<
      Pick<InventorySettings, "allow_negative_stock" | "variance_alert_percent" | "expiry_warning_days" | "expiry_critical_days" | "showroom_max_days" | "spice_grams_per_kg">
    >,
  ) =>
    unwrap<InventorySettings>(api.put(`${BASE}/settings`, data)),
};

/** تنزيل ملف (Excel) من الخادم. */
async function downloadBlob(url: string, params: Record<string, string | number>, name: string): Promise<void> {
  const res = await api.get(url, { params, responseType: "blob" });
  const href = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  URL.revokeObjectURL(href);
}

/** فلاتر التحليلات كمعاملات استعلام (القيم الفارغة تُحذف). */
function analyticsParams(f: AnalyticsFilters): Record<string, string | number> {
  const out: Record<string, string | number> = { period: f.period };
  if (f.period === "custom") {
    if (f.from) out.from = f.from;
    if (f.to) out.to = f.to;
  }
  if (f.warehouse_id) out.warehouse_id = f.warehouse_id;
  if (f.category_id) out.category_id = f.category_id;
  if (f.stock_item_id) out.stock_item_id = f.stock_item_id;
  if (f.stagnant_days) out.stagnant_days = f.stagnant_days;
  return out;
}

/** عرض كمية/مبلغ من الخادم (نص بست خانات) بلا أصفار زائدة. */
export function fmtNum(value: string | number | null | undefined, maxDecimals = 3): string {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: maxDecimals });
}
