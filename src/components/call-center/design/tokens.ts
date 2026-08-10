// ============================================================================
// DESIGN SYSTEM — O2 Call Center Enterprise
// Inspired by: Stripe, Linear, Vercel, Shopify Admin
// ============================================================================

// ── Colors ───────────────────────────────────────────────────────────────────
export const colors = {
  brand: {
    50:  "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#E20004",
    600: "#C90004",
    700: "#991b1b",
    800: "#7f1d1d",
    900: "#450a0a",
  },
  neutral: {
    0:   "#ffffff",
    50:  "#fafafa",
    100: "#f5f5f5",
    200: "#e5e5e5",
    300: "#d4d4d4",
    400: "#a3a3a3",
    500: "#737373",
    600: "#525252",
    700: "#404040",
    800: "#262626",
    900: "#171717",
    950: "#0a0a0a",
  },
  semantic: {
    success:    "#10b981",
    successBg:  "rgba(16, 185, 129, 0.08)",
    successBorder: "rgba(16, 185, 129, 0.2)",
    warning:    "#f59e0b",
    warningBg:  "rgba(245, 158, 11, 0.08)",
    warningBorder: "rgba(245, 158, 11, 0.2)",
    error:      "#ef4444",
    errorBg:    "rgba(239, 68, 68, 0.08)",
    errorBorder: "rgba(239, 68, 68, 0.2)",
    info:       "#3b82f6",
    infoBg:     "rgba(59, 130, 246, 0.08)",
    infoBorder: "rgba(59, 130, 246, 0.2)",
  },
  call: {
    ringing:    "#10b981",
    ringingBg:  "rgba(16, 185, 129, 0.12)",
    connected:  "#3b82f6",
    connectedBg:"rgba(59, 130, 246, 0.12)",
    ended:      "#6b7280",
    endedBg:    "rgba(107, 114, 128, 0.12)",
    onHold:     "#f59e0b",
    onHoldBg:   "rgba(245, 158, 11, 0.12)",
  },
  surface: {
    page:       "#fafafa",
    raised:     "#ffffff",
    overlay:    "rgba(0, 0, 0, 0.5)",
    sunken:     "#f5f5f5",
  },
  border: {
    subtle:     "#e5e5e5",
    default:    "#d4d4d4",
    strong:     "#a3a3a3",
    focus:      "#E20004",
  },
  // Dark mode
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
