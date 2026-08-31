import { Building2, Copy, Mail, MessageCircle, Pencil, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { CrmAvatar } from "./CrmAvatar";

/**
 * The mockup's customer identity card: avatar, name, phone, email, and a row
 * of small quick-action buttons — sitting to the right of the KPI strip
 * rather than being flattened into a wide header bar.
 *
 * Every action here already existed on the old header bar; they are re-laid
 * out, not newly invented, and each one is omitted when the underlying value
 * is missing (no phone → no call/WhatsApp button).
 */
export function CrmProfileCard({
  name,
  code,
  phone,
  email,
  group,
  editHref,
}: {
  name: string;
  code?: string | null;
  phone?: string | null;
  email?: string | null;
  /** The customer's group, when they belong to one. Rendered as a link. */
  group?: { id: string | number; name: string } | null;
  editHref: string;
}) {
  const whatsapp = (phone || "").replace(/\D/g, "");

  const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-[var(--crmx-radius-control)] border border-[var(--crmx-border)] text-[var(--crmx-text-muted)] transition hover:border-[var(--crmx-primary)] hover:text-[var(--crmx-primary)]";

  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
      <CrmAvatar name={name} size={60} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-[var(--crmx-text)]">{name}</p>

        {phone && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-[var(--crmx-text-secondary)]">
            <Phone className="h-3.5 w-3.5 shrink-0 text-[var(--crmx-text-muted)]" />
            <span className="truncate" dir="ltr">{phone}</span>
          </p>
        )}
        {email && (
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[var(--crmx-text-secondary)]">
            <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--crmx-text-muted)]" />
            <span className="truncate" dir="ltr">{email}</span>
          </p>
        )}

        {group && (
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px]">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-[var(--crmx-text-muted)]" />
            <Link
              to={`/admin/crm/groups/${group.id}`}
              className="truncate font-semibold text-[var(--crmx-primary)] hover:underline"
            >
              {group.name}
            </Link>
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {phone && <a href={`tel:${phone}`} title="اتصال" aria-label="اتصال" className={iconBtn}><Phone className="h-3.5 w-3.5" /></a>}
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" title="واتساب" aria-label="واتساب" className={iconBtn}>
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          )}
          {email && <a href={`mailto:${email}`} title="بريد إلكتروني" aria-label="بريد إلكتروني" className={iconBtn}><Mail className="h-3.5 w-3.5" /></a>}
          {code && (
            <button
              type="button"
              title="نسخ كود العميل"
              aria-label="نسخ كود العميل"
              onClick={() => navigator.clipboard?.writeText(String(code))}
              className={iconBtn}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
          <Link to={editHref} title="تعديل" aria-label="تعديل" className={iconBtn}><Pencil className="h-3.5 w-3.5" /></Link>
        </div>
      </div>
    </div>
  );
}
