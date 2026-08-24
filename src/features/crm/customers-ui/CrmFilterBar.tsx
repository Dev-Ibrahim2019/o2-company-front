import { SlidersHorizontal } from "lucide-react";
import type { Branch } from "../../../services/branchService";
import { CRM_CATEGORY_OPTIONS } from "./categoryOptions";
import { CRM_SOURCE_FILTER_OPTIONS } from "./sourceOptions";

const selectCls =
  "h-11 min-w-[140px] rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none transition focus:border-[var(--crmx-navy)] focus:ring-2 focus:ring-[var(--crmx-navy)]/10";

// Gender is deliberately not in this inline row — it's the least-used
// segmentation filter for day-to-day CRM work, so it lives only in the
// Advanced Filters drawer (CrmFilterDrawer) to keep this toolbar scannable.
export function CrmFilterBar({
  status,
  onStatusChange,
  category,
  onCategoryChange,
  source,
  onSourceChange,
  branchId,
  onBranchChange,
  branches,
  showBranchFilter,
  advancedActiveCount,
  onOpenAdvanced,
}: {
  status: string;
  onStatusChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  source: string;
  onSourceChange: (value: string) => void;
  branchId: string;
  onBranchChange: (value: string) => void;
  branches: Branch[];
  showBranchFilter: boolean;
  advancedActiveCount: number;
  onOpenAdvanced: () => void;
}) {
  return (
    <div className="hidden flex-wrap items-center gap-2.5 md:flex">
      <select className={selectCls} value={status} onChange={(e) => onStatusChange(e.target.value)}>
        <option value="">كل الحالات</option>
        <option value="active">نشط</option>
        <option value="inactive">غير نشط</option>
        <option value="blocked">محظور</option>
      </select>
      <select className={selectCls} value={category} onChange={(e) => onCategoryChange(e.target.value)}>
        {CRM_CATEGORY_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      <select className={selectCls} value={source} onChange={(e) => onSourceChange(e.target.value)} aria-label="مصدر العميل">
        {CRM_SOURCE_FILTER_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      {showBranchFilter && (
        <select className={selectCls} value={branchId} onChange={(e) => onBranchChange(e.target.value)}>
          <option value="">كل الفروع</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={onOpenAdvanced}
        className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-white px-4 text-[14px] font-semibold text-[var(--crmx-text)] transition hover:border-[var(--crmx-navy)]"
      >
        <SlidersHorizontal className="h-4 w-4" />
        فلاتر متقدمة
        {advancedActiveCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--crmx-navy)] text-[11px] font-bold text-white">
            {advancedActiveCount}
          </span>
        )}
      </button>
    </div>
  );
}
