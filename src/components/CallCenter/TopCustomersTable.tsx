import React, { useEffect, useState } from "react";
import { TrendingUp, ArrowUpDown, Loader2, Users } from "lucide-react";
import type { TopCustomerRow } from "../../services/callCenterService";
import { callCenterService } from "../../services/callCenterService";

const periodOptions = [
  { value: "today", label: "اليوم" },
  { value: "last_7_days", label: "آخر 7 أيام" },
  { value: "last_30_days", label: "آخر 30 يوم" },
  { value: "week", label: "هذا الأسبوع" },
  { value: "month", label: "هذا الشهر" },
  { value: "last_month", label: "الشهر الماضي" },
  { value: "year", label: "هذه السنة" },
  { value: "custom", label: "فترة مخصصة" },
];

const sortOptions = [
  { value: "total_spent", label: "قيمة الطلبات" },
  { value: "orders_count", label: "عدد الطلبات" },
  { value: "avg_order_value", label: "متوسط الطلب" },
  { value: "cancelled_count", label: "الطلبات الملغاة" },
  { value: "open_complaints", label: "الشكاوى المفتوحة" },
];

export const TopCustomersTable: React.FC = () => {
  const [customers, setCustomers] = useState<TopCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("last_30_days");
  const [sortBy, setSortBy] = useState("total_spent");
  const [sortDir, setSortDir] = useState("desc");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { period, sort_by: sortBy, sort_dir: sortDir, per_page: 25 };
      if (period === "custom") {
        params.from = from;
        params.to = to;
      }
      const res = await callCenterService.getTopCustomers(params);
      setCustomers(res.data?.data ?? []);
    } catch { } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period, sortBy, sortDir]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-red-500" />
          <h3 className="text-sm font-black text-white">أفضل العملاء</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-red-500/50">
          {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {period === "custom" && (
          <>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50" />
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50" />
            <button onClick={load}
              className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors">
              تطبيق
            </button>
          </>
        )}

        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-red-500/50">
          {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-red-500" /></div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-slate-500">
          <Users size={32} className="mb-2" />
          <p className="text-sm">لا توجد بيانات للفترة المحددة</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-white/5">
                <th className="text-right py-2 px-2 font-bold">العميل</th>
                <th className="text-center py-2 px-2 font-bold cursor-pointer" onClick={() => toggleSort("orders_count")}>
                  <div className="flex items-center justify-center gap-1">الطلبات <ArrowUpDown size={10} /></div>
                </th>
                <th className="text-center py-2 px-2 font-bold cursor-pointer" onClick={() => toggleSort("total_spent")}>
                  <div className="flex items-center justify-center gap-1">القيمة <ArrowUpDown size={10} /></div>
                </th>
                <th className="text-center py-2 px-2 font-bold cursor-pointer" onClick={() => toggleSort("avg_order_value")}>
                  <div className="flex items-center justify-center gap-1">المتوسط <ArrowUpDown size={10} /></div>
                </th>
                <th className="text-center py-2 px-2 font-bold">آخر طلب</th>
                <th className="text-center py-2 px-2 font-bold cursor-pointer" onClick={() => toggleSort("open_complaints")}>
                  <div className="flex items-center justify-center gap-1">شكاوى <ArrowUpDown size={10} /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, idx) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-600 w-5">{idx + 1}</span>
                      <div>
                        <p className="font-bold text-white">{c.name}</p>
                        <p className="text-[10px] text-slate-500">{c.phone || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-2.5 px-2 text-white font-bold">{Number(c.orders_count)}</td>
                  <td className="text-center py-2.5 px-2 text-emerald-400 font-bold">{Number(c.total_spent).toFixed(2)}</td>
                  <td className="text-center py-2.5 px-2 text-slate-300">{Number(c.avg_order_value).toFixed(2)}</td>
                  <td className="text-center py-2.5 px-2 text-slate-400 text-[10px]">
                    {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString("ar-SA") : "—"}
                  </td>
                  <td className="text-center py-2.5 px-2">
                    {c.open_complaints_count > 0 ? (
                      <span className="text-red-400 font-bold">{c.open_complaints_count}</span>
                    ) : (
                      <span className="text-slate-600">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
