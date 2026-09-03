import { Award, BadgeCheck, Coins, Layers } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CrmKpiCard, CrmPageHeader, CrmPagination, CrmSearchBar } from "./customers-ui";
import "./customers-ui/crmx.css";
import { date as fmtDate, num } from "./format";
import { LoyaltyRulesTab } from "./LoyaltyRulesTab";
import { TXN_STATUS_LABELS, TXN_TYPE_LABELS, TXN_TYPE_TONE } from "./loyaltyLabels";
import type { CrmLoyaltyGlobalSummary, CrmLoyaltyTransaction, CrmLoyaltyTxnType } from "./types";

type Tab = "ledger" | "rules";

const selectCls =
  "h-11 rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const fieldLabelCls = "flex flex-col gap-1 text-[13px] font-semibold text-[var(--crmx-text-secondary)]";
const cardCls = "rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]";
const pill = "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap";

type Filters = { owner_type: string; type: string; date_from: string; date_to: string; search: string };
const EMPTY: Filters = { owner_type: "", type: "", date_from: "", date_to: "", search: "" };

/**
 * The CRM-wide loyalty screen: the ledger across every owner, and rule
 * administration, as two tabs of one screen — mirroring ComplaintsPage and
 * OccasionsPage, the two standalone screens this module already shipped.
 */
