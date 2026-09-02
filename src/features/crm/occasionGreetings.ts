import type { CrmOccasionType } from "./types";

/**
 * Ready-made WhatsApp greetings, one per occasion type.
 *
 * Hard-coded by an explicit decision of the owner: there is no settings screen
 * for these and none is planned, so this file is the single place the wording
 * lives. Changing a greeting means changing it here.
 *
 * `{name}` is the only placeholder. The three templates addressed to an
 * organisation (a founding anniversary, a contract renewal, and the generic
 * one) carry none on purpose — they greet a company, not a person.
 */
export const OCCASION_GREETINGS: Record<CrmOccasionType, string> = {
  birthday:
    "🎉 كل عام وأنت بخير يا {name}! نتمنى لك عاماً مليئاً بالسعادة والصحة. مع أطيب التمنيات من عائلة O2 🎂",
  anniversary:
    "💐 ذكرى سعيدة يا {name}! نتمنى لك ولعائلتك دوام المحبة. مع تحيات O2",
  graduation:
    "🎓 مبروك التخرج يا {name}! نتمنى لك مستقبلاً باهراً. من فريق O2",
  company_founding:
    "🎉 كل عام وأنتم بخير بذكرى تأسيس شركتكم! نتمنى لكم دوام التقدم. من عائلة O2",
  contract_renewal:
    "🤝 يسعدنا استمرار شراكتنا معكم! شكراً لثقتكم. مع تحيات O2",
  other:
    "🎊 أحر التهاني بهذه المناسبة السعيدة! مع تحيات عائلة O2",
};

/**
 * Stands in for a missing name so a greeting never reads "يا !".
 *
 * A customer record always carries a name, so this is a guard against a
 * malformed payload rather than an expected path — but a broken sentence sent
 * to a real customer is a worse failure than a generic one.
 */
const NAME_FALLBACK = "عميلنا العزيز";

/**
 * The greeting for one occasion, with the owner's name filled in.
 *
 * Returns the raw text; encoding for the wa.me URL is the caller's job, done
 * once at the point the href is built.
 */
export function occasionGreeting(type: CrmOccasionType, name?: string | null): string {
  const template = OCCASION_GREETINGS[type] ?? OCCASION_GREETINGS.other;

  return template.replace("{name}", (name ?? "").trim() || NAME_FALLBACK);
}
