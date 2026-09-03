import { Coins, Gift, PlusCircle, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { toast } from "../../components/shared/Toast";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CrmKpiCard } from "./customers-ui";
import { date as fmtDate, num } from "./format";
import { LoyaltyManualAdjustmentDrawer } from "./LoyaltyManualAdjustmentDrawer";
import { TXN_STATUS_LABELS, TXN_TYPE_LABELS, TXN_TYPE_TONE } from "./loyaltyLabels";
import type { CrmId, CrmLoyaltyOwnerSummary, CrmLoyaltyTransaction } from "./types";

const cardCls = "rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]";
const pill = "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap";

/**
 * The loyalty half of a customer or group profile.
 *
 * Structural mirror of OccasionsPanel: one component, `owner` decides which
 * URL segment the requests use, so a customer profile and a group profile
 * render identically apart from that one prop. There is no polymorphic table
 * behind this the way customer_occasions has one — loyalty_transactions is
 * addressed by owner_type/owner_id at the API layer instead — but the
 * frontend shape is deliberately the same for the same reason: one owner
 * enum, one component, not two near-identical copies.
 */
export function LoyaltyPanel({ owner, ownerId }: { owner: "customers" | "groups"; ownerId: CrmId }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(CRM_PERMISSIONS.LOYALTY_MANAGE);

  const [summary, setSummary] = useState<CrmLoyaltyOwnerSummary | null>(null);
  const [rows, setRows] = useState<CrmLoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, page] = await Promise.all([
        crmApi.loyaltyOwnerSummary(owner, ownerId),
        crmApi.loyaltyOwnerTransactions(owner, ownerId, { per_page: "20" }),
      ]);
      setSummary(s);
      setRows(page.items);
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, [owner, ownerId]);

  useEffect(() => { void load(); }, [load]);

  const submitAdjustment = async (points: number, notes: string) => {
    setSaving(true);
    try {
      await crmApi.createLoyaltyAdjustment({
        owner_type: owner === "customers" ? "customer" : "group",
        owner_id: ownerId,
        points,
        notes,
      });
      toast.success("تم تسجيل التعديل");
      setAdjustOpen(false);
      await load();
    } catch (e) {
      toast.error("تعذّر حفظ التعديل", getCrmError(e).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CrmState kind="loading" title="جارٍ تحميل بيانات الولاء" />;
  if (error) return <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`${cardCls} col-span-1 flex flex-col justify-center p-5 sm:col-span-1`}>
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
            <Coins className="h-4 w-4 text-[var(--crmx-primary)]" /> الرصيد الحالي
          </p>
          <p className="mt-1.5 text-[32px] font-extrabold leading-none text-[var(--crmx-text)]">
            {num(summary?.balance ?? 0)}
            <span className="ms-1.5 text-[15px] font-bold text-[var(--crmx-text-muted)]">نقطة</span>
          </p>
        </div>
        <CrmKpiCard icon={<TrendingUp className="h-5 w-5" />} label="إجمالي مكتسب" tone="success" value={num(summary?.total_earned ?? 0)} />
        <CrmKpiCard icon={<Gift className="h-5 w-5" />} label="إجمالي مستبدَل" tone="warning" value={num(summary?.total_redeemed ?? 0)} />
      </div>

      {/* Hidden entirely without crm.loyalty.manage — not disabled. A visible
          but dead button would tell an unauthorised viewer the capability
          exists at all. */}
      {canManage && (
        <button
          onClick={() => setAdjustOpen(true)}
          className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-bold text-[var(--crmx-navy)] transition hover:bg-[var(--crmx-neutral-soft)]"
        >
          <PlusCircle className="h-4 w-4" /> تعديل يدوي
        </button>
      )}

      {rows.length === 0 ? (
        <CrmState kind="empty" title="لا توجد حركات ولاء بعد" />
      ) : (
        <div className={cardCls}>
          <div className="crmx-scrollbar overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-right">
              <thead>
                <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
                  {["النوع", "النقاط", "الحالة", "الطلب", "ملاحظات", "التاريخ"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3.5 text-[12.5px] font-bold text-[var(--crmx-text-secondary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const positive = Number(t.points) >= 0;
                  return (
                    <tr key={String(t.id)} className="border-b border-[var(--crmx-border)] last:border-0">
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`${pill} ${TXN_TYPE_TONE[t.type]}`}>{TXN_TYPE_LABELS[t.type]}</span>
                      </td>
                      <td className={`whitespace-nowrap px-4 py-3 text-[13px] font-bold ${positive ? "text-[var(--crmx-success-text)]" : "text-[var(--crmx-danger-text)]"}`}>
                        {positive ? "+" : ""}{num(Number(t.points))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[12.5px] text-[var(--crmx-text-secondary)]">
                        {TXN_STATUS_LABELS[t.status]}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">
                        {t.order?.order_number ?? "—"}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]" title={t.notes ?? undefined}>
                        {t.notes ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[12.5px] text-[var(--crmx-text-muted)]">
                        {fmtDate(t.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adjustOpen && (
        <LoyaltyManualAdjustmentDrawer
          ownerLabel={owner === "customers" ? "العميل" : "المجموعة"}
          saving={saving}
          onClose={() => setAdjustOpen(false)}
          onSubmit={submitAdjustment}
        />
      )}
    </div>
  );
}