export function LoyaltyPage() {
  const [tab, setTab] = useState<Tab>("ledger");

  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [rows, setRows] = useState<CrmLoyaltyTransaction[]>([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [summary, setSummary] = useState<CrmLoyaltyGlobalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);

  const params = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(applied)) if (v) out[k] = v;
    return out;
  }, [applied]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listResult, summaryResult] = await Promise.all([
        crmApi.loyaltyTransactions({ ...params, page: String(page), per_page: String(perPage) }),
        crmApi.loyaltySummary(),
      ]);
      setRows(listResult.items);
      setMeta({ currentPage: listResult.currentPage, lastPage: listResult.lastPage, total: listResult.total });
      setSummary(summaryResult);
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, [params, page, perPage]);

  useEffect(() => { if (tab === "ledger") void load(); }, [load, tab]);

  // The top KPI cards sit above the tab switch, so they read stale the
  // moment a rule is created or deactivated on the rules tab — that tab
  // never touches `load()` above. Refreshed independently so a manager who
  // never leaves "القواعد" still sees an accurate "قواعد فعّالة" count.
  const refreshSummary = useCallback(() => {
    void crmApi.loyaltySummary().then(setSummary).catch(() => {});
  }, []);

  const apply = () => { setPage(1); setApplied(filters); };
  const reset = () => { setPage(1); setFilters(EMPTY); setApplied(EMPTY); };
  const activeCount = Object.values(applied).filter(Boolean).length;

  return (
    <div className="crmx-root space-y-6 p-4 sm:p-6">
      <CrmPageHeader
        title="الولاء"
        description="نقاط العملاء والمجموعات، بقواعد تُدار من هنا — كل نقطة مكتسبة محسوبة تلقائياً عند تأكيد الدفع."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <CrmKpiCard icon={<Coins className="h-5 w-5" />} label="إجمالي نقاط صادرة" tone="primary" loading={!summary} value={num(summary?.total_points_issued ?? 0)} />
        <CrmKpiCard icon={<BadgeCheck className="h-5 w-5" />} label="قواعد فعّالة" tone="success" loading={!summary} value={num(summary?.active_rules_count ?? 0)} />
        <CrmKpiCard icon={<Layers className="h-5 w-5" />} label="إجمالي الحركات" tone="navy" loading={!summary} value={num(summary?.total_transactions ?? 0)} />
      </div>

      <div className="flex gap-1 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-1" style={{ width: "fit-content" }}>
        {([["ledger", "السجل", Award], ["rules", "القواعد", Layers]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex h-10 items-center gap-1.5 rounded-lg px-4 text-[14px] font-bold transition ${
              tab === key ? "bg-[var(--crmx-primary)] text-white" : "text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)]"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "rules" ? (
        <LoyaltyRulesTab onChanged={refreshSummary} />
      ) : (
        <>
          <div className={`${cardCls} p-4`}>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <label className={fieldLabelCls}>
                  بحث
                  <CrmSearchBar value={filters.search} onChange={(v) => setFilters((f) => ({ ...f, search: v }))} placeholder="اسم العميل أو المجموعة أو رقم العميل..." />
                </label>
              </div>
              <label className={fieldLabelCls}>
                نوع المالك
                <select className={selectCls} value={filters.owner_type} onChange={(e) => setFilters((f) => ({ ...f, owner_type: e.target.value }))}>
                  <option value="">الكل</option>
                  <option value="customer">عملاء</option>
                  <option value="group">مجموعات</option>
                </select>
              </label>
              <label className={fieldLabelCls}>
                نوع الحركة
                <select className={selectCls} value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
                  <option value="">كل الأنواع</option>
                  {(Object.keys(TXN_TYPE_LABELS) as CrmLoyaltyTxnType[]).map((t) => (
                    <option key={t} value={t}>{TXN_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-end gap-3">
                <label className={fieldLabelCls}>
                  من تاريخ
                  <input type="date" className={selectCls} value={filters.date_from} onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))} />
                </label>
                <label className={fieldLabelCls}>
                  إلى تاريخ
                  <input type="date" className={selectCls} value={filters.date_to} onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))} />
                </label>
              </div>
              <div className="flex items-end gap-2">
                <button onClick={apply} className="h-11 rounded-xl bg-[var(--crmx-primary)] px-4 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]">
                  تطبيق
                </button>
                {activeCount > 0 && (
                  <button onClick={reset} className="h-11 rounded-xl border border-[var(--crmx-border)] px-4 text-[14px] font-semibold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]">
                    مسح ({activeCount})
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <CrmState kind="loading" title="جارٍ تحميل السجل" />
          ) : error ? (
            <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />
          ) : rows.length === 0 ? (
            <CrmState kind="empty" title={activeCount > 0 ? "لا توجد حركات مطابقة للفلاتر" : "لا توجد حركات ولاء بعد"} />
          ) : (
            <div className={cardCls}>
              <div className="crmx-scrollbar overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-right">
                  <thead>
                    <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
                      {["المالك", "النوع", "النقاط", "الحالة", "الطلب", "ملاحظات", "التاريخ"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-3.5 text-[12.5px] font-bold text-[var(--crmx-text-secondary)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t) => {
                      const positive = Number(t.points) >= 0;
                      const href = t.owner_type === "customer"
                        ? `/admin/crm/customers/${t.owner_id}/loyalty`
                        : `/admin/crm/groups/${t.owner_id}`;
                      return (
                        <tr key={String(t.id)} className="crmx-table-row border-b border-[var(--crmx-border)] transition-colors last:border-0 hover:bg-[var(--crmx-neutral-soft)]/70">
                          <td className="whitespace-nowrap px-4 py-3 text-[13px]">
                            <Link to={href} className="font-semibold text-[var(--crmx-primary)] hover:underline">
                              {t.owner_name ?? `#${t.owner_id}`}
                            </Link>
                            <span className="ms-1.5 text-[11.5px] text-[var(--crmx-text-muted)]">
                              {t.owner_type === "customer" ? "عميل" : "مجموعة"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className={`${pill} ${TXN_TYPE_TONE[t.type]}`}>{TXN_TYPE_LABELS[t.type]}</span>
                          </td>
                          <td className={`whitespace-nowrap px-4 py-3 text-[13px] font-bold ${positive ? "text-[var(--crmx-success-text)]" : "text-[var(--crmx-danger-text)]"}`}>
                            {positive ? "+" : ""}{num(Number(t.points))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[12.5px] text-[var(--crmx-text-secondary)]">{TXN_STATUS_LABELS[t.status]}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">{t.order?.order_number ?? "—"}</td>
                          <td className="max-w-[200px] truncate px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]" title={t.notes ?? undefined}>{t.notes ?? "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-[12.5px] text-[var(--crmx-text-muted)]">{fmtDate(t.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <CrmPagination
                currentPage={meta.currentPage}
                lastPage={meta.lastPage}
                total={meta.total}
                perPage={perPage}
                onPageChange={setPage}
                onPerPageChange={(n: number) => { setPerPage(n); setPage(1); }}
                itemLabel="حركة"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
