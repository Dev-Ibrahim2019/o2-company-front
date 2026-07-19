import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle2, XCircle, DollarSign, CreditCard, Smartphone,
  Clock, User, ArrowDownToLine, FileText, TrendingUp, TrendingDown,
} from "lucide-react";
import { useApp } from "../../../store";
import { formatCurrency } from "../../types/salesInvoice";
import type { ReconciliationEntry } from "../../types";

const STATUS_CONFIG = {
  BALANCED: {
    label: "مطابق",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: CheckCircle2,
  },
  SHORTAGE: {
    label: "عجز",
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: XCircle,
  },
  OVERAGE: {
    label: "فائض",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: TrendingUp,
  },
  PENDING: {
    label: "بانتظار المراجعة",
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    icon: Clock,
  },
};

export const ReconciliationBoard = () => {
  const store = useApp();
  const { reconciliationEntries, blindDropSubmissions } = store;
  const shifts = (store as any).shifts ?? [];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);

  const filteredEntries = useMemo(() => {
    let entries = [...reconciliationEntries];

    // Date filter
    if (dateFilter) {
      entries = entries.filter((entry) => {
        const entryDate = new Date(entry.startTime).toISOString().split("T")[0];
        return entryDate === dateFilter;
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      entries = entries.filter((entry) => entry.status === statusFilter);
    }

    // Search filter
    if (search) {
      const lowerSearch = search.toLowerCase();
      entries = entries.filter(
        (entry) =>
          entry.cashierName.toLowerCase().includes(lowerSearch) ||
          entry.shiftId.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort by most recent first
    return entries.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }, [reconciliationEntries, dateFilter, statusFilter, search]);

  const summary = useMemo(() => {
    const total = filteredEntries.length;
    const balanced = filteredEntries.filter((e) => e.status === "BALANCED").length;
    const shortage = filteredEntries.filter((e) => e.status === "SHORTAGE").length;
    const overage = filteredEntries.filter((e) => e.status === "OVERAGE").length;
    const pending = filteredEntries.filter((e) => e.status === "PENDING").length;

    const totalVariance = filteredEntries.reduce((sum, e) => sum + e.totalVariance, 0);
    const totalShortage = filteredEntries
      .filter((e) => e.status === "SHORTAGE")
      .reduce((sum, e) => sum + Math.abs(e.totalVariance), 0);
    const totalOverage = filteredEntries
      .filter((e) => e.status === "OVERAGE")
      .reduce((sum, e) => sum + e.totalVariance, 0);

    return {
      total,
      balanced,
      shortage,
      overage,
      pending,
      totalVariance,
      totalShortage,
      totalOverage,
    };
  }, [filteredEntries]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) < 0.01) return "text-emerald-500";
    if (variance < 0) return "text-red-500";
    return "text-amber-500";
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-red-500" />
          لوحة المتابعة المالية والتسويات
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          مراجعة وتدقيق التحصيلات المالية لجميع الورديات
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-medium">إجمالي الورديات</span>
          </div>
          <p className="text-2xl font-bold text-white">{summary.total}</p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-emerald-500/20 p-4">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-medium">مطابقة</span>
          </div>
          <p className="text-2xl font-bold text-emerald-500">{summary.balanced}</p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-red-500/20 p-4">
          <div className="flex items-center gap-2 text-red-500 mb-1">
            <XCircle className="w-4 h-4" />
            <span className="text-xs font-medium">عجز</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{summary.shortage}</p>
          <p className="text-xs text-red-500/70 mt-1">{formatCurrency(summary.totalShortage)}</p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-amber-500/20 p-4">
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">فائض</span>
          </div>
          <p className="text-2xl font-bold text-amber-500">{summary.overage}</p>
          <p className="text-xs text-amber-500/70 mt-1">{formatCurrency(summary.totalOverage)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الوردية..."
            className="w-full pr-10 pl-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none"
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none"
        >
          <option value="all">جميع الحالات</option>
          <option value="BALANCED">مطابق</option>
          <option value="SHORTAGE">عجز</option>
          <option value="OVERAGE">فائض</option>
          <option value="PENDING">بانتظار المراجعة</option>
        </select>
      </div>

      {/* Reconciliation Table */}
      <div className="bg-slate-900 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 border-b border-white/10">
            <tr>
              <th className="px-4 py-3 text-right font-medium text-slate-400">الكاشير</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">رقم الوردية</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">النوع</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">البداية</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">النهاية</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">النقدية (فعلي/متوقع)</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">البطاقات (فعلي/متوقع)</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">المحافظ (فعلي/متوقع)</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">الفارق</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">الحالة</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                  لا توجد تسويات مسجلة لهذا التاريخ
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => {
                const config = STATUS_CONFIG[entry.status];
                const StatusIcon = config.icon;
                const isExpanded = expandedId === entry.id;

                return (
                  <motion.tr
                    key={entry.id}
                    layout
                    className={`hover:bg-white/[0.02] ${isExpanded ? "bg-white/[0.02]" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="text-xs font-bold text-white">{entry.cashierName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{entry.shiftId}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {entry.shiftType === "MORNING" ? "صباحي" : entry.shiftType === "EVENING" ? "مسائي" : "ليلي"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {new Date(entry.startTime).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {entry.endTime ? new Date(entry.endTime).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <span className="text-white font-bold">{formatCurrency(entry.actualCash)}</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-slate-400">{formatCurrency(entry.expectedCash)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <span className="text-white font-bold">{formatCurrency(entry.actualCards)}</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-slate-400">{formatCurrency(entry.expectedCards)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <span className="text-white font-bold">{formatCurrency(entry.actualWallets)}</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-slate-400">{formatCurrency(entry.expectedWallets)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${getVarianceColor(entry.totalVariance)}`}>
                        {entry.totalVariance >= 0 ? "+" : ""}{formatCurrency(entry.totalVariance)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} ${config.border} border`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleExpand(entry.id)}
                        className="p-1.5 hover:bg-white/5 rounded-lg transition"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded Detail View */}
      <AnimatePresence>
        {expandedId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 bg-slate-900 rounded-xl border border-white/10 overflow-hidden"
          >
            {(() => {
              const entry = filteredEntries.find((e) => e.id === expandedId);
              if (!entry) return null;

              const blindDrop = blindDropSubmissions.find(
                (sub) => sub.shiftId === entry.shiftId
              );
              const shift = shifts.find((s) => s.id === entry.shiftId);

              return (
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-red-500" />
                    تفاصيل الوردية - {entry.cashierName}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Cash Breakdown */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                      <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        النقدية
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">المبلغ الفعلي (مدفوع عمياناً)</span>
                          <span className="text-white font-bold">{formatCurrency(entry.actualCash)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">المبلغ المتوقع (من المبيعات)</span>
                          <span className="text-slate-300">{formatCurrency(entry.expectedCash)}</span>
                        </div>
                        <div className="pt-2 border-t border-white/5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">الفارق</span>
                            <span className={`font-bold ${getVarianceColor(entry.cashVariance)}`}>
                              {entry.cashVariance >= 0 ? "+" : ""}{formatCurrency(entry.cashVariance)}
                            </span>
                          </div>
                        </div>
                        {blindDrop && (
                          <div className="pt-2 border-t border-white/5">
                            <p className="text-[10px] text-slate-500 mb-1">تفاصيل الفئات:</p>
                            <div className="grid grid-cols-2 gap-1">
                              {blindDrop.denominations
                                .filter((d) => d.count > 0)
                                .map((d) => (
                                  <div key={d.value} className="text-[10px] text-slate-400">
                                    ₪{d.value}: {d.count} × {d.value} = {formatCurrency(d.value * d.count)}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cards Breakdown */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                      <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-500" />
                        بطاقات الائتمان
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">المبلغ الفعلي</span>
                          <span className="text-white font-bold">{formatCurrency(entry.actualCards)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">المبلغ المتوقع</span>
                          <span className="text-slate-300">{formatCurrency(entry.expectedCards)}</span>
                        </div>
                        <div className="pt-2 border-t border-white/5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">الفارق</span>
                            <span className={`font-bold ${getVarianceColor(entry.cardsVariance)}`}>
                              {entry.cardsVariance >= 0 ? "+" : ""}{formatCurrency(entry.cardsVariance)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Wallets Breakdown */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                      <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-purple-500" />
                        المحافظ الرقمية
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">المبلغ الفعلي</span>
                          <span className="text-white font-bold">{formatCurrency(entry.actualWallets)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">المبلغ المتوقع</span>
                          <span className="text-slate-300">{formatCurrency(entry.expectedWallets)}</span>
                        </div>
                        <div className="pt-2 border-t border-white/5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">الفارق</span>
                            <span className={`font-bold ${getVarianceColor(entry.walletsVariance)}`}>
                              {entry.walletsVariance >= 0 ? "+" : ""}{formatCurrency(entry.walletsVariance)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Variance Summary */}
                  <div className="mt-6 bg-slate-800/30 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">الفارق الإجمالي</span>
                      <span className={`text-xl font-bold ${getVarianceColor(entry.totalVariance)}`}>
                        {entry.totalVariance >= 0 ? "+" : ""}{formatCurrency(entry.totalVariance)}
                      </span>
                    </div>
                    {entry.status !== "BALANCED" && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-xs text-slate-500">
                          {entry.status === "SHORTAGE" ? (
                            <>
                              <span className="text-red-500 font-bold">عجز:</span> سيتم تسجيل المبلغ في حساب "ذمم موظفين - عجز الكاشير"
                            </>
                          ) : (
                            <>
                              <span className="text-amber-500 font-bold">فائض:</span> سيتم تسجيل المبلغ في حساب "إيرادات أخرى - فروقات صناديق"
                            </>
                          )}
                        </p>
                      </div>
                    )}
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
