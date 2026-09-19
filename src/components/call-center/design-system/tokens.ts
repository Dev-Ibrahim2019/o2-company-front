// src/components/call-center/design-system/tokens.ts
// Design System Tokens - Enterprise-grade design system for Call Center

export const colors = {
  // Brand
  brand: {
    primary: "#E20004",
    primaryHover: "#C90004",
    primaryLight: "rgba(226, 0, 4, 0.15)",
    primaryBorder: "rgba(226, 0, 4, 0.3)",
  },
  // Status
  status: {
    success: "#10B981",
    successLight: "rgba(16, 185, 129, 0.15)",
    successBorder: "rgba(16, 185, 129, 0.3)",
    warning: "#F59E0B",
    warningLight: "rgba(245, 158, 11, 0.15)",
    warningBorder: "rgba(245, 158, 11, 0.3)",
    error: "#EF4444",
    errorLight: "rgba(239, 68, 68, 0.15)",
    errorBorder: "rgba(239, 68, 68, 0.3)",
    info: "#3B82F6",
    infoLight: "rgba(59, 130, 246, 0.15)",
    infoBorder: "rgba(59, 130, 246, 0.3)",
  },
  // Call states
  call: {
    ringing: "#10B981",
    ringingLight: "rgba(16, 185, 129, 0.2)",
    connected: "#3B82F6",
    connectedLight: "rgba(59, 130, 246, 0.2)",
    ended: "#6B7280",
    endedLight: "rgba(107, 114, 128, 0.2)",
    onHold: "#F59E0B",
    onHoldLight: "rgba(245, 158, 11, 0.2)",
  },
  // Neutrals
  neutral: {
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
    950: "#020617",
  },
  // Backgrounds
  bg: {
    primary: "#0B0D10",
    secondary: "#12151A",
    tertiary: "#171B21",
    elevated: "#1E2330",
    overlay: "rgba(0, 0, 0, 0.6)",
  },
  // Borders
  border: {
    subtle: "rgba(255, 255, 255, 0.05)",
    default: "rgba(255, 255, 255, 0.1)",
    strong: "rgba(255, 255, 255, 0.15)",
    focus: "rgba(226, 0, 4, 0.5)",
  },
};

export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  "2xl": "2rem",
  "3xl": "3rem",
};

export const borderRadius = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.25rem",
  full: "9999px",
};

export const shadows = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  glow: "0 0 20px rgba(226, 0, 4, 0.3)",
};

export const typography = {
  fontFamily: {
    sans: "'Inter', 'Tajawal', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  fontSize: {
    xs: ["0.75rem", { lineHeight: "1rem" }],
    sm: ["0.875rem", { lineHeight: "1.25rem" }],
    base: ["1rem", { lineHeight: "1.5rem" }],
    lg: ["1.125rem", { lineHeight: "1.75rem" }],
    xl: ["1.25rem", { lineHeight: "1.75rem" }],
    "2xl": ["1.5rem", { lineHeight: "2rem" }],
    "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900",
  },
};

export const transitions = {
  fast: "150ms ease",
  normal: "200ms ease",
  slow: "300ms ease",
  spring: "300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
};

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  toast: 60,
  tooltip: 70,
};
