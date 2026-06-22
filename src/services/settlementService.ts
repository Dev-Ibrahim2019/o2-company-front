// src/services/settlementService.ts
// Settlement & Payment Routing Engine API client

import axios from "../api/axios";

export interface PaymentMethodDto {
  id: number;
  name: string;
  type:
    | "cash"
    | "bank"
    | "card"
    | "wallet"
    | "customer"
    | "employee"
    | "supplier";
  account: {
    id: number;
    code: string;
    name: string;
  } | null;
  is_active: boolean;
  is_entity: boolean;
}

export interface PaymentEntryDto {
  payment_method_id: number;
  amount: number;
  reference_number?: string;
  entity_type?: "customer" | "employee" | "supplier";
  entity_id?: number;
  subledger_type?: "customer" | "employee" | "supplier";
  subledger_id?: number;
}

export interface SettlementResult {
  order: any;
  transaction: {
    id: number;
    transaction_number: string;
    status: string;
    entries: Array<{
      account: { id: number; code: string; name: string };
      debit: number;
      credit: number;
      subledger: { type: string; id: number } | null;
    }>;
  };
}

export interface SettlementDetail {
  order: any;
  total: number;
  total_paid: number;
  payment_count: number;
  payments: Array<{
    id: number;
    method: string;
    method_type: string;
    account: string;
    amount: number;
    reference: string | null;
    entity_type: string | null;
    entity_id: number | null;
  }>;
  transaction: {
    id: number;
    transaction_number: string;
    entries: Array<{
      account: string;
      debit: number;
      credit: number;
      subledger: string | null;
    }>;
  } | null;
}

export const settlementService = {
  /**
   * Settle an order with one or more payment methods (mixed payment support).
   * POST /orders/{order}/settle
   */
  async settle(
    orderId: number,
    payments: PaymentEntryDto[],
  ): Promise<SettlementResult> {
    console.debug("settlementService.settle", {
      orderId,
      payments: payments.map((payment) => ({
        received_entity_type: payment.entity_type ?? null,
        received_entity_id: payment.entity_id ?? null,
        received_subledger_type: payment.subledger_type ?? null,
        received_subledger_id: payment.subledger_id ?? null,
        payment_method_id: payment.payment_method_id,
        amount: payment.amount,
      })),
    });
    const response = await axios.post(`/orders/${orderId}/settle`, {
      payments,
    });
    return response.data.data;
  },

  /**
   * Get settlement details for an order.
   * GET /orders/{order}/settlement
   */
  async getSettlement(orderId: number): Promise<SettlementDetail> {
    const response = await axios.get(`/orders/${orderId}/settlement`);
    return response.data.data;
  },

  /**
   * Get all active payment methods with their linked accounts.
   * GET /payment-methods
   */
  async getPaymentMethods(): Promise<PaymentMethodDto[]> {
    const response = await axios.get("/payment-methods");
    return response.data.data;
  },

  /**
   * Create a new payment method.
   * POST /payment-methods
   */
  async createPaymentMethod(data: {
    name: string;
    type: string;
    account_id: number;
    is_active?: boolean;
    sort_order?: number;
    description?: string;
  }): Promise<PaymentMethodDto> {
    const response = await axios.post("/payment-methods", data);
    return response.data.data;
  },

  /**
   * Update a payment method.
   * PUT /payment-methods/{id}
   */
  async updatePaymentMethod(
    id: number,
    data: Partial<{
      name: string;
      type: string;
      account_id: number;
      is_active: boolean;
      sort_order: number;
      description: string;
    }>,
  ): Promise<PaymentMethodDto> {
    const response = await axios.put(`/payment-methods/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete a payment method.
   * DELETE /payment-methods/{id}
   */
  async deletePaymentMethod(id: number): Promise<void> {
    await axios.delete(`/payment-methods/${id}`);
  },
};
