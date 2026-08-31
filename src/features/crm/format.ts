/**
 * CRM formatting — one place, so every CRM screen renders figures the way the
 * approved mockup does.
 *
 * Why this file exists: the same four formatters were re-declared in
 * CrmTable, CrmQuickViewDrawer, CrmOrderExpandedPanel, Customer360Page,
 * OrdersPage, DashboardPage and tabs/shared, each with slightly different
 * options — so the same number could render three different ways on three
 * screens.
 *
 * Numerals: the mockup uses Latin digits everywhere (248 عميل, 2,250,
 * 2025-05-20). `toLocaleString("ar")` returns Arabic-Indic characters
 * (٢٤٨) — actual different code points, which no CSS rule can restyle — so
 * the locale is pinned to "en-US" for digits while the surrounding copy
 * stays Arabic.
 *
 * Currency: ₪ (ILS). The mockup's sample rows show ريس/+966 because it was
 * drawn from a generic template; the real business is Gaza (ILS), so the
 * mockup's *format* is adopted and its sample currency is not.
 */

const NUM = new Intl.NumberFormat("en-US");
const MONEY = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const MONEY_EXACT = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Wraps a value in Unicode LTR isolate … pop-isolate (U+2066 … U+2069).
 *
 * Without it, a value made of several runs — "2026-08-26 13:34" is four digit
 * runs joined by neutral "-" and " " — gets reordered segment-by-segment by
 * the bidi algorithm inside an RTL paragraph, so a correct string renders as
 * "26-08-2026 · 13:34". Same for "2,250 ₪", which flips to "₪ 2,250".
 *
 * The isolate characters are zero-width and invisible; they only affect
 * rendering order, never the underlying text.
 */
const ltr = (value: string): string => `⁦${value}⁩`;

/** 1234 → "1,234" */
export const num = (value?: number | null): string =>
  value == null || Number.isNaN(Number(value)) ? "—" : NUM.format(Number(value));

/** 2250 → "2,250 ₪" — whole units unless the amount has cents. */
export const money = (value?: number | null): string => {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return ltr(`${MONEY.format(Number(value))} ₪`);
};

/** Always two decimals — for statements/invoices where alignment matters. */
export const moneyExact = (value?: number | null): string => {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return ltr(`${MONEY_EXACT.format(Number(value))} ₪`);
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Bare "YYYY-MM-DD", no isolate — the shared core of date() and dateTime(). */
const isoDay = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "2026-08-25T10:11:12Z" → "2025-05-20" (the mockup's date format). */
export const date = (value?: string | null): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return ltr(isoDay(d));
};

/** → "2025-05-20 14:30" (the mockup's orders-table format). */
export const dateTime = (value?: string | null): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  // Built from isoDay(), not date(), so the isolate wraps the whole
  // "date time" run once instead of nesting one isolate inside another.
  return ltr(`${isoDay(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`);
};

/**
 * "آخر طلب" specifically — a missing value means the customer has no order
 * activity at all, which reads better than a bare dash.
 */
export const lastOrder = (value?: string | null): string => (value ? date(value) : "لا يوجد نشاط");
