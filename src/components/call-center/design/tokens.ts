// ============================================================================
// DESIGN SYSTEM — O2 Call Center Enterprise
// Inspired by: Stripe, Linear, Vercel, Shopify Admin
// ============================================================================

// ── Colors ───────────────────────────────────────────────────────────────────
// القيم مراجع CSS custom properties (معرّفة في src/index.css تحت --o2-cc-*)
// بدل hex ثابتة — بهذا يعيد المتصفح رسم كل مكان يستخدم colors.X تلقائياً عند
// تبديل الثيم (عبر كلاس theme-dark/theme-light على <html>، نفس آلية useTheme()
// الموجودة أصلاً في src/theme.tsx) بدون أي تغيير في أي من الملفات المستهلِكة.
// كل قيمة هنا لا تزال string عادي، لذا `colors.neutral[900]` يبقى يعمل كما هو
// في أي مكان — التصيير فقط يصبح ديناميكياً حسب الثيم الحالي.
export const colors = {
  brand: {
    50:  "var(--o2-cc-brand-50)",
    100: "var(--o2-cc-brand-100)",
    200: "var(--o2-cc-brand-200)",
    300: "var(--o2-cc-brand-300)",
    400: "var(--o2-cc-brand-400)",
    500: "var(--o2-cc-brand-500)",
    600: "var(--o2-cc-brand-600)",
    700: "var(--o2-cc-brand-700)",
    800: "var(--o2-cc-brand-800)",
    900: "var(--o2-cc-brand-900)",
  },
  neutral: {
    0:   "var(--o2-cc-neutral-0)",
    50:  "var(--o2-cc-neutral-50)",
    100: "var(--o2-cc-neutral-100)",
    200: "var(--o2-cc-neutral-200)",
    300: "var(--o2-cc-neutral-300)",
    400: "var(--o2-cc-neutral-400)",
    500: "var(--o2-cc-neutral-500)",
    600: "var(--o2-cc-neutral-600)",
    700: "var(--o2-cc-neutral-700)",
    800: "var(--o2-cc-neutral-800)",
    900: "var(--o2-cc-neutral-900)",
    950: "var(--o2-cc-neutral-950)",
  },
  semantic: {
    success:    "var(--o2-cc-success)",
    successBg:  "var(--o2-cc-success-bg)",
    successBorder: "var(--o2-cc-success-border)",
    warning:    "var(--o2-cc-warning)",
    warningBg:  "var(--o2-cc-warning-bg)",
    warningBorder: "var(--o2-cc-warning-border)",
    error:      "var(--o2-cc-error)",
    errorBg:    "var(--o2-cc-error-bg)",
    errorBorder: "var(--o2-cc-error-border)",
    info:       "var(--o2-cc-info)",
    infoBg:     "var(--o2-cc-info-bg)",
    infoBorder: "var(--o2-cc-info-border)",
  },
  call: {
    ringing:    "var(--o2-cc-call-ringing)",
    ringingBg:  "var(--o2-cc-call-ringing-bg)",
    connected:  "var(--o2-cc-call-connected)",
    connectedBg:"var(--o2-cc-call-connected-bg)",
    ended:      "var(--o2-cc-call-ended)",
    endedBg:    "var(--o2-cc-call-ended-bg)",
    onHold:     "var(--o2-cc-call-onhold)",
    onHoldBg:   "var(--o2-cc-call-onhold-bg)",
  },
  surface: {
    page:       "var(--o2-cc-surface-page)",
    raised:     "var(--o2-cc-surface-raised)",
    overlay:    "var(--o2-cc-surface-overlay)",
    sunken:     "var(--o2-cc-surface-sunken)",
  },
  border: {
    subtle:     "var(--o2-cc-border-subtle)",
    default:    "var(--o2-cc-border-default)",
    strong:     "var(--o2-cc-border-strong)",
    focus:      "var(--o2-cc-border-focus)",
  },
  // Dark mode — أُبقيت كما كانت (ثابتة) لتوافق أي مستخدم قديم لها؛ لم تعد
  // ضرورية عملياً لأن كل ما فوق يتبدّل تلقائياً الآن، لكن حُذفها قد يكسر مراجع قائمة.
  dark: {
    page:       "#09090b",
    raised:     "#18181b",
    elevated:   "#27272a",
    overlay:    "rgba(0, 0, 0, 0.7)",
    sunken:     "#0f0f12",
    border:     "#27272a",
    borderStrong: "#3f3f46",
    text:       "#fafafa",
    textMuted:  "#a1a1aa",
    textFaint:  "#52525b",
  },
} as const;

