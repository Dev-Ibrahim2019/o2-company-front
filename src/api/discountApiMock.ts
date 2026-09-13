// src/api/discountApiMock.ts
// Mock API for Discount endpoints — يتعامل مع محرك الخصم في الذاكرة

import { discountEngine, type DiscountData, type DiscountType, type ApplyStrategy } from "../services/discountEngine";

// تهيئة بيانات تجريبية
discountEngine.seed();

function json(data: unknown) {
  return { data };
}

function paginated(data: unknown[], total?: number) {
  return {
    data,
    meta: {
      total: total ?? (Array.isArray(data) ? data.length : 0),
      per_page: 100,
      current_page: 1,
    },
  };
}

// دالة مساعدة لتحويل تاريخ إلى نص
function safeStr(v: any): string {
  if (v == null) return "";
  return String(v);
}

export const discountApiMock = {
  // GET /discounts
  getAll(params?: { status?: string; search?: string; discount_type?: string; per_page?: number }) {
    let list = discountEngine.getAll();
    if (params?.status === "active") {
      list = list.filter(d => d.is_valid);
    }
    if (params?.status === "expired") {
      list = list.filter(d => !d.is_valid);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.name_ar?.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q)
      );
    }
    if (params?.discount_type) {
      list = list.filter(d => d.discount_type === params.discount_type);
    }
    return paginated(list, list.length);
  },

  // GET /discounts/:id
  getById(id: number) {
    const d = discountEngine.getById(id);
    if (!d) return { error: "Not found", status: 404 };
    return json(d);
  },

  // POST /discounts
  create(payload: {
    name: string;
    name_ar?: string;
    code: string;
    description?: string;
    discount_type: DiscountType;
    value: number;
    apply_strategy?: ApplyStrategy;
    priority?: number;
    start_date?: string;
    end_date?: string;
    is_active?: boolean;
    max_discount_amount?: number;
    min_order_amount?: number;
    min_quantity?: number;
    usage_limit?: number;
    targets?: Array<{
      target_type: string;
      target_id?: number | null;
    }>;
  }) {
    const d = discountEngine.create({
      name: payload.name,
      name_ar: payload.name_ar,
      code: payload.code,
      description: payload.description,
      discount_type: payload.discount_type,
      value: payload.value,
      apply_strategy: payload.apply_strategy,
      priority: payload.priority,
      start_date: payload.start_date,
      end_date: payload.end_date,
      is_active: payload.is_active,
      max_discount_amount: payload.max_discount_amount,
      min_order_amount: payload.min_order_amount,
      min_quantity: payload.min_quantity,
      usage_limit: payload.usage_limit,
      targets: (payload.targets ?? []).map(t => ({
        target_type: t.target_type as any,
        target_id: t.target_id,
      })),
    });
    return json(d);
  },

  // PUT /discounts/:id
  update(id: number, payload: any) {
    const d = discountEngine.update(id, payload);
    if (!d) return { error: "Not found", status: 404 };
    return json(d);
  },

  // DELETE /discounts/:id
  delete(id: number) {
    const ok = discountEngine.delete(id);
    if (!ok) return { error: "Not found", status: 404 };
    return { success: true };
  },

  // GET /discounts/entities
  getEntities(type?: string) {
    return json(discountEngine.getEntities(type as any));
  },

  // GET /discounts/dashboard
  dashboard() {
    return json(discountEngine.getDashboardStats());
  },

  // GET /discounts/calculate
  calculate(params: {
    price: number;
    quantity?: number;
    customer_id?: number;
    employee_id?: number;
    supplier_id?: number;
    department_id?: number;
    item_id?: number;
    category_id?: number;
    branch_id?: number;
  }) {
    const result = discountEngine.calculate({
      price: Number(params.price) || 0,
      quantity: params.quantity ? Number(params.quantity) : undefined,
      customer_id: params.customer_id ? Number(params.customer_id) : undefined,
      employee_id: params.employee_id ? Number(params.employee_id) : undefined,
      supplier_id: params.supplier_id ? Number(params.supplier_id) : undefined,
      department_id: params.department_id ? Number(params.department_id) : undefined,
      item_id: params.item_id ? Number(params.item_id) : undefined,
      category_id: params.category_id ? Number(params.category_id) : undefined,
      branch_id: params.branch_id ? Number(params.branch_id) : undefined,
    });
    return json(result);
  },

  // POST /discounts/calculate-cart
  calculateCart(payload: {
    items: Array<{
      item_id: number;
      item_name?: string;
      price: number;
      quantity: number;
      department_id?: number;
      category_id?: number;
    }>;
    customer_id?: number;
    employee_id?: number;
    supplier_id?: number;
    department_id?: number;
    branch_id?: number;
  }) {
    const result = discountEngine.calculateCart({
      items: (payload.items ?? []).map(item => ({
        item_id: Number(item.item_id) || 0,
        item_name: item.item_name,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        department_id: item.department_id ? Number(item.department_id) : undefined,
        category_id: item.category_id ? Number(item.category_id) : undefined,
      })),
      customer_id: payload.customer_id ? Number(payload.customer_id) : undefined,
      employee_id: payload.employee_id ? Number(payload.employee_id) : undefined,
      supplier_id: payload.supplier_id ? Number(payload.supplier_id) : undefined,
      department_id: payload.department_id ? Number(payload.department_id) : undefined,
      branch_id: payload.branch_id ? Number(payload.branch_id) : undefined,
    });
    return json(result);
  },

  // POST /discounts/debug
  debug(payload: {
    price: number;
    quantity?: number;
    customer_id?: number;
    employee_id?: number;
    supplier_id?: number;
    department_id?: number;
    item_id?: number;
    category_id?: number;
    branch_id?: number;
  }) {
    const result = discountEngine.calculate({
      price: Number(payload.price) || 0,
      quantity: payload.quantity ? Number(payload.quantity) : undefined,
      customer_id: payload.customer_id ? Number(payload.customer_id) : undefined,
      employee_id: payload.employee_id ? Number(payload.employee_id) : undefined,
      supplier_id: payload.supplier_id ? Number(payload.supplier_id) : undefined,
      department_id: payload.department_id ? Number(payload.department_id) : undefined,
      item_id: payload.item_id ? Number(payload.item_id) : undefined,
      category_id: payload.category_id ? Number(payload.category_id) : undefined,
      branch_id: payload.branch_id ? Number(payload.branch_id) : undefined,
    });
    return json(result);
  },

  // POST /discounts/validate-target
  validateTarget(payload: {
    target_type: string;
    target_id?: number;
  }) {
    const result = discountEngine.validateTarget(
      payload.target_type as any,
      payload.target_id ? Number(payload.target_id) : undefined,
    );
    return json(result);
  },
};
