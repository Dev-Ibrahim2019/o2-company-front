/**
 * InventoryDashboardPage.tsx — /inventory/dashboard: عدد الأصناف، ما تحت مخزون الأمان، آخر الحركات،
 * وقيمة المخزون (الخادم يرجعها null لمن لا يملك inventory.costs.view فتُخفى البطاقة).
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Boxes, History, Wallet, Warehouse } from "lucide-react";
import { toast } from "../shared/Toast";
import { fmtNum, inventoryErrorMessage, inventoryService, type InventoryDashboard } from "../../services/inventoryService";
import { EmptyBlock, LoadingBlock, PageHeader } from "../administration/inventory/ui";

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string; tone: string; to?: string }> = ({
  icon: Icon,
  label,
  value,
  tone,
  to,
}) => {
  const body = (
    <div className="h-full bg-slate-900/50 border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-white/10 transition-colors">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <p className="text-2xl font-black text-white tabular-nums mt-1">
          <bdi>{value}</bdi>
        </p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
};

export const InventoryDashboardPage: React.FC = () => {
  const [data, setData] = useState<InventoryDashboard | null>(null);

  useEffect(() => {
    inventoryService
      .dashboard()
      .then(setData)
      .catch((e) => toast.error("تعذّر تحميل لوحة المخازن", inventoryErrorMessage(e)));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="لوحة المخازن" subtitle="ملخص المخازن التي تصل إليها" />

      {!data ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon={Boxes} label="الأصناف المخزنية النشطة" value={fmtNum(data.items_count)} tone="bg-sky-500/15 text-sky-400" to="/inventory/items" />
            <StatCard icon={Warehouse} label="المخازن" value={fmtNum(data.warehouses_count)} tone="bg-violet-500/15 text-violet-400" to="/inventory/warehouses" />
            <StatCard
              icon={AlertTriangle}
              label="تحت مخزون الأمان"
              value={fmtNum(data.below_safety_count)}
              tone={data.below_safety_count > 0 ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}
              to="/inventory/balances"
            />
            {data.stock_value !== null && (
              <StatCard icon={Wallet} label="قيمة المخزون (₪)" value={fmtNum(data.stock_value, 2)} tone="bg-amber-500/15 text-amber-400" />
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-400" />
                أصناف تحت مخزون الأمان
              </h2>
              {data.below_safety.length === 0 ? (
                <EmptyBlock icon={Boxes} text="كل الأصناف فوق حد الأمان" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-500 text-xs border-b border-white/5">
                        <th className="text-right py-2 font-bold">الصنف</th>
                        <th className="text-right py-2 font-bold">الرصيد</th>
                        <th className="text-right py-2 font-bold">حد الأمان</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.below_safety.map((r) => (
                        <tr key={r.id} className="border-b border-white/5 last:border-0">
                          <td className="py-2.5">
                            <span className="font-bold text-white">{r.name}</span>
                            <bdi className="block text-[11px] text-slate-500">{r.code}</bdi>
                          </td>
                          <td className="py-2.5 tabular-nums text-red-400 font-bold">
                            {fmtNum(r.quantity)} <span className="text-slate-500 font-normal">{r.base_unit}</span>
                          </td>
                          <td className="py-2.5 tabular-nums text-slate-300">{fmtNum(r.safety_stock)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.below_safety_count > data.below_safety.length && (
                    <p className="text-[11px] text-slate-500 mt-2">
                      يظهر أول {data.below_safety.length} من {data.below_safety_count} — القائمة كاملة في أرصدة المخزون.
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <History size={18} className="text-sky-400" />
                آخر حركات المخزون
              </h2>
              {data.recent_movements.length === 0 ? (
                <EmptyBlock icon={History} text="لا توجد حركات بعد" />
              ) : (
                <ul className="divide-y divide-white/5">
                  {data.recent_movements.map((m) => {
                    const qty = Number(m.quantity);
                    return (
                      <li key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{m.item_name}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {m.type_label} · {m.warehouse_name} ·{" "}
                            <bdi>{new Date(m.occurred_at).toLocaleString("ar-EG-u-nu-latn", { dateStyle: "short", timeStyle: "short" })}</bdi>
                          </p>
                        </div>
                        <span className={`text-sm font-black tabular-nums shrink-0 ${qty < 0 ? "text-red-400" : "text-emerald-400"}`}>
                          <bdi>
                            {qty > 0 ? "+" : ""}
                            {fmtNum(m.quantity)}
                          </bdi>{" "}
                          <span className="text-[11px] font-normal text-slate-500">{m.base_unit}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};
