// src/services/orderService.ts — مُحدَّث بإضافة pay و verifyReference

import api from "../api/axios";

// ── أنواع ─────────────────────────────────────────────────────────────────────
export type OrderType = "dine_in" | "takeaway";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "ready"
  | "served"
  | "paid"
  | "cancelled";
export type PaymentMethod = "cash" | "credit_card" | "wallet";
export type DiscountType = "amount" | "percent";

export interface OrderItemPayload {
  item_id: number;
  quantity: number;
  unit_price: number;
  notes?: string;
}

export interface CreateOrderPayload {
  branch_id: number;
  cashier_id?: number;
  order_type: OrderType;
  table_number?: string;
  customer_name?: string;
  customer_phone?: string;
  note?: string;
  discount_value?: number;
  discount_type?: DiscountType;
  payment_method?: PaymentMethod;
  items: OrderItemPayload[];
}

// ── طلب الدفع ────────────────────────────────────────────────────────────────
export interface PayOrderPayload {
  payment_method: PaymentMethod;
  reference_number?: string; // مطلوب عند wallet
  customer_name?: string;
  customer_phone?: string;
}

// ── نتيجة التحقق من الرقم المرجعي ───────────────────────────────────────────
export interface ReferenceVerifyResult {
  valid: boolean;
  message: string;
  existing_order?: {
    id: number;
    order_number: string;
    status: string;
    total: number;
    paid_at: string | null;
  };
}

// ── أنواع الاستجابة ───────────────────────────────────────────────────────────
export interface OrderItemFromApi {
  id: number;
  item_id: number;
  department_id: number;
  item_name: string;
  item_name_ar: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  notes: string | null;
  department?: { id: number; name: string; color: string; icon: string };
}

export interface TicketItemFromApi {
  id: number;
  item_name: string;
  item_name_ar: string;
  quantity: number;
  notes: string | null;
  status: "pending" | "preparing" | "ready";
}

export interface ProductionTicketFromApi {
  id: number;
  order_id: number;
  ticket_number: string;
  status: "pending" | "preparing" | "ready" | "cancelled";
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  department?: { id: number; name: string; color: string; icon: string };
  order?: {
    id: number;
    order_number: string;
    order_type: string;
    table_number: string | null;
    note: string | null;
  };
  items?: TicketItemFromApi[];
}

export interface OrderFromApi {
  id: number;
  order_number: string;
  branch_id: number;
  cashier_id: number | null;
  order_type: OrderType;
  status: OrderStatus;
  table_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  note: string | null;
  subtotal: number;
  discount_value: number;
  discount_type: DiscountType;
  discount_amount: number;
  total: number;
  payment_method: PaymentMethod | null;
  reference_number: string | null; // ✅
  paid_at: string | null; // ✅
  items: OrderItemFromApi[];
  tickets: ProductionTicketFromApi[];
  cashier?: { id: number; name: string };
  created_at: string;
  updated_at: string;
}

// ── الخدمة الرئيسية ───────────────────────────────────────────────────────────

export const orderService = {
  getAll: async (filters?: {
    branch_id?: number;
    status?: OrderStatus;
    date?: string;
  }): Promise<OrderFromApi[]> => {
    const { data } = await api.get("/orders", { params: filters });
    return data.data as OrderFromApi[];
  },

  getOne: async (id: number): Promise<OrderFromApi> => {
    const { data } = await api.get(`/orders/${id}`);
    return data.data as OrderFromApi;
  },

  create: async (payload: CreateOrderPayload): Promise<OrderFromApi> => {
    const { data } = await api.post("/orders", payload);
    return data.data as OrderFromApi;
  },

  update: async (
    id: number,
    payload: Partial<CreateOrderPayload>,
  ): Promise<OrderFromApi> => {
    const { data } = await api.put(`/orders/${id}`, payload);
    return data.data as OrderFromApi;
  },

  /** تأكيد الطلب → إنشاء تذاكر الأقسام */
  confirm: async (id: number): Promise<OrderFromApi> => {
    const { data } = await api.post(`/orders/${id}/confirm`);
    return data.data as OrderFromApi;
  },

  /**
   * إغلاق الطلب ماليًا
   * إذا payment_method === 'wallet' → reference_number مطلوب
   */
  pay: async (id: number, payload: PayOrderPayload): Promise<OrderFromApi> => {
    const { data } = await api.post(`/orders/${id}/pay`, payload);
    return data.data as OrderFromApi;
  },

  /** التحقق من الرقم المرجعي قبل الإرسال (لمنع التكرار) */
  verifyReference: async (
    referenceNumber: string,
    currentOrderId?: number,
  ): Promise<ReferenceVerifyResult> => {
    const { data } = await api.post("/payments/verify-reference", {
      reference_number: referenceNumber,
      order_id: currentOrderId,
    });
    return data.data as ReferenceVerifyResult;
  },

  cancel: async (id: number): Promise<OrderFromApi> => {
    const { data } = await api.post(`/orders/${id}/cancel`);
    return data.data as OrderFromApi;
  },

  void: async (id: number, reason: string): Promise<OrderFromApi> => {
    const { data } = await api.post(`/orders/${id}/void`, { reason });
    return data.data as OrderFromApi;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/orders/${id}`);
  },
};

// ── خدمة تذاكر الأقسام ───────────────────────────────────────────────────────

export const productionTicketService = {
  getAll: async (filters?: {
    department_id?: number;
    status?: string;
  }): Promise<ProductionTicketFromApi[]> => {
    const { data } = await api.get("/production-tickets", { params: filters });
    return data.data as ProductionTicketFromApi[];
  },

  updateStatus: async (
    ticketId: number,
    status: "pending" | "preparing" | "ready" | "cancelled",
  ): Promise<ProductionTicketFromApi> => {
    const { data } = await api.patch(`/production-tickets/${ticketId}/status`, {
      status,
    });
    return data.data as ProductionTicketFromApi;
  },

  updateItemStatus: async (
    ticketId: number,
    itemId: number,
    status: "pending" | "preparing" | "ready",
  ): Promise<{ ticket_item: TicketItemFromApi; ticket_status: string }> => {
    const { data } = await api.patch(
      `/production-tickets/${ticketId}/items/${itemId}/status`,
      { status },
    );
    return data.data;
  },
};
