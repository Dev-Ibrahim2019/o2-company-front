export type TargetType = "customer" | "employee" | "supplier" | "department" | "item" | "category" | "branch" | "brand" | "modifier" | "all_customers" | "all_employees" | "all_suppliers" | "all";
export type DiscountType = "percentage" | "fixed_amount" | "price_override" | "buy_x_get_y";
export type ApplyStrategy = "per_quantity" | "per_line" | "per_invoice" | "once";

export interface DiscountTargetData {
  id?: number;
  discount_id?: number;
  target_type: TargetType;
  target_id?: number | null;
  target_type_label?: string;
  target_name?: string | null;
}

export interface DiscountData {
  id: number;
  name: string;
  name_ar?: string;
  code: string;
  description?: string;
  discount_type: DiscountType;
  discount_type_label?: string;
  value: number;
  apply_strategy: ApplyStrategy;
  priority: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  is_valid?: boolean;
  max_discount_amount?: number;
  min_order_amount?: number;
  min_quantity?: number;
  usage_limit?: number;
  usage_count: number;
  targets: DiscountTargetData[];
  creator?: { id: number; name: string };
  created_at: string;
  updated_at: string;
}

export interface DiscountDebugResult {
  has_discount: boolean;
  matched_discount?: {
    id: number;
    name: string;
    code: string;
    discount_type: DiscountType;
    value: number;
    apply_strategy: ApplyStrategy;
    priority: number;
    original_price: number;
    discount_amount: number;
    final_price: number;
    discount_percent?: number;
    reason: string;
    matched_targets: DiscountTargetData[];
    matched_entity?: Record<string, unknown>;
  };
  rejected_discounts: Array<{ id: number; name: string; code: string; reason: string }>;
}

export interface CalculateItemResult {
  item_id: number;
  item_name?: string;
  quantity: number;
  unit_price: number;
  original_price: number;
  original_total: number;
  discount?: {
    id: number;
    name: string;
    code: string;
    discount_type: string;
    value: number;
    apply_strategy: ApplyStrategy;
  } | null;
  discount_amount: number;
  discount_percent?: number;
  final_unit_price: number;
  final_total: number;
}

export interface CartCalculateResult {
  items: CalculateItemResult[];
  total_original: number;
  total_discount: number;
  total_final: number;
}

export interface CartItemInput {
  item_id: number;
  item_name?: string;
  price: number;
  quantity: number;
  department_id?: number;
  category_id?: number;
  brand_id?: number;
  modifier_ids?: number[];
}

export interface EntityRecord {
  id: number;
  name: string;
  name_ar?: string;
  type: TargetType;
  code?: string;
  department_id?: number;
  department_name?: string;
  price?: number;
  phone?: string;
  status?: string;
  branch?: string;
}

// ─── Mock Entities ──────────────────────────────────────

export const MOCK_BRANCHES: Record<number, { id: number; name: string }> = {
  1: { id: 1, name: "الفرع الرئيسي" },
  2: { id: 2, name: "الفرع الثاني" },
};

export const MOCK_DEPARTMENTS: Record<number, { id: number; name: string; branch_id: number }> = {
  1: { id: 1, name: "مشروبات", branch_id: 1 },
  2: { id: 2, name: "مقبلات", branch_id: 1 },
  3: { id: 3, name: "شاورما", branch_id: 1 },
  4: { id: 4, name: "حلويات", branch_id: 1 },
  5: { id: 5, name: "مشروبات باردة", branch_id: 2 },
};

export const MOCK_CATEGORIES: Record<number, { id: number; name: string; department_id?: number }> = {
  1: { id: 1, name: "مشروبات غازية", department_id: 1 },
  2: { id: 2, name: "مشروبات ساخنة", department_id: 1 },
  3: { id: 3, name: "مقبلات باردة", department_id: 2 },
  4: { id: 4, name: "ساندويشات", department_id: 3 },
};

export const MOCK_BRANDS: Record<number, { id: number; name: string; code: string }> = {
  1: { id: 1, name: "Pepsi", code: "PEPSI" },
  2: { id: 2, name: "Coca Cola", code: "COCA" },
  3: { id: 3, name: "Almarai", code: "ALMR" },
};

export const MOCK_MODIFIERS: Record<number, { id: number; name: string; price_impact: number }> = {
  1: { id: 1, name: "إضافة جبنة", price_impact: 3 },
  2: { id: 2, name: "حجم كبير", price_impact: 5 },
  3: { id: 3, name: "إضافة صوص", price_impact: 2 },
};

