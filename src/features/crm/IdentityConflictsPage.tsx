import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldAlert, X } from "lucide-react";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CrmAvatar, CrmPageHeader, CrmPagination } from "./customers-ui";
import { date as fmtDate, money } from "./format";
import type { CrmCandidateOrder, CrmIdentityConflict } from "./types";

/**
 * The identity-conflict queue.
 *
 * A ticket is opened automatically when an incoming order carries a phone that
 * already belongs to a customer but under a different name. The stored name
 * always wins at order time; this screen is where a human decides what the
 * discrepancy actually meant.
 *
 * Tickets are never created from here — only resolved.
 */

const STATUS_LABELS: Record<string, string> = {
  open: "مفتوحة",
  resolved: "تمت المعالجة",
  dismissed: "مُهمَلة",
};

const CHANNEL_LABELS: Record<string, string> = {
  call_center: "كول سنتر",
  pos_instant: "كاشير فوري",
  pos_family: "كاشير عائلات",
  website: "الموقع",
};

/** Wording mirrors the backend's four resolutions exactly — see CustomerIdentityConflict. */
const RESOLUTION_LABELS: Record<string, string> = {
  kept_original: "إبقاء الاسم الأصلي",
  renamed_customer: "تحديث الاسم الرسمي",
  created_new_customer: "رقم مشترك — عميل منفصل",
  marked_shared_number: "رقم مشترك — موثّق دائمًا",
};

const DECISIONS: Array<{ key: string; label: string; hint: string; tone: string }> = [
  {
    key: "kept_original",
    label: "إبقاء الاسم الأصلي",
    hint: "الاسمان لشخص واحد — لا تغيير على السجل، تُوثَّق المراجعة فقط.",
    tone: "border-[var(--crmx-border)] text-[var(--crmx-text)] hover:bg-[var(--crmx-neutral-soft)]",
  },
  {
    key: "renamed_customer",
    label: "تحديث الاسم الرسمي",
    hint: "الاسم الوارد هو الصحيح — يُستبدل اسم العميل به.",
    tone: "border-[var(--crmx-navy)] text-[var(--crmx-navy)] hover:bg-[var(--crmx-navy)]/5",
  },
  {
    key: "created_new_customer",
    label: "رقم مشترك — عميل منفصل",
    hint: "شخصان يتشاركان الرقم — يُنشأ عميل جديد بالاسم الوارد.",
    tone: "border-[var(--crmx-warning)] text-[var(--crmx-warning-text)] hover:bg-[var(--crmx-warning-soft)]",
  },
];

const selectCls =
  "h-11 rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";