// ── Typography ───────────────────────────────────────────────────────────────
export const typography = {
  fontFamily: {
    sans:    "'Inter', 'Tajawal', system-ui, -apple-system, sans-serif",
    mono:    "'JetBrains Mono', 'Fira Code', monospace",
    arabic:  "'Tajawal', 'Inter', sans-serif",
  },
  size: {
    xs:   "0.75rem",
    sm:   "0.8125rem",
    base: "0.875rem",
    lg:   "1rem",
    xl:   "1.125rem",
    "2xl": "1.25rem",
    "3xl": "1.5rem",
    "4xl": "2rem",
  },
  weight: {
    normal:   400,
    medium:   500,
    semibold: 600,
    bold:     700,
    extrabold:800,
  },
  lineHeight: {
    tight:   1.25,
    snug:    1.375,
    normal:  1.5,
    relaxed: 1.625,
  },
  tracking: {
    tight:  "-0.025em",
    normal: "0",
    wide:   "0.05em",
    wider:  "0.1em",
  },
} as const;

// ── Spacing ──────────────────────────────────────────────────────────────────
export const spacing = {
  0:   "0",
  0.5: "0.125rem",
  1:   "0.25rem",
  1.5: "0.375rem",
  2:   "0.5rem",
  2.5: "0.625rem",
  3:   "0.75rem",
  3.5: "0.875rem",
  4:   "1rem",
  5:   "1.25rem",
  6:   "1.5rem",
  7:   "1.75rem",
  8:   "2rem",
  9:   "2.25rem",
  10:  "2.5rem",
  12:  "3rem",
  14:  "3.5rem",
  16:  "4rem",
  20:  "5rem",
  24:  "6rem",
} as const;

// ── Border Radius ────────────────────────────────────────────────────────────
export const radius = {
  none: "0",
  sm:   "0.25rem",
  md:   "0.375rem",
  lg:   "0.5rem",
  xl:   "0.75rem",
  "2xl": "1rem",
  "3xl": "1.5rem",
  full: "9999px",
} as const;

// ── Shadows ──────────────────────────────────────────────────────────────────
export const shadows = {
  xs:   "0 1px 2px rgba(0,0,0,0.05)",
  sm:   "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
  md:   "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
  lg:   "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
  xl:   "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
  "2xl":"0 25px 50px -12px rgba(0,0,0,0.25)",
  glow: "0 0 20px rgba(226, 0, 4, 0.15)",
  glowLg: "0 0 40px rgba(226, 0, 4, 0.2)",
} as const;

// ── Transitions ──────────────────────────────────────────────────────────────
export const transitions = {
  fast:    "120ms cubic-bezier(0.4, 0, 0.2, 1)",
  normal:  "200ms cubic-bezier(0.4, 0, 0.2, 1)",
  slow:    "300ms cubic-bezier(0.4, 0, 0.2, 1)",
  spring:  "500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

// ── Z-Index ──────────────────────────────────────────────────────────────────
export const zIndex = {
  base:     0,
  dropdown: 100,
  sticky:   200,
  overlay:  300,
  modal:    400,
  popover:  500,
  toast:    600,
  tooltip:  700,
  call:     800,
  critical: 900,
} as const;

// ── Breakpoints ──────────────────────────────────────────────────────────────
export const breakpoints = {
  sm:  "640px",
  md:  "768px",
  lg:  "1024px",
  xl:  "1280px",
  "2xl":"1536px",
} as const;

// ── Layout Constants ─────────────────────────────────────────────────────────
export const layout = {
  sidebarWidth: 256,
  sidebarCollapsed: 72,
  headerHeight: 56,
  callBarHeight: 64,
  maxContentWidth: 1400,
  panelMinWidth: 320,
  panelMaxWidth: 420,
} as const;
