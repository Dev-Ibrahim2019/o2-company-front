import type {
  InvoicePaymentPayload,
  InvoicePaymentResponse,
  PaymentMethod,
} from "../../../services/orderService";

export type PaymentDraft = {
  id: string;
  method: PaymentMethod;
  amount: string;
  reference: string;
};

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] =
  [
    { value: "cash", label: "كاش" },
    { value: "credit_card", label: "بطاقة" },
    { value: "wallet", label: "محفظة" },
    { value: "bank_transfer", label: "بنك" },
  ];

let draftCounter = 0;

export const roundMoney = (value: number) =>
  Math.round((Number(value) || 0) * 100) / 100;

export const formatMoney = (value: number) =>
  `${roundMoney(value).toFixed(2)} ₪`;

export const createPaymentDraft = (
  amount = 0,
  method: PaymentMethod = "cash",
): PaymentDraft => {
  draftCounter += 1;
  return {
    id: `payment-${Date.now()}-${draftCounter}`,
    method,
    amount: amount > 0 ? roundMoney(amount).toFixed(2) : "",
    reference: "",
  };
};

export const draftsFromPayments = (
  payments: InvoicePaymentResponse[] | undefined,
): PaymentDraft[] =>
  (payments ?? []).map((payment, index) => ({
    id: `existing-payment-${payment.id ?? index}`,
    method: normalizePaymentMethod(payment.payment_method ?? payment.method),
    amount: roundMoney(Number(payment.amount || 0)).toFixed(2),
    reference: payment.reference_number ?? "",
  }));

export const normalizePaymentMethod = (
  value?: string | null,
): PaymentMethod => {
  const method = String(value ?? "").trim().toLowerCase();
  if (["credit_card", "card", "credit", "visa", "mastercard"].includes(method)) {
    return "credit_card";
  }
  if (method === "wallet") return "wallet";
  if (["bank_transfer", "bank", "transfer", "qr", "online"].includes(method)) {
    return "bank_transfer";
  }
  return "cash";
};

export const sumPaymentDrafts = (payments: PaymentDraft[]) =>
  roundMoney(
    payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
  );

export const paymentDifference = (
  targetAmount: number,
  payments: PaymentDraft[],
) => roundMoney(roundMoney(targetAmount) - sumPaymentDrafts(payments));

export const validatePaymentDrafts = (
  payments: PaymentDraft[],
  targetAmount: number,
  options?: { allowEmpty?: boolean },
) => {
  const total = roundMoney(targetAmount);
  const activePayments = payments.filter(
    (payment) => payment.amount.trim() !== "" || payment.reference.trim() !== "",
  );

  if (options?.allowEmpty && activePayments.length === 0) return null;

  if (total <= 0) {
    return "لا يمكن تسجيل دفعات لفاتورة قيمتها صفر";
  }

  if (activePayments.length === 0) {
    return "أضف طريقة دفع واحدة على الأقل";
  }

  const hasInvalidAmount = activePayments.some((payment) => {
    const amount = Number(payment.amount);
    return !Number.isFinite(amount) || amount <= 0;
  });

  if (hasInvalidAmount) {
    return "تأكد من أن كل مبالغ الدفع أكبر من صفر";
  }

  const difference = paymentDifference(total, activePayments);
  if (Math.abs(difference) > 0.01) {
    return `إجمالي الدفعات يجب أن يساوي إجمالي الفاتورة. الفرق الحالي ${formatMoney(
      difference,
    )}`;
  }

  return null;
};

export const paymentDraftsToPayloads = (
  payments: PaymentDraft[],
): InvoicePaymentPayload[] =>
  payments
    .map((payment) => ({
      method: payment.method,
      payment_method: payment.method,
      amount: roundMoney(Number(payment.amount || 0)),
      reference_number: payment.reference.trim() || undefined,
    }))
    .filter((payment) => payment.amount > 0);

export const getPrimaryPaymentMethod = (
  payments: PaymentDraft[],
  fallback: PaymentMethod = "cash",
) => payments.find((payment) => Number(payment.amount || 0) > 0)?.method ?? fallback;

export const summarizePaymentDraftsByMethod = (payments: PaymentDraft[]) =>
  payments.reduce<Record<PaymentMethod, number>>(
    (totals, payment) => {
      totals[payment.method] = roundMoney(
        totals[payment.method] + Number(payment.amount || 0),
      );
      return totals;
    },
    {
      cash: 0,
      credit_card: 0,
      wallet: 0,
      bank_transfer: 0,
    },
  );
