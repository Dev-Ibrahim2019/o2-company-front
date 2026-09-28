import { LayoutGrid, Rows3 } from "lucide-react";
import type { CrmViewMode } from "./useCrmViewMode";

/**
 * جدول / كاردات — the switch every CRM list shares. Icon + word on wide
 * screens, icon only on phones (the words come back as aria-label/title).
 */
export function CrmViewToggle({
  mode,
  onChange,
  className = "",
}: {
  mode: CrmViewMode;
  onChange: (mode: CrmViewMode) => void;
  className?: string;
}) {
  const options: { value: CrmViewMode; label: string; Icon: typeof Rows3 }[] = [
    { value: "table", label: "جدول", Icon: Rows3 },
    { value: "cards", label: "كاردات", Icon: LayoutGrid },
  ];

  return (
    <div
      role="group"
      aria-label="طريقة العرض"
      className={`inline-flex shrink-0 rounded-[var(--crmx-radius-control)] border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-1 ${className}`}
    >
      {options.map(({ value, label, Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={`عرض ${label}`}
            title={`عرض ${label}`}
            onClick={() => onChange(value)}
            className={`flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[13px] font-bold transition ${
              active
                ? "bg-[var(--crmx-primary)] text-white shadow-sm"
                : "text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-text)]"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
