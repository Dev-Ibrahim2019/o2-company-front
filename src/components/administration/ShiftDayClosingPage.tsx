import { useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  Clock3,
  Download,
  FileText,
  Filter,
  Lock,
  Printer,
  ReceiptText,
  Search,
  Sparkles,
  Unlock,
  UserRound,
  Wallet,
} from "lucide-react";
import { useApp } from "../../../store";
import { formatCurrency } from "../../types/salesInvoice";

type ClosingRecordType = "shift" | "day";

interface ClosingRecord {
  id: string;
  type: ClosingRecordType;
  closureNo: string;
  title: string;
  closedAt: string;
  cashierName: string;
  branchName: string;
  shiftNumber: string;
  startTime?: string;
  endTime?: string;
  totalSales: number;
  totalRevenue: number;
  invoiceCount: number;
  returnCount: number;
  discountAmount: number;
  taxAmount: number;
  paymentBreakdown: Array<{ method: string; amount: number }>;
  expectedCash: number;
  actualCash: number;
  difference: number;
  notes: string;
  status: "open" | "closed";
  raw: unknown;
}

const normalizeDate = (value: unknown) => {
  const date = value ? new Date(value as string | Date) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const formatDateTime = (value: unknown) => {
  const date = normalizeDate(value);
  return date.toLocaleString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const ShiftDayClosingPage = () => {
  const {
    currentUser,
    shifts,
    blindDropSubmissions,
    reconciliationEntries,
    businessDayState,
    openBusinessDay,
    closeBusinessDay,
    orders,
    branches,
  } = useApp();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const records = useMemo<ClosingRecord[]>(() => {
    const branchLookup = new Map(branches.map((branch) => [branch.id, branch.name]));

    const shiftRecords: ClosingRecord[] = shifts.map((shift) => {
      const submission = blindDropSubmissions.find((entry) => entry.shiftId === shift.id);
      const reconciliation = reconciliationEntries.find((entry) => entry.shiftId === shift.id);
      const shiftOrders = orders.filter((order) => {
        const orderDate = normalizeDate(order.created_at ?? order.createdAt);
        const shiftStart = normalizeDate(shift.startTime);
        const shiftEnd = shift.endTime ? normalizeDate(shift.endTime) : new Date();
        const sameCashier = Number(order.cashier_id ?? order.cashierId) === Number(shift.cashierId);
        return sameCashier && orderDate >= shiftStart && orderDate <= shiftEnd;
      });

      const paymentBreakdown = shiftOrders.reduce<Array<{ method: string; amount: number }>>((acc, order) => {
        const payments = Array.isArray(order.payments) ? order.payments : [];
        payments.forEach((payment) => {
          const method = payment.payment_method ?? payment.method ?? "cash";
          const amount = Number(payment.amount ?? 0);
          const existing = acc.find((item) => item.method === method);
          if (existing) existing.amount += amount;
          else acc.push({ method, amount });
        });
        return acc;
      }, []);

      const totalSales = shiftOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const totalRevenue = totalSales;
      const invoiceCount = shiftOrders.filter((order) => order.status === "paid" || order.status === "COMPLETED").length;
      const returnCount = shiftOrders.filter((order) => order.status === "REFUNDED" || order.status === "CANCELED").length;
      const discountAmount = shiftOrders.reduce((sum, order) => sum + Number(order.discount || 0), 0);
      const taxAmount = shiftOrders.reduce((sum, order) => sum + Number(order.tax || 0), 0);
      const expectedCash = reconciliation?.expectedCash ?? shift.openingBalance;
      const actualCash = submission?.cashTotal ?? shift.closingBalance ?? shift.openingBalance;
      const difference = actualCash - expectedCash;

      return {
        id: shift.id,
        type: "shift" as const,
        closureNo: `SH-${shift.id}`,
        title: `إغلاق وردية ${shift.type === "MORNING" ? "صباحية" : shift.type === "EVENING" ? "مسائية" : "ليلية"}`,
        closedAt: shift.endTime ? formatDateTime(shift.endTime) : formatDateTime(shift.startTime),
        cashierName: shift.cashierId,
        branchName: branchLookup.get(String(shift.cashierId)) ?? "—",
        shiftNumber: shift.id,
        startTime: formatDateTime(shift.startTime),
        endTime: shift.endTime ? formatDateTime(shift.endTime) : undefined,
        totalSales,
        totalRevenue,
        invoiceCount,
        returnCount,
        discountAmount,
        taxAmount,
        paymentBreakdown,
        expectedCash,
        actualCash,
        difference,
        notes: reconciliation ? `الفارق ${difference >= 0 ? "+" : ""}${difference.toFixed(2)}` : "لا توجد ملاحظات بعد",
        status: shift.status === "CLOSED" ? "closed" : "open",
        raw: shift,
      };
    });

    const dayRecord: ClosingRecord | null = businessDayState
      ? {
          id: businessDayState.id,
          type: "day" as const,
          closureNo: `DAY-${businessDayState.date}`,
          title: "إغلاق اليوم المحاسبي",
          closedAt: businessDayState.closedAt ? formatDateTime(businessDayState.closedAt) : formatDateTime(businessDayState.openedAt ?? new Date()),
          cashierName: businessDayState.closedBy ?? businessDayState.openedBy ?? currentUser?.name ?? "—",
          branchName: "الفرع الحالي",
          shiftNumber: businessDayState.date,
          startTime: businessDayState.openedAt ? formatDateTime(businessDayState.openedAt) : undefined,
          endTime: businessDayState.closedAt ? formatDateTime(businessDayState.closedAt) : undefined,
          totalSales: businessDayState.totalSales,
          totalRevenue: businessDayState.totalRevenue,
          invoiceCount: businessDayState.invoiceCount,
          returnCount: businessDayState.returnCount,
          discountAmount: businessDayState.discountTotal,
          taxAmount: businessDayState.taxTotal,
          paymentBreakdown: [],
          expectedCash: 0,
          actualCash: 0,
          difference: 0,
          notes: businessDayState.closingNote ?? businessDayState.openingNote ?? "",
          status: businessDayState.status === "CLOSED" ? "closed" : "open",
          raw: businessDayState,
        }
      : null;

    return dayRecord ? [...shiftRecords, dayRecord] : shiftRecords;
  }, [branches, blindDropSubmissions, businessDayState, currentUser?.name, orders, reconciliationEntries, shifts]);

  const filteredRecords = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch =
        !keyword ||
        record.title.toLowerCase().includes(keyword) ||
        record.cashierName.toLowerCase().includes(keyword) ||
        record.closureNo.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesType = typeFilter === "all" || record.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [query, records, statusFilter, typeFilter]);

  const selectedRecord = filteredRecords.find((record) => record.id === selectedId) ?? filteredRecords[0] ?? null;

  const handleExportCsv = () => {
    const rows = [
      ["رقم الإغلاق", "النوع", "الحالة", "التاريخ", "الكاشير", "الفرع", "إجمالي المبيعات", "الإيرادات", "عدد الفواتير", "عدد المرتجعات", "الخصومات", "الضرائب", "الفارق"],
      ...filteredRecords.map((record) => [
        record.closureNo,
        record.type === "day" ? "يوم" : "وردية",
        record.status === "closed" ? "مغلق" : "مفتوح",
        record.closedAt,
        record.cashierName,
        record.branchName,
        record.totalSales,
        record.totalRevenue,
        record.invoiceCount,
        record.returnCount,
        record.discountAmount,
        record.taxAmount,
        record.difference,
      ]),
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "shift-day-closing.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-[var(--o2-bg)] text-[var(--o2-text)] p-4 md:p-6" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-[color:var(--o2-border)] bg-[var(--o2-surface)] p-6 shadow-[var(--o2-card-shadow)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[color:var(--o2-brand-soft)] px-3 py-1 text-sm font-semibold text-[var(--o2-brand-text)]">
                <Sparkles size={16} />
                إدارة الإغلاق المحاسبي
              </div>
              <h1 className="text-2xl font-black">إغلاق الورديات والأيام</h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--o2-muted)]">
                تتبع جميع عمليات الإغلاق على مستوى الورديات واليوم المحاسبي مع تقارير سريعة واحترافية.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => openBusinessDay(currentUser?.id ?? "unknown", "تم فتح اليوم من واجهة الإدارة")}
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-500/20"
              >
                <span className="flex items-center gap-2">
                  <Unlock size={16} />
                  فتح يوم محاسبي
                </span>
              </button>
              <button
                onClick={() => closeBusinessDay(currentUser?.id ?? "unknown", "تم إغلاق اليوم من واجهة الإدارة")}
                className="rounded-xl border border-[color:var(--o2-border)] bg-[var(--o2-surface-raised)] px-4 py-2.5 text-sm font-bold text-[var(--o2-text)] transition hover:bg-[color:var(--o2-surface-muted)]"
              >
                <span className="flex items-center gap-2">
                  <Lock size={16} />
                  إغلاق اليوم الحالي
                </span>
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[1.5rem] border border-[color:var(--o2-border)] bg-[var(--o2-surface)] p-4 shadow-[var(--o2-card-shadow)]">
            <div className="mb-2 flex items-center gap-2 text-[var(--o2-muted)]">
              <CalendarDays size={16} />
              <span className="text-xs font-semibold">الحالة الحالية</span>
            </div>
            <p className="text-xl font-black">{businessDayState?.status === "CLOSED" ? "مغلق" : "مفتوح"}</p>
            <p className="mt-1 text-sm text-[var(--o2-muted)]">{businessDayState?.date ?? "لا يوجد يوم محاسبي"}</p>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--o2-border)] bg-[var(--o2-surface)] p-4 shadow-[var(--o2-card-shadow)]">
            <div className="mb-2 flex items-center gap-2 text-[var(--o2-muted)]">
              <ReceiptText size={16} />
              <span className="text-xs font-semibold">إجمالي المبيعات</span>
            </div>
            <p className="text-xl font-black">{formatCurrency(records.reduce((sum, item) => sum + item.totalSales, 0))}</p>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--o2-border)] bg-[var(--o2-surface)] p-4 shadow-[var(--o2-card-shadow)]">
            <div className="mb-2 flex items-center gap-2 text-[var(--o2-muted)]">
              <Wallet size={16} />
              <span className="text-xs font-semibold">إجمالي الإيرادات</span>
            </div>
            <p className="text-xl font-black">{formatCurrency(records.reduce((sum, item) => sum + item.totalRevenue, 0))}</p>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--o2-border)] bg-[var(--o2-surface)] p-4 shadow-[var(--o2-card-shadow)]">
            <div className="mb-2 flex items-center gap-2 text-[var(--o2-muted)]">
              <FileText size={16} />
              <span className="text-xs font-semibold">عدد العمليات</span>
            </div>
            <p className="text-xl font-black">{records.length}</p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[color:var(--o2-border)] bg-[var(--o2-surface)] p-4 shadow-[var(--o2-card-shadow)]">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-[var(--o2-muted)]">
              <Filter size={16} />
              <span className="text-sm font-semibold">البحث والفلترة</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handlePrint} className="rounded-xl border border-[color:var(--o2-border)] bg-[var(--o2-surface-raised)] px-3 py-2 text-sm font-semibold transition hover:bg-[color:var(--o2-surface-muted)]">
                <span className="flex items-center gap-2">
                  <Printer size={16} />
                  طباعة
                </span>
              </button>
              <button onClick={handleExportCsv} className="rounded-xl border border-[color:var(--o2-border)] bg-[var(--o2-surface-raised)] px-3 py-2 text-sm font-semibold transition hover:bg-[color:var(--o2-surface-muted)]">
                <span className="flex items-center gap-2">
                  <Download size={16} />
                  تصدير CSV
                </span>
              </button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
            <label className="flex items-center gap-2 rounded-2xl border border-[color:var(--o2-border)] bg-[var(--o2-surface-raised)] px-3 py-2">
              <Search size={16} className="text-[var(--o2-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث برقم الإغلاق أو الكاشير"
                className="w-full border-none bg-transparent text-sm outline-none"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-[color:var(--o2-border)] bg-[var(--o2-surface-raised)] px-3 py-2 text-sm outline-none"
            >
              <option value="all">جميع الحالات</option>
              <option value="open">مفتوح</option>
              <option value="closed">مغلق</option>
            </select>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded-2xl border border-[color:var(--o2-border)] bg-[var(--o2-surface-raised)] px-3 py-2 text-sm outline-none"
            >
              <option value="all">الكل</option>
              <option value="shift">ورديات</option>
              <option value="day">أيام</option>
            </select>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="overflow-hidden rounded-[1.5rem] border border-[color:var(--o2-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[color:var(--o2-surface-muted)] text-[var(--o2-muted)]">
                  <tr>
                    <th className="px-3 py-3 text-right">رقم الإغلاق</th>
                    <th className="px-3 py-3 text-right">النوع</th>
                    <th className="px-3 py-3 text-right">الحالة</th>
                    <th className="px-3 py-3 text-right">التاريخ</th>
                    <th className="px-3 py-3 text-right">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-[var(--o2-muted)]">
                        لا توجد عمليات إغلاق تطابق الفلتر
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => (
                      <tr
                        key={record.id}
                        className={`cursor-pointer border-t border-[color:var(--o2-border)] transition hover:bg-[color:var(--o2-surface-muted)] ${selectedRecord?.id === record.id ? "bg-[color:var(--o2-brand-soft)]" : ""}`}
                        onClick={() => setSelectedId(record.id)}
                      >
                        <td className="px-3 py-3 font-semibold">{record.closureNo}</td>
                        <td className="px-3 py-3">{record.type === "day" ? "يوم محاسبي" : "وردية"}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${record.status === "closed" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
                            {record.status === "closed" ? "مغلق" : "مفتوح"}
                          </span>
                        </td>
                        <td className="px-3 py-3">{record.closedAt}</td>
                        <td className="px-3 py-3">{formatCurrency(record.totalRevenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <aside className="rounded-[1.5rem] border border-[color:var(--o2-border)] bg-[var(--o2-surface-raised)] p-4">
              {selectedRecord ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--o2-muted)]">تفاصيل الإغلاق</p>
                    <h2 className="mt-2 text-xl font-black">{selectedRecord.title}</h2>
                    <p className="mt-1 text-sm text-[var(--o2-muted)]">{selectedRecord.closureNo}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[color:var(--o2-border)] bg-[var(--o2-surface)] p-3">
                      <div className="flex items-center gap-2 text-[var(--o2-muted)]">
                        <UserRound size={16} />
                        <span className="text-xs font-bold">الكاشير</span>
                      </div>
                      <p className="mt-2 font-semibold">{selectedRecord.cashierName}</p>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--o2-border)] bg-[var(--o2-surface)] p-3">
                      <div className="flex items-center gap-2 text-[var(--o2-muted)]">
                        <Building2 size={16} />
                        <span className="text-xs font-bold">الفرع</span>
                      </div>
                      <p className="mt-2 font-semibold">{selectedRecord.branchName}</p>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--o2-border)] bg-[var(--o2-surface)] p-3">
                      <div className="flex items-center gap-2 text-[var(--o2-muted)]">
                        <Clock3 size={16} />
                        <span className="text-xs font-bold">وقت البداية</span>
                      </div>
                      <p className="mt-2 text-sm">{selectedRecord.startTime ?? "—"}</p>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--o2-border)] bg-[var(--o2-surface)] p-3">
                      <div className="flex items-center gap-2 text-[var(--o2-muted)]">
                        <Clock3 size={16} />
                        <span className="text-xs font-bold">وقت النهاية</span>
                      </div>
                      <p className="mt-2 text-sm">{selectedRecord.endTime ?? "—"}</p>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-2xl border border-[color:var(--o2-border)] bg-[var(--o2-surface)] p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--o2-muted)]">إجمالي المبيعات</span>
                      <span className="font-semibold">{formatCurrency(selectedRecord.totalSales)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--o2-muted)]">إجمالي الإيرادات</span>
                      <span className="font-semibold">{formatCurrency(selectedRecord.totalRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--o2-muted)]">الخصومات</span>
                      <span className="font-semibold">{formatCurrency(selectedRecord.discountAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--o2-muted)]">الضرائب</span>
                      <span className="font-semibold">{formatCurrency(selectedRecord.taxAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--o2-muted)]">الرصيد النقدي المتوقع</span>
                      <span className="font-semibold">{formatCurrency(selectedRecord.expectedCash)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--o2-muted)]">الرصيد النقدي الفعلي</span>
                      <span className="font-semibold">{formatCurrency(selectedRecord.actualCash)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--o2-muted)]">الفرق</span>
                      <span className={`font-black ${selectedRecord.difference >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatCurrency(selectedRecord.difference)}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[color:var(--o2-border)] bg-[var(--o2-surface)] p-3">
                    <p className="text-xs font-bold text-[var(--o2-muted)]">ملاحظات الإغلاق</p>
                    <p className="mt-2 text-sm leading-7">{selectedRecord.notes || "لا توجد ملاحظات"}</p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--o2-muted)]">
                  اختر عملية إغلاق لعرض التفاصيل
                </div>
              )}
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
};
