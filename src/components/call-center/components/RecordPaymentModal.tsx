import React, { useState } from "react";
import { X, Loader2, CreditCard, Wallet, Banknote, Landmark, FileText } from "lucide-react";
import { colors, typography, radius, shadows } from "../design/tokens";
import { orderService, type OrderFromApi, type PaymentMethod } from "../../../services/orderService";
import { toast } from "../../shared/Toast";
import { formatShekel, PAYMENT_METHOD_LABELS } from "../activeOrdersView";

// نافذة "تسجيل الدفع" — تُستخدم من صفحة تفاصيل الطلب وأيضًا من داخل معاينة الفاتورة (نفس
// المكون، مصدر واحد للمنطق). تُنشئ الفاتورة عند الحاجة (لو لسا ما انعملت) ثم تسجّل الدفعة عليها؛
// الباك اند وحده هو من يقرر حالة الفاتورة/الطلب النهائية (paid/partial) — إحنا فقط نرسل المبلغ.

const METHOD_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote size={16} />,
  card: <CreditCard size={16} />,
  wallet: <Wallet size={16} />,
  bank: <Landmark size={16} />,
  account: <FileText size={16} />,
};

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "wallet", "bank", "account"];

export const RecordPaymentModal: React.FC<{
  order: OrderFromApi;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ order, onClose, onSuccess }) => {
  const invoice = order.invoice;
  const suggestedAmount = invoice?.remaining_amount ?? invoice?.total ?? order.total;

  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState<number>(Math.max(0, suggestedAmount || 0));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const confirm = async () => {
    if (!amount || amount <= 0) {
      toast.error("أدخل مبلغًا صحيحًا");
      return;
    }
    setSubmitting(true);
    try {
      let currentInvoice = invoice;
      if (!currentInvoice) {
        currentInvoice = await orderService.createInvoiceFromOrder(order.id, {
          customer_name: order.customer_name || undefined,
          customer_phone: order.customer_phone || undefined,
        });
      }

      const remaining = currentInvoice.remaining_amount ?? currentInvoice.total;
      const amountToCharge = Math.min(amount, remaining);
      if (amountToCharge <= 0) {
        toast.error("لا يوجد مبلغ متبقٍ لتحصيله على هذا الطلب");
        setSubmitting(false);
        return;
      }

      await orderService.addPaymentToInvoice(currentInvoice.id, {
        method,
        amount: amountToCharge,
        notes: note.trim() || undefined,
      });

      toast.success(
        "تم تسجيل الدفعة بنجاح",
        amountToCharge < amount
          ? `تم تحصيل ${formatShekel(amountToCharge)} فقط (المتبقي الفعلي على الطلب)`
          : undefined
      );
      onSuccess();
    } catch (err: any) {
      toast.error("فشل تسجيل الدفعة", err?.response?.data?.message || err?.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        dir="rtl"
        style={{
          width: "100%", maxWidth: 420,
          background: colors.neutral[0], borderRadius: radius.xl,
          boxShadow: shadows["2xl"], overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.border.subtle}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
            تسجيل الدفع
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: colors.neutral[400] }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* طريقة الدفع */}
          <div>
            <label style={{ display: "block", fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.neutral[500], marginBottom: 8 }}>
              طريقة الدفع
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "10px 6px", borderRadius: radius.lg,
                    border: `1.5px solid ${method === m ? colors.brand[500] : colors.border.subtle}`,
                    background: method === m ? `color-mix(in srgb, ${colors.brand[500]} 8%, transparent)` : colors.neutral[0],
                    color: method === m ? colors.brand[600] : colors.neutral[600],
                    cursor: "pointer", fontSize: typography.size.xs, fontWeight: typography.weight.semibold,
                  }}
                >
                  {METHOD_ICONS[m]}
                  {PAYMENT_METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* المبلغ */}
          <div>
            <label style={{ display: "block", fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.neutral[500], marginBottom: 8 }}>
              المبلغ المدفوع
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                min={0}
                step={0.01}
                value={amount || ""}
                onChange={e => setAmount(Number(e.target.value))}
                style={{
                  width: "100%", height: 44, padding: "0 44px 0 12px", borderRadius: radius.lg,
                  border: `1px solid ${colors.border.default}`, fontSize: typography.size.lg,
                  fontWeight: typography.weight.bold, outline: "none", color: colors.neutral[900],
                }}
              />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: colors.neutral[400], fontSize: typography.size.sm }}>
                ₪
              </span>
            </div>
            <p style={{ fontSize: "11px", color: colors.neutral[400], marginTop: 6 }}>
              الإجمالي المستحق: {formatShekel(suggestedAmount || 0)}
              {invoice?.status === "partial" ? " (متبقٍ بعد دفعات سابقة)" : ""} — يمكنك تعديل المبلغ لدعم الدفع الجزئي.
            </p>
          </div>

          {/* ملاحظة */}
          <div>
            <label style={{ display: "block", fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.neutral[500], marginBottom: 8 }}>
              ملاحظة (اختياري)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="مثال: دفعة عبر تطبيق..."
              style={{
                width: "100%", padding: "10px 12px", borderRadius: radius.lg,
                border: `1px solid ${colors.border.default}`, fontSize: typography.size.sm,
                outline: "none", resize: "vertical", fontFamily: typography.fontFamily.sans,
              }}
            />
          </div>
        </div>

        <div style={{ padding: "14px 20px", borderTop: `1px solid ${colors.border.subtle}`, display: "flex", gap: 8 }}>
          <button onClick={onClose} disabled={submitting} style={{
            flex: 1, padding: "10px 14px", borderRadius: radius.lg,
            background: colors.neutral[100], border: `1px solid ${colors.border.subtle}`,
            color: colors.neutral[600], fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
            cursor: submitting ? "not-allowed" : "pointer",
          }}>
            إلغاء
          </button>
          <button onClick={confirm} disabled={submitting} style={{
            flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "10px 14px", borderRadius: radius.lg,
            background: colors.brand[500], color: "#fff", border: "none",
            fontSize: typography.size.sm, fontWeight: typography.weight.bold,
            cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1,
          }}>
            {submitting && <Loader2 size={14} className="animate-spin" />}
            تأكيد الدفع
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
