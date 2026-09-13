import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock, Lock, Unlock, CheckCircle2, AlertTriangle,
  User, ArrowRightCircle, Shield, Calendar, TrendingUp,
} from "lucide-react";
import { useApp } from "../../../store";
import { formatCurrency } from "../../types/salesInvoice";

export const DayClosePage = () => {
  const store = useApp();
  const {
    currentUser,
    blindDropSubmissions,
    reconciliationEntries,
    dayCloseState,
    executeDayClose,
    canExecuteDayClose,
  } = store;
  const shifts = (store as any).shifts ?? [];

  const [executing, setExecuting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const todayShifts = useMemo(() => {
    return shifts.filter((s) => {
      const shiftDate = new Date(s.startTime).toISOString().split("T")[0];
      return shiftDate === today;
    });
  }, [shifts, today]);

  const todaySubmissions = useMemo(() => {
    return blindDropSubmissions.filter((sub) => {
      const subDate = new Date(sub.submittedAt).toISOString().split("T")[0];
      return subDate === today;
    });
  }, [blindDropSubmissions, today]);

  const todayReconciliations = useMemo(() => {
    return reconciliationEntries.filter((entry) => {
      const entryDate = new Date(entry.startTime).toISOString().split("T")[0];
      return entryDate === today;
    });
  }, [reconciliationEntries, today]);

  const shiftStatus = useMemo(() => {
    return todayShifts.map((shift) => {
      const submission = todaySubmissions.find(
        (sub) => sub.shiftId === shift.id
      );
      const reconciliation = todayReconciliations.find(
        (rec) => rec.shiftId === shift.id
      );
      return {
        shift,
        hasSubmitted: !!submission,
        submission,
        reconciliation,
        isClosed: shift.status === "CLOSED",
      };
    });
  }, [todayShifts, todaySubmissions, todayReconciliations]);

  const allShiftsClosed = shiftStatus.every((s) => s.isClosed);
  const allSubmitted = shiftStatus.every((s) => s.hasSubmitted);
  const canClose = canExecuteDayClose();

  const summary = useMemo(() => {
    const totalSales = todayReconciliations.reduce(
      (sum, entry) => sum + entry.actualCash + entry.actualCards + entry.actualWallets,
      0
    );
    const totalVariance = todayReconciliations.reduce(
      (sum, entry) => sum + entry.totalVariance,
      0
    );
    const shortageCount = todayReconciliations.filter(
      (e) => e.status === "SHORTAGE"
    ).length;
    const overageCount = todayReconciliations.filter(
      (e) => e.status === "OVERAGE"
    ).length;

    return {
      totalShifts: todayShifts.length,
      closedShifts: shiftStatus.filter((s) => s.isClosed).length,
      submittedCount: shiftStatus.filter((s) => s.hasSubmitted).length,
      totalSales,
      totalVariance,
      shortageCount,
      overageCount,
    };
  }, [todayShifts, shiftStatus, todayReconciliations]);

  const handleExecuteDayClose = async () => {
    if (!canClose || executing) return;
    setExecuting(true);
    try {
      executeDayClose(currentUser?.id || "unknown");
      setConfirmOpen(false);
    } catch (error) {
      console.error("Day close failed:", error);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--o2-bg)] p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--o2-text)] flex items-center gap-2">
            <Lock className="w-6 h-6 text-red-500" />
            إغلاق اليوم (End of Day)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString("ar-EG", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {dayCloseState?.status === "CLOSED" ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
            <Lock className="w-5 h-5" />
            <span className="font-bold text-sm">اليوم مُغلق</span>
          </div>
        ) : (
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!canClose}
            className="px-6 py-3 bg-[var(--o2-brand)] text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[var(--o2-brand-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <Lock className="w-5 h-5" />
            تنفيذ إغلاق اليوم
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium">إجمالي الورديات</span>
          </div>
          <p className="text-2xl font-bold text-[var(--o2-text)]">{summary.totalShifts}</p>
          <p className="text-xs text-slate-500 mt-1">
            {summary.closedShifts} مغلقة / {summary.submittedCount} مدفوعة
          </p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">إجمالي المبيعات</span>
          </div>
          <p className="text-2xl font-bold text-emerald-500">
            {formatCurrency(summary.totalSales)}
          </p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-2 text-red-500 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">الفرقات</span>
          </div>
          <p className="text-2xl font-bold text-[var(--o2-text)]">
            {summary.shortageCount + summary.overageCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {summary.shortageCount} عجز / {summary.overageCount} فائض
          </p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">الحالة</span>
          </div>
          <div className="flex items-center gap-2">
            {allShiftsClosed && allSubmitted ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold text-emerald-500">جاهز للإغلاق</span>
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-bold text-amber-500">بانتظار الإكمال</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="bg-[var(--o2-surface)] rounded-xl border border-[color:var(--o2-border)] p-6 mb-6">
        <h3 className="text-lg font-bold text-[var(--o2-text)] mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-500" />
          متطلبات إغلاق اليوم
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {allShiftsClosed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
            <span className={`text-sm ${allShiftsClosed ? "text-emerald-500" : "text-slate-400"}`}>
              جميع الورديات مغلقة ({summary.closedShifts}/{summary.totalShifts})
            </span>
          </div>
          <div className="flex items-center gap-3">
            {allSubmitted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
            <span className={`text-sm ${allSubmitted ? "text-emerald-500" : "text-slate-400"}`}>
              جميع الكاشيرين سلّموا Blind Drop ({summary.submittedCount}/{summary.totalShifts})
            </span>
          </div>
        </div>
      </div>

      {/* Shifts Table */}
      <div className="bg-[var(--o2-surface)] rounded-xl border border-[color:var(--o2-border)] overflow-hidden mb-6">
        <div className="px-4 py-3 bg-[var(--o2-surface-raised)] border-b border-[color:var(--o2-border)]">
          <h3 className="text-sm font-bold text-[var(--o2-text)]">تفاصيل الورديات</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[var(--o2-surface-muted)] border-b border-[color:var(--o2-border)]">
            <tr>
              <th className="px-4 py-3 text-right font-medium text-slate-400">الكاشير</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">النوع</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">البداية</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">النهاية</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">Blind Drop</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">الحالة</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">الفارق</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {shiftStatus.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  لا توجد وديات مسجلة لهذا اليوم
                </td>
              </tr>
            ) : (
              shiftStatus.map(({ shift, hasSubmitted, reconciliation, isClosed }) => (
                <tr key={shift.id} className="hover:bg-[color:var(--o2-surface-muted)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="text-xs font-bold text-white">
                        {shift.cashierId}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {shift.type === "MORNING" ? "صباحي" : shift.type === "EVENING" ? "مسائي" : "ليلي"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {new Date(shift.startTime).toLocaleTimeString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {shift.endTime
                      ? new Date(shift.endTime).toLocaleTimeString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {hasSubmitted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        تم التسليم
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        <Clock className="w-3 h-3" />
                        لم يتم التسليم
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isClosed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <Lock className="w-3 h-3" />
                        مغلق
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <Unlock className="w-3 h-3" />
                        مفتوح
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {reconciliation ? (
                      <span
                        className={`text-xs font-bold ${
                          reconciliation.status === "BALANCED"
                            ? "text-emerald-500"
                            : reconciliation.status === "SHORTAGE"
                            ? "text-red-500"
                            : "text-amber-500"
                        }`}
                      >
                        {reconciliation.totalVariance >= 0 ? "+" : ""}
                        {formatCurrency(reconciliation.totalVariance)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {confirmOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          dir="rtl"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 rounded-2xl border border-red-500/20 shadow-2xl p-6 max-w-md w-full mx-4"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">تأكيد إغلاق اليوم</h3>
              <p className="text-sm text-slate-400 mb-6">
                سيتم قفل جميع البيانات المالية لهذا اليوم بشكل دائم. لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleExecuteDayClose}
                  disabled={executing}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {executing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري التنفيذ...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      تأكيد الإغلاق
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
