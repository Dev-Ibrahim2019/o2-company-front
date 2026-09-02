import { MessageCircle, PartyPopper, Phone } from "lucide-react";
import { occasionGreeting } from "./occasionGreetings";
import type { CrmOccasionType } from "./types";
import { whatsappNumber } from "./whatsapp";

export interface OccasionContact {
  /** customer_phones.normalized_phone (E.164) for the primary number. */
  normalizedPhone?: string | null;
  /** The legacy display value, e.g. 0599123456. */
  phone?: string | null;
  /** The owner's name, for the {name} slot in a greeting template. */
  name?: string | null;
}

/**
 * Call / WhatsApp / ready-made greeting for the person an occasion belongs to.
 *
 * Only ever rendered for a customer-owned occasion. A group has no single
 * number to dial — reaching its members is the deferred bulk-messaging
 * module, not something to fake with one member's phone — so the caller
 * passes no contact for a group and this renders nothing at all. The greeting
 * button inherits that guard rather than adding its own.
 *
 * The wa.me number comes from whatsappNumber(), the same function the profile
 * card uses. Duplicating the "strip non-digits, prepend the country code"
 * rule here is exactly how the two would drift apart; the known limitation
 * documented in whatsapp.ts applies equally to both call sites.
 */
export function OccasionContactActions({
  contact,
  /** Chooses the greeting template. Without it the greeting button is
   *  omitted — there is no sensible default congratulation for an unknown
   *  kind of occasion, and `other` would be a guess, not a fallback. */
  occasionType,
}: {
  contact: OccasionContact;
  occasionType?: CrmOccasionType | null;
}) {
  const whatsapp = whatsappNumber({ normalized: contact.normalizedPhone, legacy: contact.phone });

  // The tel: link is built from whatever we can display; unlike wa.me, a
  // dialler handles a local number fine, so a missing country code is not a
  // reason to withhold the button.
  const dial = (contact.normalizedPhone ?? contact.phone ?? "").replace(/[^\d+]/g, "");

  if (!dial && !whatsapp) return null;

  // Encoded once, here, where the URL is assembled. The template carries
  // emoji, spaces and "!" — all of which have to survive as text rather than
  // being read as URL syntax, which is exactly what encodeURIComponent does.
  const greetingHref = whatsapp && occasionType
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(occasionGreeting(occasionType, contact.name))}`
    : null;

  const btn =
    "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--crmx-border)] px-2.5 text-[12px] font-bold transition";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {greetingHref && (
        <a
          href={greetingHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          // Says plainly that nothing is sent yet: WhatsApp opens with the
          // text as a draft and the employee sends it themselves.
          title="فتح واتساب برسالة تهنئة جاهزة للمراجعة قبل الإرسال"
          className={`${btn} border-[var(--crmx-primary)]/40 text-[var(--crmx-primary-text)] hover:bg-[var(--crmx-primary-soft)]`}
        >
          <PartyPopper className="h-3.5 w-3.5" />
          إرسال تهنئة
        </a>
      )}
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          // The row/card around this is clickable in the list; without this the
          // click would open the detail drawer instead of the link.
          onClick={(e) => e.stopPropagation()}
          title="مراسلة عبر واتساب"
          className={`${btn} text-[var(--crmx-success-text)] hover:bg-[var(--crmx-success-soft)]`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          واتساب
        </a>
      )}
      {dial && (
        <a
          href={`tel:${dial}`}
          onClick={(e) => e.stopPropagation()}
          title="اتصال"
          className={`${btn} text-[var(--crmx-navy)] hover:bg-[var(--crmx-neutral-soft)]`}
        >
          <Phone className="h-3.5 w-3.5" />
          اتصال
        </a>
      )}
    </div>
  );
}
