// The two purchase charts are shared with the Overview tab (where the
// mockup places them) — see customers-ui/CrmPurchaseCharts.
import { CrmFavoriteProductsChart, CrmPurchaseHistoryChart } from "../customers-ui";
import { DomainTable, SectionFrame, date, money, num, text, unwrapRows, useCrmSection, type Row } from "./shared";

// Labels for the payment-terms codes the backend stores (net15/net30/…).
// Unmapped values fall through unchanged rather than being hidden.
const PAYMENT_TERMS_LABELS: Record<string, string> = {
  immediate: "فوري",
  net15: "15 يومًا",
  net30: "30 يومًا",
  net60: "60 يومًا",
  net90: "90 يومًا",
};

function Figure({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--crmx-border)] p-4">
      <dt className="text-[12px] text-[var(--crmx-text-muted)]">{label}</dt>
      <dd className="mt-1 text-[16px] font-bold text-[var(--crmx-text)]">{value}</dd>
      {hint && <p className="mt-0.5 text-[11.5px] text-[var(--crmx-text-muted)]">{hint}</p>}
    </div>
  );
}

/**
 * GET /crm/customers/{id}/financial-summary returns
 * {balance, credit_limit, available_credit, payment_terms, credit_days, aging}
 * — read from customer_financial_profiles, gated by the same three permissions
 * that decide whether this tab renders at all.
 *
 * All four figures are shown unconditionally. An earlier version suppressed
 * the whole block when balance and credit_limit were both 0, which also hid
 * payment_terms and credit_days — real, configured values that say nothing
 * about whether the customer currently owes anything.
 */
function Summary() {
  const s = useCrmSection("financial-summary");
  return (
    <SectionFrame state={s} hideOnForbidden>
      {(d) => {
        const r = d as Row;
        const terms = r.payment_terms == null ? null : String(r.payment_terms);
        const isDormant = Number(r.credit_limit ?? 0) === 0 && Number(r.balance ?? 0) === 0;
        return (
          <div>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Figure label="الرصيد" value={money(r.balance)} />
              <Figure
                label="الحد الائتماني"
                value={money(r.credit_limit)}
                hint={r.available_credit != null ? `المتاح: ${money(r.available_credit)}` : undefined}
              />
              <Figure label="شروط الدفع" value={terms ? PAYMENT_TERMS_LABELS[terms] ?? terms : "—"} />
              <Figure
                label="أيام الاستحقاق"
                value={r.credit_days != null ? `${num(r.credit_days)} يومًا` : "—"}
              />
            </dl>
            {isDormant && (
              <p className="mt-3 text-[12.5px] text-[var(--crmx-text-muted)]">
                لا يوجد حد ائتمان أو رصيد مرصود لهذا العميل حتى الآن — الشروط أعلاه هي الإعدادات الافتراضية لملفه المالي.
              </p>
            )}
          </div>
        );
      }}
    </SectionFrame>
  );
}

function Statement(){const s=useCrmSection("statement");return <SectionFrame state={s} hideOnForbidden>{d=><DomainTable empty="لا توجد حركات مالية" rows={unwrapRows(d,["transactions","statement"])} columns={[{key:"date",label:"التاريخ",render:(v,r)=>date(v??r.created_at)},{key:"description",label:"البيان",render:(v,r)=>text(v??r.reference)},{key:"debit",label:"مدين",render:money},{key:"credit",label:"دائن",render:money},{key:"balance",label:"الرصيد",render:money}]}/>}</SectionFrame>}
function Aging(){const s=useCrmSection("aging");return <SectionFrame state={s} hideOnForbidden>{d=><DomainTable empty="لا توجد أرصدة مستحقة" rows={unwrapRows(d,["buckets","aging"])} columns={[{key:"label",label:"الفترة",render:(v,r)=>text(v??r.period)},{key:"amount",label:"القيمة",render:money}]}/>}</SectionFrame>}

const sectionTitle = "mb-3 text-[15px] font-bold text-[var(--crmx-text)] border-b border-[var(--crmx-border)] pb-2.5";
export default function FinancialTab(){return <div className="crmx-root grid gap-6">
  <section>
    <h3 className={sectionTitle}>تحليلات الشراء</h3>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <CrmFavoriteProductsChart/>
      <CrmPurchaseHistoryChart/>
    </div>
  </section>
  <section><h3 className={sectionTitle}>الملخص المالي</h3><Summary/></section>
  <section><h3 className={sectionTitle}>كشف الحساب</h3><Statement/></section>
  <section><h3 className={sectionTitle}>أعمار الديون</h3><Aging/></section>
</div>}
