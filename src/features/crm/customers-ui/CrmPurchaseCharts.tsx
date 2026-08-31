import { PackageSearch, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { crmApi } from "../api";
import { money, num } from "../format";
import type { CrmFavoriteProduct, CrmMonthAmount } from "../types";

/**
 * The two purchase-analytics charts from the approved mockup's "نظرة عامة"
 * screen. They live here, not inside a tab, because both the Overview tab
 * (where the mockup puts them) and the Financial tab render them — extracting
 * them was the alternative to keeping two copies in sync.
 */

const DONUT_COLORS = [
  "var(--crmx-info)",
  "var(--crmx-success)",
  "var(--crmx-warning)",
  "var(--crmx-accent)",
  "var(--crmx-primary)",
  "var(--crmx-text-muted)",
];

const CARD = "rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5";
const TITLE = "mb-4 text-[15px] font-bold text-[var(--crmx-text)]";

function ChartEmpty({ icon: Icon, children }: { icon: typeof TrendingUp; children: string }) {
  return (
    <div className="flex h-[210px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--crmx-border)] text-center">
      <Icon className="h-6 w-6 text-[var(--crmx-text-muted)]" />
      <p className="max-w-[240px] text-[12.5px] text-[var(--crmx-text-muted)]">{children}</p>
    </div>
  );
}

export function CrmFavoriteProductsChart() {
  const { customerId = "" } = useParams();
  const [items, setItems] = useState<CrmFavoriteProduct[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    crmApi.favorites(customerId)
      .then((d) => !cancelled && setItems(Array.isArray(d) ? d : []))
      .catch(() => !cancelled && setError("تعذر تحميل المنتجات المفضلة."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [customerId]);

  // The donut's centre figure in the mockup is the total across all slices,
  // so it must be summed from the same field the slices are drawn from.
  const total = (items ?? []).reduce((sum, it) => sum + Number(it.quantity_sum || 0), 0);

  return (
    <div className={CARD}>
      <h3 className={TITLE}>المنتجات المفضلة <span className="font-semibold text-[var(--crmx-text-muted)]">(حسب عدد المشتريات)</span></h3>
      {loading ? (
        <div className="crmx-skeleton h-[210px] w-full rounded-xl" />
      ) : error ? (
        <div className="flex h-[210px] items-center justify-center text-[12.5px] text-[var(--crmx-danger-text)]">{error}</div>
      ) : !items?.length ? (
        <ChartEmpty icon={PackageSearch}>لا توجد منتجات مفضلة بعد — تظهر هنا بعد أول طلبات العميل.</ChartEmpty>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative w-[45%] shrink-0">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={items} dataKey="quantity_sum" nameKey="item_name_ar" innerRadius={58} outerRadius={88} paddingAngle={3} stroke="none">
                  {items.map((it, i) => <Cell key={it.item_id} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v, _n, item) => [
                    `×${num(Number(v))}`,
                    (item.payload as CrmFavoriteProduct).item_name_ar || (item.payload as CrmFavoriteProduct).item_name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Centre label — the mockup's "38 / إجمالي المشتريات". Overlaid
                rather than a recharts <Label> so it can carry two type sizes. */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <strong className="text-[26px] font-extrabold leading-none text-[var(--crmx-text)]">{num(total)}</strong>
              <span className="mt-1 text-[11px] text-[var(--crmx-text-muted)]">إجمالي المشتريات</span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between border-b border-[var(--crmx-border)] pb-1.5 text-[11px] font-bold text-[var(--crmx-text-muted)]">
              <span>الصنف</span>
              <span>عدد المشتريات</span>
            </div>
            <ul className="space-y-2">
              {items.slice(0, 6).map((it, i) => (
                <li key={it.item_id} className="flex items-center justify-between text-[12.5px]">
                  <span className="flex min-w-0 items-center gap-2 text-[var(--crmx-text-secondary)]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="truncate">{it.item_name_ar || it.item_name}</span>
                  </span>
                  <span className="shrink-0 font-bold text-[var(--crmx-text)]">{num(it.quantity_sum)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function CrmPurchaseHistoryChart() {
  const { customerId = "" } = useParams();
  const [months, setMonths] = useState<CrmMonthAmount[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    crmApi.purchaseHistory(customerId)
      .then((d) => !cancelled && setMonths(d.months ?? []))
      .catch(() => !cancelled && setError("تعذر تحميل سجل المشتريات."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [customerId]);

  const hasAnyPurchase = months?.some((m) => m.amount > 0);

  return (
    <div className={CARD}>
      <h3 className={TITLE}>إجمالي المشتريات <span className="font-semibold text-[var(--crmx-text-muted)]">(آخر 6 أشهر)</span></h3>
      {loading ? (
        <div className="crmx-skeleton h-[210px] w-full rounded-xl" />
      ) : error ? (
        <div className="flex h-[210px] items-center justify-center text-[12.5px] text-[var(--crmx-danger-text)]">{error}</div>
      ) : !months?.length || !hasAnyPurchase ? (
        <ChartEmpty icon={TrendingUp}>لا توجد مشتريات لهذا العميل خلال آخر 6 أشهر.</ChartEmpty>
      ) : (
        // Area, not bars: the mockup draws this series as a red line with a
        // soft gradient fill under it.
        <ResponsiveContainer width="100%" height={210}>
          <AreaChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="crmPurchaseFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--crmx-primary)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--crmx-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--crmx-border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--crmx-text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "var(--crmx-text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} width={48} />
            <Tooltip formatter={(v) => money(Number(v))} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="var(--crmx-primary)"
              strokeWidth={2.5}
              fill="url(#crmPurchaseFill)"
              dot={{ r: 3.5, fill: "var(--crmx-primary)", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
