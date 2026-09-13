import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, ChevronDown, ChevronUp, Clock, User,
  Lock, Unlock, DollarSign, CreditCard, Smartphone, FileText,
  Printer, Download, TrendingUp, TrendingDown, CheckCircle2,
  AlertTriangle, Calendar, ArrowUpRight, ArrowDownLeft, X,
  Wallet,
} from "lucide-react";
import { useApp } from "../../../store";
import { formatCurrency } from "../../types/salesInvoice";
import { fiscalYearService } from "../../services/fiscalYearService";
import type { FiscalYearFromApi } from "../../services/fiscalYearService";
import type { Shift, BlindDropSubmission, ReconciliationEntry } from "../../types";

interface ShiftClosingRecord {
  shift: Shift;
  submission?: BlindDropSubmission;
  reconciliation?: ReconciliationEntry;
  salesSummary: {
    total: number;
    cash: number;
    card: number;
    wallet: number;
    bank: number;
    orderCount: number;
    returnCount: number;
    discountTotal: number;
    taxTotal: number;
  };
  expenses: number;
  deposits: number;
  withdrawals: number;
  expectedBalance: number;
  difference: number;
}

const SHIFT_TYPE_LABELS: Record<string, string> = {
  MORNING: "صباحي",
  EVENING: "مسائي",
  NIGHT: "ليلي",
};

const STATUS_CONFIG = {
  OPEN: { label: "مفتوح", color: "var(--o2-warning-text)", bg: "var(--o2-warning-soft)", icon: Unlock },
  CLOSED: { label: "مغلق", color: "var(--o2-success-text)", bg: "var(--o2-success-soft)", icon: Lock },
};

