/**
 * تبويب "الإحصائيات": إجمالي المبيعات والطلبات ومتوسط الطلب والتكلفة والربح ونسبة التكلفة، وأعلى/أقل 5 أصناف
 * مبيعاً (بالكمية)، ورسم يومي للمبيعات والتكلفة خلال الفترة.
 */

import React from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtNum } from "../../../../services/inventoryService";
import { departmentsService, type RankedItem } from "../../../../services/departmentsService";
import type { TabProps } from "./DepartmentDetailPage";
import { Card, foodCostTone, Kpi, money, pct, Spinner, UndeductedBanner, useTabData } from "./shared";

/* ألوان المخطط من متغيرات ألوان Tailwind (تتبع الثيم بدل ألوان ثابتة). */
const C = {
  sales: "var(--color-sky-500)",
  cost: "var(--color-red-500)",
  orders: "var(--color-amber-400)",
  grid: "var(--color-slate-800)",
  axis: "var(--color-slate-500)",
};

export const StatsTab: React.FC<TabProps> = ({ departmentId, query, onPeriod }) => {
  const { data, loading } = useTabData((q) => departmentsService.stats(departmentId, q), query, onPeriod, "تعذّر تحميل الإحصائيات");

  if (loading && !data) return <Spinner />;
  if (!data) return null;
  const costs = data.costs_visible;
  const t = data.totals;
  const daily = data.daily.map((d) => ({ day: d.day.slice(5), sales: Number(d.sales), cost: d.cost === null ? null : Number(d.cost), orders: d.orders }));
  const empty = daily.every((d) => d.sales === 0 && !d.cost);

  return (
    <div className={`space-y-4 pt-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <UndeductedBanner count={data.undeducted_orders} />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="إجمالي المبيعات" value={money(t.sales)} />
        <Kpi label="عدد الطلبات" value={fmtNum(t.orders)} sub={`${t.items_sold} صنف مُباع`} />
        <Kpi label="متوسط قيمة الطلب" value={money(t.avg_order)} sub="من أصناف القسم فقط" />
        <Kpi label="التكلفة الإجمالية" value={costs ? money(t.cost) : "—"} tone="text-red-400" />
        <Kpi label="الربح الإجمالي" value={costs ? money(t.profit) : "—"} tone={Number(t.profit) < 0 ? "text-red-400" : "text-green-400"} />
        <Kpi label="نسبة التكلفة" value={costs ? pct(t.food_cost_percent) : "—"} tone={foodCostTone(t.food_cost_percent)} />
      </div>

      <Card title="المبيعات والتكلفة يومياً">
        {empty ? (
          <p className="py-10 text-center text-sm text-slate-500 font-bold">لا توجد مبيعات في هذه الفترة</p>
        ) : (
          <div className="h-72" role="img" aria-label="رسم بياني يومي للمبيعات والتكلفة وعدد الطلبات">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={daily} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                {/* RTL: الأيام من اليمين لليسار، ومحور المبالغ يميناً. */}
                <XAxis dataKey="day" reversed tick={{ fill: C.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="money" orientation="right" tick={{ fill: C.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
                <YAxis yAxisId="orders" orientation="left" tick={{ fill: C.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--color-slate-900)", border: "1px solid var(--color-slate-700)", borderRadius: 12, direction: "rtl" }}
                  labelStyle={{ color: "var(--color-slate-300)", fontWeight: 800 }}
                  formatter={(v, name) => [name === "الطلبات" ? fmtNum(Number(v)) : money(Number(v)), name]}
                />
                <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                <Bar yAxisId="money" dataKey="sales" name="المبيعات" fill={C.sales} radius={[4, 4, 0, 0]} maxBarSize={28} />
                {costs && <Bar yAxisId="money" dataKey="cost" name="التكلفة" fill={C.cost} radius={[4, 4, 0, 0]} maxBarSize={28} />}
                <Line yAxisId="orders" dataKey="orders" name="الطلبات" stroke={C.orders} strokeWidth={2} dot={false} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="أعلى 5 أصناف مبيعاً">
          <Ranked items={data.top} tone="bg-green-500" empty="لا توجد مبيعات في هذه الفترة" />
        </Card>
        <Card title="أقل 5 أصناف مبيعاً">
          <Ranked
            items={data.bottom}
            tone="bg-red-500"
            empty={data.top.length ? "الأصناف المبيعة خمسة أو أقل — كلها في القائمة المقابلة" : "لا توجد مبيعات في هذه الفترة"}
          />
        </Card>
      </div>
    </div>
  );
};

const Ranked: React.FC<{ items: RankedItem[]; tone: string; empty: string }> = ({ items, tone, empty }) => {
  if (items.length === 0) return <p className="py-6 text-center text-xs text-slate-500 font-bold">{empty}</p>;
  const max = Math.max(...items.map((i) => Number(i.quantity)), 1);
  return (
    <ol className="space-y-2.5">
      {items.map((i, idx) => (
        <li key={i.item_id} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 text-[11px] font-black flex items-center justify-center shrink-0">{idx + 1}</span>
              <span className="font-bold text-white truncate">{i.name}</span>
            </span>
            <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">
              {fmtNum(i.quantity)} مباع · {money(i.sales)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden" aria-hidden>
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${(Number(i.quantity) / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
};
