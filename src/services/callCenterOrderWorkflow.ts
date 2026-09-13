import api from "../api/axios";
import {
  orderService,
  type OrderFromApi,
  type PaymentMethod,
} from "./orderService";
import { settlementService } from "./settlementService";

export interface CallCenterPayment {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  entity_type?: "customer" | "employee" | "supplier";
  entity_id?: number;
  subledger_type?: "customer" | "employee" | "supplier";
  subledger_id?: number;
}

export type CallCenterExecutionOrder = OrderFromApi & {
  payment_policy?: "manual_confirmation" | "instant_debit" | "mixed";
  invoice_status?: string | null;
  paid_amount?: number;
  remaining_amount?: number;
  payment_status?: string | null;
  kitchen_release_status?: "held" | "releasing" | "released" | "release_failed";
  kitchen_released_at?: string | null;
  kitchen_released_by?: number | null;
};

export type CallCenterWorkflowErrorKind =
  | "duplicate_reference"
  | "idempotency_conflict"
  | "insufficient_balance"
  | "forbidden"
  | "validation"
  | "network"
  | "unknown";

export class CallCenterWorkflowError extends Error {
  constructor(
    message: string,
    public readonly kind: CallCenterWorkflowErrorKind,
    public readonly status?: number,
    public readonly availableBalance?: number,
  ) {
    super(message);
    this.name = "CallCenterWorkflowError";
  }

  get requiresNewIdempotencyKey() {
    return this.kind === "idempotency_conflict";
  }
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

const REFERENCE_METHODS = new Set<string>(["card", "wallet", "bank"]);
type PaymentLegAttempt = { key: string; succeeded: boolean };
type PaymentPlanAttempt = {
  signature: string;
  legs: PaymentLegAttempt[];
  lastResult?: CallCenterExecutionOrder;
  remainingAmount?: number;
};

const paymentAttempts = new Map<number, PaymentPlanAttempt>();

const generateIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "cc-payment-" + Date.now() + "-" + Math.random().toString(36).slice(2);
};

/** Start one distinct payment attempt. Keep this key in component state and reuse it on retries. */
export const beginCallCenterPaymentAttempt = (orderId: number) => {
  const key = generateIdempotencyKey();
  paymentAttempts.delete(orderId);
  return key;
};

export const clearCallCenterPaymentAttempt = (orderId: number) => {
  paymentAttempts.delete(orderId);
};

const paymentPlanSignature = (payments: CallCenterPayment[]) =>
  JSON.stringify(payments.map((payment) => ({
    method: payment.method,
    amount: payment.amount,
    reference: payment.reference ?? null,
    entity_type: payment.entity_type ?? null,
    entity_id: payment.entity_id ?? null,
  })));

const paymentPlanAttempt = (
  orderId: number,
  payments: CallCenterPayment[],
  providedKey?: string,
) => {
  const signature = paymentPlanSignature(payments);
  const current = paymentAttempts.get(orderId);
  if (current?.signature === signature && current.legs.length === payments.length) {
    return current;
  }

  const baseKey = providedKey?.trim();
  const attempt: PaymentPlanAttempt = {
    signature,
    legs: payments.map((_, index) => ({
      key: baseKey ? `${baseKey}-leg-${index + 1}` : generateIdempotencyKey(),
      succeeded: false,
    })),
  };
  paymentAttempts.set(orderId, attempt);
  return attempt;
};

const paymentAttemptKey = (orderId: number, provided?: string) => {
  const current = paymentAttempts.get(orderId);
  if (current?.legs[0]) return current.legs[0].key;
  const key = provided?.trim() || generateIdempotencyKey();
  paymentAttempts.set(orderId, {
    signature: "single-legacy-attempt",
    legs: [{ key, succeeded: false }],
  });
  return key;
};

type ApiFailure = {
  response?: {
    status?: number;
    data?: {
      message?: string;
      data?: { available_balance?: number };
      errors?: { available_balance?: number };
    };
  };
  message?: string;
};

