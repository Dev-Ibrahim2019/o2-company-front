import { ChevronDown, ChevronUp, History, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { dateTime } from "./format";
import { CrmPageHeader, CrmPagination } from "./customers-ui";
import "./customers-ui/crmx.css";
import type { CrmPage, CrmStaffActivityMeta, CrmStaffActivityRow } from "./types";

const inputCls =
  "h-11 rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";

const ATTEMPT_LABELS: Record<string, string> = { view: "فتح الشكوى", update: "تعديل الشكوى", followup: "إضافة متابعة" };

const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

/**
 * سجل نشاطات موظفي CRM — للمدير والـ super-admin فقط (crm.staff-activity.view).
 * يعرض افتراضيًا "الحركات الغريبة" فقط؛ يمكن إظهار كل النشاطات للسياق.
 */
export function CrmStaffActivityPage() {
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState<CrmPage<CrmStaffActivityRow>>();
  const [meta, setMeta] = useState<CrmStaffActivityMeta>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string }>();
  const [expanded, setExpanded] = useState<number | null>(null);

  // Flagged-only unless the reader explicitly asks for everything.
  const flaggedOnly = params.get("flagged") !== "0";
  const perPage = Number(params.get("per_page") || 30);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const query = new URLSearchParams(params);
      query.set("flagged", flaggedOnly ? "1" : "0");
      const { page, meta: m } = await crmApi.staffActivity(query);
      setResult(page);
      if (m) setMeta(m);
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, [params, flaggedOnly]);

  useEffect(() => { void load(); }, [load]);

  const fieldLabel = (field: string) => meta?.fields[field] ?? field;

  return (
    <div className="crmx-root space-y-5" dir="rtl">
      <CrmPageHeader
        title="سجل نشاطات الفريق"
        description="ما يفعله موظفو CRM على العملاء والشكاوى. الحركات غير المعتادة معلَّمة — مثل تعديل عميل من فرع آخر أو محاولة فتح شكوى خارج النطاق."
      />

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
        <div className="flex rounded-xl bg-[var(--crmx-neutral-soft)] p-1" role="tablist" aria-label="نطاق السجل">
          {[
            { key: "1", label: "الحركات الغريبة فقط" },
            { key: "0", label: "كل النشاطات" },
          ].map((t) => {
            const active = (t.key === "1") === flaggedOnly;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => set("flagged", t.key === "1" ? "" : "0")}
                className={`h-9 rounded-lg px-3 text-[13px] font-bold transition ${active ? "bg-[var(--crmx-card)] text-[var(--crmx-text)] shadow-sm" : "text-[var(--crmx-text-secondary)]"}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
          نوع الحركة
          <select className={inputCls} value={params.get("action") ?? ""} onChange={(e) => set("action", e.target.value)}>
            <option value="">الكل</option>
            {Object.entries(meta?.actions ?? {}).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
          سبب التعليم
          <select className={inputCls} value={params.get("flag") ?? ""} onChange={(e) => set("flag", e.target.value)}>
            <option value="">الكل</option>
            {Object.entries(meta?.flags ?? {}).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
          من
          <input type="date" className={inputCls} value={params.get("date_from") ?? ""} onChange={(e) => set("date_from", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
          إلى
          <input type="date" className={inputCls} value={params.get("date_to") ?? ""} min={params.get("date_from") ?? undefined} onChange={(e) => set("date_to", e.target.value)} />
        </label>
      </div>

      {loading && !result ? (
        <CrmState kind="loading" title="جارٍ تحميل السجل" />
      ) : error ? (
        <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />
      ) : !result?.items.length ? (
        <CrmState kind="empty" title={flaggedOnly ? "لا توجد حركات غريبة في هذه الفترة" : "لا توجد نشاطات مسجلة"} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]">
          <ul className="divide-y divide-[var(--crmx-border)]">
            {result.items.map((row) => {
              const changes = Object.entries(row.details?.changes ?? {});
              const hasDetails = changes.length > 0 || !!row.details?.content;
              const isOpen = expanded === row.id;
              return (
                <li key={row.id} className="px-4 py-3.5">
                  <div className="flex flex-wrap items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${row.is_flagged ? "bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]" : "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]"}`}
                      aria-hidden
                    >
                      {row.is_flagged ? <ShieldAlert className="h-4 w-4" /> : <History className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-[14px] text-[var(--crmx-text)]">
                        <span className="font-bold">{row.actor?.name ?? "—"}</span>
                        {row.actor_branch && <span className="text-[var(--crmx-text-muted)]"> ({row.actor_branch})</span>}
                        {" · "}
                        {row.action_label}
                        {row.customer && (
                          <>
                            {" · "}
                            <Link to={`/admin/crm/customers/${row.customer.id}/overview`} className="font-semibold text-[var(--crmx-primary)] hover:underline">
                              {row.customer.name}
                            </Link>
                          </>
                        )}
                        {row.subject_type === "complaint" && row.subject_id && (
                          <>
                            {" · "}
                            <Link to={`/admin/crm/complaints/${row.subject_id}`} className="font-semibold text-[var(--crmx-primary)] hover:underline">
                              شكوى #{row.subject_id}
                            </Link>
                          </>
                        )}
                        {row.subject_branch && <span className="text-[var(--crmx-text-muted)]"> — فرع {row.subject_branch}</span>}
                      </p>
                      {row.flags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {row.flags.map((f) => (
                            <span key={f.key} className="rounded-full bg-[var(--crmx-danger-soft)] px-2.5 py-0.5 text-[12px] font-bold text-[var(--crmx-danger-text)]">
                              {f.label}
                            </span>
                          ))}
                        </div>
                      )}
                      {row.details?.attempt && (
                        <p className="text-[12px] text-[var(--crmx-text-secondary)]">المحاولة: {ATTEMPT_LABELS[row.details.attempt] ?? row.details.attempt}</p>
                      )}
                      <p className="text-[12px] text-[var(--crmx-text-muted)]">
                        {dateTime(row.created_at)}{row.ip_address ? ` · ${row.ip_address}` : ""}
                      </p>
                    </div>
                    {hasDetails && (
                      <button
                        onClick={() => setExpanded(isOpen ? null : row.id)}
                        aria-expanded={isOpen}
                        className="flex h-9 items-center gap-1 rounded-lg border border-[var(--crmx-border)] px-2.5 text-[12px] font-bold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]"
                      >
                        التفاصيل {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>

                  {isOpen && (
                    <div className="mt-3 overflow-x-auto rounded-xl bg-[var(--crmx-neutral-soft)] p-3 text-[13px]">
                      {changes.length > 0 && (
                        <table className="w-full min-w-[360px]">
                          <thead>
                            <tr className="text-right text-[12px] text-[var(--crmx-text-muted)]">
                              <th className="pb-1.5 font-bold">الحقل</th>
                              <th className="pb-1.5 font-bold">قبل</th>
                              <th className="pb-1.5 font-bold">بعد</th>
                            </tr>
                          </thead>
                          <tbody>
                            {changes.map(([field, c]) => (
                              <tr key={field} className="border-t border-[var(--crmx-border)]">
                                <td className="py-1.5 font-semibold text-[var(--crmx-text)]">{fieldLabel(field)}</td>
                                <td className="py-1.5 text-[var(--crmx-text-secondary)]" dir="auto">{show(c.old)}</td>
                                <td className="py-1.5 text-[var(--crmx-text)]" dir="auto">{show(c.new)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      {row.details?.content && (
                        <p className="whitespace-pre-wrap text-[var(--crmx-text)]" dir="auto">
                          <span className="font-bold">نص الملاحظة المحذوفة: </span>{row.details.content}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <CrmPagination
            currentPage={result.currentPage}
            lastPage={result.lastPage}
            total={result.total}
            perPage={perPage}
            onPageChange={(p) => set("page", String(p))}
            onPerPageChange={(size) => set("per_page", String(size))}
          />
        </div>
      )}
    </div>
  );
}
