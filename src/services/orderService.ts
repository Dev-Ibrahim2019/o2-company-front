// src/services/orderService.ts — Limited & Updated with Settlement Engine integration

import api from "../api/axios";
import type { Transaction as AccountingTransaction } from "./accountingService";

// ── أنواع ─────────────────────────────────────────────────────────────────────
export type OrderType = "dine_in" | "takeaway";
export type OrderStatus =
  | "pending"
  | "pending_confirmation"
  | "confirmed"
  | "in_progress"
  | "ready"
  | "served"
  | "paid"
  | "cancelled"
  | "pending_payment";
export type PaymentMethod = "cash" | "card" | "wallet" | "bank" | "account";
export type DiscountType = "amount" | "percent";

const normalizeMoney = (value: number) =>
  Math.round((Number(value) || 0) * 100) / 100;

const normalizeTableNumber = (value: string | number | null | undefined) =>
  String(value ?? "").trim();

const CLOSED_ORDER_STATUSES = new Set<OrderStatus>(["paid", "cancelled"]);

type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

const getApiErrorMessage = (error: unknown) => {
  const apiError = error as ApiErrorLike;
  return String(apiError.response?.data?.message ?? apiError.message ?? "");
};

const isExistingInvoiceError = (error: unknown) => {
  const message = getApiErrorMessage(error).toLowerCase();
  return (
    (message.includes("invoice") &&
      (message.includes("already") || message.includes("exists"))) ||
    (message.includes("فاتورة") &&
      (message.includes("مسبق") ||
        message.includes("موجود") ||
        message.includes("سابقة")))
  );
};

const getInvoiceFromError = (error: unknown): InvoiceFromApi | null => {
  const apiError = error as {
    response?: { data?: { data?: unknown; invoice?: unknown } };
  };
  const payload = apiError.response?.data;
  const invoice = payload?.invoice ?? payload?.data;

  return invoice && typeof invoice === "object" && "id" in invoice
    ? (invoice as InvoiceFromApi)
    : null;
};

export const normalizePaymentMethod = (
  value: PaymentMethod | string | null | undefined,
): PaymentMethod | undefined => {
  const method = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!method) return undefined;

  if (method === "cash") return "cash";
  if (
    ["credit_card", "card", "credit", "visa", "mastercard"].includes(method)
  ) {
    return "card";
  }
  if (method === "wallet") return "wallet";
  if (["bank_transfer", "bank", "transfer", "qr", "online"].includes(method)) {
    return "bank";
  }
  // Entity payment methods — يجب إرسالها كـ 'account' لأن جدول payments
  // يقبل فقط: cash, card, bank, wallet, account, mixed
  if (["employee", "customer", "supplier", "account"].includes(method)) {
    return "account";
  }

  return undefined;
};

// Cache for payment method type -> DB ID mapping
let _paymentMethodIdCache: Record<string, number> | null = null;

async function resolvePaymentMethodIdToDbId(method: string): Promise<number> {
  if (!_paymentMethodIdCache) {
    const { settlementService } = await import("./settlementService");
    const methods = await settlementService.getPaymentMethods();
    _paymentMethodIdCache = {};
    for (const m of methods) {
      _paymentMethodIdCache[m.type] = m.id;
    }
  }
  const id = _paymentMethodIdCache[method];
  if (!id) {
    throw new Error(`طريقة الدفع '${method}' غير موجودة في قاعدة البيانات.`);
  }
  return id;
}

const logSettlementPayload = (
  label: string,
  payload: Record<string, unknown>,
) => {
  console.debug(label, {
    received_entity_type: payload.entity_type ?? null,
    received_entity_id: payload.entity_id ?? null,
    received_subledger_type: payload.subledger_type ?? null,
    received_subledger_id: payload.subledger_id ?? null,
    payload,
  });
};

export interface OrderQueryFilters {
  branch_id?: number;
  status?: OrderStatus;
  date?: string;
  table_number?: string;
}