function StatusPill({ value }: { value: string }) {
  const tone =
    value === "open"
      ? "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]"
      : value === "resolved"
        ? "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]"
        : "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-muted)]";
  return <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${tone}`}>{STATUS_LABELS[value] ?? value}</span>;
}

export function IdentityConflictsPage() {
  const { hasPermission } = useAuth();
  const canResolve = hasPermission(CRM_PERMISSIONS.MANAGE_IDENTITY_CONFLICTS);

  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "open";
  const channel = params.get("channel") ?? "";
  const page = Number(params.get("page") ?? 1);

  const [rows, setRows] = useState<CrmIdentityConflict[]>([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string }>();
  const [selected, setSelected] = useState<CrmIdentityConflict | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const q = new URLSearchParams({ page: String(page), per_page: "20" });
      if (status) q.set("status", status);
      if (channel) q.set("source_channel", channel);
      const res = await crmApi.identityConflicts(q);
      setRows(res.items);
      setMeta({ currentPage: res.currentPage, lastPage: res.lastPage, total: res.total });
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, [status, channel, page]);

  useEffect(() => { void load(); }, [load]);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <div className="crmx-root space-y-5 p-4 sm:p-6">
      <CrmPageHeader
        title="تعارضات الهوية"
        description="أسماء وردت مع رقم يخص عميلًا مسجّلًا باسم مختلف. الاسم المحفوظ هو الذي اعتُمد وقت الطلب — القرار هنا يوثّق ما يعنيه الاختلاف."
      />

      <div className="flex flex-wrap items-center gap-2">
        <select className={selectCls} value={status} onChange={(e) => set("status", e.target.value)} aria-label="الحالة">
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className={selectCls} value={channel} onChange={(e) => set("channel", e.target.value)} aria-label="القناة">
          <option value="">كل القنوات</option>
          {Object.entries(CHANNEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <span className="text-[13px] text-[var(--crmx-text-muted)]">{meta.total} تذكرة</span>
      </div>

      {loading ? (
        <CrmState kind="loading" title="جارٍ تحميل التذاكر" />
      ) : error ? (
        // A 403 here means the queue itself is not visible to this user. Say
        // nothing about what it contains.
        error.status === 403 ? null : <CrmState kind="error" title={error.message} retry={load} />
      ) : !rows.length ? (
        <CrmState kind="empty" title="لا توجد تعارضات مطابقة" detail="تُفتح التذاكر تلقائيًا عند ورود اسم مختلف على رقم مسجّل." />
      ) : (
        <>
          <div className="crmx-scrollbar overflow-x-auto rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]">
            <table className="w-full min-w-[860px] border-collapse text-right">
              <thead>
                <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
                  {["العميل المسجّل", "الاسم الوارد", "الرقم", "القناة", "الحالة", "التاريخ", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={String(c.id)} className="crmx-table-row border-b border-[var(--crmx-border)] last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <CrmAvatar name={c.customer?.name ?? "?"} size={32} />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-[var(--crmx-text)]">{c.customer?.name ?? "—"}</p>
                          <p className="text-[11.5px] text-[var(--crmx-text-muted)]">{c.customer?.code ?? ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-[var(--crmx-warning-text)]">{c.incoming_name}</td>
                    <td className="px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]" dir="ltr">{c.incoming_phone_normalized}</td>
                    <td className="px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">{CHANNEL_LABELS[c.source_channel] ?? c.source_channel}</td>
                    <td className="px-4 py-3"><StatusPill value={c.status} /></td>
                    <td className="px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">{fmtDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(c)}
                        className="rounded-[var(--crmx-radius-control)] border border-[var(--crmx-border)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--crmx-text)] hover:bg-[var(--crmx-neutral-soft)]"
                      >
                        {c.status === "open" ? "مراجعة" : "التفاصيل"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <CrmPagination
            currentPage={meta.currentPage}
            lastPage={meta.lastPage}
            total={meta.total}
            perPage={20}
            itemLabel="تذكرة"
            onPageChange={(p) => { const n = new URLSearchParams(params); n.set("page", String(p)); setParams(n, { replace: true }); }}
            onPerPageChange={() => {}}
          />
        </>
      )}

      {selected && (
        <ConflictDrawer
          conflict={selected}
          canResolve={canResolve}
          onClose={() => setSelected(null)}
          onResolved={() => { setSelected(null); void load(); }}
        />
      )}
    </div>
  );
}

function ConflictDrawer({
  conflict,
  canResolve,
  onClose,
  onResolved,
}: {
  conflict: CrmIdentityConflict;
  canResolve: boolean;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string>();

  // Candidate-picking step. Only ever populated for the two resolutions that
  // split a customer off; every other path leaves it null and the drawer
  // closes as it always did.
  const [candidates, setCandidates] = useState<CrmCandidateOrder[] | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [summary, setSummary] = useState<string>();

  const isOpen = conflict.status === "open";

  // A closed split ticket can still have orders nobody has decided about.
  // Surfaced only when something is actually pending.
  const [pending, setPending] = useState<CrmCandidateOrder[]>([]);
  useEffect(() => {
    if (isOpen || !conflict.created_customer_id) return;
    let cancelled = false;
    crmApi.identityConflict(conflict.id)
      .then((env) => !cancelled && setPending(env.candidate_orders ?? []))
      .catch(() => {});
    return () => { cancelled = true; };
  }, [conflict.id, conflict.created_customer_id, isOpen]);

  const act = async (kind: string) => {
    setBusy(kind);
    setErr(undefined);
    try {
      if (kind === "dismissed") {
        await crmApi.dismissIdentityConflict(conflict.id, note || undefined);
        onResolved();
        return;
      }

      const env = await crmApi.resolveIdentityConflict(conflict.id, kind, note || undefined);
      const found = env.candidate_orders ?? [];

      // Nothing to decide about — close as before rather than showing an
      // empty step.
      if (!found.length) {
        onResolved();
        return;
      }

      setCandidates(found);
      setPicked([]);
    } catch (e) {
      setErr(getCrmError(e).message);
    } finally {
      setBusy(null);
    }
  };

  const submitReassign = async () => {
    setBusy("reassign");
    setErr(undefined);
    try {
      const env = await crmApi.reassignConflictOrders(conflict.id, picked);
      // The summary quotes the backend's own note rather than counting
      // client-side — the server is the record of what actually moved.
      setSummary(env.data.resolution_note ?? undefined);
      setCandidates(null);
      setPending(env.candidate_orders ?? []);
    } catch (e) {
      setErr(getCrmError(e).message);
    } finally {
      setBusy(null);
    }
  };

  const toggle = (id: number) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="تفاصيل تعارض الهوية">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/40" onClick={onClose} />
      <div dir="rtl" className="crmx-drawer-panel relative flex h-full w-full max-w-md flex-col bg-[var(--crmx-card)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-[var(--crmx-warning-text)]" />
            <h2 className="text-[16px] font-bold text-[var(--crmx-text)]">تعارض في الهوية</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* The comparison is the whole point of the screen: the two names
              side by side, on the one phone number they share. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[var(--crmx-border)] p-4">
              <p className="text-[11.5px] text-[var(--crmx-text-muted)]">الاسم المسجّل حاليًا</p>
              <p className="mt-1 text-[15px] font-bold text-[var(--crmx-text)]">{conflict.customer?.name ?? "—"}</p>
              <p className="mt-0.5 text-[11.5px] text-[var(--crmx-text-muted)]">{conflict.customer?.code ?? ""}</p>
              {conflict.customer && (
                <Link
                  to={`/admin/crm/customers/${conflict.customer.id}`}
                  className="mt-2 inline-block text-[12.5px] font-semibold text-[var(--crmx-primary)] hover:underline"
                >
                  فتح ملف العميل
                </Link>
              )}
            </div>
            <div className="rounded-2xl border border-[var(--crmx-warning)] bg-[var(--crmx-warning-soft)] p-4">
              <p className="text-[11.5px] text-[var(--crmx-warning-text)]">الاسم الوارد</p>
              <p className="mt-1 text-[15px] font-bold text-[var(--crmx-text)]">{conflict.incoming_name}</p>
            </div>
          </div>

          <dl className="mt-4 space-y-2.5 rounded-2xl border border-[var(--crmx-border)] p-4 text-[13px]">
            <Row label="الرقم" value={<span dir="ltr">{conflict.incoming_phone_normalized}</span>} />
            <Row label="القناة" value={CHANNEL_LABELS[conflict.source_channel] ?? conflict.source_channel} />
            <Row label="تاريخ الفتح" value={fmtDate(conflict.created_at)} />
            <Row
              label="المصدر"
              value={
                conflict.order?.id ? (
                  <Link to={`/admin/crm/orders`} className="font-semibold text-[var(--crmx-primary)] hover:underline">
                    {conflict.order.order_number ?? `طلب #${conflict.order.id}`}
                  </Link>
                ) : (
                  <span className="text-[var(--crmx-text-muted)]">لا يوجد طلب مرتبط</span>
                )
              }
            />
          </dl>

          {/* Closed tickets are a record, not something to re-decide. */}
          {/* The historical block reads the note from the list payload, which
              goes stale the moment a reassignment happens in this drawer. The
              fresh summary below supersedes it, so only one is ever shown. */}
          {!isOpen && !summary && (
            <div className="mt-4 rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-neutral-soft)] p-4">
              <p className="text-[12px] font-bold text-[var(--crmx-text-muted)]">القرار المتخذ</p>
              <p className="mt-1 text-[14px] font-bold text-[var(--crmx-text)]">
                {conflict.resolution ? RESOLUTION_LABELS[conflict.resolution] ?? conflict.resolution : STATUS_LABELS[conflict.status]}
              </p>
              {conflict.resolution_note && (
                <p className="mt-2 text-[13px] text-[var(--crmx-text-secondary)]">{conflict.resolution_note}</p>
              )}
              <p className="mt-2 text-[11.5px] text-[var(--crmx-text-muted)]">
                {conflict.resolver?.name ? `${conflict.resolver.name} · ` : ""}{fmtDate(conflict.resolved_at)}
              </p>
            </div>
          )}

          {/* Step two: which past orders belonged to the person just split off.
              Nothing is pre-checked — the whole point is a deliberate choice,
              and a default selection would quietly become the answer. */}
          {candidates && (
            <div className="mt-5 rounded-2xl border border-[var(--crmx-warning)] bg-[var(--crmx-warning-soft)] p-4">
              <h3 className="text-[14px] font-bold text-[var(--crmx-text)]">طلبات قد تخص العميل الجديد</h3>
              <p className="mt-1 text-[12.5px] text-[var(--crmx-text-secondary)]">
                طلبات سابقة سُجّلت بالاسم الوارد نفسه على هذا الرقم. اختر ما تتأكد أنه يخص العميل الجديد — ما لا تختاره يبقى كما هو.
              </p>

              <button
                type="button"
                onClick={() => setPicked(picked.length === candidates.length ? [] : candidates.map((o) => o.id))}
                className="mt-3 text-[12.5px] font-bold text-[var(--crmx-primary)] hover:underline"
              >
                {picked.length === candidates.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
              </button>

              <ul className="mt-2 space-y-1.5">
                {candidates.map((o) => (
                  <li key={o.id}>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-[var(--crmx-radius-control)] bg-[var(--crmx-card)] px-3 py-2">
                      <input
                        type="checkbox"
                        checked={picked.includes(o.id)}
                        onChange={() => toggle(o.id)}
                        className="h-4 w-4 accent-[var(--crmx-primary)]"
                      />
                      <span className="flex-1 text-[13px] font-semibold text-[var(--crmx-text)]">{o.order_number ?? `#${o.id}`}</span>
                      <span className="text-[12px] text-[var(--crmx-text-muted)]">{fmtDate(o.created_at)}</span>
                      <span className="text-[13px] font-bold text-[var(--crmx-text)]">{money(o.total == null ? null : Number(o.total))}</span>
                    </label>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={busy !== null}
                onClick={submitReassign}
                className="mt-3 h-11 w-full rounded-xl bg-[var(--crmx-primary)] px-4 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:opacity-50"
              >
                {busy === "reassign"
                  ? "جارٍ الإسناد…"
                  : picked.length
                    ? `إسناد ${picked.length} طلب للعميل الجديد`
                    : "متابعة بلا إسناد أي طلب"}
              </button>
              {err && <p className="mt-2 text-[12.5px] text-[var(--crmx-danger-text)]">{err}</p>}
            </div>
          )}

          {/* Quotes the backend's own note, so the screen cannot claim
              something different from what the server recorded. */}
          {summary && (
            <div className="mt-5 rounded-2xl border border-[var(--crmx-success)] bg-[var(--crmx-success-soft)] p-4">
              <p className="text-[13px] font-semibold text-[var(--crmx-text)]">{summary}</p>
              <button
                type="button"
                onClick={onResolved}
                className="mt-3 h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-bold text-[var(--crmx-text)]"
              >
                إغلاق
              </button>
            </div>
          )}

          {/* A closed split ticket with orders still undecided. Shown only
              when something is genuinely pending. */}
          {!isOpen && !candidates && !summary && pending.length > 0 && canResolve && (
            <button
              type="button"
              onClick={() => { setCandidates(pending); setPicked([]); }}
              className="mt-4 h-11 w-full rounded-xl border border-[var(--crmx-warning)] px-4 text-[14px] font-bold text-[var(--crmx-warning-text)] hover:bg-[var(--crmx-warning-soft)]"
            >
              مراجعة الطلبات المتبقية ({pending.length})
            </button>
          )}

          {isOpen && canResolve && !candidates && !summary && (
            <div className="mt-5">
              <label className="mb-1 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]">ملاحظة (اختيارية)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 py-2.5 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10"
                placeholder="سبب القرار، لسجل المراجعة."
              />
              {err && <p className="mt-2 text-[12.5px] text-[var(--crmx-danger-text)]">{err}</p>}

              <div className="mt-3 space-y-2">
                {DECISIONS.map((d) => (
                  <button
                    key={d.key}
                    disabled={busy !== null}
                    onClick={() => act(d.key)}
                    className={`w-full rounded-xl border px-4 py-3 text-right text-[14px] font-semibold transition disabled:opacity-50 ${d.tone}`}
                  >
                    {busy === d.key ? "جارٍ التنفيذ…" : d.label}
                    <span className="mt-0.5 block text-[11.5px] font-normal text-[var(--crmx-text-muted)]">{d.hint}</span>
                  </button>
                ))}
                <button
                  disabled={busy !== null}
                  onClick={() => act("dismissed")}
                  className="w-full rounded-xl px-4 py-3 text-right text-[14px] font-semibold text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)] disabled:opacity-50"
                >
                  {busy === "dismissed" ? "جارٍ التنفيذ…" : "تجاهل"}
                  <span className="mt-0.5 block text-[11.5px] font-normal">تذكرة لا محل لها — بيانات اختبار أو خطأ إدخال واضح.</span>
                </button>
              </div>
            </div>
          )}

          {isOpen && !canResolve && (
            <p className="mt-5 rounded-2xl border border-dashed border-[var(--crmx-border)] p-4 text-center text-[13px] text-[var(--crmx-text-muted)]">
              العرض فقط — البتّ في التعارضات يحتاج صلاحية إضافية.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[var(--crmx-text-muted)]">{label}</dt>
      <dd className="font-semibold text-[var(--crmx-text)]">{value}</dd>
    </div>
  );
}
