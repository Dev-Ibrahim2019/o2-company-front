import type { ReactNode } from "react";

export function CrmPageHeader({
  title,
  description,
  actions,
  breadcrumb = "CRM",
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  breadcrumb?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-1 text-[12px] font-bold text-[var(--crmx-text-muted)]">{breadcrumb}</p>
        <h1 className="text-[28px] font-extrabold text-[var(--crmx-text)] md:text-[32px]">{title}</h1>
        <p className="mt-1 max-w-xl text-[15px] text-[var(--crmx-text-secondary)]">{description}</p>
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}
