// The two purchase charts are shared with the Overview tab (where the
// mockup places them) — see customers-ui/CrmPurchaseCharts.
import { useAuth } from "../../../auth";
import { CRM_PERMISSIONS } from "../../../auth/permissions";
import { CrmFavoriteProductsChart, CrmPurchaseHistoryChart } from "../customers-ui";
import { DomainTable, SectionFrame, date, money, num, text, unwrapRows, useCrmSection, type Row } from "./shared";

// customer_accounting getAging()'s real bucket order and the labels already
// established for the exact same keys elsewhere in the app (Administration's
// aging reports — CustomerAgingReport.tsx, CustomerDashboard.tsx, etc.) —
// reused verbatim rather than inventing a second wording for the same five
// buckets.
const AGING_BUCKETS: Array<[key: string, label: string]> = [
  ["current", "الحالي"],
  ["1_30", "1-30 يوم"],
  ["31_60", "31-60 يوم"],
  ["61_90", "61-90 يوم"],
  ["over_90", "أكثر من 90 يوم"],
];

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

// GET .../statement's real shape is {..., lines: [...], ...} (SubledgerService::
// getFullStatement()) — "lines" was missing from this list entirely, so
// unwrapRows() never found an array to unwrap and fell back to wrapping the
// whole response object as one fake row (every cell showing "—"/"0 ₪",
// regardless of whether the customer actually had statement lines or not).
// Added here only — unwrapRows() itself is untouched, and every other call
// site (ComplaintsTab, NotesOccasionsTab, OrdersTab, OverviewTab,
// AddressesTab) passes its own distinct keys, so this cannot affect them.
function Statement(){const s=useCrmSection("statement");return <SectionFrame state={s} hideOnForbidden>{d=><DomainTable empty="لا توجد حركات مالية" rows={unwrapRows(d,["lines","transactions","statement"])} columns={[{key:"date",label:"التاريخ",render:(v,r)=>date(v??r.created_at)},{key:"description",label:"البيان",render:(v,r)=>text(v??r.reference)},{key:"debit",label:"مدين",render:money},{key:"credit",label:"دائن",render:money},{key:"balance",label:"الرصيد",render:money}]}/>}</SectionFrame>}

// GET .../aging returns a flat bucket object ({current, 1_30, 31_60, 61_90,
// over_90, total}), never an array — unwrapRows() is an array-unwrapper, not
// a shape-transformer, so no key added to its list would ever fix this the
// way it fixed Statement above; it would keep falling back to the same
// "wrap the whole object as one fake row" behaviour. Reshaped here instead,
// at the one place that actually needs rows, rather than changing what the
// backend returns — CustomerFinancialController's own /aging endpoint
// returns this identical shape for other real consumers (Administration's
// aging reports) that want the bucket keys directly, not a generic table.
function Aging(){
  const s=useCrmSection("aging");
  return <SectionFrame state={s} hideOnForbidden>{(d)=>{
    const r = d as Row;
    // All five buckets, always — including ones sitting at 0. A 0 here is a
    // real computed answer ("nothing owed in this window"), not a missing
    // value; filtering them out would make an aging report that only shows
    // the customer's problems, never confirms the absence of one.
    const rows = AGING_BUCKETS.map(([key, label]) => ({ label, amount: r[key] }));
    return <DomainTable empty="لا توجد أرصدة مستحقة" rows={rows} columns={[{key:"label",label:"الفترة"},{key:"amount",label:"القيمة",render:money}]}/>;
  }}</SectionFrame>;
}

const sectionTitle = "mb-3 text-[15px] font-bold text-[var(--crmx-text)] border-b border-[var(--crmx-border)] pb-2.5";
export default function FinancialTab(){
  const { hasPermission } = useAuth();
  // CrmController::statement() gates on this permission alone, not the
  // broader set that gets the rest of the tab open (crm.view-customer-
  // financial / view-accounting / manage-accounting) — a viewer with only
  // one of those could open this tab and reach a "كشف الحساب" heading with
  // nothing under it (SectionFrame's hideOnForbidden only ever hid the
  // content, never the heading above it). Checked here, once, so the whole
  // section — heading included — simply isn't in the page for someone the
  // backend was always going to 403 anyway.
  const canStatement = hasPermission(CRM_PERMISSIONS.VIEW_CUSTOMER_STATEMENT);
  return <div className="crmx-root grid gap-6">
  <section>
    <h3 className={sectionTitle}>تحليلات الشراء</h3>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <CrmFavoriteProductsChart/>
      <CrmPurchaseHistoryChart/>
    </div>
  </section>
  <section><h3 className={sectionTitle}>الملخص المالي</h3><Summary/></section>
  {canStatement && <section><h3 className={sectionTitle}>كشف الحساب</h3><Statement/></section>}
  <section><h3 className={sectionTitle}>أعمار الديون</h3><Aging/></section>
</div>;
}
