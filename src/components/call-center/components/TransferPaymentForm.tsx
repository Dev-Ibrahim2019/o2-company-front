import React, { useEffect, useId, useMemo, useState } from "react";
import { AlertTriangle, Landmark, Loader2 } from "lucide-react";
import { colors, typography, radius } from "../design/tokens";
import { toast } from "../../shared/Toast";
import { settlementService, type PaymentMethodDto } from "../../../services/settlementService";
import { callCenterService, type OrderDetail } from "../services/callCenterService";
import { formatShekel } from "../activeOrdersView";
import { MAX_RECEIPT_BYTES, amountMismatch, todayDateInput, transferIdempotencyKey } from "../orderDrawerView";

// دفع بحوالة بنكية برقم مرجعي: المرجع والطريقة (البنك) والمبلغ إلزاميين، والتاريخ واسم البنك وصورة الإشعار
// اختيارية. تكرار المرجع بيرفضه الباك اند (409) برسالة بتقول أي طلب استخدمه — بنعرضها تحت الحقل مباشرة.
// إعادة الإرسال بنفس البيانات آمنة: مفتاح الـidempotency حتمي (راجع transferIdempotencyKey).
//
// الفاتورة بتنشأ بالباك اند جوّا نفس transaction الدفع (بعد فحص الرقم المرجعي) — مش من هون بطلب منفصل.
// قبل هيك محاولة فاشلة (مرجع مكرر) كانت تخلّي فاتورة محفوظة بينما order.invoice بالواجهة لسا null،
// فالمحاولة الجاية كانت تفشل بـ"يوجد فاتورة مسبقة لهذا الطلب" لحد ما تعيد تحميل الصفحة.

const inputStyle = (invalid = false): React.CSSProperties => ({
  width: "100%", height: 40, padding: "0 12px", borderRadius: radius.md, fontSize: typography.size.sm,
  background: colors.neutral[0], color: colors.neutral[900], fontFamily: "inherit",
  border: `1px solid ${invalid ? colors.semantic.error : colors.border.default}`,
});
const labelStyle: React.CSSProperties = { fontSize: "12px", fontWeight: typography.weight.semibold, color: colors.neutral[600] };

