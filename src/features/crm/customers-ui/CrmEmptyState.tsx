import { SearchX, UserPlus } from "lucide-react";

export function CrmEmptyState({
  hasFilters,
  onResetFilters,
  onAddCustomer,
}: {
  hasFilters: boolean;
  onResetFilters: () => void;
  onAddCustomer: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-muted)]">
        <SearchX className="h-6 w-6" />
      </span>
      <div>
        <p className="text-[16px] font-bold text-[var(--crmx-text)]">{hasFilters ? "لا توجد نتائج" : "لا يوجد عملاء بعد"}</p>
        <p className="mt-1 max-w-xs text-[13px] text-[var(--crmx-text-secondary)]">
          {hasFilters ? "لم نجد عملاء مطابقين للفلاتر الحالية." : "ابدأ بإضافة أول عميل إلى CRM لإدارة بياناته وتفاعلاته."}
        </p>
      </div>
      {hasFilters ? (
        <button
          onClick={onResetFilters}
          className="mt-2 h-10 rounded-xl border border-[var(--crmx-border)] px-4 text-[13px] font-semibold text-[var(--crmx-text)] hover:bg-[var(--crmx-neutral-soft)]"
        >
          إعادة ضبط الفلاتر
        </button>
      ) : (
        <button
          onClick={onAddCustomer}
          className="mt-2 flex h-10 items-center gap-1.5 rounded-xl bg-[var(--crmx-navy)] px-4 text-[13px] font-bold text-white hover:bg-[var(--crmx-navy-hover)]"
        >
          <UserPlus className="h-4 w-4" /> إضافة أول عميل
        </button>
      )}
    </div>
  );
}