export const ShiftClosingsPage = () => {
  const store = useApp();
  const { blindDropSubmissions, reconciliationEntries, branches, employees } = store;
  const shifts = (store as any).shifts ?? [];
  const orders = (store as any).orders ?? [];
  const activeOrders = (store as any).activeOrders ?? [];
  const financialTransactions = (store as any).financialTransactions ?? [];

  const getCashierName = (cashierId: string) => {
    const emp = employees?.find((e: any) => e.id === cashierId);
    return emp ? emp.name || emp.fullName || emp.username || cashierId : cashierId;
  };

  // Combine orders from all sources
  const allOrders = useMemo(() => {
    const map = new Map<string, any>();
    [...orders, ...activeOrders].forEach((o: any) => map.set(o.id, o));
    return Array.from(map.values());
  }, [orders, activeOrders]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [fiscalYearFilter, setFiscalYearFilter] = useState<string>("all");
  const [fiscalYears, setFiscalYears] = useState<FiscalYearFromApi[]>([]);

  // جلب السنوات المالية
  useEffect(() => {
    fiscalYearService.getAll().then(setFiscalYears).catch(() => {});
  }, []);

  const closingRecords = useMemo(() => {
    return (shifts ?? []).map((shift): ShiftClosingRecord => {
      const submission = (blindDropSubmissions ?? []).find((sub: BlindDropSubmission) => sub.shiftId === shift.id);
      const reconciliation = (reconciliationEntries ?? []).find((rec: ReconciliationEntry) => rec.shiftId === shift.id);

      const shiftStart = new Date(shift.startTime);
      const shiftEnd = shift.endTime ? new Date(shift.endTime) : new Date();
      const shiftTx = (financialTransactions ?? []).filter(
        (tx: any) => tx.shiftId === shift.id
      );

      const paidOrders = allOrders.filter((order: any) => {
        const paidDate = new Date(order.paid_at ?? order.updated_at ?? order.created_at);
        return order.status === "paid" && paidDate >= shiftStart && paidDate <= shiftEnd;
      });

      const sumByMethod = (method: string) =>
        paidOrders.reduce((sum: number, order: any) => {
          if (order.payments?.length > 0) {
            return sum + order.payments
              .filter((p: any) => p.payment_method === method)
              .reduce((inner: number, p: any) => inner + Number(p.amount || 0), 0);
          }
          return order.payment_method === method ? sum + Number(order.total || 0) : sum;
        }, 0);

      const cash = sumByMethod("cash");
      const card = sumByMethod("credit_card");
      const wallet = sumByMethod("wallet");
      const bank = sumByMethod("bank_transfer");
      const total = cash + card + wallet + bank;

      const expenses = shiftTx
        .filter((tx: any) => tx.type === "EXPENSE")
        .reduce((sum: number, tx: any) => sum + tx.amount, 0);
      const deposits = shiftTx
        .filter((tx: any) => tx.type === "DEPOSIT")
        .reduce((sum: number, tx: any) => sum + tx.amount, 0);
      const withdrawals = shiftTx
        .filter((tx: any) => tx.type === "WITHDRAWAL")
        .reduce((sum: number, tx: any) => sum + tx.amount, 0);

      const expectedBalance = shift.openingBalance + cash + deposits - expenses - withdrawals;
      const actualBalance = reconciliation?.actualCash ?? submission?.cashTotal ?? shift.closingBalance ?? 0;
      const difference = actualBalance - expectedBalance;

      return {
        shift,
        submission,
        reconciliation,
        salesSummary: {
          total,
          cash,
          card,
          wallet,
          bank,
          orderCount: paidOrders.length,
          returnCount: paidOrders.filter((o: any) => o.status === "REFUNDED").length,
          discountTotal: paidOrders.reduce((sum: number, o: any) => sum + Number(o.discount || 0), 0),
          taxTotal: paidOrders.reduce((sum: number, o: any) => sum + Number(o.tax || 0), 0),
        },
        expenses,
        deposits,
        withdrawals,
        expectedBalance,
        difference,
      };
    });
  }, [shifts, blindDropSubmissions, reconciliationEntries, financialTransactions, allOrders]);

  const filteredRecords = useMemo(() => {
    let records = [...closingRecords];

    if (dateFilter) {
      records = records.filter((r) => {
        const shiftDate = new Date(r.shift.startTime).toISOString().split("T")[0];
        return shiftDate === dateFilter;
      });
    }

    if (statusFilter !== "all") {
      records = records.filter((r) => r.shift.status === statusFilter);
    }

    if (typeFilter !== "all") {
      records = records.filter((r) => r.shift.type === typeFilter);
    }

    // فلترة حسب السنة المالية
    if (fiscalYearFilter !== "all") {
      const selectedFY = fiscalYears.find((fy) => fy.id.toString() === fiscalYearFilter);
      if (selectedFY) {
        const fyStart = new Date(selectedFY.start_date);
        const fyEnd = new Date(selectedFY.end_date);
        records = records.filter((r) => {
          const shiftDate = new Date(r.shift.startTime);
          return shiftDate >= fyStart && shiftDate <= fyEnd;
        });
      }
    }

    if (search) {
      const lower = search.toLowerCase();
      records = records.filter(
        (r) =>
          r.shift.cashierId.toLowerCase().includes(lower) ||
          r.shift.id.toLowerCase().includes(lower)
      );
    }

    return records.sort(
      (a, b) => new Date(b.shift.startTime).getTime() - new Date(a.shift.startTime).getTime()
    );
  }, [closingRecords, dateFilter, statusFilter, typeFilter, fiscalYearFilter, fiscalYears, search]);

  const summary = useMemo(() => {
    const total = filteredRecords.length;
    const closed = filteredRecords.filter((r) => r.shift.status === "CLOSED").length;
    const open = total - closed;
    const totalSales = filteredRecords.reduce((sum, r) => sum + r.salesSummary.total, 0);
    const totalExpenses = filteredRecords.reduce((sum, r) => sum + r.expenses, 0);
    const totalVariance = filteredRecords.reduce((sum, r) => sum + r.difference, 0);
    const shortageCount = filteredRecords.filter((r) => r.difference < -0.01).length;
    const overageCount = filteredRecords.filter((r) => r.difference > 0.01).length;

    return { total, closed, open, totalSales, totalExpenses, totalVariance, shortageCount, overageCount };
  }, [filteredRecords]);

  const handlePrint = (record: ShiftClosingRecord) => {
    const branch = branches.find((b: any) => b.id === record.shift.cashierId);
    const content = `
      <div dir="rtl" style="font-family: 'Cairo', sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
        <h1 style="text-align: center; color: #a30000; border-bottom: 2px solid #a30000; padding-bottom: 10px;">تقرير إغلاق الوردية</h1>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
          <div><strong>رقم الوردية:</strong> ${record.shift.id}</div>
          <div><strong>النوع:</strong> ${SHIFT_TYPE_LABELS[record.shift.type] || record.shift.type}</div>
          <div><strong>الكاشير:</strong> ${record.shift.cashierId}</div>
          <div><strong>الحالة:</strong> ${record.shift.status === "CLOSED" ? "مغلق" : "مفتوح"}</div>
          <div><strong>وقت البداية:</strong> ${new Date(record.shift.startTime).toLocaleString("ar")}</div>
          <div><strong>وقت النهاية:</strong> ${record.shift.endTime ? new Date(record.shift.endTime).toLocaleString("ar") : "-"}</div>
        </div>
        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;"/>
        <h2 style="color: #374151;">ملخص المبيعات</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>الكاش</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${record.salesSummary.cash.toFixed(2)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>البطاقات</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${record.salesSummary.card.toFixed(2)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>المحافظ</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${record.salesSummary.wallet.toFixed(2)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>البنكي</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${record.salesSummary.bank.toFixed(2)}</td></tr>
          <tr style="background: #f3f4f6;"><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>الإجمالي</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>₪${record.salesSummary.total.toFixed(2)}</strong></td></tr>
        </table>
        <h2 style="color: #374151;">تفاصيل الصندوق</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">الرصيد الافتتاحي</td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${record.shift.openingBalance.toFixed(2)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">+ المبيعات النقدية</td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${record.salesSummary.cash.toFixed(2)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">+ الإيداعات</td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${record.deposits.toFixed(2)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">- المصروفات</td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${record.expenses.toFixed(2)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">- السحوبات</td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${record.withdrawals.toFixed(2)}</td></tr>
          <tr style="background: #f3f4f6;"><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>الرصيد المتوقع</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>₪${record.expectedBalance.toFixed(2)}</strong></td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">الرصيد الفعلي</td><td style="padding: 8px; border: 1px solid #e5e7eb;">₪${(record.reconciliation?.actualCash ?? record.shift.closingBalance ?? 0).toFixed(2)}</td></tr>
          <tr style="background: ${Math.abs(record.difference) < 0.01 ? '#d1fae5' : '#fee2e2'};"><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>الفارق</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>${record.difference >= 0 ? "+" : ""}₪${record.difference.toFixed(2)}</strong></td></tr>
        </table>
        <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center;">
          <div><p>___________________</p><p>توقيع الكاشير</p></div>
          <div><p>___________________</p><p>توقيع المدير</p></div>
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

  const handleExportCSV = () => {
    const headers = ["رقم الوردية", "الكاشير", "النوع", "التاريخ", "البداية", "النهاية", "المبيعات", "النقدية", "البطاقات", "المحافظ", "المصروفات", "الرصيد المتوقع", "الرصيد الفعلي", "الفارق", "الحالة"];
    const rows = filteredRecords.map((r) => [
      r.shift.id,
      r.shift.cashierId,
      SHIFT_TYPE_LABELS[r.shift.type] || r.shift.type,
      new Date(r.shift.startTime).toLocaleDateString("ar"),
      new Date(r.shift.startTime).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }),
      r.shift.endTime ? new Date(r.shift.endTime).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }) : "-",
      r.salesSummary.total.toFixed(2),
      r.salesSummary.cash.toFixed(2),
      r.salesSummary.card.toFixed(2),
      r.salesSummary.wallet.toFixed(2),
      r.expenses.toFixed(2),
      r.expectedBalance.toFixed(2),
      (r.reconciliation?.actualCash ?? r.shift.closingBalance ?? 0).toFixed(2),
      r.difference.toFixed(2),
      r.shift.status === "CLOSED" ? "مغلق" : "مفتوح",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shift-closings-${dateFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getVarianceColor = (v: number) => {
    if (Math.abs(v) < 0.01) return "var(--o2-success-text)";
    if (v < 0) return "var(--o2-brand-text)";
    return "var(--o2-warning-text)";
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--o2-bg)" }} dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
            <Clock className="w-6 h-6" style={{ color: "var(--o2-brand-text)" }} />
            سجل إغلاق الورديات
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--o2-muted)" }}>
            عرض وطباعة تفاصيل جميع عمليات إغلاق الورديات
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition"
          style={{ backgroundColor: "var(--o2-surface)", color: "var(--o2-text)", border: "1px solid var(--o2-border)" }}
        >
          <Download className="w-4 h-4" />
          تصدير CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--o2-muted)" }}>
            <FileText className="w-4 h-4" />
            <span className="text-xs font-medium">إجمالي الورديات</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--o2-text)" }}>{summary.total}</p>
          <p className="text-xs mt-1" style={{ color: "var(--o2-muted)" }}>
            {summary.closed} مغلقة / {summary.open} مفتوحة
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--o2-success-text)" }}>
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">إجمالي المبيعات</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--o2-success-text)" }}>
            {formatCurrency(summary.totalSales)}
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--o2-brand-text)" }}>
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium">المصروفات</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--o2-brand-text)" }}>
            {formatCurrency(summary.totalExpenses)}
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--o2-muted)" }}>
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">الفرقات</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--o2-text)" }}>
            {summary.shortageCount + summary.overageCount}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--o2-muted)" }}>
            {summary.shortageCount} عجز / {summary.overageCount} فائض
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--o2-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالكاشير أو رقم الوردية..."
            className="w-full pr-10 pl-4 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)", borderWidth: 1 }}
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)", borderWidth: 1 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)", borderWidth: 1 }}
        >
          <option value="all">جميع الحالات</option>
          <option value="OPEN">مفتوح</option>
          <option value="CLOSED">مغلق</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)", borderWidth: 1 }}
        >
          <option value="all">جميع الأنواع</option>
          <option value="MORNING">صباحي</option>
          <option value="EVENING">مسائي</option>
          <option value="NIGHT">ليلي</option>
        </select>
        <select
          value={fiscalYearFilter}
          onChange={(e) => setFiscalYearFilter(e.target.value)}
          className="px-4 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)", borderWidth: 1 }}
        >
          <option value="all">جميع السنوات المالية</option>
          {fiscalYears.map((fy) => (
            <option key={fy.id} value={fy.id.toString()}>
              {fy.name} {fy.status === "closed" ? "(مغلقة)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: "var(--o2-surface-raised)" }}>
              <tr className="border-b" style={{ borderColor: "var(--o2-border)" }}>
                <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--o2-muted)" }}>رقم الوردية</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--o2-muted)" }}>الكاشير</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--o2-muted)" }}>النوع</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--o2-muted)" }}>البداية</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--o2-muted)" }}>النهاية</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--o2-muted)" }}>المبيعات</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--o2-muted)" }}>المتوقع</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--o2-muted)" }}>الفعلي</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--o2-muted)" }}>الفارق</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--o2-muted)" }}>الحالة</th>
                <th className="px-4 py-3 text-right font-medium w-20" style={{ color: "var(--o2-muted)" }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center" style={{ color: "var(--o2-muted)" }}>
                    لا توجد سجلات إغلاق وديات
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const statusConfig = STATUS_CONFIG[record.shift.status];
                  const StatusIcon = statusConfig.icon;
                  const isExpanded = expandedId === record.shift.id;

                  return (
                    <motion.tr
                      key={record.shift.id}
                      layout
                      className="border-b transition"
                      style={{ borderColor: "var(--o2-border)" }}
                    >
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--o2-text)" }}>
                        {record.shift.id.slice(0, 12)}...
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--o2-surface-raised)" }}>
                            <User className="w-4 h-4" style={{ color: "var(--o2-muted)" }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: "var(--o2-text)" }}>{getCashierName(record.shift.cashierId)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--o2-text)" }}>
                        {SHIFT_TYPE_LABELS[record.shift.type] || record.shift.type}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--o2-text)" }}>
                        {new Date(record.shift.startTime).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--o2-text)" }}>
                        {record.shift.endTime
                          ? new Date(record.shift.endTime).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: "var(--o2-success-text)" }}>
                        {formatCurrency(record.salesSummary.total)}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--o2-text)" }}>
                        {formatCurrency(record.expectedBalance)}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: "var(--o2-text)" }}>
                        {formatCurrency(record.reconciliation?.actualCash ?? record.shift.closingBalance ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold" style={{ color: getVarianceColor(record.difference) }}>
                          {record.difference >= 0 ? "+" : ""}{formatCurrency(record.difference)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                          style={{ color: statusConfig.color, backgroundColor: statusConfig.bg, borderColor: statusConfig.color }}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : record.shift.id)}
                            className="p-1.5 rounded-lg transition"
                            style={{ color: "var(--o2-muted)" }}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handlePrint(record)}
                            className="p-1.5 rounded-lg transition"
                            style={{ color: "var(--o2-muted)" }}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Detail View */}
      <AnimatePresence>
        {expandedId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 rounded-xl border overflow-hidden"
            style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}
          >
            {(() => {
              const record = filteredRecords.find((r) => r.shift.id === expandedId);
              if (!record) return null;

              return (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
                      <FileText className="w-5 h-5" style={{ color: "var(--o2-brand-text)" }} />
                      تفاصيل الوردية - {getCashierName(record.shift.cashierId)}
                    </h3>
                    <button
                      onClick={() => setExpandedId(null)}
                      className="p-2 rounded-xl transition"
                      style={{ color: "var(--o2-muted)" }}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Shift Info */}
                    <div className="rounded-xl p-4 border" style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)" }}>
                      <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
                        <Clock className="w-4 h-4" style={{ color: "var(--o2-brand-text)" }} />
                        معلومات الوردية
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>رقم الوردية</span>
                          <span className="font-bold" style={{ color: "var(--o2-text)" }}>{record.shift.id.slice(0, 12)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>اسم الكاشير</span>
                          <span className="font-bold" style={{ color: "var(--o2-text)" }}>{getCashierName(record.shift.cashierId)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>النوع</span>
                          <span className="font-bold" style={{ color: "var(--o2-text)" }}>{SHIFT_TYPE_LABELS[record.shift.type]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>البداية</span>
                          <span style={{ color: "var(--o2-text)" }}>{new Date(record.shift.startTime).toLocaleTimeString("ar")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>النهاية</span>
                          <span style={{ color: "var(--o2-text)" }}>{record.shift.endTime ? new Date(record.shift.endTime).toLocaleTimeString("ar") : "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>المدة</span>
                          <span style={{ color: "var(--o2-text)" }}>
                            {record.shift.endTime
                              ? `${Math.round((new Date(record.shift.endTime).getTime() - new Date(record.shift.startTime).getTime()) / 60000)} دقيقة`
                              : "نشطة"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sales Breakdown */}
                    <div className="rounded-xl p-4 border" style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)" }}>
                      <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
                        <DollarSign className="w-4 h-4" style={{ color: "var(--o2-success-text)" }} />
                        تفصيل المبيعات
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>الكاش</span>
                          <span className="font-bold" style={{ color: "var(--o2-success-text)" }}>{formatCurrency(record.salesSummary.cash)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>البطاقات</span>
                          <span className="font-bold" style={{ color: "var(--o2-text)" }}>{formatCurrency(record.salesSummary.card)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>المحافظ</span>
                          <span className="font-bold" style={{ color: "var(--o2-text)" }}>{formatCurrency(record.salesSummary.wallet)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>البنكي</span>
                          <span className="font-bold" style={{ color: "var(--o2-text)" }}>{formatCurrency(record.salesSummary.bank)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t" style={{ borderColor: "var(--o2-border)" }}>
                          <span style={{ color: "var(--o2-muted)" }}>عدد الطلبات</span>
                          <span className="font-bold" style={{ color: "var(--o2-text)" }}>{record.salesSummary.orderCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>الخصومات</span>
                          <span style={{ color: "var(--o2-text)" }}>{formatCurrency(record.salesSummary.discountTotal)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t font-bold" style={{ borderColor: "var(--o2-border)" }}>
                          <span style={{ color: "var(--o2-text)" }}>إجمالي المبيعات</span>
                          <span style={{ color: "var(--o2-success-text)" }}>{formatCurrency(record.salesSummary.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cash Drawer */}
                    <div className="rounded-xl p-4 border" style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)" }}>
                      <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
                        <Wallet className="w-4 h-4" style={{ color: "var(--o2-warning-text)" }} />
                        تفاصيل الصندوق
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>الرصيد الافتتاحي</span>
                          <span className="font-bold" style={{ color: "var(--o2-text)" }}>{formatCurrency(record.shift.openingBalance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>+ الإيداعات</span>
                          <span style={{ color: "var(--o2-success-text)" }}>{formatCurrency(record.deposits)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>- المصروفات</span>
                          <span style={{ color: "var(--o2-brand-text)" }}>{formatCurrency(record.expenses)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>- السحوبات</span>
                          <span style={{ color: "var(--o2-brand-text)" }}>{formatCurrency(record.withdrawals)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t" style={{ borderColor: "var(--o2-border)" }}>
                          <span style={{ color: "var(--o2-muted)" }}>المتوقع</span>
                          <span className="font-bold" style={{ color: "var(--o2-text)" }}>{formatCurrency(record.expectedBalance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>الفعلي</span>
                          <span className="font-bold" style={{ color: "var(--o2-text)" }}>
                            {formatCurrency(record.reconciliation?.actualCash ?? record.shift.closingBalance ?? 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Variance Summary */}
                    <div className="rounded-xl p-4 border" style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)" }}>
                      <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
                        <AlertTriangle className="w-4 h-4" style={{ color: "var(--o2-brand-text)" }} />
                        ملخص الفروقات
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>النقدية</span>
                          <span className="font-bold" style={{ color: getVarianceColor(record.reconciliation?.cashVariance ?? 0) }}>
                            {record.reconciliation ? `${record.reconciliation.cashVariance >= 0 ? "+" : ""}${formatCurrency(record.reconciliation.cashVariance)}` : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>البطاقات</span>
                          <span className="font-bold" style={{ color: getVarianceColor(record.reconciliation?.cardsVariance ?? 0) }}>
                            {record.reconciliation ? `${record.reconciliation.cardsVariance >= 0 ? "+" : ""}${formatCurrency(record.reconciliation.cardsVariance)}` : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--o2-muted)" }}>المحافظ</span>
                          <span className="font-bold" style={{ color: getVarianceColor(record.reconciliation?.walletsVariance ?? 0) }}>
                            {record.reconciliation ? `${record.reconciliation.walletsVariance >= 0 ? "+" : ""}${formatCurrency(record.reconciliation.walletsVariance)}` : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t" style={{ borderColor: "var(--o2-border)" }}>
                          <span style={{ color: "var(--o2-muted)" }}>الإجمالي</span>
                          <span className="font-bold text-lg" style={{ color: getVarianceColor(record.difference) }}>
                            {record.difference >= 0 ? "+" : ""}{formatCurrency(record.difference)}
                          </span>
                        </div>
                        {record.reconciliation && (
                          <div className="pt-2 border-t" style={{ borderColor: "var(--o2-border)" }}>
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                              style={{
                                color: record.reconciliation.status === "BALANCED" ? "var(--o2-success-text)" : record.reconciliation.status === "SHORTAGE" ? "var(--o2-brand-text)" : "var(--o2-warning-text)",
                                backgroundColor: record.reconciliation.status === "BALANCED" ? "var(--o2-success-soft)" : record.reconciliation.status === "SHORTAGE" ? "var(--o2-danger-soft)" : "var(--o2-warning-soft)",
                              }}
                            >
                              {record.reconciliation.status === "BALANCED" ? "مطابق" : record.reconciliation.status === "SHORTAGE" ? "عجز" : "فائض"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods Summary */}
                  <div className="rounded-xl p-4 border" style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)" }}>
                    <h4 className="text-sm font-bold mb-3" style={{ color: "var(--o2-text)" }}>وسائل الدفع</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { label: "نقداً", value: record.salesSummary.cash, icon: DollarSign, color: "var(--o2-success-text)" },
                        { label: "بطاقات ائتمان", value: record.salesSummary.card, icon: CreditCard, color: "var(--o2-info)" },
                        { label: "محافظ رقمية", value: record.salesSummary.wallet, icon: Smartphone, color: "#8b5cf6" },
                        { label: "تحويل بنكي", value: record.salesSummary.bank, icon: ArrowUpRight, color: "var(--o2-warning-text)" },
                        { label: "الإجمالي", value: record.salesSummary.total, icon: DollarSign, color: "var(--o2-text)" },
                      ].map((pm) => (
                        <div key={pm.label} className="text-center p-3 rounded-lg border" style={{ borderColor: "var(--o2-border)" }}>
                          <pm.icon className="w-5 h-5 mx-auto mb-1" style={{ color: pm.color }} />
                          <p className="text-[10px]" style={{ color: "var(--o2-muted)" }}>{pm.label}</p>
                          <p className="text-sm font-bold" style={{ color: pm.color }}>{formatCurrency(pm.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