const workflowError = (error: unknown): CallCenterWorkflowError => {
  const failure = error as ApiFailure;
  const status = failure.response?.status;
  const serverMessage = String(failure.response?.data?.message ?? failure.message ?? "");
  const normalized = serverMessage.toLowerCase();
  const available = Number(
    failure.response?.data?.data?.available_balance ??
      failure.response?.data?.errors?.available_balance,
  );
  const availableBalance = Number.isFinite(available) ? available : undefined;

  if (status === 409 && normalized.includes("idempotency")) {
    return new CallCenterWorkflowError(
      "بيانات العملية تغيّرت، أعد المحاولة من جديد.",
      "idempotency_conflict",
      status,
    );
  }
  if (status === 409) {
    return new CallCenterWorkflowError(
      "هذا المرجع مستخدم سابقًا، تحقق من الرقم.",
      "duplicate_reference",
      status,
    );
  }
  if (status === 422 && (normalized.includes("الرصيد") || normalized.includes("balance"))) {
    return new CallCenterWorkflowError(
      availableBalance === undefined
        ? "الرصيد غير كافٍ. يمكنك اختيار التحويل البنكي بدل الحساب."
        : "الرصيد المتاح " + availableBalance.toFixed(2) + ". يمكنك اختيار التحويل البنكي بدل الحساب.",
      "insufficient_balance",
      status,
      availableBalance,
    );
  }
  if (status === 422) {
    return new CallCenterWorkflowError(serverMessage || "بيانات الدفع غير صالحة.", "validation", status);
  }
  if (status === 403) {
    return new CallCenterWorkflowError(
      serverMessage || "ليست لديك صلاحية تنفيذ دفعة هذا الطلب.",
      "forbidden",
      status,
    );
  }
  if (!status) {
    return new CallCenterWorkflowError(
      "تعذر الاتصال بالخادم. أعد المحاولة؛ لن تتكرر الدفعة.",
      "network",
    );
  }
  return new CallCenterWorkflowError(serverMessage || "تعذر تنفيذ عملية الدفع.", "unknown", status);
};

const unwrapExecutionOrder = (payload: unknown) =>
  (payload as { data?: { data?: CallCenterExecutionOrder } })?.data?.data;

const executePaymentPlan = async (
  orderId: number,
  order: OrderFromApi,
  payments: CallCenterPayment[],
  providedKey?: string,
): Promise<CallCenterExecutionOrder> => {
  const attempt = paymentPlanAttempt(orderId, payments, providedKey);
  const needsMethods = payments.some(
    (payment, index) => !attempt.legs[index].succeeded && payment.method !== "account",
  );
  const methods = needsMethods ? await settlementService.getPaymentMethods() : [];

  for (let index = 0; index < payments.length; index += 1) {
    const payment = payments[index];
    const leg = attempt.legs[index];
    if (leg.succeeded) continue;

    try {
      let response;
      if (payment.method === "account") {
        if (!payment.entity_type || !payment.entity_id) {
          throw new CallCenterWorkflowError("اختر الجهة المرتبطة بالحساب.", "validation", 422);
        }
        response = await api.post(`/call-center/orders/${orderId}/debit-entity`, {
          entity_type: payment.entity_type,
          entity_id: payment.entity_id,
          amount: payment.amount,
          idempotency_key: leg.key,
        });
      } else {
        const methodType = String(payment.method);
        if (!REFERENCE_METHODS.has(methodType) || !payment.reference) {
          throw new CallCenterWorkflowError(
            "طريقة الدفع المختارة تحتاج رقمًا مرجعيًا صالحًا.",
            "validation",
            422,
          );
        }
        const method = methods.find((row) => row.is_active && row.type === methodType);
        if (!method) {
          throw new CallCenterWorkflowError("طريقة الدفع غير مفعلة.", "validation", 422);
        }
        response = await api.post(`/call-center/orders/${orderId}/confirm-transfer`, {
          reference_number: payment.reference,
          payment_method_id: method.id,
          amount: payment.amount,
          idempotency_key: leg.key,
        });
      }

      const execution = unwrapExecutionOrder(response);
      if (!execution) throw new Error("Invalid call-center execution response.");
      attempt.lastResult = { ...order, ...execution };
      const remainingBeforeLeg = attempt.remainingAmount ?? roundMoney(
        payments
          .filter((_, paymentIndex) => !attempt.legs[paymentIndex].succeeded)
          .reduce((sum, pendingPayment) => sum + pendingPayment.amount, 0),
      );
      const remainingAfterLeg = roundMoney(Number(execution.remaining_amount ?? 0));
      attempt.remainingAmount = remainingAfterLeg;
      // A financially committed final leg must be replayed with the same key when
      // the backend asks us to retry only the kitchen release phase.
      leg.succeeded =
        execution.kitchen_release_status !== "release_failed" &&
        remainingAfterLeg <= roundMoney(remainingBeforeLeg - payment.amount) + 0.01;
    } catch (error) {
      const mapped = error instanceof CallCenterWorkflowError ? error : workflowError(error);
      if (mapped.requiresNewIdempotencyKey) leg.key = generateIdempotencyKey();
      throw new CallCenterWorkflowError(
        `تعذر تنفيذ الدفعة رقم ${index + 1}: ${mapped.message}`,
        mapped.kind,
        mapped.status,
        mapped.availableBalance,
      );
    }
  }

  if (!attempt.lastResult) throw new Error("Payment plan completed without a response.");
  const result = attempt.lastResult;
  if (result.kitchen_release_status !== "release_failed") {
    clearCallCenterPaymentAttempt(orderId);
  }
  return result;
};

