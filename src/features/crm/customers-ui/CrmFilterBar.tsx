import { SlidersHorizontal } from "lucide-react";
import type { Branch } from "../../../services/branchService";
import { CRM_ENGAGEMENT_OPTIONS } from "./engagementOptions";
import { CRM_OCCASION_OPTIONS } from "./occasionOptions";

const selectCls =
  "h-11 min-w-[140px] rounded-[var(--crmx-radius-control)] border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none transition focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";

/**
 * Inline filter row — the five filters the approved mockup puts under the
 * search bar, in its order: الحالة · لديه مشكلة · لديه مناسبة · مناسبة · التصنيف.
 *
 * "المصدر" and "الجنس" are deliberately NOT here: neither is in the mockup's
 * row, and both remain available in the Advanced Filters drawer, so nothing
 * is lost and the toolbar stays scannable. "الفرع" is the one addition, shown
 * only to a global (non-branch-scoped) user, who otherwise has no way to
 * narrow a multi-branch list.
 */
export function CrmFilterBar({
  status,
  onStatusChange,
  hasComplaints,
  onHasComplaintsChange,
  hasOccasion,
  onHasOccasionChange,
  occasionType,
  onOccasionTypeChange,
  category,
  onCategoryChange,
  branchId,
  onBranchChange,
  branches,
  showBranchFilter,
  advancedActiveCount,
  onOpenAdvanced,
}: {
  status: string;
  onStatusChange: (value: string) => void;
  hasComplaints: string;
  onHasComplaintsChange: (value: string) => void;
  hasOccasion: string;
  onHasOccasionChange: (value: string) => void;
  occasionType: string;
  onOccasionTypeChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  branchId: string;
  onBranchChange: (value: string) => void;
  branches: Branch[];
  showBranchFilter: boolean;
  advancedActiveCount: number;
  onOpenAdvanced: () => void;
}) {
  return (
    // Matches CrmTable's breakpoint (lg, not md) — this bar and the desktop
    // table used to switch on together at 768px, the exact width where the
    // table needed a forced horizontal scrollbar and this row itself wrapped
    // to two lines. Below lg the mobile filter drawer covers the same ground.
    <div className="hidden flex-wrap items-center gap-2.5 lg:flex">
      <select className={selectCls} value={status} onChange={(e) => onStatusChange(e.target.value)} aria-label="الحالة">
        <option value="">كل الحالات</option>
        <option value="active">نشط</option>
        <option value="inactive">غير نشط</option>
        <option value="blocked">محظور</option>
      </select>

      <select className={selectCls} value={hasComplaints} onChange={(e) => onHasComplaintsChange(e.target.value)} aria-label="لديه مشكلة">
        <option value="">لديه مشكلة: الكل</option>
        <option value="1">نعم</option>
        <option value="0">لا</option>
      </select>

      <select className={selectCls} value={hasOccasion} onChange={(e) => onHasOccasionChange(e.target.value)} aria-label="لديه مناسبة">
        <option value="">لديه مناسبة: الكل</option>
        <option value="1">نعم</option>
        <option value="0">لا</option>
      </select>

      <select className={selectCls} value={occasionType} onChange={(e) => onOccasionTypeChange(e.target.value)} aria-label="نوع المناسبة">
        <option value="">كل المناسبات</option>
        {CRM_OCCASION_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>

      <select className={selectCls} value={category} onChange={(e) => onCategoryChange(e.target.value)} aria-label="حالة التعامل">
        {CRM_ENGAGEMENT_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>

      {showBranchFilter && (
        <select className={selectCls} value={branchId} onChange={(e) => onBranchChange(e.target.value)} aria-label="الفرع">
          <option value="">كل الفروع</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={onOpenAdvanced}
        className="flex h-11 items-center gap-2 rounded-[var(--crmx-radius-control)] border border-[var(--crmx-border)] bg-white px-4 text-[14px] font-semibold text-[var(--crmx-text)] transition hover:border-[var(--crmx-primary)]"
      >
        <SlidersHorizontal className="h-4 w-4" />
        فلترة متقدمة
        {advancedActiveCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--crmx-primary)] text-[11px] font-bold text-white">
            {advancedActiveCount}
          </span>
        )}
      </button>
    </div>
  );
}
