import api from "../api/axios";
import {
  orderService,
  type OrderFromApi,
  type PaymentMethod,
} from "./orderService";
import { settlementService, type PaymentEntryDto } from "./settlementService";

// Cache for payment method type -> DB id (payment_method_id), same mapping
// SettlementEngine expects server-side — resolved once per session.
let paymentMethodIdCache: Record<string, number> | null = null;
async function resolvePaymentMethodId(method: string): Promise<number> {
  if (!paymentMethodIdCache) {
    const methods = await settlementService.getPaymentMethods();
    paymentMethodIdCache = {};
    for (const m of methods) paymentMethodIdCache[m.type] = m.id;
  }
  const id = paymentMethodIdCache[method];
  if (!id) throw new Error(`طريقة الدفع '${method}' غير موجودة في قاعدة البيانات.`);
  return id;
}

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

  // ملاحظة: الدفع يتم بنداء واحد ذري إلى /orders/{order}/settle (SettlementEngine)
  // بدل إنشاء الفاتورة ثم تسجيل كل دفعة بطلب منفصل — بحيث إذا فشل تسجيل أي
  // دفعة أو ربطها بالصندوق يتم التراجع عن العملية بالكامل (DB transaction واحدة
  // على الخادم)، والدفعة تُربط تلقائياً بالعميل وبصندوق الكول سنتر النشط
  // (المُحدَّد عبر جهاز الوكيل المُفعَّل، المرسل في هيدر X-Device-UUID).
  async checkout(
    orderId: number,
    payments: CallCenterPayment[],
    customer: {
      id?: number;
      name?: string;
      phone?: string;
    },
  ): Promise<OrderFromApi> {
    void customer; // العميل مرتبط بالطلب مسبقاً (customer_id) — السطر محفوظ لتوافق التوقيع الحالي
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

    const paymentEntries: PaymentEntryDto[] = await Promise.all(
      normalized.map(async (payment) => ({
        payment_method_id: await resolvePaymentMethodId(
          payment.entity_type ?? payment.subledger_type ?? payment.method,
        ),
        amount: payment.amount,
        reference_number: payment.reference,
        entity_type: payment.entity_type,
        entity_id: payment.entity_id,
        subledger_type: payment.subledger_type,
        subledger_id: payment.subledger_id,
      })),
    );

    const settled = await settlementService.settle(orderId, paymentEntries);
    if (settled.order.status !== "paid") {
      throw new Error("لا يمكن إرسال الطلب للمطبخ قبل اكتمال الدفع");
    }

    return orderService.confirm(settled.order.id);
  },
};