export const MOCK_EMPLOYEES: Record<number, { id: number; name: string; department_id: number; branch_id: number; status: string }> = {
  15: { id: 15, name: "حسين أحمد", department_id: 3, branch_id: 1, status: "active" },
  16: { id: 16, name: "سارة علي", department_id: 2, branch_id: 1, status: "active" },
  17: { id: 17, name: "محمد عمر", department_id: 1, branch_id: 2, status: "active" },
  18: { id: 18, name: "نورة خالد", department_id: 4, branch_id: 1, status: "active" },
  19: { id: 19, name: "خالد سعيد", department_id: 2, branch_id: 2, status: "active" },
};

export const MOCK_CUSTOMERS: Record<number, { id: number; name: string; phone: string; branch_id?: number }> = {
  1: { id: 1, name: "شركة القدس", phone: "055500001", branch_id: 1 },
  2: { id: 2, name: "شركة غزة", phone: "055500002" },
  3: { id: 3, name: "مؤسسة فلسطين", phone: "055500003", branch_id: 1 },
};

export const MOCK_SUPPLIERS: Record<number, { id: number; name: string; phone: string }> = {
  10: { id: 10, name: "شركة الغذاء المثالي", phone: "055511111" },
  11: { id: 11, name: "مؤسسة المشروبات", phone: "055522222" },
};

export const MOCK_ITEMS: Record<number, { id: number; name: string; name_ar: string; price: number; department_id: number; category_id?: number; brand_id?: number }> = {
  70: { id: 70, name: "Shawarma Plate", name_ar: "شاورما", price: 20, department_id: 3, category_id: 4 },
  71: { id: 71, name: "Pepsi", name_ar: "بيبسي", price: 5, department_id: 1, category_id: 1, brand_id: 1 },
  72: { id: 72, name: "Fries", name_ar: "بطاطا", price: 10, department_id: 2, category_id: 3 },
  73: { id: 73, name: "Burger", name_ar: "برجر", price: 35, department_id: 3, category_id: 4 },
  74: { id: 74, name: "Cola", name_ar: "كولا", price: 5, department_id: 1, category_id: 1, brand_id: 2 },
  75: { id: 75, name: "Water", name_ar: "ماء", price: 2, department_id: 1 },
  76: { id: 76, name: "Juice", name_ar: "عصير", price: 12, department_id: 1 },
  77: { id: 77, name: "Pizza", name_ar: "بيتزا", price: 45, department_id: 3, category_id: 4 },
};

// ─── Discount Store ─────────────────────────────────────

let discountIdCounter = 100;
const discounts: Map<number, DiscountData> = new Map();

function getNextId(): number { return ++discountIdCounter; }

const appliedInvoiceDiscounts: Map<string | number, Set<number>> = new Map();
let currentCartSessionId: string | null = null;
const cartSessionApplied: Set<string> = new Set();

export function resetCartSession() {
  currentCartSessionId = Math.random().toString(36).substring(2, 10);
  cartSessionApplied.clear();
}

function makeLabel(type: TargetType): string {
  const labels: Record<string, string> = {
    customer: "عميل", employee: "موظف", supplier: "مورد",
    department: "قسم", item: "صنف", category: "فئة", branch: "فرع",
    brand: "براند", modifier: "محدد",
    all_customers: "جميع العملاء", all_employees: "جميع الموظفين",
    all_suppliers: "جميع الموردين", all: "الجميع",
  };
  return labels[type] || type;
}

function resolveEntityName(target: DiscountTargetData): string | null {
  if (target.target_type === "employee") return MOCK_EMPLOYEES[target.target_id ?? -1]?.name ?? null;
  if (target.target_type === "customer") return MOCK_CUSTOMERS[target.target_id ?? -1]?.name ?? null;
  if (target.target_type === "supplier") return MOCK_SUPPLIERS[target.target_id ?? -1]?.name ?? null;
  if (target.target_type === "department") return MOCK_DEPARTMENTS[target.target_id ?? -1]?.name ?? null;
  if (target.target_type === "item") return MOCK_ITEMS[target.target_id ?? -1]?.name_ar ?? null;
  if (target.target_type === "category") return MOCK_CATEGORIES[target.target_id ?? -1]?.name ?? null;
  if (target.target_type === "brand") return MOCK_BRANDS[target.target_id ?? -1]?.name ?? null;
  if (target.target_type === "modifier") return MOCK_MODIFIERS[target.target_id ?? -1]?.name ?? null;
  return null;
}

function isDiscountValid(d: DiscountData): boolean {
  if (!d.is_active) return false;
  const now = new Date();
  if (d.start_date && new Date(d.start_date) > now) return false;
  if (d.end_date && new Date(d.end_date) < now) return false;
  if (d.usage_limit != null && d.usage_count >= d.usage_limit) return false;
  return true;
}

