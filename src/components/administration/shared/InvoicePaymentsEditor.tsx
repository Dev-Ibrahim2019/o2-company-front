import { memo, useMemo } from "react";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Landmark,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import type { PaymentMethod } from "../../../services/orderService";
import {
  createPaymentDraft,
  formatMoney,
  PAYMENT_METHOD_OPTIONS,
  paymentDifference,
  roundMoney,
  summarizePaymentDraftsByMethod,
  sumPaymentDrafts,
  type PaymentDraft,
} from "./invoicePayments";

type InvoicePaymentsEditorProps = {
  payments: PaymentDraft[];
  targetAmount: number;
  onChange: (payments: PaymentDraft[]) => void;
  disabled?: boolean;
  title?: string;
  addLabel?: string;
  differenceLabel?: string;
};

const methodIcons: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote,
  credit_card: CreditCard,
  wallet: Wallet,
  bank_transfer: Landmark,
};

const methodClassNames: Record<PaymentMethod, string> = {
  cash: "text-emerald-400",
  credit_card: "text-blue-400",
  wallet: "text-cyan-400",
  bank_transfer: "text-amber-400",
};

const methodLabel = (method: PaymentMethod) =>
  PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ??
  method;

export const InvoicePaymentsEditor = memo(
  ({
    payments,
    targetAmount,
    onChange,
    disabled = false,
    title = "توزيع الدفع",
    addLabel = "إضافة طريقة",
    differenceLabel = "الفرق",
  }: InvoicePaymentsEditorProps) => {
    const paidTotal = useMemo(() => sumPaymentDrafts(payments), [payments]);
    const difference = useMemo(
      () => paymentDifference(targetAmount, payments),
      [targetAmount, payments],
    );
    const isBalanced = Math.abs(difference) <= 0.01;
    const breakdown = useMemo(
      () => summarizePaymentDraftsByMethod(payments),
      [payments],
    );

    const updatePayment = (
      id: string,
      changes: Partial<Omit<PaymentDraft, "id">>,
    ) => {
      onChange(
        payments.map((payment) =>
          payment.id === id ? { ...payment, ...changes } : payment,
        ),
      );
    };

    const removePayment = (id: string) => {
      if (payments.length <= 1) return;
      onChange(payments.filter((payment) => payment.id !== id));
    };

    const addPayment = () => {
      const remaining = Math.max(0, roundMoney(targetAmount - paidTotal));
      onChange([...payments, createPaymentDraft(remaining)]);
    };

    return (
      <section className="border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-white/5 bg-slate-950/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-white">{title}</h4>
            <p className="text-[10px] text-slate-500 font-bold">
              {formatMoney(paidTotal)} / {formatMoney(targetAmount)}
            </p>
          </div>
          <button
            type="button"
            onClick={addPayment}
            disabled={disabled}
            className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus size={14} />
            {addLabel}
          </button>
        </div>

        <div className="p-3 space-y-2">
          {payments.map((payment, index) => {
            const Icon = methodIcons[payment.method];
            return (
              <div
                key={payment.id}
                className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr_1.3fr_auto] gap-2 items-end"
              >
                <label className="space-y-1">
                  <span className="text-[10px] font-black text-slate-500">
                    طريقة الدفع
                  </span>
                  <div className="relative">
                    <Icon
                      size={15}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${methodClassNames[payment.method]}`}
                    />
                    <select
                      value={payment.method}
                      onChange={(event) =>
                        updatePayment(payment.id, {
                          method: event.target.value as PaymentMethod,
                        })
                      }
                      disabled={disabled}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl py-2 pr-9 pl-3 text-sm text-white outline-none disabled:opacity-60"
                    >
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black text-slate-500">
                    المبلغ
                  </span>
                  <input
                    value={payment.amount}
                    onChange={(event) =>
                      updatePayment(payment.id, { amount: event.target.value })
                    }
                    disabled={disabled}
                    inputMode="decimal"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none disabled:opacity-60"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black text-slate-500">
                    رقم مرجعي
                  </span>
                  <input
                    value={payment.reference}
                    onChange={(event) =>
                      updatePayment(payment.id, {
                        reference: event.target.value,
                      })
                    }
                    disabled={disabled}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none disabled:opacity-60"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => removePayment(payment.id)}
                  disabled={disabled || payments.length <= 1}
                  className="h-10 px-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white disabled:opacity-40"
                  title={`حذف الدفعة ${index + 1}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-white/5 bg-slate-950/20 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PAYMENT_METHOD_OPTIONS.map((option) => {
              const Icon = methodIcons[option.value];
              const amount = breakdown[option.value];
              if (amount <= 0) return null;
              return (
                <div
                  key={option.value}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-slate-900/60 px-3 py-2"
                >
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-400">
                    <Icon size={13} className={methodClassNames[option.value]} />
                    {methodLabel(option.value)}
                  </span>
                  <span className="text-[11px] font-black text-white">
                    {formatMoney(amount)}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className={`rounded-xl border px-3 py-2 text-xs font-black flex items-center justify-between gap-3 ${
              isBalanced
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/20 bg-amber-500/10 text-amber-300"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {isBalanced ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              {isBalanced ? "إجمالي الدفعات مطابق" : differenceLabel}
            </span>
            <span className="font-mono">{formatMoney(difference)}</span>
          </div>
        </div>
      </section>
    );
  },
);

InvoicePaymentsEditor.displayName = "InvoicePaymentsEditor";
