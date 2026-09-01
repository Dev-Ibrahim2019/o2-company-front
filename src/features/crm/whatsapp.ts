/**
 * Builds the number wa.me expects: digits only, full country code, no `+`
 * and no leading zero.
 *
 * This is a presentation concern, deliberately separate from identity
 * matching. The backend's PhoneNormalizer decides what two numbers mean when
 * comparing customers; this decides what a link needs to dial, and nothing
 * here feeds back into matching.
 *
 * The card used to strip non-digits from the displayed value, which is the
 * legacy local form (`0599123456`, or `591234568` once
 * PhoneNormalizer::legacyValue has removed the +970). Neither carries a
 * country code, so every link it produced was unusable — wa.me read the
 * leading zero as part of the subscriber number and found nothing.
 *
 * Known limitation, inherited from the data rather than introduced here: a
 * `05x` number is stored as +970 even when the subscriber is actually on an
 * Israeli network (050/052/054/058). Internal matching does not care, but a
 * WhatsApp link built from it will point at the wrong country. Correcting
 * that means correcting the stored number, not this function.
 */
const DEFAULT_COUNTRY_CODE = "970";

export function whatsappNumber(input?: {
  /** E.164 as stored in customer_phones.normalized_phone, e.g. +970599123456. */
  normalized?: string | null;
  /** The legacy display value, e.g. 0599123456 or 599123456. */
  legacy?: string | null;
}): string | null {
  const normalized = (input?.normalized ?? "").trim();

  // Preferred path: the stored E.164 value already carries the country code,
  // so it only needs its punctuation removed.
  if (normalized.startsWith("+")) {
    const digits = normalized.replace(/\D/g, "");
    return digits.length >= 8 ? digits : null;
  }

  const legacy = (input?.legacy ?? "").replace(/\D/g, "");
  if (legacy === "") return null;

  // No country code available, so assume the default one. Strip any leading
  // zeros first — a trunk prefix is meaningless in an international number.
  const local = legacy.replace(/^0+/, "");
  if (local === "") return null;

  // Already international (starts with the country code and is long enough to
  // be more than a local number that happens to begin with those digits).
  if (local.startsWith(DEFAULT_COUNTRY_CODE) && local.length > DEFAULT_COUNTRY_CODE.length + 6) {
    return local;
  }

  return DEFAULT_COUNTRY_CODE + local;
}