function enrichDiscount(d: DiscountData): DiscountData {
  return {
    ...d,
    is_valid: isDiscountValid(d),
    discount_type_label:
      d.discount_type === "percentage" ? "نسبة مئوية" : d.discount_type === "fixed_amount" ? "مبلغ ثابت" : "تجاوز السعر",
    targets: d.targets.map(t => ({ ...t, target_type_label: makeLabel(t.target_type), target_name: resolveEntityName(t) })),
  };
}

// ─── Entity List with Search ────────────────────────────

function collectEntityList(type: TargetType, search?: string): EntityRecord[] {
  let list: EntityRecord[] = [];
  switch (type) {
    case "employee":
      list = Object.values(MOCK_EMPLOYEES).map(e => ({
        id: e.id, name: e.name, type, department_id: e.department_id,
        department_name: MOCK_DEPARTMENTS[e.department_id]?.name,
        status: e.status, branch: MOCK_BRANCHES[e.branch_id]?.name,
      }));
      break;
    case "customer":
      list = Object.values(MOCK_CUSTOMERS).map(c => ({
        id: c.id, name: c.name, type, phone: c.phone,
        branch: c.branch_id ? MOCK_BRANCHES[c.branch_id]?.name : undefined,
      }));
      break;
    case "supplier":
      list = Object.values(MOCK_SUPPLIERS).map(s => ({
        id: s.id, name: s.name, type, phone: s.phone,
      }));
      break;
    case "department":
      list = Object.values(MOCK_DEPARTMENTS).map(d => ({
        id: d.id, name: d.name, type,
        branch: MOCK_BRANCHES[d.branch_id]?.name,
      }));
      break;
    case "item":
      list = Object.values(MOCK_ITEMS).map(i => ({
        id: i.id, name: i.name, name_ar: i.name_ar, type,
        department_id: i.department_id,
        department_name: MOCK_DEPARTMENTS[i.department_id]?.name,
        price: i.price, code: String(i.id),
      }));
      break;
    case "category":
      list = Object.values(MOCK_CATEGORIES).map(c => ({
        id: c.id, name: c.name, type, department_id: c.department_id,
        department_name: c.department_id ? MOCK_DEPARTMENTS[c.department_id]?.name : undefined,
      }));
      break;
    case "brand":
      list = Object.values(MOCK_BRANDS).map(b => ({
        id: b.id, name: b.name, type, code: b.code,
      }));
      break;
    case "modifier":
      list = Object.values(MOCK_MODIFIERS).map(m => ({
        id: m.id, name: m.name, type,
      }));
      break;
    case "branch":
      list = Object.values(MOCK_BRANCHES).map(b => ({
        id: b.id, name: b.name, type,
      }));
      break;
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.name_ar && e.name_ar.includes(q)) ||
      (e.department_name && e.department_name.toLowerCase().includes(q)) ||
      String(e.id).includes(q)
    );
  }
  return list;
}

// ─── Discount Engine ────────────────────────────────────

