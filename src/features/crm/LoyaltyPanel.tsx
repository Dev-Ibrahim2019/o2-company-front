import { Coins, Gift, PlusCircle, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { toast } from "../../components/shared/Toast";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CrmDataView, CrmKpiCard, CrmViewToggle, useCrmViewMode } from "./customers-ui";
import { num } from "./format";
import { LoyaltyManualAdjustmentDrawer } from "./LoyaltyManualAdjustmentDrawer";
import { loyaltyTxnColumns } from "./loyaltyColumns";
import type { CrmId, CrmLoyaltyOwnerSummary, CrmLoyaltyTransaction } from "./types";

const cardCls = "rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]";
// Each ledger row is the owner's own, so no owner column.
const PANEL_COLUMNS = loyaltyTxnColumns({ withOwner: false });

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
  const [viewMode, setViewMode] = useCrmViewMode(owner === "customers" ? "customer-loyalty" : "group-loyalty");
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
        <div className="space-y-2">
          <div className="flex justify-end">
            <CrmViewToggle mode={viewMode} onChange={setViewMode} />
          </div>
          <CrmDataView
            rows={rows}
            columns={PANEL_COLUMNS}
            rowKey={(t) => String(t.id)}
            mode={viewMode}
            minTableWidth={720}
          />
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
