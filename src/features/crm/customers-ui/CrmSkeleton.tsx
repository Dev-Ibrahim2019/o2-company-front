export function CrmTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]">
      <div className="crmx-skeleton h-11 w-full rounded-none" />
      <div className="divide-y divide-[var(--crmx-border)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <span className="crmx-skeleton h-10 w-10 shrink-0 rounded-full" />
            <span className="crmx-skeleton h-4 w-full max-w-[160px]" />
            <span className="crmx-skeleton hidden h-4 w-24 md:block" />
            <span className="crmx-skeleton hidden h-4 w-20 md:block" />
            <span className="crmx-skeleton hidden h-4 w-16 lg:block" />
            <span className="crmx-skeleton ms-auto h-6 w-16 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CrmToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="crmx-skeleton h-11 min-w-[220px] flex-1" />
      <span className="crmx-skeleton hidden h-11 w-36 md:block" />
      <span className="crmx-skeleton hidden h-11 w-36 md:block" />
      <span className="crmx-skeleton hidden h-11 w-40 md:block" />
    </div>
  );
}