const unwrapOrderList = (payload: unknown): OrderFromApi[] => {
  if (Array.isArray(payload)) return payload as OrderFromApi[];

  const nested = (payload as { data?: unknown } | null)?.data;
  return Array.isArray(nested) ? (nested as OrderFromApi[]) : [];
};

const unwrapInvoiceList = (payload: unknown): InvoiceFromApi[] => {
  const candidate = Array.isArray(payload)
    ? payload
    : (payload as { data?: unknown } | null)?.data ?? payload;

  if (Array.isArray(candidate)) return candidate as InvoiceFromApi[];

  const nested = (candidate as { data?: unknown } | null)?.data;
  return Array.isArray(nested) ? (nested as InvoiceFromApi[]) : [];
};

const unwrapInvoice = (payload: unknown): InvoiceFromApi | null => {
  const candidate = (payload as { data?: unknown } | null)?.data ?? payload;
  const nested = (candidate as { data?: unknown } | null)?.data ?? candidate;

  if (Array.isArray(nested)) {
    return (nested[0] as InvoiceFromApi | undefined) ?? null;
  }

  return nested && typeof nested === "object" && "id" in nested
    ? (nested as InvoiceFromApi)
    : null;
};

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
  method?: PaymentMethod;
  amount: number;
  reference_number?: string;
  customer_name?: string;
  customer_phone?: string;
  note?: string;
  entity_type?: "customer" | "employee" | "supplier";
  entity_id?: number;
  subledger_type?: "customer" | "employee" | "supplier";
  subledger_id?: number;
}

export interface InvoicePayload {
  customer_name?: string;
  customer_phone?: string;
  customer_id?: number;
  employee_id?: number;
  supplier_id?: number;
  note?: string;
}

export interface InvoiceItemFromApi {
  id: number;
  item_id: number;
  item_name: string;
  quantity: number;
  price: number;
  total: number;
  tax_rate?: number;
  tax_amount?: number;
}

export interface InvoiceFromApi {
  id: number;
  number: string;
  invoice_number?: string;
  order_id: number;
  branch_id?: number;
  customer_id?: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  table_number?: string | number | null;
  order_number?: string | number | null;
  order_type?: OrderType | null;
  note?: string | null;
  payment_method?: PaymentMethod | string | null;
  discount_type?: DiscountType | null;
  discount_value?: number | string | null;
  subtotal?: number;
  discount?: number;
  discount_amount?: number;
  total: number;
  status: string;
  paid_amount?: number;
  remaining_amount?: number;
  paid_at?: string | null;
  created_at: string;
  updated_at?: string;
  payments?: InvoicePaymentResponse[];
  items?: InvoiceItemFromApi[];
  invoice_items?: InvoiceItemFromApi[];
  order?: {
    id: number;
    order_number: string;
    branch_id?: number;
    customer_name?: string | null;
    customer_phone?: string | null;
    table_number?: string | null;
    note?: string | null;
    status?: OrderStatus;
    order_type?: OrderType;
    payment_method?: PaymentMethod | null;
    discount_type?: DiscountType;
    discount_value?: number;
    discount_amount?: number;
    items?: OrderItemFromApi[];
    paid_at?: string | null;
  };
}

export interface InvoicePaymentPayload {
  payment_method?: PaymentMethod | string;
  method?: PaymentMethod | string;
  amount: number;
  reference_number?: string;
  entity_type?: "customer" | "employee" | "supplier";
  entity_id?: number;
  subledger_type?: "customer" | "employee" | "supplier";
  subledger_id?: number;
}

export interface CloseOrderWithPaymentsPayload extends InvoicePayload {
  payments: InvoicePaymentPayload[];
}

