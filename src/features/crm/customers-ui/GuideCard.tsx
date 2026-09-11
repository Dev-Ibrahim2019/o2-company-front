/**
 * The two building blocks every CRM "دليل" (reference guide) page is built
 * from — first written for ComplaintsGuidePage, reused as-is for
 * IdentityConflictsGuidePage so two independent guides can never drift into
 * two different visual languages.
 */

export function GuideCard({
  icon, title, subtitle, children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5 shadow-[var(--crmx-shadow-sm)]">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]">
          {icon}
        </span>
        <div>
          <h2 className="text-[15px] font-extrabold text-[var(--crmx-text)]">{title}</h2>
          <p className="mt-0.5 text-[12.5px] text-[var(--crmx-text-secondary)]">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

export function GuideRow({ pill, description }: { pill: React.ReactNode; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[var(--crmx-neutral-soft)] px-3 py-2.5">
      <span className="shrink-0 pt-0.5">{pill}</span>
      <p className="text-[12.5px] leading-6 text-[var(--crmx-text-secondary)]">{description}</p>
    </div>
  );
}