export const validateCallCenterPayments = (
  payments: CallCenterPayment[],
  expectedTotal: number,
): string[] => {
  const errors: string[] = [];
  if (!payments.length) return ["يجب إضافة دفعة واحدة على الأقل"];
  payments.forEach((payment, index) => {
    const row = index + 1;
    if (!Number.isFinite(payment.amount) || payment.amount <= 0)
      errors.push(`مبلغ الدفعة ${row} يجب أن يكون رقماً موجباً`);
    if (REFERENCE_METHODS.has(String(payment.method)) && !payment.reference?.trim())
      errors.push(`الرقم المرجعي مطلوب للدفعة ${row}`);
    const expectedEntity = payment.entity_type;
    if (String(payment.method) === "account") {
      if (
        !expectedEntity ||
        payment.subledger_type !== expectedEntity ||
        !Number.isInteger(payment.entity_id) ||
        !Number.isInteger(payment.subledger_id) ||
        payment.entity_id !== payment.subledger_id
      ) errors.push(`بيانات الجهة المالية غير مكتملة للدفعة ${row}`);
    } else if (
      payment.entity_type || payment.entity_id ||
      payment.subledger_type || payment.subledger_id
    ) errors.push(`لا تقبل الدفعة ${row} بيانات جهة مالية`);
  });
  const paid = roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
  if (Number.isFinite(paid) && Math.abs(roundMoney(expectedTotal) - paid) > 0.01)
    errors.push("يجب أن يساوي مجموع الدفعات إجمالي الطلب تماماً");
  return errors;
};

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
    _customer: {
      id?: number;
      name?: string;
      phone?: string;
    },
    idempotencyKey?: string,
  ): Promise<CallCenterExecutionOrder> {
    const order = await orderService.getOne(orderId);
    const total = roundMoney(Number(order.total));
    const validationErrors = validateCallCenterPayments(payments, total);
    if (validationErrors.length) {
      throw new CallCenterWorkflowError(validationErrors[0], "validation", 422);
    }
    const normalized = payments.map((payment) => ({
        ...payment,
        amount: roundMoney(payment.amount),
        reference: payment.reference?.trim() || undefined,
      }));
    const paid = roundMoney(
      normalized.reduce((sum, payment) => sum + payment.amount, 0),
    );

    if (normalized.length === 0 || Math.abs(total - paid) > 0.01) {
      const difference = roundMoney(total - paid);
      throw new CallCenterWorkflowError(
        difference > 0
          ? `المبلغ المدفوع ناقص ${difference.toFixed(2)} ₪`
          : `المبلغ المدفوع زائد ${Math.abs(difference).toFixed(2)} ₪`,
        "validation",
        422,
      );
    }

    if (normalized.length > 1) {
      return executePaymentPlan(orderId, order, normalized, idempotencyKey);
    }

    if (normalized.length !== 1) {
      throw new CallCenterWorkflowError(
        "يجب اختيار سياسة دفع واحدة للطلب.",
        "validation",
        422,
      );
    }

    const payment = normalized[0];
    const key = paymentAttemptKey(orderId, idempotencyKey);

    try {
      let response;
      if (payment.method === "account") {
        if (!payment.entity_type || !payment.entity_id) {
          throw new CallCenterWorkflowError("اختر الجهة المرتبطة بالحساب.", "validation", 422);
        }
        response = await api.post("/call-center/orders/" + orderId + "/debit-entity", {
          entity_type: payment.entity_type,
          entity_id: payment.entity_id,
          amount: payment.amount,
          idempotency_key: key,
        });
      } else {
        const methodType = String(payment.method);
        if (!REFERENCE_METHODS.has(methodType) || !payment.reference) {
          throw new CallCenterWorkflowError(
            "طريقة الدفع المختارة تحتاج رقمًا مرجعيًا صالحًا.",
            "validation",
            422,
          );
        }
        const methods = await settlementService.getPaymentMethods();
        const method = methods.find((row) => row.is_active && row.type === methodType);
        if (!method) {
          throw new CallCenterWorkflowError("طريقة الدفع غير مفعلة.", "validation", 422);
        }
        response = await api.post("/call-center/orders/" + orderId + "/confirm-transfer", {
          reference_number: payment.reference,
          payment_method_id: method.id,
          amount: payment.amount,
          idempotency_key: key,
        });
      }

      const execution = unwrapExecutionOrder(response);
      if (!execution) throw new Error("Invalid call-center execution response.");
      const result = { ...order, ...execution };
      if (result.kitchen_release_status !== "release_failed") {
        clearCallCenterPaymentAttempt(orderId);
      }
      return result;
    } catch (error) {
      if (error instanceof CallCenterWorkflowError) throw error;
      const mapped = workflowError(error);
      if (mapped.requiresNewIdempotencyKey) clearCallCenterPaymentAttempt(orderId);
      throw mapped;
    }
  },
};
