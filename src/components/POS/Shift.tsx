
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../../store';
import { Clock, Wallet, LogOut, ArrowRightCircle } from 'lucide-react';
import { useOrders } from '../../hooks/useOrders';
import { FinancialTransactionType } from '../../../types';
import { BlindDropModal, type BlindDropData } from './BlindDropModal';

const getBranchFilter = (currentUser: unknown) => {
  const user = currentUser as { branch_id?: number | string; branchId?: number | string } | null;
  const rawBranchId = user?.branch_id ?? user?.branchId;
  const branchId =
    typeof rawBranchId === "number" ? rawBranchId : Number(rawBranchId);

  return Number.isFinite(branchId) ? { branch_id: branchId } : undefined;
};

export const ShiftView: React.FC = () => {
  const { currentShift, openShift, closeShift, currentUser, financialTransactions, submitBlindDrop } = useApp();
  const [balance, setBalance] = useState('');
  const [blindDropOpen, setBlindDropOpen] = useState(false);
  const [blindDropLoading, setBlindDropLoading] = useState(false);
  const branchFilter = useMemo(() => getBranchFilter(currentUser), [currentUser]);
  const { orders } = useOrders(branchFilter);

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
  const handleBlindDropSubmit = useCallback(async (data: BlindDropData) => {
    setBlindDropLoading(true);
    try {
      const totalCash = data.denominations.reduce(
        (sum, d) => sum + d.value * d.count,
        0,
      );

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

      // Close the shift
      await closeShift(totalCash);
      // NOTE: Do NOT close the modal here — BlindDropModal shows the
      // success screen and its "إنهاء" button calls onClose().
    } catch (err) {
      console.error("Blind drop submit failed:", err);
    } finally {
      setBlindDropLoading(false);
    }
  }, [closeShift, submitBlindDrop, currentShift, currentUser]);

  const shiftStats = useMemo(() => {
    if (!currentShift) {
      return {
        orderCount: 0,
        cashSales: 0,
        cardSales: 0,
        walletSales: 0,
        bankSales: 0,
        expenses: 0,
        expectedDrawer: 0,
      };
    }

    const shiftStart = new Date(currentShift.startTime);
    const currentCashierId = currentUser?.id ? Number(currentUser.id) : null;
    const paidOrders = orders.filter((order) => {
      const paidDate = new Date(order.paid_at ?? order.updated_at ?? order.created_at);
      const sameCashier =
        currentCashierId && Number.isFinite(currentCashierId)
          ? order.cashier_id === currentCashierId
          : true;
      return order.status === "paid" && paidDate >= shiftStart && sameCashier;
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

    return {
      orderCount: paidOrders.length,
      cashSales,
      cardSales: sumByMethod("credit_card"),
      walletSales: sumByMethod("wallet"),
      bankSales: sumByMethod("bank_transfer"),
      expenses,
      expectedDrawer:
        currentShift.openingBalance + cashSales + deposits - expenses - withdrawals,
    };
  }, [currentShift, currentUser, financialTransactions, orders]);

  if (!currentShift) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="max-w-md w-full border border-[color:var(--o2-border)] bg-[var(--o2-surface)] p-8 rounded-[2rem] shadow-[var(--o2-card-shadow)] text-center">
          <div className="w-16 h-16 bg-[color:var(--o2-brand-soft)] text-[var(--o2-brand-text)] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Wallet size={32} />
          </div>
          <h2 className="text-2xl font-black text-[var(--o2-text)] mb-2">بدء شفت جديد</h2>
          <p className="text-[var(--o2-muted)] mb-8">يرجى إدخال المبلغ الافتتاحي في الصندوق لبدء العمل</p>

          <div className="space-y-4">
            <div className="text-right">
              <label className="text-sm font-bold text-[var(--o2-muted)] block mb-2">الرصيد الابتدائي (₪)</label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && balance) {
                    openShift(Number(balance), 'MORNING');
                  }
                }}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-[var(--o2-surface-raised)] border border-[color:var(--o2-border)] rounded-xl focus:ring-2 focus:ring-[var(--o2-brand)] outline-none text-center text-xl font-bold text-[var(--o2-text)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <button
              onClick={() => openShift(Number(balance), 'MORNING')}
              disabled={!balance}
              className="w-full py-4 bg-[var(--o2-brand)] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[var(--o2-brand-hover)] transition-all shadow-lg disabled:opacity-50"
            >
              فتح الشفت الآن
              <ArrowRightCircle size={20} className="rotate-180" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[var(--o2-bg)] rounded-[3rem] custom-scrollbar">
      <header className="flex justify-between items-center bg-[var(--o2-surface)] p-6 rounded-[1.75rem] border border-[color:var(--o2-border)] shadow-[var(--o2-card-shadow)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center border" style={{ backgroundColor: 'var(--o2-success-soft)', color: 'var(--o2-success-text)', borderColor: 'var(--o2-success)' }}>
            <Clock size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-[var(--o2-text)]">الشفت نشط</h2>
            <p className="text-sm text-[var(--o2-muted)] font-bold">بدأ منذ: {new Date(currentShift.startTime ?? Date.now()).toLocaleTimeString('ar-EG')}</p>
          </div>
        </div>
        <button
          onClick={() => setBlindDropOpen(true)}
          className="px-6 py-3 bg-[var(--o2-brand)] text-white rounded-xl font-black text-xs flex items-center gap-2 hover:bg-[var(--o2-brand-hover)] transition-all shadow-lg active:scale-95"
        >
          <LogOut size={18} />
          إغلاق الشفت
          <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ backgroundColor: 'var(--o2-surface-raised)', color: 'var(--o2-muted)' }}>F12</kbd>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--o2-surface)] p-6 rounded-[1.5rem] border border-[color:var(--o2-border)] space-y-2 shadow-[var(--o2-card-shadow)]">
          <p className="text-[10px] font-black text-[var(--o2-muted)] uppercase tracking-widest">الرصيد الافتتاحي</p>
          <p className="text-2xl font-black text-[var(--o2-text)]">{(currentShift.openingBalance ?? 0).toFixed(2)} ₪</p>
        </div>
        <div className="bg-[var(--o2-surface)] p-6 rounded-[1.5rem] border border-[color:var(--o2-border)] space-y-2 shadow-[var(--o2-card-shadow)]">
          <p className="text-[10px] font-black text-[var(--o2-muted)] uppercase tracking-widest">إجمالي المبيعات (كاش)</p>
          <p className="text-2xl font-black" style={{ color: 'var(--o2-success-text)' }}>{shiftStats.cashSales.toFixed(2)} ₪</p>
        </div>
        <div className="bg-[var(--o2-surface)] p-6 rounded-[1.5rem] border border-[color:var(--o2-border)] space-y-2 shadow-[var(--o2-card-shadow)]">
          <p className="text-[10px] font-black text-[var(--o2-muted)] uppercase tracking-widest">إجمالي المصاريف</p>
          <p className="text-2xl font-black" style={{ color: 'var(--o2-brand-text)' }}>{shiftStats.expenses.toFixed(2)} ₪</p>
        </div>
      </div>

      <div className="bg-[var(--o2-surface)] p-8 rounded-[2rem] border border-[color:var(--o2-border)] shadow-[var(--o2-card-shadow)]">
        <h3 className="text-lg font-black text-[var(--o2-text)] mb-6 border-b border-[color:var(--o2-border)] pb-4 uppercase tracking-widest">تقرير الشفت الحالي</h3>
        <div className="space-y-4">
          <div className="flex justify-between text-[var(--o2-muted)]">
            <span className="text-xs font-bold">الكاشير</span>
            <span className="text-xs font-black text-[var(--o2-text)]">{currentUser?.name}</span>
          </div>
          <div className="flex justify-between text-[var(--o2-muted)]">
            <span className="text-xs font-bold">عدد الطلبات</span>
            <span className="text-xs font-black text-[var(--o2-text)]">{shiftStats.orderCount} طلب</span>
          </div>
          <div className="flex justify-between text-[var(--o2-muted)]">
            <span className="text-xs font-bold">مبيعات الشبكة</span>
            <span className="text-xs font-black text-[var(--o2-text)]">{shiftStats.cardSales.toFixed(2)} ₪</span>
          </div>
          <div className="flex justify-between text-[var(--o2-muted)]">
            <span className="text-xs font-bold">مبيعات بنكية</span>
            <span className="text-xs font-black text-[var(--o2-text)]">{shiftStats.bankSales.toFixed(2)} ₪</span>
          </div>
          <div className="flex justify-between text-[var(--o2-muted)]">
            <span className="text-xs font-bold">مبيعات المحفظة</span>
            <span className="text-xs font-black text-[var(--o2-text)]">{shiftStats.walletSales.toFixed(2)} ₪</span>
          </div>
          <div className="pt-4 border-t border-[color:var(--o2-border)] flex justify-between text-[var(--o2-text)] font-black">
            <span className="text-sm">الرصيد المتوقع بالدرج</span>
            <span className="text-2xl" style={{ color: 'var(--o2-brand-text)' }}>{shiftStats.expectedDrawer.toFixed(2)} ₪</span>
          </div>
        </div>
      </div>

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