export const discountEngine = {
  getEntities(type?: TargetType, search?: string, page?: number, limit?: number): { data: EntityRecord[]; total: number; page: number; limit: number } {
    const types: TargetType[] = type ? [type] : ["employee", "customer", "supplier", "department", "item", "category", "brand", "modifier", "branch"];
    let all: EntityRecord[] = [];
    for (const t of types) all.push(...collectEntityList(t, undefined));
    if (search) {
      const q = search.toLowerCase();
      all = all.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.name_ar && e.name_ar.includes(q)) ||
        (e.department_name && e.department_name.toLowerCase().includes(q)) ||
        String(e.id).includes(q)
      );
    }
    const total = all.length;
    const p = page ?? 1;
    const lim = limit ?? 50;
    const start = (p - 1) * lim;
    const data = all.slice(start, start + lim);
    return { data, total, page: p, limit: lim };
  },

  getAll(): DiscountData[] { return Array.from(discounts.values()).map(enrichDiscount); },

  getById(id: number): DiscountData | undefined {
    const d = discounts.get(id);
    return d ? enrichDiscount(d) : undefined;
  },

  create(payload: {
    name: string; name_ar?: string; code: string; description?: string;
    discount_type: DiscountType; value: number; apply_strategy?: ApplyStrategy;
    priority?: number; start_date?: string; end_date?: string; is_active?: boolean;
    max_discount_amount?: number; min_order_amount?: number; min_quantity?: number; usage_limit?: number;
    targets?: Omit<DiscountTargetData, "id" | "discount_id">[];
  }): DiscountData {
    const id = getNextId();
    const now = new Date().toISOString();
    const d: DiscountData = {
      id, name: payload.name, name_ar: payload.name_ar, code: payload.code,
      description: payload.description, discount_type: payload.discount_type,
      value: payload.value, apply_strategy: payload.apply_strategy ?? "per_quantity",
      priority: payload.priority ?? 0, start_date: payload.start_date, end_date: payload.end_date,
      is_active: payload.is_active ?? true, is_valid: true,
      max_discount_amount: payload.max_discount_amount, min_order_amount: payload.min_order_amount,
      min_quantity: payload.min_quantity, usage_limit: payload.usage_limit, usage_count: 0,
      targets: (payload.targets ?? []).map(t => ({ ...t, target_type_label: makeLabel(t.target_type), target_name: resolveEntityName(t) })),
      created_at: now, updated_at: now,
    };
    discounts.set(id, d);
    return this.getById(id)!;
  },

  update(id: number, payload: Partial<{
    name: string; name_ar?: string; code: string; description?: string;
    discount_type: DiscountType; value: number; apply_strategy: ApplyStrategy; priority: number;
    start_date?: string; end_date?: string; is_active: boolean;
    max_discount_amount?: number; min_order_amount?: number; min_quantity?: number; usage_limit?: number;
    targets: Omit<DiscountTargetData, "id" | "discount_id">[];
  }>): DiscountData | undefined {
    const existing = discounts.get(id);
    if (!existing) return undefined;
    discounts.set(id, {
      ...existing, ...payload,
      targets: payload.targets ? payload.targets.map(t => ({ ...t, target_type_label: makeLabel(t.target_type), target_name: resolveEntityName(t) })) : existing.targets,
      updated_at: new Date().toISOString(),
    });
    return this.getById(id);
  },

  delete(id: number): boolean { return discounts.delete(id); },

  getDashboardStats() {
    const all = Array.from(discounts.values());
    const now = new Date();
    return {
      stats: {
        total_discounts: all.length,
        active_discounts: all.filter(d => d.is_active && (!d.end_date || new Date(d.end_date) >= now) && (!d.start_date || new Date(d.start_date) <= now)).length,
        expired_discounts: all.filter(d => d.end_date && new Date(d.end_date) < now).length,
        percentage_discounts: all.filter(d => d.discount_type === "percentage").length,
        fixed_discounts: all.filter(d => d.discount_type === "fixed_amount").length,
        price_override_discounts: all.filter(d => d.discount_type === "price_override").length,
        total_usage: all.reduce((sum, d) => sum + (d.usage_count || 0), 0),
        total_discount_amount: 0,
      },
      recent_usage: [] as any[],
    };
  },

  validateTarget(target_type: TargetType, target_id?: number): {
    found: boolean; target_type: TargetType; target_id?: number;
    entity?: Record<string, unknown>; relations?: Record<string, unknown>; message: string;
  } {
    if (["all", "all_customers", "all_employees", "all_suppliers"].includes(target_type)) {
      return { found: true, target_type, message: `✅ ${makeLabel(target_type)} - شامل` };
    }
    if (!target_id) return { found: false, target_type, message: "❌ يجب اختيار كيان" };

    if (target_type === "employee") {
      const emp = MOCK_EMPLOYEES[target_id];
      if (!emp) return { found: false, target_type, target_id, message: `❌ الموظف ID=${target_id} غير موجود` };
      const dept = MOCK_DEPARTMENTS[emp.department_id];
      return {
        found: true, target_type, target_id,
        entity: { id: emp.id, name: emp.name, status: emp.status, department_name: dept?.name, branch: MOCK_BRANCHES[emp.branch_id]?.name } as any,
        relations: { القسم: dept ? { id: dept.id, name: dept.name } : null },
        message: `✅ ${emp.name} | القسم: ${dept?.name ?? "—"} | الحالة: ${emp.status}`,
      };
    }
    if (target_type === "customer") {
      const c = MOCK_CUSTOMERS[target_id];
      if (!c) return { found: false, target_type, target_id, message: `❌ العميل ID=${target_id} غير موجود` };
      return { found: true, target_type, target_id, entity: c as any, message: `✅ ${c.name} | هاتف: ${c.phone}` };
    }
    if (target_type === "supplier") {
      const s = MOCK_SUPPLIERS[target_id];
      if (!s) return { found: false, target_type, target_id, message: `❌ المورد ID=${target_id} غير موجود` };
      return { found: true, target_type, target_id, entity: s as any, message: `✅ ${s.name}` };
    }
    if (target_type === "department") {
      const dept = MOCK_DEPARTMENTS[target_id];
      if (!dept) return { found: false, target_type, target_id, message: `❌ القسم ID=${target_id} غير موجود` };
      const items = Object.values(MOCK_ITEMS).filter(i => i.department_id === target_id);
      return {
        found: true, target_type, target_id, entity: dept as any,
        relations: { الأصناف: items.map(i => ({ id: i.id, name: i.name_ar })), عدد_الأصناف: items.length },
        message: `✅ ${dept.name} (${items.length} صنف)`,
      };
    }
    if (target_type === "item") {
      const item = MOCK_ITEMS[target_id];
      if (!item) return { found: false, target_type, target_id, message: `❌ الصنف ID=${target_id} غير موجود` };
      const dept = MOCK_DEPARTMENTS[item.department_id];
      const brand = item.brand_id ? MOCK_BRANDS[item.brand_id] : null;
      return {
        found: true, target_type, target_id,
        entity: { id: item.id, name: item.name_ar, name_en: item.name, price: `${item.price} ₪`, department: dept?.name, brand: brand?.name },
        relations: { القسم: dept ? { id: dept.id, name: dept.name } : null, البراند: brand ? { id: brand.id, name: brand.name } : null },
        message: `✅ ${item.name_ar} | ${dept?.name ?? "—"} | ${item.price} ₪`,
      };
    }
    if (target_type === "category") {
      const cat = MOCK_CATEGORIES[target_id];
      if (!cat) return { found: false, target_type, target_id, message: `❌ الفئة ID=${target_id} غير موجودة` };
      const items = Object.values(MOCK_ITEMS).filter(i => i.category_id === target_id);
      return {
        found: true, target_type, target_id, entity: { id: cat.id, name: cat.name } as any,
        relations: { الأصناف: items.map(i => ({ id: i.id, name: i.name_ar })), عدد_الأصناف: items.length },
        message: `✅ ${cat.name} (${items.length} أصناف)`,
      };
    }
    if (target_type === "brand") {
      const brand = MOCK_BRANDS[target_id];
      if (!brand) return { found: false, target_type, target_id, message: `❌ البراند ID=${target_id} غير موجود` };
      const items = Object.values(MOCK_ITEMS).filter(i => i.brand_id === target_id);
      return {
        found: true, target_type, target_id, entity: { id: brand.id, name: brand.name, code: brand.code } as any,
        relations: { الأصناف: items.map(i => ({ id: i.id, name: i.name_ar })), عدد_الأصناف: items.length },
        message: `✅ ${brand.name} (${items.length} أصناف)`,
      };
    }
    if (target_type === "modifier") {
      const mod = MOCK_MODIFIERS[target_id];
      if (!mod) return { found: false, target_type, target_id, message: `❌ المحدد ID=${target_id} غير موجود` };
      return { found: true, target_type, target_id, entity: mod as any, message: `✅ ${mod.name} (تأثير: ${mod.price_impact} ₪)` };
    }
    if (target_type === "branch") {
      return { found: true, target_type, target_id, message: `✅ ${MOCK_BRANCHES[target_id]?.name ?? "الفرع " + target_id}` };
    }
    return { found: false, target_type, message: `❌ نوع غير معروف: ${target_type}` };
  },

  // ─── Core Matching Logic ──────────────────────────────
  // Entity targets (employee, customer, supplier): AND between themselves — WHO is this for?
  // Scope targets (item, department, category, brand, modifier): OR between themselves — WHAT does this apply to?
  // Compound: entity AND scope (both conditions must be satisfied)

  calculate(params: {
    price: number; quantity?: number;
    customer_id?: number; employee_id?: number; supplier_id?: number;
    department_id?: number; item_id?: number; category_id?: number;
    brand_id?: number; modifier_ids?: number[]; branch_id?: number;
    item_key?: string;
  }): DiscountDebugResult {
    const allDiscounts = Array.from(discounts.values()).filter(isDiscountValid);
    const matched: Array<{ discount: DiscountData; targets: DiscountTargetData[]; entity?: Record<string, unknown>; score: number }> = [];
    const rejected: Array<{ id: number; name: string; code: string; reason: string }> = [];

    for (const d of allDiscounts) {
      // Pre-checks
      if (d.min_order_amount != null && params.price < d.min_order_amount) {
        rejected.push({ id: d.id, name: d.name, code: d.code, reason: `المبلغ ${params.price} < الحد الأدنى ${d.min_order_amount}` });
        continue;
      }
      if (d.min_quantity != null && (params.quantity ?? 1) < d.min_quantity) {
        rejected.push({ id: d.id, name: d.name, code: d.code, reason: `الكمية ${params.quantity} < الحد الأدنى ${d.min_quantity}` });
        continue;
      }
      if (d.apply_strategy === "once" && d.usage_count > 0) {
        rejected.push({ id: d.id, name: d.name, code: d.code, reason: "استخدم مرة واحدة فقط" });
        continue;
      }
      if (d.apply_strategy === "per_invoice" && params.item_key) {
        const sessionKey = currentCartSessionId ?? "default";
        if (cartSessionApplied.has(`${d.id}:${params.item_key}`)) {
          rejected.push({ id: d.id, name: d.name, code: d.code, reason: "طبق مسبقاً على هذه الفاتورة" });
          continue;
        }
      }

      // ── Entity Match (AND: ALL entity targets must match) ──
      const entityTargets = d.targets.filter(t =>
        ["employee", "customer", "supplier", "all_employees", "all_customers", "all_suppliers", "all"].includes(t.target_type)
      );
      const scopeTargets = d.targets.filter(t =>
        ["item", "department", "category", "brand", "modifier"].includes(t.target_type)
      );

      let entityMatched = true;
      let entityDetails: Record<string, unknown> | undefined;
      const matchedEntityTargets: DiscountTargetData[] = [];

      // If no entity targets, discount applies to anyone (global)
      if (entityTargets.length === 0) {
        entityMatched = true;
      } else {
        for (const t of entityTargets) {
          const result = this.matchEntityTarget(t, params);
          if (result.matched) {
            matchedEntityTargets.push(t);
            if (result.entity) entityDetails = result.entity;
          } else {
            entityMatched = false;
            break;
          }
        }
      }

      if (!entityMatched) {
        const firstFail = entityTargets.find(t => !this.matchEntityTarget(t, params).matched);
        rejected.push({
          id: d.id, name: d.name, code: d.code,
          reason: firstFail ? `${makeLabel(firstFail.target_type)} غير مطابق` : "شروط الكيان لم تتحقق",
        });
        continue;
      }

      // ── Scope Match (AND: ALL scope targets must match) ──
      let scopeMatched = true;
      const matchedScopeTargets: DiscountTargetData[] = [];

      if (scopeTargets.length === 0) {
        // No scope restrictions → applies to everything
        scopeMatched = true;
      } else {
        for (const t of scopeTargets) {
          const result = this.matchScopeTarget(t, params);
          if (result.matched) {
            matchedScopeTargets.push(t);
            if (result.entity) entityDetails = result.entity;
          } else {
            scopeMatched = false;
            break;
          }
        }
      }

      if (!scopeMatched) {
        rejected.push({
          id: d.id, name: d.name, code: d.code,
          reason: `الخصم لا ينطبق على هذا الصنف/القسم`,
        });
        continue;
      }

      // Both conditions met → matched!
      const allMatchedTargets = [...matchedEntityTargets, ...matchedScopeTargets];
      matched.push({ discount: d, targets: allMatchedTargets, entity: entityDetails, score: d.priority });
    }

    // Sort by priority (lowest number = highest priority)
    matched.sort((a, b) => a.score - b.score);
    const best = matched[0] ?? null;

    if (!best) {
      return { has_discount: false, rejected_discounts: rejected };
    }

    // Calculate discount
    const d = best.discount;
    let discountAmount = 0;
    let discountPercent: number | undefined;
    let finalPrice = params.price;

    if (d.discount_type === "percentage") {
      discountAmount = params.price * (d.value / 100);
      if (d.max_discount_amount != null) discountAmount = Math.min(discountAmount, d.max_discount_amount);
      discountPercent = d.value;
      finalPrice = params.price - discountAmount;
    } else if (d.discount_type === "fixed_amount") {
      discountAmount = Math.min(d.value, params.price);
      finalPrice = params.price - discountAmount;
    } else if (d.discount_type === "price_override") {
      discountAmount = Math.max(0, params.price - d.value);
      finalPrice = d.value;
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    finalPrice = Math.max(0, Math.round(finalPrice * 100) / 100);

    if (d.apply_strategy === "per_invoice" && params.item_key) {
      const sessionKey = currentCartSessionId ?? "default";
      cartSessionApplied.add(`${d.id}:${params.item_key}`);
    }
    if (d.apply_strategy === "once") {
      d.usage_count = (d.usage_count || 0) + 1;
    }

    const targetReasons = best.targets.map(t => `${makeLabel(t.target_type)} (ID=${t.target_id ?? "all"})`).join(" + ");

    return {
      has_discount: true,
      matched_discount: {
        id: d.id, name: d.name, code: d.code,
        discount_type: d.discount_type, value: d.value,
        apply_strategy: d.apply_strategy, priority: d.priority,
        original_price: params.price, discount_amount: discountAmount,
        final_price: finalPrice, discount_percent: discountPercent,
        reason: `✅ "${d.name}" (${targetReasons}) الأولوية ${d.priority}`,
        matched_targets: best.targets, matched_entity: best.entity,
      },
      rejected_discounts: rejected,
    };
  },

  matchEntityTarget(target: DiscountTargetData, params: {
    customer_id?: number; employee_id?: number; supplier_id?: number;
  }): { matched: boolean; entity?: Record<string, unknown> } {
    const t = target.target_type;
    const tid = target.target_id;
    if (t === "all") return { matched: true };
    if (t === "all_customers") return params.customer_id != null ? { matched: true } : { matched: false };
    if (t === "all_employees") return params.employee_id != null ? { matched: true } : { matched: false };
    if (t === "all_suppliers") return params.supplier_id != null ? { matched: true } : { matched: false };
    if (t === "customer") {
      if (params.customer_id == null) return { matched: false };
      if (tid != null && params.customer_id !== tid) return { matched: false };
      return { matched: true, entity: MOCK_CUSTOMERS[params.customer_id] as any };
    }
    if (t === "employee") {
      if (params.employee_id == null) return { matched: false };
      if (tid != null && params.employee_id !== tid) return { matched: false };
      return { matched: true, entity: MOCK_EMPLOYEES[params.employee_id] as any };
    }
    if (t === "supplier") {
      if (params.supplier_id == null) return { matched: false };
      if (tid != null && params.supplier_id !== tid) return { matched: false };
      return { matched: true, entity: MOCK_SUPPLIERS[params.supplier_id] as any };
    }
    return { matched: false };
  },

  matchScopeTarget(target: DiscountTargetData, params: {
    department_id?: number; item_id?: number; category_id?: number;
    brand_id?: number; modifier_ids?: number[];
  }): { matched: boolean; entity?: Record<string, unknown> } {
    const t = target.target_type;
    const tid = target.target_id;

    if (t === "department") {
      let deptId = params.department_id;
      if (deptId == null && params.item_id != null) {
        const item = MOCK_ITEMS[params.item_id];
        if (item) deptId = item.department_id;
      }
      if (deptId == null) return { matched: false };
      if (tid != null && deptId !== tid) return { matched: false };
      return { matched: true, entity: MOCK_DEPARTMENTS[deptId] as any };
    }

    if (t === "item") {
      if (params.item_id == null) return { matched: false };
      if (tid != null && params.item_id !== tid) return { matched: false };
      return { matched: true, entity: MOCK_ITEMS[params.item_id] as any };
    }

    if (t === "category") {
      if (params.item_id == null) return { matched: false };
      const item = MOCK_ITEMS[params.item_id];
      if (!item) return { matched: false };
      if (tid != null && item.category_id !== tid) return { matched: false };
      if (item.category_id == null) return { matched: false };
      return { matched: true, entity: MOCK_CATEGORIES[item.category_id] as any };
    }

    if (t === "brand") {
      if (params.item_id == null) return { matched: false };
      const item = MOCK_ITEMS[params.item_id];
      if (!item) return { matched: false };
      if (tid != null && item.brand_id !== tid) return { matched: false };
      if (item.brand_id == null) return { matched: false };
      return { matched: true, entity: MOCK_BRANDS[item.brand_id] as any };
    }

    if (t === "modifier") {
      if (!params.modifier_ids || params.modifier_ids.length === 0) return { matched: false };
      const hasModifier = tid == null || params.modifier_ids.includes(tid);
      if (!hasModifier) return { matched: false };
      return { matched: true, entity: tid != null ? MOCK_MODIFIERS[tid] as any : undefined };
    }

    return { matched: false };
  },

  calculateCart(params: {
    items: CartItemInput[]; customer_id?: number; employee_id?: number;
    supplier_id?: number; department_id?: number; branch_id?: number;
  }): CartCalculateResult {
    resetCartSession();
    const results: CalculateItemResult[] = [];
    let totalOriginal = 0;
    let totalDiscount = 0;

    for (const item of params.items) {
      const originalTotal = item.price * item.quantity;
      totalOriginal += originalTotal;
      const itemKey = `${item.item_id}:${item.department_id ?? "none"}`;

      const calcResult = this.calculate({
        price: item.price, quantity: item.quantity,
        customer_id: params.customer_id, employee_id: params.employee_id,
        supplier_id: params.supplier_id,
        department_id: item.department_id ?? params.department_id,
        item_id: item.item_id, brand_id: item.brand_id,
        modifier_ids: item.modifier_ids,
        branch_id: params.branch_id, item_key: itemKey,
      });

      if (calcResult.has_discount && calcResult.matched_discount) {
        const md = calcResult.matched_discount;
        let effectiveDiscountAmount: number;
        if (md.apply_strategy === "per_line") {
          effectiveDiscountAmount = md.discount_amount;
        } else if (md.apply_strategy === "per_invoice") {
          effectiveDiscountAmount = md.discount_amount;
        } else {
          effectiveDiscountAmount = md.discount_amount * item.quantity;
        }
        const finalTotal = originalTotal - effectiveDiscountAmount;
        totalDiscount += effectiveDiscountAmount;
        results.push({
          item_id: item.item_id, item_name: item.item_name,
          quantity: item.quantity, unit_price: item.price,
          original_price: md.original_price, original_total: originalTotal,
          discount: {
            id: md.id, name: md.name, code: md.code,
            discount_type: md.discount_type, value: md.value,
            apply_strategy: md.apply_strategy,
          },
          discount_amount: Math.round(effectiveDiscountAmount * 100) / 100,
          discount_percent: md.discount_percent,
          final_unit_price: md.apply_strategy === "per_line"
            ? Math.round(((originalTotal - effectiveDiscountAmount) / item.quantity) * 100) / 100
            : md.final_price,
          final_total: Math.max(0, Math.round(finalTotal * 100) / 100),
        });
      } else {
        results.push({
          item_id: item.item_id, item_name: item.item_name,
          quantity: item.quantity, unit_price: item.price,
          original_price: item.price, original_total: originalTotal,
          discount: null, discount_amount: 0,
          final_unit_price: item.price, final_total: originalTotal,
        });
      }
    }
    return {
      items: results,
      total_original: totalOriginal,
      total_discount: Math.round(totalDiscount * 100) / 100,
      total_final: Math.max(0, Math.round((totalOriginal - totalDiscount) * 100) / 100),
    };
  },

  // ─── Seed ─────────────────────────────────────────────

  seed() {
    if (discounts.size > 0) return;

    // حسين (15) خصم 20% على شاورما (70) فقط — per_quantity
    this.create({
      name: "Hussein Shawarma",
      name_ar: "خصم حسين على الشاورما",
      code: "HUSS-SHAW",
      discount_type: "percentage", value: 20,
      apply_strategy: "per_quantity", priority: 1, is_active: true,
      targets: [
        { target_type: "employee", target_id: 15 },
        { target_type: "item", target_id: 70 },
      ],
    });

    // حسين (15) خصم 10% على قسم الشاورما (3) — لكل قطعة
    this.create({
      name: "Hussein Dept Shawarma",
      name_ar: "خصم حسين على قسم الشاورما",
      code: "HUSS-DEPT",
      discount_type: "percentage", value: 10,
      apply_strategy: "per_quantity", priority: 2, is_active: true,
      targets: [
        { target_type: "employee", target_id: 15 },
        { target_type: "department", target_id: 3 },
      ],
    });

    // حسين (15) خصم 15% على البرجر (73) — لكل قطعة
    this.create({
      name: "Hussein Burger",
      name_ar: "خصم حسين على البرجر",
      code: "HUSS-BURG",
      discount_type: "percentage", value: 15,
      apply_strategy: "per_quantity", priority: 3, is_active: true,
      targets: [
        { target_type: "employee", target_id: 15 },
        { target_type: "item", target_id: 73 },
      ],
    });

    // VIP (1) خصم 15% على المشروبات (قسم 1)
    this.create({
      name: "VIP Drinks",
      name_ar: "خصم كبار العملاء على المشروبات",
      code: "VIP-DRNK",
      discount_type: "percentage", value: 15,
      apply_strategy: "per_quantity", priority: 1, is_active: true,
      targets: [
        { target_type: "customer", target_id: 1 },
        { target_type: "department", target_id: 1 },
      ],
    });

    // خصم على براند Pepsi (1) — لجميع الموظفين
    this.create({
      name: "Pepsi Brand Discount",
      name_ar: "خصم بيبسي",
      code: "PEPSI-OFF",
      discount_type: "fixed_amount", value: 1,
      apply_strategy: "per_quantity", priority: 5, is_active: true,
      targets: [
        { target_type: "brand", target_id: 1 },
      ],
    });

    // خصم شامل للجميع
    this.create({
      name: "Grand Opening",
      name_ar: "الافتتاح الكبير",
      code: "OPENING",
      discount_type: "percentage", value: 25,
      apply_strategy: "once", priority: 10,
      end_date: "2026-07-01", is_active: true,
      targets: [{ target_type: "all" }],
    });
  },
};
