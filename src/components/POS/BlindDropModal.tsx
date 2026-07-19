import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Printer, CheckCircle2, DollarSign, CreditCard, Smartphone, Hash, Coins } from "lucide-react";

interface Denomination {
  label: string;
  value: number;
}

const DENOMINATIONS: Denomination[] = [
  { label: "₪200", value: 200 },
  { label: "₪100", value: 100 },
  { label: "₪50", value: 50 },
  { label: "₪20", value: 20 },
  { label: "₪10", value: 10 },
  { label: "₪5", value: 5 },
  { label: "₪2", value: 2 },
  { label: "₪1", value: 1 },
  { label: "₪0.50", value: 0.5 },
  { label: "₪0.10", value: 0.1 },
];

interface BlindDropModalProps {
  open: boolean;
  cashierName: string;
  onClose: () => void;
  onSubmit: (data: BlindDropData) => void;
  loading?: boolean;
}

export interface BlindDropData {
  denominations: { value: number; count: number }[];
  cardTotal: number;
  walletTotal: number;
}

export const BlindDropModal = ({ open, cashierName, onClose, onSubmit, loading }: BlindDropModalProps) => {
  const [counts, setCounts] = useState<number[]>(DENOMINATIONS.map(() => 0));
  const [cardTotal, setCardTotal] = useState("");
  const [walletTotal, setWalletTotal] = useState("");
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const cashTotal = useMemo(
    () => DENOMINATIONS.reduce((sum, d, i) => sum + d.value * (counts[i] || 0), 0),
    [counts],
  );

  const grandTotal = cashTotal + (Number(cardTotal) || 0) + (Number(walletTotal) || 0);

  const reset = useCallback(() => {
    setCounts(DENOMINATIONS.map(() => 0));
    setCardTotal("");
    setWalletTotal("");
    setSuccess(false);
  }, []);

  useEffect(() => {
    if (open) {
      reset();
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading && !success) onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !loading && !success) {
        handleSubmit();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, loading, success]);

  const updateCount = (index: number, val: string) => {
    const next = [...counts];
    next[index] = val === "" ? 0 : Math.max(0, parseInt(val) || 0);
    setCounts(next);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = index + 1;
      if (next < DENOMINATIONS.length) {
        inputRefs.current[next]?.focus();
        inputRefs.current[next]?.select();
      } else {
        // Move to card field
        const cardInput = document.getElementById("blind-card-total") as HTMLInputElement;
        cardInput?.focus();
        cardInput?.select();
      }
    }
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const walletInput = document.getElementById("blind-wallet-total") as HTMLInputElement;
      walletInput?.focus();
      walletInput?.select();
    }
  };

  const handleWalletKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (loading || success) return;
    const data: BlindDropData = {
      denominations: DENOMINATIONS.map((d, i) => ({ value: d.value, count: counts[i] })),
      cardTotal: Number(cardTotal) || 0,
      walletTotal: Number(walletTotal) || 0,
    };
    setSuccess(true);
    onSubmit(data);
  };

  const handlePrint = () => {
    const printContent = `
      <div dir="rtl" style="font-family: 'Cairo', sans-serif; text-align: center; padding: 20px;">
        <h2>إغلاق الوردية - إيصال تسليم</h2>
        <hr/>
        <p><strong>الكاشير:</strong> ${cashierName}</p>
        <p><strong>الوقت:</strong> ${new Date().toLocaleString("ar")}</p>
        <hr/>
        <h3>النقدية</h3>
        ${DENOMINATIONS.map((d, i) => `<p>${d.label}: ${counts[i]} × ${d.value.toFixed(2)} = ₪${(d.value * counts[i]).toFixed(2)}</p>`).join("")}
        <p><strong>إجمالي النقدية: ₪${cashTotal.toFixed(2)}</strong></p>
        <hr/>
        <p>بطاقات ائتمان: ₪${(Number(cardTotal) || 0).toFixed(2)}</p>
        <p>محافظ رقمية: ₪${(Number(walletTotal) || 0).toFixed(2)}</p>
        <hr/>
        <p style="font-size: 18px;"><strong>الإجمالي: ₪${grandTotal.toFixed(2)}</strong></p>
        <hr/>
        <br/>
        <p>___________________</p>
        <p>توقيع الكاشير</p>
        <br/>
        <p>___________________</p>
        <p>توقيع المشرف</p>
      </div>
    `;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.focus();
      win.print();
      win.close();
    }
  };

  if (success) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-slate-950/95 backdrop-blur-sm flex items-center justify-center"
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-6 p-12 bg-[var(--o2-surface)] rounded-2xl border border-[color:var(--o2-border)] shadow-2xl max-w-md mx-4"
            >
              <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center" style={{ backgroundColor: 'var(--o2-success-soft)' }}>
                <CheckCircle2 className="w-10 h-10" style={{ color: 'var(--o2-success-text)' }} />
              </div>
              <h2 className="text-3xl font-bold" style={{ color: 'var(--o2-text)' }}>تم إغلاق الوردية بنجاح</h2>
              <p style={{ color: 'var(--o2-muted)' }}>المبلغ المدخل: ₪{grandTotal.toFixed(2)}</p>
              <div className="flex gap-4 justify-center pt-4">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition border"
                  style={{ backgroundColor: 'var(--o2-surface-raised)', color: 'var(--o2-text)', borderColor: 'var(--o2-border)' }}
                >
                  <Printer className="w-5 h-5" />
                  طباعة الإيصال
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-6 py-3 bg-[var(--o2-brand)] text-white rounded-xl font-bold hover:bg-[var(--o2-brand-hover)] transition"
                >
                  إنهاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-slate-950/95 backdrop-blur-sm flex flex-col overflow-hidden"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--o2-border)', backgroundColor: 'var(--o2-surface-muted)' }}>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--o2-text)' }}>
                <Coins className="w-6 h-6" style={{ color: 'var(--o2-brand-text)' }} />
                إغلاق الوردية - Blind Drop
              </h1>
              <p className="text-xs mt-1" style={{ color: 'var(--o2-muted)' }}>
                الكاشير: {cashierName} — أدخل المبالغ الفعلية في الصندوق
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 rounded-xl transition disabled:opacity-40"
              style={{ color: 'var(--o2-muted)' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cash Denominations */}
              <div className="lg:col-span-2 rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--o2-surface)', borderColor: 'var(--o2-border)' }}>
                <div className="px-5 py-4 border-b flex items-center gap-2" style={{ backgroundColor: 'var(--o2-surface-raised)', borderColor: 'var(--o2-border)' }}>
                  <DollarSign className="w-5 h-5" style={{ color: 'var(--o2-success-text)' }} />
                  <h2 className="text-sm font-bold" style={{ color: 'var(--o2-text)' }}>عدّ النقدية (الفئات)</h2>
                  <span className="text-[10px] mr-auto" style={{ color: 'var(--o2-muted)' }}>استخدم Enter للتنقل بين الحقول</span>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--o2-border)' }}>
                  {DENOMINATIONS.map((denom, i) => (
                    <div
                      key={denom.label}
                      className="flex items-center gap-4 px-5 py-3 transition"
                      style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}
                    >
                      <span className="w-20 text-sm font-bold shrink-0" style={{ color: 'var(--o2-text)' }}>{denom.label}</span>
                      <input
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="number"
                        min={0}
                        value={counts[i] || ""}
                        onChange={(e) => updateCount(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="w-24 px-3 py-2 rounded-xl text-center text-sm font-bold outline-none transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ backgroundColor: 'var(--o2-surface-raised)', borderColor: 'var(--o2-border)', color: 'var(--o2-text)', borderWidth: 1 }}
                      />
                      <span className="text-xs" style={{ color: 'var(--o2-muted)' }}>× {denom.value.toFixed(2)}₪</span>
                      <span className="mr-auto text-sm font-bold" style={{ color: 'var(--o2-success-text)' }}>
                        ₪{(denom.value * (counts[i] || 0)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Cash Total */}
                <div className="px-5 py-4 border-t flex items-center justify-between" style={{ backgroundColor: 'var(--o2-surface-raised)', borderColor: 'var(--o2-border)' }}>
                  <span className="text-sm font-bold" style={{ color: 'var(--o2-text)' }}>إجمالي النقدية الفعلي</span>
                  <span className="text-xl font-bold" style={{ color: 'var(--o2-success-text)' }}>₪{cashTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Non-Cash Fields */}
              <div className="space-y-4">
                <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: 'var(--o2-surface)', borderColor: 'var(--o2-border)' }}>
                  <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--o2-border)' }}>
                    <CreditCard className="w-5 h-5" style={{ color: 'var(--o2-info)' }} />
                    <h2 className="text-sm font-bold" style={{ color: 'var(--o2-text)' }}>المدفوعات غير النقدية</h2>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-2" style={{ color: 'var(--o2-muted)' }}>
                      بطاقات ائتمان (فيزا/ماستركارد)
                    </label>
                    <div className="relative">
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--o2-muted)' }}>₪</span>
                      <input
                        id="blind-card-total"
                        type="number"
                        value={cardTotal}
                        onChange={(e) => setCardTotal(e.target.value)}
                        onKeyDown={handleCardKeyDown}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.00"
                        className="w-full pr-8 pl-4 py-3 rounded-xl text-left text-sm font-bold outline-none transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ backgroundColor: 'var(--o2-surface-raised)', borderColor: 'var(--o2-border)', color: 'var(--o2-text)', borderWidth: 1 }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-2" style={{ color: 'var(--o2-muted)' }}>
                      محافظ رقمية / تطبيقات توصيل
                    </label>
                    <div className="relative">
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--o2-muted)' }}>₪</span>
                      <input
                        id="blind-wallet-total"
                        type="number"
                        value={walletTotal}
                        onChange={(e) => setWalletTotal(e.target.value)}
                        onKeyDown={handleWalletKeyDown}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.00"
                        className="w-full pr-8 pl-4 py-3 rounded-xl text-left text-sm font-bold outline-none transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ backgroundColor: 'var(--o2-surface-raised)', borderColor: 'var(--o2-border)', color: 'var(--o2-text)', borderWidth: 1 }}
                      />
                    </div>
                  </div>

                  {/* Grand Total Box */}
                  <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--o2-border)' }}>
                    <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--o2-danger-soft)', borderColor: 'rgba(220, 38, 38, 0.2)' }}>
                      <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--o2-muted)' }}>الإجمالي الكلي المدخل</p>
                      <p className="text-2xl font-black" style={{ color: 'var(--o2-brand-text)' }}>
                        ₪{grandTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Keyboard Shortcuts */}
                <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--o2-surface)', borderColor: 'var(--o2-border)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Hash className="w-4 h-4" style={{ color: 'var(--o2-muted)' }} />
                    <span className="text-[10px] font-bold" style={{ color: 'var(--o2-muted)' }}>اختصارات لوحة المفاتيح</span>
                  </div>
                  <div className="space-y-1.5 text-[11px]" style={{ color: 'var(--o2-muted)' }}>
                    <div className="flex items-center gap-2">
                      <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: 'var(--o2-surface-raised)', color: 'var(--o2-text)' }}>Enter</kbd>
                      <span>→ الحقل التالي</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: 'var(--o2-surface-raised)', color: 'var(--o2-text)' }}>Ctrl + Enter</kbd>
                      <span>→ تأكيد الإغلاق</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: 'var(--o2-surface-raised)', color: 'var(--o2-text)' }}>Esc</kbd>
                      <span>→ إلغاء</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t px-6 py-4 flex items-center justify-between" style={{ backgroundColor: 'var(--o2-surface-muted)', borderColor: 'var(--o2-border)' }}>
            <p className="text-xs" style={{ color: 'var(--o2-muted)' }}>
              * لن يتم عرض المبلغ المتوقع — الإدخال أعمى لضمان النزاهة
            </p>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 bg-[var(--o2-brand)] text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[var(--o2-brand-hover)] transition disabled:opacity-50 shadow-lg active:scale-95"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  تأكيد إغلاق الوردية
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">Ctrl+Enter</kbd>
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