export const TransferPaymentForm: React.FC<{
  order: OrderDetail;
  onPaid: () => void;
  onCancel: () => void;
  /** بعد محاولة فاشلة — الأم بتعيد جلب الطلب عشان المتبقي/الفاتورة يكونوا محدّثين للمحاولة الجاية */
  onFailed?: () => void;
}> = ({ order, onPaid, onCancel, onFailed }) => {
  const uid = useId();
  const remaining = order.invoice?.remaining_amount ?? order.invoice?.total ?? order.total;

  const [methods, setMethods] = useState<PaymentMethodDto[] | null>(null);
  const [methodId, setMethodId] = useState<number | "">("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState(String(remaining));
  const [bankName, setBankName] = useState("");
  const [transferredAt, setTransferredAt] = useState(todayDateInput());
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    settlementService.getPaymentMethods()
      .then(rows => {
        if (cancelled) return;
        const usable = rows.filter(m => m.is_active && ["bank", "card", "wallet"].includes(m.type));
        setMethods(usable);
        setMethodId(usable.find(m => m.type === "bank")?.id ?? usable[0]?.id ?? "");
      })
      .catch(() => { if (!cancelled) { setMethods([]); setFormError("تعذر تحميل طرق الدفع"); } });
    return () => { cancelled = true; };
  }, []);

  const amountNumber = Number(amount);
  const mismatch = useMemo(() => amountNumber > 0 && amountMismatch(amountNumber, remaining), [amountNumber, remaining]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReferenceError(null);
    setFormError(null);

    if (!reference.trim()) { setReferenceError("الرقم المرجعي مطلوب"); return; }
    if (methodId === "") { setFormError("اختر طريقة الدفع (البنك)"); return; }
    if (!(amountNumber > 0)) { setFormError("أدخل مبلغًا صحيحًا"); return; }
    if (receipt && receipt.size > MAX_RECEIPT_BYTES) { setFormError("صورة الإشعار أكبر من 5MB"); return; }

    setBusy(true);
    try {
      const res = await callCenterService.confirmTransfer(order.id, {
        reference_number: reference.trim(),
        payment_method_id: Number(methodId),
        amount: amountNumber,
        idempotency_key: transferIdempotencyKey(order.id, reference, Number(methodId), amountNumber),
        bank_name: bankName.trim() || undefined,
        transferred_at: transferredAt || undefined,
        receipt,
      });
      toast.success("تم تسجيل الدفعة", res.message);
      (res.data?.warnings ?? []).forEach(w => toast.warning("تنبيه بالمبلغ", w));
      onPaid();
    } catch (err: any) {
      const message: string = err?.response?.data?.message || err?.message || "فشل تسجيل الدفعة";
      if (err?.response?.status === 409) setReferenceError(message);
      else setFormError(message);
      toast.error("فشل تسجيل الدفعة", message);
      onFailed?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12, borderRadius: radius.lg, background: colors.neutral[50], border: `1px solid ${colors.border.subtle}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: typography.weight.bold, fontSize: typography.size.sm, color: colors.neutral[800] }}>
        <Landmark size={16} aria-hidden /> دفع بحوالة بنكية — المتبقي {formatShekel(remaining)}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor={`${uid}-ref`} style={labelStyle}>الرقم المرجعي *</label>
        <input id={`${uid}-ref`} value={reference} onChange={e => { setReference(e.target.value); setReferenceError(null); }} dir="ltr" autoFocus
          aria-invalid={!!referenceError} aria-describedby={referenceError ? `${uid}-ref-err` : undefined} style={inputStyle(!!referenceError)} />
        {referenceError && <span id={`${uid}-ref-err`} role="alert" style={{ fontSize: "12px", color: colors.semantic.error }}>{referenceError}</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor={`${uid}-method`} style={labelStyle}>البنك / طريقة الدفع *</label>
        <select id={`${uid}-method`} value={methodId} onChange={e => setMethodId(e.target.value ? Number(e.target.value) : "")} disabled={methods === null} style={inputStyle()}>
          {methods === null && <option value="">جاري التحميل…</option>}
          {methods?.length === 0 && <option value="">لا توجد طرق دفع مفعّلة</option>}
          {methods?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor={`${uid}-amount`} style={labelStyle}>المبلغ *</label>
          <input id={`${uid}-amount`} type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} dir="ltr" style={inputStyle()} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor={`${uid}-date`} style={labelStyle}>تاريخ التحويل</label>
          <input id={`${uid}-date`} type="date" max={todayDateInput()} value={transferredAt} onChange={e => setTransferredAt(e.target.value)} style={inputStyle()} />
        </div>
      </div>

      {mismatch && (
        <div role="status" style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: "12px", padding: "8px 10px", borderRadius: radius.md, background: colors.semantic.warningBg, border: `1px solid ${colors.semantic.warningBorder}`, color: colors.neutral[800] }}>
          <AlertTriangle size={14} aria-hidden style={{ marginTop: 2, flexShrink: 0 }} />
          المبلغ المدخل ({formatShekel(amountNumber)}) لا يطابق المتبقي على الطلب ({formatShekel(remaining)}). بيتسجّل كما هو، تأكد منه.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor={`${uid}-bank`} style={labelStyle}>اسم البنك (اختياري)</label>
        <input id={`${uid}-bank`} value={bankName} onChange={e => setBankName(e.target.value)} maxLength={100} style={inputStyle()} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor={`${uid}-receipt`} style={labelStyle}>صورة إشعار التحويل (اختياري)</label>
        <input id={`${uid}-receipt`} type="file" accept="image/*" onChange={e => setReceipt(e.target.files?.[0] ?? null)} style={{ fontSize: "12px" }} />
      </div>

      {formError && <p role="alert" style={{ fontSize: "12px", color: colors.semantic.error }}>{formError}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={busy || methods === null} style={{ flex: 1, height: 40, borderRadius: radius.md, border: "none", background: colors.semantic.success, color: "#fff", fontWeight: typography.weight.bold, cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {busy && <Loader2 size={14} className="animate-spin" aria-hidden />} تأكيد الدفع
        </button>
        <button type="button" onClick={onCancel} disabled={busy} style={{ height: 40, padding: "0 16px", borderRadius: radius.md, border: `1px solid ${colors.border.default}`, background: colors.neutral[0], color: colors.neutral[700], cursor: "pointer" }}>
          إلغاء
        </button>
      </div>
    </form>
  );
};
