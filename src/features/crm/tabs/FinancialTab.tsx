import { PackageSearch, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { crmApi } from "../api";
import type { CrmFavoriteProduct, CrmMonthAmount } from "../types";
import { DomainTable, SectionFrame, date, money, text, unwrapRows, useCrmSection, type Row } from "./shared";

// There is no backend field proving a customer "has" or "doesn't have" a
// financial account — every customer computes a balance (defaulting to 0
// when there's no ledger activity). We surface the only real derived signal
// available on this endpoint (credit_limit / balance) rather than presenting
// a bare "0" as if it were a confirmed empty account.
function hasFinancialSignal(r: Row): boolean {
  const creditLimit = Number(r.credit_limit ?? 0);
  const balance = Number(r.balance ?? 0);
  return creditLimit > 0 || balance !== 0;
}

function Summary(){const s=useCrmSection("financial-summary");return <SectionFrame state={s}>{d=>{
  const r=d as Row;
  if (!hasFinancialSignal(r)) {
    return <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--crmx-border,#E7E9F0)] py-10 text-center">
      <strong className="text-[15px] font-bold text-[var(--crmx-text,#1E2433)]">لا يوجد ملف مالي نشط لهذا العميل</strong>
      <p className="max-w-sm text-[13px] text-[var(--crmx-text-secondary,#545E70)]">لم يُرصد أي حد ائتمان أو رصيد لهذا العميل حتى الآن. هذا العميل موجود في CRM بغض النظر عن وجود نشاط مالي له.</p>
    </div>;
  }
  return <div>
    <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[var(--crmx-text-muted)]">مؤشرات الملف المالي</p>
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[["balance","الرصيد"],["total_debit","إجمالي المدين"],["total_credit","إجمالي الدائن"],["overdue","المتأخر"]].filter(([k])=>r[k]!=null).map(([k,l])=><div key={k} className="rounded-2xl border border-[var(--crmx-border)] p-4"><dt className="text-[12px] text-[var(--crmx-text-muted)]">{l}</dt><dd className="mt-1 text-[16px] font-bold text-[var(--crmx-text)]">{money(r[k])}</dd></div>)}</dl>
  </div>;
}}</SectionFrame>}
function Statement(){const s=useCrmSection("statement");return <SectionFrame state={s}>{d=><DomainTable empty="لا توجد حركات مالية" rows={unwrapRows(d,["transactions","statement"])} columns={[{key:"date",label:"التاريخ",render:(v,r)=>date(v??r.created_at)},{key:"description",label:"البيان",render:(v,r)=>text(v??r.reference)},{key:"debit",label:"مدين",render:money},{key:"credit",label:"دائن",render:money},{key:"balance",label:"الرصيد",render:money}]}/>}</SectionFrame>}
function Aging(){const s=useCrmSection("aging");return <SectionFrame state={s}>{d=><DomainTable empty="لا توجد أرصدة مستحقة" rows={unwrapRows(d,["buckets","aging"])} columns={[{key:"label",label:"الفترة",render:(v,r)=>text(v??r.period)},{key:"amount",label:"القيمة",render:money}]}/>}</SectionFrame>}

// Moved out of Overview — these are purchase-analytics charts, not
// day-to-day operational content, so they belong alongside the rest of the
// customer's financial/purchasing picture rather than crowding the
// Overview tab's Recent Orders + Activity focus.
const DONUT_COLORS = ["var(--crmx-primary)", "var(--crmx-navy)", "var(--crmx-accent)", "var(--crmx-warning)", "var(--crmx-info)", "var(--crmx-text-muted)"];

function FavoriteProducts() {
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

  return (
    <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
      <h3 className="mb-4 text-[15px] font-bold text-[var(--crmx-text)]">المنتجات المفضلة</h3>
      {loading ? (
        <div className="crmx-skeleton h-[200px] w-full rounded-xl" />
      ) : error ? (
        <div className="flex h-[200px] items-center justify-center text-[12.5px] text-[var(--crmx-danger-text)]">{error}</div>
      ) : !items?.length ? (
        <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--crmx-border)] text-center">
          <PackageSearch className="h-6 w-6 text-[var(--crmx-text-muted)]" />
          <p className="max-w-[220px] text-[12.5px] text-[var(--crmx-text-muted)]">لا توجد منتجات مفضلة بعد — تظهر هنا بعد أول طلبات العميل.</p>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="45%" height={200}>
            <PieChart>
              <Pie data={items} dataKey="orders_count" nameKey="item_name_ar" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {items.map((it, i) => <Cell key={it.item_id} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v, _n, item) => [`${v} طلب`, (item.payload as CrmFavoriteProduct).item_name_ar || (item.payload as CrmFavoriteProduct).item_name]} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="flex-1 space-y-2">
            {items.slice(0, 6).map((it, i) => (
              <li key={it.item_id} className="flex items-center justify-between text-[12.5px]">
                <span className="flex min-w-0 items-center gap-2 text-[var(--crmx-text-secondary)]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="truncate">{it.item_name_ar || it.item_name}</span>
                </span>
                <span className="shrink-0 font-bold text-[var(--crmx-text)]">×{it.quantity_sum.toLocaleString("ar")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PurchaseHistoryChart() {
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
    <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
      <h3 className="mb-4 text-[15px] font-bold text-[var(--crmx-text)]">إجمالي المشتريات — آخر 6 أشهر</h3>
      {loading ? (
        <div className="crmx-skeleton h-[200px] w-full rounded-xl" />
      ) : error ? (
        <div className="flex h-[200px] items-center justify-center text-[12.5px] text-[var(--crmx-danger-text)]">{error}</div>
      ) : !months?.length || !hasAnyPurchase ? (
        <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--crmx-border)] text-center">
          <TrendingUp className="h-6 w-6 text-[var(--crmx-text-muted)]" />
          <p className="max-w-[220px] text-[12.5px] text-[var(--crmx-text-muted)]">لا توجد مشتريات لهذا العميل خلال آخر 6 أشهر.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={months}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--crmx-border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--crmx-text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "var(--crmx-text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip formatter={(v) => money(v)} />
            <Bar dataKey="amount" fill="var(--crmx-primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

const sectionTitle = "mb-3 text-[15px] font-bold text-[var(--crmx-text)] border-b border-[var(--crmx-border)] pb-2.5";
export default function FinancialTab(){return <div className="crmx-root grid gap-6">
  <section>
    <h3 className={sectionTitle}>تحليلات الشراء</h3>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <FavoriteProducts/>
      <PurchaseHistoryChart/>
    </div>
  </section>
  <section><h3 className={sectionTitle}>الملخص المالي</h3><Summary/></section>
  <section><h3 className={sectionTitle}>كشف الحساب</h3><Statement/></section>
  <section><h3 className={sectionTitle}>أعمار الديون</h3><Aging/></section>
</div>}
