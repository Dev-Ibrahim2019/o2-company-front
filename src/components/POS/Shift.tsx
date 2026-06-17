
import React, { useMemo, useState } from 'react';
import { useApp } from '../../../store';
import { Clock, Wallet, LogOut, ArrowRightCircle } from 'lucide-react';
import { useOrders } from '../../hooks/useOrders';
import { FinancialTransactionType } from '../../../types';

const getBranchFilter = (currentUser: unknown) => {
  const user = currentUser as { branch_id?: number | string; branchId?: number | string } | null;
  const rawBranchId = user?.branch_id ?? user?.branchId;
  const branchId =
    typeof rawBranchId === "number" ? rawBranchId : Number(rawBranchId);

  return Number.isFinite(branchId) ? { branch_id: branchId } : undefined;
};

export const ShiftView: React.FC = () => {
  const { currentShift, openShift, closeShift, currentUser, financialTransactions } = useApp();
  const [balance, setBalance] = useState('');
  const branchFilter = useMemo(() => getBranchFilter(currentUser), [currentUser]);
  const { orders } = useOrders(branchFilter);

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
        <div className="max-w-md w-full bg-slate-900 p-8 rounded-3xl border border-white/5 shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-600/10 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Wallet size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">بدء شفت جديد</h2>
          <p className="text-slate-500 mb-8">يرجى إدخال المبلغ الافتتاحي في الصندوق لبدء العمل</p>

          <div className="space-y-4">
            <div className="text-right">
              <label className="text-sm font-bold text-slate-400 block mb-2">الرصيد الابتدائي (₪)</label>
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
                className="w-full px-4 py-3 bg-slate-800 border border-white/5 rounded-xl focus:ring-2 focus:ring-red-600 outline-none text-center text-xl font-bold text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <button
              onClick={() => openShift(Number(balance), 'MORNING')}
              disabled={!balance}
              className="w-full py-4 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 disabled:opacity-50"
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
    <div className="max-w-4xl mx-auto space-y-6 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950 rounded-[3rem] custom-scrollbar">
      <header className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl border border-white/5 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <Clock size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">الشفت نشط</h2>
            <p className="text-sm text-slate-500 font-bold">بدأ منذ: {new Date(currentShift.startTime).toLocaleTimeString('ar-EG')}</p>
          </div>
        </div>
        <button
          onClick={() => {
            const final = prompt('أدخل المبلغ النهائي في الصندوق');
            if (final) closeShift(Number(final));
          }}
          className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-xs flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 active:scale-95"
        >
          <LogOut size={18} />
          إغلاق الشفت
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl border border-white/5 space-y-2 shadow-2xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الرصيد الافتتاحي</p>
          <p className="text-2xl font-black text-white">{currentShift.openingBalance.toFixed(2)} ₪</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-white/5 space-y-2 shadow-2xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">إجمالي المبيعات (كاش)</p>
          <p className="text-2xl font-black text-emerald-500">{shiftStats.cashSales.toFixed(2)} ₪</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-white/5 space-y-2 shadow-2xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">إجمالي المصاريف</p>
          <p className="text-2xl font-black text-red-500">{shiftStats.expenses.toFixed(2)} ₪</p>
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
        <h3 className="text-lg font-black text-white mb-6 border-b border-white/5 pb-4 uppercase tracking-widest">تقرير الشفت الحالي</h3>
        <div className="space-y-4">
          <div className="flex justify-between text-slate-400">
            <span className="text-xs font-bold">الكاشير</span>
            <span className="text-xs font-black text-white">{currentUser?.name}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span className="text-xs font-bold">عدد الطلبات</span>
            <span className="text-xs font-black text-white">{shiftStats.orderCount} طلب</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span className="text-xs font-bold">مبيعات الشبكة</span>
            <span className="text-xs font-black text-white">{shiftStats.cardSales.toFixed(2)} ₪</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span className="text-xs font-bold">مبيعات بنكية</span>
            <span className="text-xs font-black text-white">{shiftStats.bankSales.toFixed(2)} ₪</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span className="text-xs font-bold">مبيعات المحفظة</span>
            <span className="text-xs font-black text-white">{shiftStats.walletSales.toFixed(2)} ₪</span>
          </div>
          <div className="pt-4 border-t border-white/5 flex justify-between text-white font-black">
            <span className="text-sm">الرصيد المتوقع بالدرج</span>
            <span className="text-2xl text-red-600">{shiftStats.expectedDrawer.toFixed(2)} ₪</span>
          </div>
        </div>
      </div>
    </div>
  );
};
