
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../../store';
import { Clock, Wallet, LogOut, ArrowRightCircle, RefreshCw, Calendar, Loader2, AlertTriangle } from 'lucide-react';
import { useOrders } from '../../hooks/useOrders';
import { FinancialTransactionType } from '../../../types';
import { BlindDropModal, type BlindDropData } from './BlindDropModal';
import { toast } from '../shared/Toast';

const getBranchFilter = (currentUser: unknown) => {
  const user = currentUser as { branch_id?: number | string; branchId?: number | string } | null;
  const rawBranchId = user?.branch_id ?? user?.branchId;
  const branchId =
    typeof rawBranchId === "number" ? rawBranchId : Number(rawBranchId);

  return Number.isFinite(branchId) ? { branch_id: branchId } : undefined;
};

const formatMoney = (value: number) => `${Number(value || 0).toFixed(2)} ₪`;

export const ShiftView: React.FC = () => {
  const { currentShift, openShift, closeShift, currentUser, financialTransactions, submitBlindDrop, rollover } = useApp();
  const [balance, setBalance] = useState('');
  const [openShiftLoading, setOpenShiftLoading] = useState(false);
  const [blindDropOpen, setBlindDropOpen] = useState(false);
  const [blindDropLoading, setBlindDropLoading] = useState(false);
  const [rolloverLoading, setRolloverLoading] = useState(false);
  const [showRolloverConfirm, setShowRolloverConfirm] = useState(false);
  const branchFilter = useMemo(() => getBranchFilter(currentUser), [currentUser]);
  const { orders, loading: ordersLoading } = useOrders(branchFilter);

  // F12 shortcut to open blind drop
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F12" && currentShift && !blindDropOpen) {
        e.preventDefault();
        setBlindDropOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [currentShift, blindDropOpen]);

  const handleOpenShift = useCallback(async () => {
    if (!balance || openShiftLoading) return;
    setOpenShiftLoading(true);
    try {
      const ok = await openShift(Number(balance), 'MORNING');
      if (!ok) toast.error("فشل فتح اليومية", "حاول مرة ثانية");
    } finally {
      setOpenShiftLoading(false);
    }
  }, [balance, openShift, openShiftLoading]);

  const handleBlindDropSubmit = useCallback(async (data: BlindDropData): Promise<boolean> => {
    setBlindDropLoading(true);
    try {
      const totalCash = data.denominations.reduce(
        (sum, d) => sum + d.value * d.count,
        0,
      );

      // إغلاق اليومية فعلياً بالباك اند أولاً — لو رفض (مثلاً في طلبات لسا
      // مفتوحة) ما بنكمل ولا بنعرض شاشة نجاح، ونطلع سبب الرفض الحقيقي.
      const reconciliation = await closeShift(totalCash);
      if (!reconciliation) return false;

      // Submit blind drop to store for reconciliation
      if (currentShift && currentShift.id) {
        submitBlindDrop({
          shiftId: currentShift.id,
          cashierId: currentUser?.id || "unknown",
          cashierName: currentUser?.name || "Unknown",
          denominations: data.denominations,
          cashTotal: totalCash,
          cardTotal: data.cardTotal,
          walletTotal: data.walletTotal,
          grandTotal: totalCash + data.cardTotal + data.walletTotal,
        });
      }

      if (reconciliation.status !== "balanced") {
        const diff = Math.abs(reconciliation.variance).toFixed(2);
        toast.warning(
          reconciliation.status === "over" ? `زيادة ${diff} ₪` : `نقص ${diff} ₪`,
          `المتوقع ${reconciliation.expected_cash.toFixed(2)} ₪ — المعدود ${reconciliation.counted_cash.toFixed(2)} ₪`,
        );
      }

      // NOTE: Do NOT close the modal here — BlindDropModal shows the
      // success screen and its "إنهاء" button calls onClose().
      return true;
    } catch (err: any) {
      const message = err?.response?.data?.message || "فشل إغلاق اليومية";
      toast.error(message);
      return false;
    } finally {
      setBlindDropLoading(false);
    }
  }, [closeShift, submitBlindDrop, currentShift, currentUser]);

  // معالجة الترحيل
  const handleRollover = useCallback(async () => {
    setRolloverLoading(true);
    try {
      await rollover(currentShift?.openingBalance ?? 0);
      setShowRolloverConfirm(false);
    } catch (err) {
      console.error("Rollover failed:", err);
      toast.error("فشل الترحيل. يرجى المحاولة مرة أخرى.");
    } finally {
      setRolloverLoading(false);
    }
  }, [rollover, currentShift]);

  // حساب إحصائيات اليوميات
  const shiftStats = useMemo(() => {
    if (!currentShift) {
      return {
        orderCount: 0,
        totalSales: 0,
        cashSales: 0,
        cardSales: 0,
        walletSales: 0,
        bankSales: 0,
        expenses: 0,
        expectedDrawer: 0,
        openOrders: 0,
        paidOrders: 0,
      };
    }

    const shiftStart = new Date(currentShift.startTime);
    const currentCashierId = currentUser?.id ? Number(currentUser.id) : null;
    
    // الطلبات المدفوعة
    const paidOrders = orders.filter((order) => {
      const paidDate = new Date(order.paid_at ?? order.updated_at ?? order.created_at);
      const sameCashier =
        currentCashierId && Number.isFinite(currentCashierId)
          ? order.cashier_id === currentCashierId
          : true;
      return order.status === "paid" && paidDate >= shiftStart && sameCashier;
    });

    // الطلبات المفتوحة (نشطة)
    const openOrders = orders.filter((order) => {
      const orderDate = new Date(order.created_at);
      return !["paid", "cancelled"].includes(order.status) && orderDate >= shiftStart;
    });

    const sumByMethod = (method: string) =>
      paidOrders.reduce((sum, order) => {
        if (order.payments && order.payments.length > 0) {
          return (
            sum +
            order.payments
              .filter((payment) => payment.payment_method === method)
              .reduce((inner, payment) => inner + Number(payment.amount || 0), 0)
          );
        }
        return order.payment_method === method ? sum + Number(order.total || 0) : sum;
      }, 0);

    const shiftTransactions = financialTransactions.filter(
      (tx) => tx.shiftId === currentShift.id,
    );
    const expenses = shiftTransactions
      .filter((tx) => tx.type === FinancialTransactionType.EXPENSE)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const withdrawals = shiftTransactions
      .filter((tx) => tx.type === FinancialTransactionType.WITHDRAWAL)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const deposits = shiftTransactions
      .filter((tx) => tx.type === FinancialTransactionType.DEPOSIT)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const cashSales = sumByMethod("cash");
    const totalSales = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

    return {
      orderCount: paidOrders.length,
      totalSales,
      cashSales,
      cardSales: sumByMethod("credit_card"),
      walletSales: sumByMethod("wallet"),
      bankSales: sumByMethod("bank_transfer"),
      expenses,
      expectedDrawer:
        currentShift.openingBalance + cashSales + deposits - expenses - withdrawals,
      openOrders: openOrders.length,
      paidOrders: paidOrders.length,
    };
  }, [currentShift, currentUser, financialTransactions, orders]);

  // تاريخ اليوم
  const today = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (!currentShift) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="max-w-md w-full border border-[color:var(--o2-border)] bg-[var(--o2-surface)] p-8 rounded-[2rem] shadow-[var(--o2-card-shadow)] text-center">
          <div className="w-16 h-16 bg-[color:var(--o2-brand-soft)] text-[var(--o2-brand-text)] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Wallet size={32} />
          </div>
          <h2 className="text-2xl font-black text-[var(--o2-text)] mb-2">بدء يومية جديدة</h2>
          <p className="text-[var(--o2-muted)] mb-2">يرجى إدخال المبلغ الافتتاحي في الصندوق لبدء العمل</p>
          <p className="text-xs text-[var(--o2-muted)] mb-8">{today}</p>

          <div className="space-y-4">
            <div className="text-right">
              <label className="text-sm font-bold text-[var(--o2-muted)] block mb-2">الرصيد الابتدائي (₪)</label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && balance) {
                    handleOpenShift();
                  }
                }}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-[var(--o2-surface-raised)] border border-[color:var(--o2-border)] rounded-xl focus:ring-2 focus:ring-[var(--o2-brand)] outline-none text-center text-xl font-bold text-[var(--o2-text)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <button
              onClick={handleOpenShift}
              disabled={!balance || openShiftLoading}
              className="w-full py-4 bg-[var(--o2-brand)] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[var(--o2-brand-hover)] transition-all shadow-lg disabled:opacity-50"
            >
              {openShiftLoading ? <Loader2 size={18} className="animate-spin" /> : null}
              فتح اليومية الآن
              <ArrowRightCircle size={20} className="rotate-180" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[var(--o2-bg)] rounded-[3rem] custom-scrollbar">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--o2-surface)] p-6 rounded-[1.75rem] border border-[color:var(--o2-border)] shadow-[var(--o2-card-shadow)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center border" style={{ backgroundColor: 'var(--o2-success-soft)', color: 'var(--o2-success-text)', borderColor: 'var(--o2-success)' }}>
            <Clock size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-[var(--o2-text)]">اليومية نشطة</h2>
            <p className="text-sm text-[var(--o2-muted)] font-bold">
              بدأت منذ: {new Date(currentShift.startTime ?? Date.now()).toLocaleTimeString('ar-EG')}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Calendar size={12} className="text-[var(--o2-muted)]" />
              <span className="text-xs text-[var(--o2-muted)]">{today}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* زر الترحيل */}
          <button
            onClick={() => setShowRolloverConfirm(true)}
            disabled={rolloverLoading || ordersLoading}
            className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {rolloverLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <RefreshCw size={18} />
            )}
            ترحيل اليومية
          </button>

          {/* زر إغلاق الشفت (Blind Drop) */}
          <button
            onClick={() => setBlindDropOpen(true)}
            className="px-5 py-3 bg-[var(--o2-brand)] text-white rounded-xl font-black text-xs flex items-center gap-2 hover:bg-[var(--o2-brand-hover)] transition-all shadow-lg active:scale-95"
          >
            <LogOut size={18} />
            إغلاق الشفت
            <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ backgroundColor: 'var(--o2-surface-raised)', color: 'var(--o2-muted)' }}>F12</kbd>
          </button>
        </div>
      </header>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--o2-surface)] p-5 rounded-[1.5rem] border border-[color:var(--o2-border)] space-y-2 shadow-[var(--o2-card-shadow)]">
          <p className="text-[10px] font-black text-[var(--o2-muted)] uppercase tracking-widest">الرصيد الافتتاحي</p>
          <p className="text-xl font-black text-[var(--o2-text)]">{formatMoney(currentShift.openingBalance ?? 0)}</p>
        </div>
        <div className="bg-[var(--o2-surface)] p-5 rounded-[1.5rem] border border-[color:var(--o2-border)] space-y-2 shadow-[var(--o2-card-shadow)]">
          <p className="text-[10px] font-black text-[var(--o2-muted)] uppercase tracking-widest">إجمالي المبيعات</p>
          <p className="text-xl font-black" style={{ color: 'var(--o2-success-text)' }}>{formatMoney(shiftStats.totalSales)}</p>
        </div>
        <div className="bg-[var(--o2-surface)] p-5 rounded-[1.5rem] border border-[color:var(--o2-border)] space-y-2 shadow-[var(--o2-card-shadow)]">
          <p className="text-[10px] font-black text-[var(--o2-muted)] uppercase tracking-widest">المبيعات (كاش)</p>
          <p className="text-xl font-black" style={{ color: 'var(--o2-success-text)' }}>{formatMoney(shiftStats.cashSales)}</p>
        </div>
        <div className="bg-[var(--o2-surface)] p-5 rounded-[1.5rem] border border-[color:var(--o2-border)] space-y-2 shadow-[var(--o2-card-shadow)]">
          <p className="text-[10px] font-black text-[var(--o2-muted)] uppercase tracking-widest">المصاريف</p>
          <p className="text-xl font-black" style={{ color: 'var(--o2-brand-text)' }}>{formatMoney(shiftStats.expenses)}</p>
        </div>
      </div>

      {/* تقرير اليومية */}
      <div className="bg-[var(--o2-surface)] p-8 rounded-[2rem] border border-[color:var(--o2-border)] shadow-[var(--o2-card-shadow)]">
        <h3 className="text-lg font-black text-[var(--o2-text)] mb-6 border-b border-[color:var(--o2-border)] pb-4 uppercase tracking-widest">تقرير اليومية</h3>
        <div className="space-y-4">
          <div className="flex justify-between text-[var(--o2-muted)]">
            <span className="text-xs font-bold">الكاشير</span>
            <span className="text-xs font-black text-[var(--o2-text)]">{currentUser?.name}</span>
          </div>
          <div className="flex justify-between text-[var(--o2-muted)]">
            <span className="text-xs font-bold">عدد الطلبات المدفوعة</span>
            <span className="text-xs font-black text-[var(--o2-text)]">{shiftStats.paidOrders} طلب</span>
          </div>
          <div className="flex justify-between text-[var(--o2-muted)]">
            <span className="text-xs font-bold">الطلبات المفتوحة (نشطة)</span>
            <span className="text-xs font-black" style={{ color: shiftStats.openOrders > 0 ? 'var(--o2-warning-text)' : 'var(--o2-text)' }}>
              {shiftStats.openOrders} طلب
            </span>
          </div>
          <div className="flex justify-between text-[var(--o2-muted)]">
            <span className="text-xs font-bold">مبيعات الشبكة</span>
            <span className="text-xs font-black text-[var(--o2-text)]">{formatMoney(shiftStats.cardSales)}</span>
          </div>
          <div className="flex justify-between text-[var(--o2-muted)]">
            <span className="text-xs font-bold">مبيعات بنكية</span>
            <span className="text-xs font-black text-[var(--o2-text)]">{formatMoney(shiftStats.bankSales)}</span>
          </div>
          <div className="flex justify-between text-[var(--o2-muted)]">
            <span className="text-xs font-bold">مبيعات المحفظة</span>
            <span className="text-xs font-black text-[var(--o2-text)]">{formatMoney(shiftStats.walletSales)}</span>
          </div>
          <div className="pt-4 border-t border-[color:var(--o2-border)] flex justify-between text-[var(--o2-text)] font-black">
            <span className="text-sm">الرصيد المتوقع بالدرج</span>
            <span className="text-2xl" style={{ color: 'var(--o2-brand-text)' }}>{formatMoney(shiftStats.expectedDrawer)}</span>
          </div>
        </div>
      </div>

      {/* مودال تأكيد الترحيل */}
      {showRolloverConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--o2-surface)] rounded-[2rem] border border-[color:var(--o2-border)] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10">
                <AlertTriangle size={24} className="text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--o2-text)]">ترحيل اليومية</h3>
                <p className="text-xs text-[var(--o2-muted)]">إغلاق يومية اليوم وفتح يومية جديدة</p>
              </div>
            </div>

            <div className="bg-[var(--o2-surface-raised)] rounded-xl p-4 space-y-2">
              <p className="text-xs text-[var(--o2-muted)] font-bold">
                سيتم إغلاق اليومية الحالية وفتح يومية جديدة للتاريخ التالي.
              </p>
              <p className="text-xs text-[var(--o2-muted)] font-bold">
                الطلبات المدفوعة ستبقى في يومية اليوم، والطلبات المفتوحة ستنقل ليومية جديدة.
              </p>
              {shiftStats.openOrders > 0 && (
                <p className="text-xs font-black text-amber-500 mt-2">
                  ⚠️ يوجد {shiftStats.openOrders} طلبات مفتوحة سيتم نقلها لل يومية الجديدة
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRollover}
                disabled={rolloverLoading}
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {rolloverLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    جاري الترحيل...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    تأكيد الترحيل
                  </>
                )}
              </button>
              <button
                onClick={() => setShowRolloverConfirm(false)}
                disabled={rolloverLoading}
                className="px-4 py-3 bg-[var(--o2-surface-raised)] hover:bg-[var(--o2-surface)] text-[var(--o2-text)] rounded-xl font-black text-xs transition-all disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال Blind Drop */}
      <BlindDropModal
        open={blindDropOpen}
        cashierName={currentUser?.name || "---"}
        onClose={() => setBlindDropOpen(false)}
        onSubmit={handleBlindDropSubmit}
        loading={blindDropLoading}
      />
    </div>
  );
};
