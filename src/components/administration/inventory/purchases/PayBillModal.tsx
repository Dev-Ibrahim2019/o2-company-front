import React, { useState } from "react";
import { toast } from "../../../shared/Toast";
import { fmtMoney, purchaseErrorMessage, purchaseInvoiceService, type PurchaseBill } from "../../../../services/purchaseInvoiceService";
import { Field, Modal, PrimaryButton, SecondaryButton, inputClass } from "../ui";

/** تسديد (جزء من) المتبقي: الخادم يسجّل قيد الدفع وسند صرف مورّد مربوطاً بالفاتورة. */
export const PayBillModal: React.FC<{
  bill: PurchaseBill;
  cashAccounts: { id: number; name: string; code?: string }[];
  onClose: () => void;
  onPaid: (bill: PurchaseBill) => void;
}> = ({ bill, cashAccounts, onClose, onPaid }) => {
  const [amount, setAmount] = useState(String(bill.remaining));
  const [accountId, setAccountId] = useState<number | "">(bill.cash_account_id ?? cashAccounts[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const value = Number(amount);
  const valid = value > 0 && value <= bill.remaining + 1e-9 && accountId !== "";

  const submit = async () => {
    if (!valid || typeof accountId !== "number") return;
    setSaving(true);
    try {
      const updated = await purchaseInvoiceService.pay(bill.id, { amount: value, cash_account_id: accountId, date: date || null });
      toast.success(`تم تسديد ${fmtMoney(value)} على ${bill.bill_number}`);
      onPaid(updated);
    } catch (e) {
      toast.error("تعذّر التسديد", purchaseErrorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`تسديد ${bill.bill_number} — ${bill.supplier?.name ?? ""}`}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>إلغاء</SecondaryButton>
          <PrimaryButton onClick={submit} loading={saving} disabled={!valid || saving}>
            تسديد وإصدار سند صرف
          </PrimaryButton>
        </>
      }
    >
      <p className="text-sm text-slate-400 font-bold">
        المتبقي على المورّد: <span className="text-white tabular-nums">{fmtMoney(bill.remaining)} {bill.currency}</span>
      </p>
      <Field label="المبلغ" required hint={value > bill.remaining + 1e-9 ? "أكبر من المتبقي." : undefined}>
        <input className={inputClass} type="number" min={0} step="any" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
      </Field>
      <Field label="من صندوق / حساب بنكي" required>
        <select className={inputClass} value={accountId} onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">— اختر —</option>
          {cashAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} {a.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="التاريخ" hint="فارغ = اليوم المحاسبي.">
        <input className={inputClass} type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
    </Modal>
  );
};
