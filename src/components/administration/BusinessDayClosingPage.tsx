import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Lock, Unlock, CheckCircle2, AlertTriangle,
  Clock, User, TrendingUp, TrendingDown, DollarSign,
  FileText, Printer, Download, ArrowUpRight, ArrowDownLeft,
  BookOpen, Receipt, X, BarChart3,
} from "lucide-react";
import { useApp } from "../../../store";
import { formatCurrency } from "../../types/salesInvoice";
import type { BusinessDayState, DayCloseState } from "../../types";

const DAY_STATUS_CONFIG = {
  OPEN: { label: "مفتوح", color: "var(--o2-warning-text)", bg: "var(--o2-warning-soft)", icon: Unlock },
  CLOSED: { label: "مغلق", color: "var(--o2-success-text)", bg: "var(--o2-success-soft)", icon: Lock },
};

export const BusinessDayClosingPage = () => {
  const store = useApp();
  const {
    currentUser, businessDayState, dayCloseState,
    blindDropSubmissions, reconciliationEntries, financialTransactions,
    journalEntries, openBusinessDay, closeBusinessDay,
    executeDayClose, canExecuteDayClose, activityLogs,
  } = store;

  // Safe accessors for data that may be undefined
  const shifts = (store as any).shifts ?? [];
  const orders = (store as any).orders ?? [];
  const activeOrders = (store as any).activeOrders ?? [];
  const safeFinancialTransactions = (store as any).financialTransactions ?? [];
  const safeBlindDropSubmissions = (store as any).blindDropSubmissions ?? [];
  const safeReconciliationEntries = (store as any).reconciliationEntries ?? [];
  const safeJournalEntries = (store as any).journalEntries ?? [];
  const safeActivityLogs = (store as any).activityLogs ?? [];

  // Combine orders from all sources for complete picture
  const allOrders = useMemo(() => {
    const map = new Map<string, any>();
    [...orders, ...activeOrders].forEach((o: any) => map.set(o.id, o));
    return Array.from(map.values());
  }, [orders, activeOrders]);

  const [confirmClose, setConfirmClose] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [note, setNote] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const todayShifts = useMemo(() => {
    return shifts.filter((s: any) => {
      const shiftDate = new Date(s.startTime).toISOString().split("T")[0];
      return shiftDate === today;
    });
  }, [shifts, today]);

  const todaySubmissions = useMemo(() => {
    return safeBlindDropSubmissions.filter((sub: any) => {
      const subDate = new Date(sub.submittedAt).toISOString().split("T")[0];
      return subDate === today;
    });
  }, [safeBlindDropSubmissions, today]);

  const todayReconciliations = useMemo(() => {
    return safeReconciliationEntries.filter((entry: any) => {
      const entryDate = new Date(entry.startTime).toISOString().split("T")[0];
      return entryDate === today;
    });
  }, [safeReconciliationEntries, today]);

  const todayTransactions = useMemo(() => {
    return safeFinancialTransactions.filter((tx: any) => {
      const txDate = new Date(tx.timestamp).toISOString().split("T")[0];
      return txDate === today;
    });
  }, [safeFinancialTransactions, today]);

  const todayOrders = useMemo(() => {
    return allOrders.filter((order: any) => {
      const orderDate = new Date(order.created_at ?? order.createdAt ?? order.createdAt).toISOString().split("T")[0];
      return orderDate === today;
    });
  }, [allOrders, today]);

  const todayJournals = useMemo(() => {
    return safeJournalEntries.filter((je: any) => je.date === today);
  }, [safeJournalEntries, today]);

  const daySummary = useMemo(() => {
    const totalSales = todayReconciliations.reduce(
      (sum: number, entry: any) => sum + entry.actualCash + entry.actualCards + entry.actualWallets, 0
    );
    const totalExpected = todayReconciliations.reduce(
      (sum: number, entry: any) => sum + entry.expectedCash + entry.expectedCards + entry.expectedWallets, 0
    );
    const totalVariance = todayReconciliations.reduce(
      (sum: number, entry: any) => sum + entry.totalVariance, 0
    );
    const totalExpenses = todayTransactions
      .filter((tx: any) => tx.type === "EXPENSE")
      .reduce((sum: number, tx: any) => sum + tx.amount, 0);
    const totalDeposits = todayTransactions
      .filter((tx: any) => tx.type === "DEPOSIT")
      .reduce((sum: number, tx: any) => sum + tx.amount, 0);
    const totalWithdrawals = todayTransactions
      .filter((tx: any) => tx.type === "WITHDRAWAL")
      .reduce((sum: number, tx: any) => sum + tx.amount, 0);
    const totalRefunds = todayTransactions
      .filter((tx: any) => tx.type === "REFUND")
      .reduce((sum: number, tx: any) => sum + tx.amount, 0);
    const invoiceCount = todayOrders.filter((o: any) => o.status === "paid" || o.status === "COMPLETED").length;
    const returnCount = todayOrders.filter((o: any) => o.status === "REFUNDED" || o.status === "CANCELED").length;
    const discountTotal = todayOrders.reduce((sum: number, o: any) => sum + Number(o.discount || 0), 0);
    const taxTotal = todayOrders.reduce((sum: number, o: any) => sum + Number(o.tax || 0), 0);

    const closedShifts = todayShifts.filter((s: any) => s.status === "CLOSED").length;
    const allShiftsClosed = todayShifts.length > 0 && closedShifts === todayShifts.length;
    const allSubmitted = todayShifts.every((s: any) =>
      todaySubmissions.some((sub: any) => sub.shiftId === s.id)
    );

    return {
      totalSales,
      totalExpected,
      totalVariance,
      totalExpenses,
      totalDeposits,
      totalWithdrawals,
      totalRefunds,
      invoiceCount,
      returnCount,
      discountTotal,
      taxTotal,
      totalShifts: todayShifts.length,
      closedShifts,
      submittedCount: todaySubmissions.length,
      allShiftsClosed,
      allSubmitted,
      journalCount: todayJournals.length,
    };
  }, [todayShifts, todaySubmissions, todayReconciliations, todayTransactions, todayOrders, todayJournals]);

  const canClose = canExecuteDayClose();
  const isDayOpen = businessDayState?.status === "OPEN" && businessDayState?.date === today;
  const isDayClosed = businessDayState?.status === "CLOSED" && businessDayState?.date === today;

  const handleOpenDay = () => {
    openBusinessDay(currentUser?.id || "unknown", "بدء يوم عمل جديد");
  };

  const handleCloseDay = async () => {
    if (!canClose || executing) return;
    setExecuting(true);
    try {
      closeBusinessDay(currentUser?.id || "unknown", note || "إغلاق يوم محاسبي");
      executeDayClose(currentUser?.id || "unknown");
      setConfirmClose(false);
      setNote("");
    } catch (error) {
      console.error("Day close failed:", error);
    } finally {
      setExecuting(false);
    }
  };

  const handlePrintReport = () => {
    const content = `
      <div dir="rtl" style="font-family: 'Cairo', sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
        <h1 style="text-align: center; color: #a30000; border-bottom: 2px solid #a30000; padding-bottom: 10px;">تقرير اليوم المحاسبي</h1>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
          <div><strong>التاريخ:</strong> ${today}</div>
          <div><strong>الحالة:</strong> ${isDayClosed ? "مغلق" : "مفتوح"}</div>
          <div><strong>وقت الفتح:</strong> ${businessDayState?.openedAt ? new Date(businessDayState.openedAt).toLocaleString("ar") : "-"}</div>
          <div><strong>وقت الإغلاق:</strong> ${businessDayState?.closedAt ? new Date(businessDayState.closedAt).toLocaleString("ar") : "-"}</div>
          <div><strong>فتح بواسطة:</strong> ${businessDayState?.openedBy || "-"}</div>
          <div><strong>أُغلق بواسطة:</strong> ${businessDayState?.closedBy || "-"}</div>
        </div>
        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;"/>
        <h2 style="color: #374151;">الملخص المالي</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>إجمالي الإيرادات</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${daySummary.totalSales.toFixed(2)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">المصروفات</td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${daySummary.totalExpenses.toFixed(2)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">الإيداعات</td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${daySummary.totalDeposits.toFixed(2)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">السحوبات</td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${daySummary.totalWithdrawals.toFixed(2)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">المرتجعات</td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${daySummary.totalRefunds.toFixed(2)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">الخصومات</td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${daySummary.discountTotal.toFixed(2)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">الضرائب</td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${daySummary.taxTotal.toFixed(2)}</td></tr>
          <tr style="background: #f3f4f6;"><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>صافي الإيرادات</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>₪${(daySummary.totalSales - daySummary.totalExpenses).toFixed(2)}</strong></td></tr>
        </table>
        <h2 style="color: #374151;">العمليات</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">عدد الفواتير</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${daySummary.invoiceCount}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">عدد المرتجعات</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${daySummary.returnCount}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">عدد القيود اليومية</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${daySummary.journalCount}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">عدد الورديات</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${daySummary.totalShifts} (${daySummary.closedShifts} مغلقة)</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">الفرقات المالية</td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${daySummary.totalVariance.toFixed(2)}</td></tr>
        </table>
        <div style="margin-top: 40px; text-align: center;">
          <p>___________________</p>
          <p>توقيع المدير المسؤول</p>
        </div>
      </div>
    `;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(content);
      win.document.close();
      win.focus();
      win.print();
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--o2-bg)" }} dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
            <Calendar className="w-6 h-6" style={{ color: "var(--o2-brand-text)" }} />
            اليوم المحاسبي
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--o2-muted)" }}>
            {new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrintReport}
            className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition"
            style={{ backgroundColor: "var(--o2-surface)", color: "var(--o2-text)", border: "1px solid var(--o2-border)" }}
          >
            <Printer className="w-4 h-4" />
            طباعة التقرير
          </button>
          {isDayClosed ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ backgroundColor: "var(--o2-success-soft)", color: "var(--o2-success-text)", borderColor: "var(--o2-success)" }}>
              <Lock className="w-5 h-5" />
              <span className="font-bold text-sm">اليوم مُغلق</span>
            </div>
          ) : isDayOpen ? (
            <button
              onClick={() => setConfirmClose(true)}
              disabled={!canClose}
              className="px-6 py-3 bg-[var(--o2-brand)] text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[var(--o2-brand-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <Lock className="w-5 h-5" />
              إغلاق اليوم
            </button>
          ) : (
            <button
              onClick={handleOpenDay}
              className="px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition shadow-lg"
              style={{ backgroundColor: "var(--o2-success)", color: "white" }}
            >
              <Unlock className="w-5 h-5" />
              فتح يوم جديد
            </button>
          )}
        </div>
      </div>

      {/* Business Day Status Card */}
      <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: isDayClosed ? "var(--o2-success-soft)" : "var(--o2-warning-soft)" }}>
              {isDayClosed ? (
                <Lock className="w-7 h-7" style={{ color: "var(--o2-success-text)" }} />
              ) : isDayOpen ? (
                <Unlock className="w-7 h-7" style={{ color: "var(--o2-warning-text)" }} />
              ) : (
                <Calendar className="w-7 h-7" style={{ color: "var(--o2-muted)" }} />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--o2-text)" }}>
                {isDayClosed ? "اليوم مُغلق" : isDayOpen ? "اليوم مفتوح" : "لم يتم فتح يوم بعد"}
              </h2>
              <div className="flex items-center gap-4 text-xs mt-1" style={{ color: "var(--o2-muted)" }}>
                {businessDayState?.openedAt && (
                  <span>الفتح: {new Date(businessDayState.openedAt).toLocaleTimeString("ar")}</span>
                )}
                {businessDayState?.closedAt && (
                  <span>الإغلاق: {new Date(businessDayState.closedAt).toLocaleTimeString("ar")}</span>
                )}
                {businessDayState?.openedBy && (
                  <span>فتح بواسطة: {businessDayState.openedBy}</span>
                )}
              </div>
            </div>
          </div>
          {businessDayState?.openingNote && (
            <div className="text-xs px-3 py-1 rounded-lg" style={{ backgroundColor: "var(--o2-surface-raised)", color: "var(--o2-muted)" }}>
              {businessDayState.openingNote}
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--o2-muted)" }}>
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">إجمالي الإيرادات</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--o2-success-text)" }}>
            {formatCurrency(daySummary.totalSales)}
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--o2-muted)" }}>
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium">المصروفات</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--o2-brand-text)" }}>
            {formatCurrency(daySummary.totalExpenses)}
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--o2-muted)" }}>
            <FileText className="w-4 h-4" />
            <span className="text-xs font-medium">الفواتير</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--o2-text)" }}>
            {daySummary.invoiceCount}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--o2-muted)" }}>
            {daySummary.returnCount} مرتجع
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--o2-muted)" }}>
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">الفرق المالي</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: Math.abs(daySummary.totalVariance) < 0.01 ? "var(--o2-success-text)" : "var(--o2-brand-text)" }}>
            {daySummary.totalVariance >= 0 ? "+" : ""}{formatCurrency(daySummary.totalVariance)}
          </p>
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
          <CheckCircle2 className="w-5 h-5" style={{ color: "var(--o2-brand-text)" }} />
          متطلبات إغلاق اليوم
        </h3>
        <div className="space-y-3">
          {[
            { label: "جميع الورديات مغلقة", done: daySummary.allShiftsClosed, detail: `${daySummary.closedShifts}/${daySummary.totalShifts}` },
            { label: "جميع الكاشيرين سلّموا Blind Drop", done: daySummary.allSubmitted, detail: `${daySummary.submittedCount}/${daySummary.totalShifts}` },
            { label: "اليوم المحاسبي مفتوح", done: isDayOpen, detail: isDayOpen ? "نعم" : "لا" },
          ].map((req) => (
            <div key={req.label} className="flex items-center gap-3">
              {req.done ? (
                <CheckCircle2 className="w-5 h-5" style={{ color: "var(--o2-success-text)" }} />
              ) : (
                <AlertTriangle className="w-5 h-5" style={{ color: "var(--o2-warning-text)" }} />
              )}
              <span className="text-sm" style={{ color: req.done ? "var(--o2-success-text)" : "var(--o2-muted)" }}>
                {req.label} ({req.detail})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Shifts Summary */}
        <div className="rounded-xl border p-6" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
            <Clock className="w-5 h-5" style={{ color: "var(--o2-brand-text)" }} />
            الورديات ({daySummary.totalShifts})
          </h3>
          <div className="space-y-3">
            {todayShifts.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: "var(--o2-muted)" }}>لا توجد وديات اليوم</p>
            ) : (
              todayShifts.map((shift: any) => {
                const hasSubmitted = todaySubmissions.some((sub: any) => sub.shiftId === shift.id);
                const recon = todayReconciliations.find((r: any) => r.shiftId === shift.id);
                return (
                  <div key={shift.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--o2-border)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--o2-surface-raised)" }}>
                        <User className="w-4 h-4" style={{ color: "var(--o2-muted)" }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold" style={{ color: "var(--o2-text)" }}>{shift.cashierId}</p>
                        <p className="text-[10px]" style={{ color: "var(--o2-muted)" }}>
                          {shift.type === "MORNING" ? "صباحي" : shift.type === "EVENING" ? "مسائي" : "ليلي"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasSubmitted && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border" style={{ color: "var(--o2-success-text)", backgroundColor: "var(--o2-success-soft)", borderColor: "var(--o2-success)" }}>
                          <CheckCircle2 className="w-3 h-3" />
                          تم التسليم
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border" style={{
                        color: shift.status === "CLOSED" ? "var(--o2-success-text)" : "var(--o2-warning-text)",
                        backgroundColor: shift.status === "CLOSED" ? "var(--o2-success-soft)" : "var(--o2-warning-soft)",
                        borderColor: shift.status === "CLOSED" ? "var(--o2-success)" : "var(--o2-warning)",
                      }}>
                        {shift.status === "CLOSED" ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        {shift.status === "CLOSED" ? "مغلق" : "مفتوح"}
                      </span>
                      {recon && (
                        <span className="text-[10px] font-bold" style={{ color: recon.totalVariance >= 0 ? "var(--o2-success-text)" : "var(--o2-brand-text)" }}>
                          {recon.totalVariance >= 0 ? "+" : ""}{formatCurrency(recon.totalVariance)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Financial Operations */}
        <div className="rounded-xl border p-6" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
            <DollarSign className="w-5 h-5" style={{ color: "var(--o2-success-text)" }} />
            العمليات المالية
          </h3>
          <div className="space-y-3">
            {[
              { label: "المبيعات", value: daySummary.totalSales, icon: TrendingUp, color: "var(--o2-success-text)" },
              { label: "المصروفات", value: daySummary.totalExpenses, icon: TrendingDown, color: "var(--o2-brand-text)" },
              { label: "الإيداعات", value: daySummary.totalDeposits, icon: ArrowDownLeft, color: "var(--o2-success-text)" },
              { label: "السحوبات", value: daySummary.totalWithdrawals, icon: ArrowUpRight, color: "var(--o2-warning-text)" },
              { label: "المرتجعات", value: daySummary.totalRefunds, icon: TrendingDown, color: "var(--o2-brand-text)" },
              { label: "الخصومات", value: daySummary.discountTotal, icon: TrendingDown, color: "var(--o2-muted)" },
              { label: "الضرائب", value: daySummary.taxTotal, icon: TrendingDown, color: "var(--o2-muted)" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--o2-border)" }}>
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  <span className="text-sm" style={{ color: "var(--o2-text)" }}>{item.label}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: item.color }}>{formatCurrency(item.value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 rounded-lg border-t-2" style={{ borderColor: "var(--o2-success)" }}>
              <span className="text-sm font-bold" style={{ color: "var(--o2-text)" }}>صافي الإيرادات</span>
              <span className="text-lg font-bold" style={{ color: "var(--o2-success-text)" }}>
                {formatCurrency(daySummary.totalSales - daySummary.totalExpenses)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="rounded-xl border p-6" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
          <BookOpen className="w-5 h-5" style={{ color: "var(--o2-brand-text)" }} />
          سجل العمليات اليوم
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {safeActivityLogs
            .filter((log: any) => {
              const logDate = new Date(log.timestamp).toISOString().split("T")[0];
              return logDate === today;
            })
            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 20)
            .map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg text-xs" style={{ backgroundColor: "var(--o2-surface-raised)" }}>
                <Clock className="w-3 h-3 shrink-0" style={{ color: "var(--o2-muted)" }} />
                <span style={{ color: "var(--o2-muted)" }}>{new Date(log.timestamp).toLocaleTimeString("ar")}</span>
                <span className="font-bold" style={{ color: "var(--o2-text)" }}>{log.action}</span>
                {log.details && (
                  <span className="mr-auto truncate" style={{ color: "var(--o2-muted)" }}>
                    {typeof log.details === "object" ? JSON.stringify(log.details).slice(0, 60) : log.details}
                  </span>
                )}
              </div>
            ))}
          {safeActivityLogs.filter((log: any) => new Date(log.timestamp).toISOString().split("T")[0] === today).length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: "var(--o2-muted)" }}>لا توجد عمليات مسجلة اليوم</p>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmClose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-2xl border shadow-2xl p-6 max-w-md w-full mx-4"
              style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "var(--o2-danger-soft)" }}>
                  <Lock className="w-8 h-8" style={{ color: "var(--o2-brand-text)" }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--o2-text)" }}>تأكيد إغلاق اليوم</h3>
                <p className="text-sm mb-4" style={{ color: "var(--o2-muted)" }}>
                  سيتم قفل جميع البيانات المالية لهذا اليوم بشكل دائم. لا يمكن التراجع عن هذا الإجراء.
                </p>
                <div className="mb-4">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="ملاحظات الإغلاق (اختياري)"
                    className="w-full px-4 py-2 rounded-xl text-sm outline-none resize-none"
                    style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)", borderWidth: 1 }}
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setConfirmClose(false); setNote(""); }}
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition border"
                    style={{ color: "var(--o2-text)", backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)" }}
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleCloseDay}
                    disabled={executing}
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: "var(--o2-brand)" }}
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
      </AnimatePresence>
    </div>
  );
};