export interface InvoicePaymentResponse {
  id: number;
  invoice_id: number;
  amount: number;
  payment_method: string;
  method?: string;
  reference_number?: string;
  entity_type?: "customer" | "employee" | "supplier" | null;
  entity_id?: number | null;
  subledger_type?: "customer" | "employee" | "supplier" | null;
  subledger_id?: number | null;
  created_at: string;
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
  tax_rate?: number;
  tax_amount?: number;
  is_printed_direct?: boolean;
  is_takeaway?: boolean;
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
  engine_discount_amount?: number;
  total_discount?: number;
  grand_total?: number;
  customer_id?: number;
  employee_id?: number;
  supplier_id?: number;
  total: number;
  payment_method: PaymentMethod | null;
  reference_number: string | null;
  paid_at: string | null;
  items: OrderItemFromApi[];
  tickets: ProductionTicketFromApi[];
  payments?: InvoicePaymentResponse[];
  cashier?: { id: number; name: string };
  has_unsent_items?: boolean;
  created_at: string;
  updated_at: string;
}

// ── الخدمة الرئيسية ───────────────────────────────────────────────────────────

export const orderService = {
  getAll: async (filters?: OrderQueryFilters): Promise<OrderFromApi[]> => {
    const { data } = await api.get("/orders", { params: filters });
    return unwrapOrderList(data.data);
  },

  getOne: async (id: number): Promise<OrderFromApi> => {
    const { data } = await api.get(`/orders/${id}`);
    return data.data as OrderFromApi;
  },

  getActiveByTableNumber: async (
    tableNumber: string | number,
    filters?: Omit<OrderQueryFilters, "table_number" | "status">,
  ): Promise<OrderFromApi | null> => {
    const normalizedTable = normalizeTableNumber(tableNumber);
    if (!normalizedTable) return null;

    const orders = await orderService.getAll({
      ...filters,
      table_number: normalizedTable,
    });

    return (
      orders
        .filter(
          (order) =>
            normalizeTableNumber(order.table_number) === normalizedTable &&
            !CLOSED_ORDER_STATUSES.has(order.status),
        )
        .sort((a, b) => {
          const aTime = Date.parse(a.updated_at || a.created_at);
          const bTime = Date.parse(b.updated_at || b.created_at);
          return bTime - aTime || b.id - a.id;
        })[0] ?? null
    );
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

  /** مزامنة سياق التسعير وإعادة حساب المجاميع (خصم المحرك + يدوي) */
  syncPricing: async (
    id: number,
    payload: Partial<{
      customer_id?: number;
      employee_id?: number;
      supplier_id?: number;
      discount_value?: number;
      discount_type?: DiscountType;
      customer_name?: string;
      customer_phone?: string;
      note?: string;
    }>,
  ): Promise<OrderFromApi> => {
    const { data } = await api.post(`/orders/${id}/sync-pricing`, payload);
    return data.data as OrderFromApi;
  },

  /** إنشاء فاتورة رسمية من الطلب */
  createInvoiceFromOrder: async (
    orderId: number,
    payload?: InvoicePayload,
  ): Promise<InvoiceFromApi> => {
    const body = payload ?? {};
    console.log(`[API] POST /orders/${orderId}/invoice`, JSON.stringify(body));
    try {
      const { data } = await api.post(
        `/orders/${orderId}/invoice`,
        body,
      );
      return data.data as InvoiceFromApi;
    } catch (err: any) {
      console.error(`[API] POST /orders/${orderId}/invoice FAILED`, {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      throw err;
    }
  },

  getInvoices: async (params?: {
    id?: number;
    branch_id?: number;
    order_id?: number;
    status?: string;
    from?: string;
    to?: string;
    search?: string;
  }): Promise<InvoiceFromApi[]> => {
    const { data } = await api.get("/invoices", { params });
    return unwrapInvoiceList(data.data ?? data);
  },

  getInvoice: async (id: number): Promise<InvoiceFromApi | null> => {
    try {
      const { data } = await api.get(`/invoices/${id}`);
      const invoice = unwrapInvoice(data);
      if (invoice) return invoice;
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response
        ?.status;
      if (status && status !== 404 && status !== 405) {
        throw error;
      }
    }

    const invoices = await orderService.getInvoices({
      id,
      search: String(id),
    });
    return (
      invoices.find((invoice) => Number(invoice.id) === Number(id)) ?? null
    );
  },

  /** إضافة دفعة إلى فاتورة موجودة */
  addPaymentToInvoice: async (
    invoiceId: number,
    payload: InvoicePaymentPayload,
  ): Promise<InvoicePaymentResponse> => {
    // إذا كان هناك entity_type، method = 'account' (لأن ENUM يقبل فقط: cash,card,bank,wallet,account,mixed)
    const isEntityPayment = !!(payload.entity_type || payload.subledger_type);
    const method = isEntityPayment
      ? "account"
      : normalizePaymentMethod(payload.method ?? payload.payment_method);
    if (!method) {
      throw new Error("طريقة الدفع مطلوبة");
    }
    logSettlementPayload(
      "orderService.addPaymentToInvoice",
      payload as Record<string, unknown>,
    );
    const paymentBody = {
      ...payload,
      method,
      payment_method: method,
      amount: normalizeMoney(payload.amount),
      reference_number: payload.reference_number?.trim() || undefined,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      subledger_type: payload.subledger_type,
      subledger_id: payload.subledger_id,
    };
    console.log(`[API] POST /invoices/${invoiceId}/payments`, JSON.stringify(paymentBody));
    const { data } = await api.post(`/invoices/${invoiceId}/payments`, paymentBody);

    return data.data as InvoicePaymentResponse;
  },

  addPaymentsToInvoice: async (
    invoiceId: number,
    payments: InvoicePaymentPayload[],
  ): Promise<InvoicePaymentResponse[]> => {
    const createdPayments: InvoicePaymentResponse[] = [];

    for (const payment of payments) {
      createdPayments.push(
        await orderService.addPaymentToInvoice(invoiceId, payment),
      );
    }

    return createdPayments;
  },

  getInvoiceForOrder: async (orderId: number): Promise<InvoiceFromApi | null> => {
    const invoices = await orderService.getInvoices({ order_id: orderId });
    return (
      invoices.find(
        (invoice) => Number(invoice.order_id) === Number(orderId),
      ) ??
      invoices[0] ??
      null
    );
  },

  closeOrderWithPayments: async (
    orderId: number,
    payload: CloseOrderWithPaymentsPayload,
  ): Promise<OrderFromApi> => {
    let invoice: InvoiceFromApi;
    try {
      invoice = await orderService.createInvoiceFromOrder(orderId, {
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        customer_id: payload.customer_id,
        employee_id: payload.employee_id,
        supplier_id: payload.supplier_id,
        note: payload.note,
      });
    } catch (error) {
      if (!isExistingInvoiceError(error)) {
        throw error;
      }

      const existingInvoice =
        getInvoiceFromError(error) ??
        (await orderService.getInvoiceForOrder(orderId));
      if (!existingInvoice) {
        throw error;
      }
      invoice = existingInvoice;
    }

    const normalizedPayments = payload.payments
      .map((payment) => {
        const isEntityPayment = !!(
          payment.entity_type || payment.subledger_type
        );
        return {
          ...payment,
          method: isEntityPayment
            ? "account"
            : normalizePaymentMethod(payment.method ?? payment.payment_method),
          amount: normalizeMoney(payment.amount),
          reference_number: payment.reference_number?.trim() || undefined,
          entity_type: payment.entity_type,
          entity_id: payment.entity_id,
          subledger_type: payment.subledger_type,
          subledger_id: payment.subledger_id,
        };
      })
      .filter((payment) => payment.method && payment.amount > 0);

    logSettlementPayload("orderService.closeOrderWithPayments", {
      payments: normalizedPayments.map((payment) => ({
        entity_type: payment.entity_type ?? null,
        entity_id: payment.entity_id ?? null,
        subledger_type: payment.subledger_type ?? null,
        subledger_id: payment.subledger_id ?? null,
        method: payment.method,
        amount: payment.amount,
      })),
    } as Record<string, unknown>);

    if (payload.payments.length > 0 && normalizedPayments.length === 0) {
      throw new Error("طريقة الدفع المحددة غير مدعومة");
    }

    const invoiceTotal = normalizeMoney(Number(invoice.total || 0));
    const existingPaid = normalizeMoney(
      (invoice.payments ?? []).reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      ),
    );

    if (normalizedPayments.length > 0 && invoiceTotal > 0) {
      const newPaymentTotal = normalizeMoney(
        normalizedPayments.reduce((sum, p) => sum + p.amount, 0),
      );
      const expectedRemaining = normalizeMoney(invoiceTotal - existingPaid);
      if (Math.abs(newPaymentTotal - expectedRemaining) > 0.01) {
        throw new Error(
          newPaymentTotal < expectedRemaining
            ? `المبلغ المدفوع ناقص ${normalizeMoney(expectedRemaining - newPaymentTotal).toFixed(2)} ₪`
            : `المبلغ المدفوع زائد ${normalizeMoney(newPaymentTotal - expectedRemaining).toFixed(2)} ₪`,
        );
      }
    }

    let remainingAmount =
      invoiceTotal > 0
        ? Math.max(0, normalizeMoney(invoiceTotal - existingPaid))
        : 0;

    for (const payment of normalizedPayments) {
      if (invoiceTotal > 0 && remainingAmount <= 0) break;

      const amount =
        invoiceTotal > 0 && existingPaid > 0
          ? Math.min(payment.amount, remainingAmount)
          : payment.amount;

      if (amount <= 0) continue;

      await orderService.addPaymentToInvoice(invoice.id, {
        ...payment,
        amount,
      });
      remainingAmount = normalizeMoney(remainingAmount - amount);
    }

    const primaryPaymentMethod = normalizedPayments[0]?.method;

    let refreshedOrder = await orderService.getOne(orderId);

    if (primaryPaymentMethod) {
      try {
        const { data } = await api.put(`/orders/${orderId}`, {
          payment_method: primaryPaymentMethod,
          status: "paid",
        });
        refreshedOrder = data.data as OrderFromApi;
      } catch {
        try {
          await api.put(`/orders/${orderId}`, {
            payment_method: primaryPaymentMethod,
          });
          refreshedOrder = await orderService.getOne(orderId);
        } catch {
          // Some APIs mark the order paid from the invoice payment endpoint and
          // reject direct edits after confirmation.
        }
      }
    }

    return refreshedOrder;
  },

  /** قسم الفاتورة للطباعة */
  getPrintSections: async (orderId: number): Promise<unknown> => {
    const { data } = await api.get(`/orders/${orderId}/print-sections`);
    return data.data;
  },

  /** إضافة صنف جديد لطلب موجود */
  addOrderItem: async (
    orderId: number,
    payload: OrderItemPayload,
  ): Promise<OrderItemFromApi> => {
    const { data } = await api.post(`/orders/${orderId}/items`, payload);
    return data.data as OrderItemFromApi;
  },

  /** إزالة صنف من طلب */
  removeOrderItem: async (
    orderId: number,
    orderItemId: number,
  ): Promise<void> => {
    await api.delete(`/orders/${orderId}/items/${orderItemId}`);
  },

  /**
   * إغلاق الطلب ماليًا عبر SettlementEngine
   * يدعم المدفوعات المختلطة والمحفظة والتحويلات
   */
  pay: async (id: number, payload: PayOrderPayload): Promise<OrderFromApi> => {
    const entityDrivenMethod = payload.entity_type ?? payload.subledger_type;
    const method =
      entityDrivenMethod ??
      normalizePaymentMethod(payload.method ?? payload.payment_method);
    if (!method) {
      throw new Error("طريقة الدفع مطلوبة");
    }
    const paymentMethodId = await resolvePaymentMethodIdToDbId(method);
    logSettlementPayload("orderService.pay", {
      ...payload,
      method,
      payment_method: method,
    } as Record<string, unknown>);
    const { data } = await api.post(`/orders/${id}/settle`, {
      payments: [
        {
          payment_method_id: paymentMethodId,
          amount: normalizeMoney(payload.amount),
          reference_number: payload.reference_number?.trim() || undefined,
          entity_type: payload.entity_type,
          entity_id: payload.entity_id,
          subledger_type: payload.subledger_type,
          subledger_id: payload.subledger_id,
        },
      ],
    });
    return data.data?.order || data.data;
  },

  transferClosedOrderToSales: async (
    order: OrderFromApi,
  ): Promise<AccountingTransaction> => {
    // Use SettlementEngine on backend - no hardcoded account IDs
    const firstPayment = order.payments?.[0];
    const method =
      firstPayment?.entity_type ??
      firstPayment?.subledger_type ??
      normalizePaymentMethod(order.payment_method) ??
      "cash";
    const paymentMethodId = await resolvePaymentMethodIdToDbId(method);
    logSettlementPayload("orderService.transferClosedOrderToSales", {
      method,
      payment_method: method,
      entity_type: firstPayment?.entity_type,
      entity_id: firstPayment?.entity_id,
      subledger_type: firstPayment?.subledger_type,
      subledger_id: firstPayment?.subledger_id,
    } as Record<string, unknown>);
    const { data } = await api.post(`/orders/${order.id}/settle`, {
      payments: [
        {
          payment_method_id: paymentMethodId,
          amount: order.total,
          entity_type: firstPayment?.entity_type,
          entity_id: firstPayment?.entity_id,
          subledger_type: firstPayment?.subledger_type,
          subledger_id: firstPayment?.subledger_id,
        },
      ],
    });
    return data.data?.transaction || data.data;
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

  /**
   * إنشاء قيد محاسبي — تم تحديثه لاستخدام SettlementEngine
   * بدلاً من الأكواد الثابتة للحسابات
   */
  createJournalEntryFromInvoice: async (
    invoiceId: number,
    orderId: number,
    amount: number,
    paymentMethod: PaymentMethod,
    description?: string,
    subledger?: {
      entity_type?: "customer" | "employee" | "supplier";
      entity_id?: number;
      subledger_type?: "customer" | "employee" | "supplier";
      subledger_id?: number;
    },
  ): Promise<AccountingTransaction> => {
    // Delegated to backend SettlementEngine
    const method =
      subledger?.entity_type ??
      subledger?.subledger_type ??
      normalizePaymentMethod(paymentMethod) ??
      "cash";
    const paymentMethodId = await resolvePaymentMethodIdToDbId(method);
    logSettlementPayload("orderService.createJournalEntryFromInvoice", {
      invoiceId,
      orderId,
      amount,
      method,
      ...subledger,
    } as Record<string, unknown>);
    const { data } = await api.post(`/orders/${orderId}/settle`, {
      payments: [
        {
          payment_method_id: paymentMethodId,
          amount: amount,
          entity_type: subledger?.entity_type,
          entity_id: subledger?.entity_id,
          subledger_type: subledger?.subledger_type,
          subledger_id: subledger?.subledger_id,
        },
      ],
    });
    return data.data?.transaction || data.data;
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

  deferOrder: async (id: number): Promise<OrderFromApi> => {
    const { data } = await api.post(`/orders/${id}/defer`);
    return data.data as OrderFromApi;
  },

  transferOrder: async (orderId: number, newTableNumber: string): Promise<OrderFromApi> => {
    const { data } = await api.post(`/orders/${orderId}/transfer`, { table_number: newTableNumber });
    return data.data as OrderFromApi;
  },

  getDeferredOrders: async (branchId?: number): Promise<OrderFromApi[]> => {
    const params: Record<string, any> = { status: "pending_payment" };
    if (branchId && Number.isFinite(branchId)) {
      params.branch_id = branchId;
    }
    const { data } = await api.get("/orders", { params });
    return (data.data ?? data) as OrderFromApi[];
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
