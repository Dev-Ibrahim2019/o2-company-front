// src/services/discountService.ts
// خدمة إدارة الخصومات - اتصال مع API الخصومات

import api from "../api/axios";

export interface DiscountTarget {
  id?: number;
  discount_id?: number;
  target_type:
    | "customer"
    | "employee"
    | "supplier"
    | "department"
    | "item"
    | "category"
    | "branch"
    | "all_customers"
    | "all_employees"
    | "all_suppliers"
    | "all";
  target_id?: number | null;
  business_code?: string;
  target_business_code?: string;
  target_type_label?: string;
  target_name?: string | null;
}

export interface Discount {
  id: number;
  name: string;
  name_ar?: string;
  code: string;
  description?: string;
  discount_type:
    | "percentage"
    | "fixed_amount"
    | "price_override"
    | "buy_x_get_y";
  discount_type_label?: string;
  value: number;
  apply_strategy?: "per_quantity" | "per_line" | "per_invoice" | "once";
  priority: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  is_valid?: boolean;
  max_discount_amount?: number;
  min_order_amount?: number;
  targets?: DiscountTarget[];
  exclusions?: DiscountTarget[];
  creator?: { id: number; name: string };
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

export interface DiscountCreatePayload {
  name: string;
  name_ar?: string;
  code: string;
  description?: string;
  discount_type:
    | "percentage"
    | "fixed_amount"
    | "price_override"
    | "buy_x_get_y";
  value: number;
  apply_strategy?: "per_quantity" | "per_line" | "per_invoice" | "once";
  priority?: number;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  max_discount_amount?: number;
  min_order_amount?: number;
  targets?: Omit<DiscountTarget, "id" | "discount_id">[];
  exclusions?: Omit<DiscountTarget, "id" | "discount_id">[];
}

export interface EntityRecord {
  id: number;
  name: string;
  name_ar?: string;
  type: string;
  business_code?: string;
  employee_number?: string;
  customer_code?: string;
  supplier_code?: string;
  department?: string;
  department_id?: number;
  department_name?: string;
  status?: string | boolean;
  branch?: string;
  branch_id?: number;
  price?: number;
  phone?: string;
}

export interface EntityLookupResponse {
  data: EntityRecord[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface DiscountCalculateResult {
  has_discount: boolean;
  discount?: Discount;
  original_price: number;
  discount_amount: number;
  final_price: number;
  discount_percent?: number;
  matched_rule?: unknown;
  matched_target?: unknown;
  matched_entity?: unknown;
  priority?: number;
  apply_strategy?: string;
  reason?: string;
  rejected_discounts?: Array<{ id: number; name: string; code: string; reason: string }>;
}

export interface CartDiscountResult {
  items: CartDiscountItem[];
  total_original: number;
  total_discount: number;
  total_final: number;
}

export interface CartDiscountItem {
  item_id?: number;
  item_name?: string;
  quantity: number;
  unit_price: number;
  original_price: number;
  original_total: number;
  discount?: Discount;
  discount_amount: number;
  discount_percent?: number;
  final_unit_price: number;
  final_total: number;
  apply_strategy?: string;
}

export interface DiscountDebugPayload {
  price: number;
  quantity?: number;
  customer_id?: number;
  employee_id?: number;
  supplier_id?: number;
  department_id?: number;
  item_id?: number;
  category_id?: number;
  branch_id?: number;
}

export interface DiscountTargetValidation {
  found: boolean;
  target_type: DiscountTarget["target_type"];
  target_id?: number;
  entity?: Record<string, unknown>;
  relations?: Record<string, unknown>;
  message?: string;
}

const API_BASE = "/admin/pos-registers/discounts";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const config: any = {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string>),
    },
  };

  const response = await api.get(url, config);

  if (!response.data) {
    throw new Error("No data received from server");
  }

  return response.data as T;
}

// ── CRUD Operations ──

export const discountService = {
  // جلب جميع الخصومات
  async getAll(params?: {
    status?: string;
    search?: string;
    discount_type?: string;
    per_page?: number;
  }): Promise<{ data: Discount[]; meta?: any }> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    if (params?.discount_type) query.set("discount_type", params.discount_type);
    if (params?.per_page) query.set("per_page", String(params.per_page));
    const qs = query.toString();
    return request(`${API_BASE}${qs ? `?${qs}` : ""}`);
  },

  // جلب خصم محدد
  async getById(id: number): Promise<{ data: Discount }> {
    return request(`${API_BASE}/${id}`);
  },

  // إنشاء خصم جديد
  async create(payload: DiscountCreatePayload): Promise<{ data: Discount }> {
    const response = await api.post(API_BASE, payload);
    return response.data;
  },

  // تحديث خصم
  async update(
    id: number,
    payload: Partial<DiscountCreatePayload>,
  ): Promise<{ data: Discount }> {
    const response = await api.put(`${API_BASE}/${id}`, payload);
    return response.data;
  },

  // حذف خصم
  async delete(id: number): Promise<void> {
    await api.delete(`${API_BASE}/${id}`);
  },

  // حساب الخصم لعنصر
  async getEntities(params?: {
    type?: string;
    search?: string;
    page?: number;
    per_page?: number;
  } | string): Promise<{ data: EntityRecord[]; meta?: EntityLookupResponse["meta"] }> {
    const finalParams = typeof params === "string" ? { type: params } : params;
    const response = await api.get(`${API_BASE}/entities`, { params: finalParams });
    const payload = response.data?.data;
    if (payload?.data && Array.isArray(payload.data)) {
      return payload;
    }
    return response.data;
  },

  async calculate(params: {
    price: number;
    quantity?: number;
    customer_id?: number;
    employee_id?: number;
    supplier_id?: number;
    department_id?: number;
    item_id?: number;
    category_id?: number;
    branch_id?: number;
  }): Promise<{ data: DiscountCalculateResult }> {
    const response = await api.post(`${API_BASE}/calculate`, params);
    return response.data;
  },

  // حساب خصومات السلة
  async calculateCart(params: {
    items: Array<{
      price: number;
      quantity?: number;
      item_id?: number;
      item_name?: string;
      department_id?: number;
      category_id?: number;
    }>;
    customer_id?: number;
    employee_id?: number;
    supplier_id?: number;
    department_id?: number;
    branch_id?: number;
  }): Promise<{ data: CartDiscountResult }> {
    const response = await api.post(`${API_BASE}/calculate-cart`, params);
    return response.data;
  },

  async debug(
    payload: DiscountDebugPayload,
  ): Promise<{ data: DiscountCalculateResult }> {
    const response = await api.post(`${API_BASE}/debug`, payload);
    return response.data;
  },

  async validateTarget(params: {
    target_type: DiscountTarget["target_type"];
    target_id?: number;
  }): Promise<{ data: DiscountTargetValidation }> {
    const response = await api.post(`${API_BASE}/validate-target`, params);
    return response.data;
  },

  // لوحة التحكم (الإحصائيات)
  async dashboard(): Promise<{ data: { stats: any; recent_usage: any[] } }> {
    return request(`${API_BASE}/dashboard`);
  },
};
