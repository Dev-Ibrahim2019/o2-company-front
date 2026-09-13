import api from "../api/axios";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

export interface InvoiceOverview {
  id: number;
  number: string;
  order_number: string | null;
  status: string;
  order_status: string | null;
  order_type: string | null;
  branch_id: number | null;
  branch_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  table_number: string | null;
  cashier_name: string | null;
  cashier_id: number | null;
  created_at: string | null;
  invoice_date: string | null;
  paid_at: string | null;
  subtotal: number;
  discount: number;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  notes: string | null;
  payment_method: string | null;
  discount_info: { has_discount: boolean; discount_type?: string; discount_value?: number; discount_apply_strategy?: string };
}

export interface InvoiceProduct {
  id: number;
  item_id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  original_price: number;
  final_price: number;
  subtotal: number;
  total: number;
  discount_amount: number;
  discount_percent: number;
  discount_id: number | null;
  discount_apply_strategy: string | null;
  discount_name: string | null;
  tax_rate: number;
  tax_amount: number;
  notes: string | null;
}

export interface InvoicePayment {
  id: number;
  number: string | null;
  method: string;
  amount: number;
  reference_number: string | null;
  paid_at: string | null;
  user_name: string | null;
  branch_name: string | null;
  notes: string | null;
  entity_type: string | null;
  entity_id: number | null;
}

export interface AccountingEntry {
  id: number;
  account_id: number;
  account_code: string | null;
  account_name: string | null;
  debit: number;
  credit: number;
  description: string | null;
  cost_center_name: string | null;
  subledger_type: string | null;
  subledger_id: number | null;
}

export interface InvoiceDiscount {
  item_name: string;
  item_id: number;
  quantity: number;
  unit_price: number;
  original_total: number;
  subtotal: number;
  total: number;
  discount_amount: number;
  discount_percent: number;
  discount_apply_strategy: string | null;
  discount_name: string | null;
  discount_id: number | null;
}

export interface InventoryMovement {
  item_id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_cost: number;
  movement: string;
  type: string;
}

export interface TimelineEvent {
  event: string;
  label: string;
  timestamp: string | null;
  user: string | null;
}

export interface InvoiceNote {
  source: string;
  note: string;
  created_at: string | null;
}

export const invoiceDetailsService = {
  getDetails: async (invoiceId: number) => {
    const { data } = await api.get(`/invoices/${invoiceId}/details`);
    return data.data as InvoiceOverview;
  },
  getProducts: async (invoiceId: number) => {
    const { data } = await api.get(`/invoices/${invoiceId}/products`);
    return data.data as { items: InvoiceProduct[]; total_items: number; subtotal: number; total_discount: number; grand_total: number; tax_total: number };
  },
  getPayments: async (invoiceId: number) => {
    const { data } = await api.get(`/invoices/${invoiceId}/payments`);
    return data.data as { payments: InvoicePayment[]; total_paid: number; payment_count: number };
  },
  getAccounting: async (invoiceId: number) => {
    const { data } = await api.get(`/invoices/${invoiceId}/accounting`);
    return data.data as { entries: AccountingEntry[]; transaction_id: number; transaction_number: string; transaction_date: string; status: string; user_name: string | null; branch_name: string | null; posted_at: string | null; total_debit: number; total_credit: number };
  },
  getDiscounts: async (invoiceId: number) => {
    const { data } = await api.get(`/invoices/${invoiceId}/discounts`);
    return data.data as { discounts: InvoiceDiscount[]; total_item_discount: number; total_invoice_discount: number; total_discount: number; discount_count: number };
  },
  getInventory: async (invoiceId: number) => {
    const { data } = await api.get(`/invoices/${invoiceId}/inventory`);
    return data.data as { movements: InventoryMovement[]; total_qty: number };
  },
  getTimeline: async (invoiceId: number) => {
    const { data } = await api.get(`/invoices/${invoiceId}/timeline`);
    return data.data as { events: TimelineEvent[] };
  },
  getAttachments: async (invoiceId: number) => {
    const { data } = await api.get(`/invoices/${invoiceId}/attachments`);
    return data.data as { attachments: any[] };
  },
  getNotes: async (invoiceId: number) => {
    const { data } = await api.get(`/invoices/${invoiceId}/notes`);
    return data.data as { notes: InvoiceNote[] };
  },

  getInvoiceIdByOrder: async (orderId: number) => {
    const { data } = await api.get(`/orders/${orderId}/invoice-id`);
    return data.data as { invoice_id: number | null; invoice_number: string | null };
  },

  batchInvoiceIds: async (orderIds: number[]) => {
    const { data } = await api.post(`/orders/batch-invoice-ids`, { order_ids: orderIds });
    return data.data.map as Record<number, { invoice_id: number; invoice_number: string }>;
  },
};
