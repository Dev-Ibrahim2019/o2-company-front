import api from "../api/axios";
import {
  orderService,
  type OrderFromApi,
  type PaymentMethod,
} from "./orderService";

export interface CallCenterPayment {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  entity_type?: "customer" | "employee" | "supplier";
  entity_id?: number;
  subledger_type?: "customer" | "employee" | "supplier";
  subledger_id?: number;
}

export interface CallCenterOrderPayload {
  branch_id: number;
  call_center_agent_id?: number;
  source: "call_center";
  order_type: "delivery" | "takeaway";
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_address_id?: number;
  delivery_address_snapshot?: Record<string, unknown>;
  delivery_zone_id?: number;
  delivery_fee?: number;
  delivery_notes?: string;
  note?: string;
  call_notes?: string;
  discount_value?: number;
  discount_type?: "amount" | "percent";
  items: Array<{
    item_id: number;
    quantity: number;
    unit_price: number;
    notes?: string;
  }>;
}

const roundMoney = (value: number) =>
  Math.round((Number(value) || 0) * 100) / 100;

export const callCenterOrderWorkflow = {
  async saveDraft(
    payload: CallCenterOrderPayload,
    existingOrderId?: number | null,
  ): Promise<OrderFromApi> {
    if (existingOrderId) {
      return orderService.update(existingOrderId, payload);
    }
    const response = await api.post("/orders", payload);
    return response.data.data as OrderFromApi;
  },

  async checkout(
    orderId: number,
    payments: CallCenterPayment[],
    customer: {
      id?: number;
      name?: string;
      phone?: string;
    },
  ): Promise<OrderFromApi> {
    const order = await orderService.getOne(orderId);
    const total = roundMoney(Number(order.total));
    const normalized = payments
      .map((payment) => ({
        ...payment,
        amount: roundMoney(payment.amount),
        reference: payment.reference?.trim() || undefined,
      }))
      .filter((payment) => payment.amount > 0);
    const paid = roundMoney(
      normalized.reduce((sum, payment) => sum + payment.amount, 0),
    );

    if (normalized.length === 0 || Math.abs(total - paid) > 0.01) {
      const difference = roundMoney(total - paid);
      throw new Error(
        difference > 0
          ? `المبلغ المدفوع ناقص ${difference.toFixed(2)} ₪`
          : `المبلغ المدفوع زائد ${Math.abs(difference).toFixed(2)} ₪`,
      );
    }

    const closed = await orderService.closeOrderWithPayments(orderId, {
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      payments: normalized.map((payment) => ({
        method: payment.method,
        payment_method: payment.method,
        amount: payment.amount,
        reference_number: payment.reference,
        entity_type: payment.entity_type,
        entity_id: payment.entity_id,
        subledger_type: payment.subledger_type,
        subledger_id: payment.subledger_id,
      })),
    });

    const paidOrder = await orderService.getOne(closed.id);
    if (paidOrder.status !== "paid") {
      throw new Error("لا يمكن إرسال الطلب للمطبخ قبل اكتمال الدفع");
    }

    return orderService.confirm(paidOrder.id);
  },
};
