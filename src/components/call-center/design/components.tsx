import React from "react";
import { colors, typography, radius, transitions, shadows } from "../design/tokens";

// ============================================================================
// BUTTON
// ============================================================================
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const vStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: colors.brand[500], color: "#fff", border: "none" },
  secondary: { background: colors.surface.raised, color: colors.neutral[700], border: `1px solid ${colors.border.default}` },
  ghost: { background: "transparent", color: colors.neutral[600], border: "none" },
  danger: { background: colors.semantic.error, color: "#fff", border: "none" },
  success: { background: colors.semantic.success, color: "#fff", border: "none" },
};
const sStyles: Record<ButtonSize, React.CSSProperties> = {
  xs: { height: 28, padding: "0 8px", fontSize: "12px", borderRadius: radius.md },
  sm: { height: 32, padding: "0 12px", fontSize: "13px", borderRadius: radius.lg },
  md: { height: 36, padding: "0 16px", fontSize: "14px", borderRadius: radius.lg },
  lg: { height: 40, padding: "0 20px", fontSize: "14px", borderRadius: radius.xl },
};

export const Button: React.FC<ButtonProps> = ({ variant = "primary", size = "md", loading, icon, iconRight, fullWidth, disabled, style, children, ...p }) => (
  <button disabled={disabled || loading} style={{ ...vStyles[variant], ...sStyles[size], display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 600, fontFamily: typography.fontFamily.sans, cursor: disabled || loading ? "not-allowed" : "pointer", opacity: disabled || loading ? 0.5 : 1, transition: `all ${transitions.fast}`, width: fullWidth ? "100%" : undefined, whiteSpace: "nowrap" as const, ...style }} {...p}>
    {loading ? <span style={{ width: 16, height: 16, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .6s linear infinite" }} /> : icon}
    {children}
    {iconRight}
  </button>
);

// ============================================================================
// INPUT
// ============================================================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; icon?: React.ReactNode; }
export const Input: React.FC<InputProps> = ({ label, error, icon, style, ...p }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {label && <label style={{ fontSize: "13px", fontWeight: 500, color: colors.neutral[600] }}>{label}</label>}
    <div style={{ position: "relative" }}>
      {icon && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: colors.neutral[400], display: "flex" }}>{icon}</span>}
      <input {...p} style={{ width: "100%", height: 36, padding: icon ? "0 36px 0 12px" : "0 12px", fontSize: "14px", fontFamily: typography.fontFamily.sans, color: colors.neutral[900], background: colors.surface.raised, border: `1px solid ${error ? colors.semantic.error : colors.border.default}`, borderRadius: radius.lg, outline: "none", ...style }} />
    </div>
    {error && <span style={{ fontSize: "12px", color: colors.semantic.error }}>{error}</span>}
  </div>
);

// ============================================================================
// BADGE
// ============================================================================
type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "brand";
const bc: Record<BadgeVariant, { bg: string; fg: string; bd: string }> = {
  default: { bg: colors.neutral[100], fg: colors.neutral[700], bd: colors.neutral[200] },
  success: { bg: colors.semantic.successBg, fg: "#065f46", bd: colors.semantic.successBorder },
  warning: { bg: colors.semantic.warningBg, fg: "#92400e", bd: colors.semantic.warningBorder },
  error: { bg: colors.semantic.errorBg, fg: "#991b1b", bd: colors.semantic.errorBorder },
  info: { bg: colors.semantic.infoBg, fg: "#1e40af", bd: colors.semantic.infoBorder },
  brand: { bg: "rgba(226,0,4,0.08)", fg: colors.brand[600], bd: "rgba(226,0,4,0.2)" },
};
export const Badge: React.FC<{ variant?: BadgeVariant; children: React.ReactNode; dot?: boolean }> = ({ variant = "default", children, dot }) => {
  const c = bc[variant];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", fontSize: "12px", fontWeight: 500, color: c.fg, background: c.bg, border: `1px solid ${c.bd}`, borderRadius: 9999, whiteSpace: "nowrap" }}>{dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.fg }} />}{children}</span>;
};

// ============================================================================
// CARD
// ============================================================================
export const Card: React.FC<{ children: React.ReactNode; padding?: string; hover?: boolean; onClick?: () => void; className?: string; style?: React.CSSProperties }> = ({ children, padding = "16px", hover, onClick, style }) => (
  <div onClick={onClick} style={{ background: colors.surface.raised, border: `1px solid ${colors.border.subtle}`, borderRadius: radius.xl, padding, transition: `all ${transitions.fast}`, cursor: onClick ? "pointer" : undefined, ...style }}>
    {children}
  </div>
);

// ============================================================================
// STAT CARD
// ============================================================================
export const StatCard: React.FC<{ title: string; value: string | number; change?: { value: number; type: "increase" | "decrease" }; icon?: React.ReactNode; color?: string; suffix?: string }> = ({ title, value, change, icon, color = colors.brand[500], suffix }) => (
  <Card>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div>
        <p style={{ fontSize: "12px", fontWeight: 500, color: colors.neutral[500], marginBottom: 4 }}>{title}</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: "24px", fontWeight: 700, color: colors.neutral[900], fontFamily: typography.fontFamily.mono }}>{value}</span>
          {suffix && <span style={{ fontSize: "13px", color: colors.neutral[500] }}>{suffix}</span>}
        </div>
        {change && <p style={{ fontSize: "12px", fontWeight: 500, color: change.type === "increase" ? colors.semantic.success : colors.semantic.error, marginTop: 4 }}>{change.type === "increase" ? "↑" : "↓"} {Math.abs(change.value)}%</p>}
      </div>
      {icon && <div style={{ width: 40, height: 40, borderRadius: radius.lg, background: `color-mix(in srgb, ${color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", color }}>{icon}</div>}
    </div>
  </Card>
);

// ============================================================================
// AVATAR
// ============================================================================
export const Avatar: React.FC<{ name: string; image?: string; size?: number; status?: "online" | "offline" | "busy" }> = ({ name, image, size = 40, status }) => {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const palette = ["#E20004", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
  const bg = palette[name.charCodeAt(0) % palette.length];
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {image ? <img src={image} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} /> : (
        <div style={{ width: size, height: size, borderRadius: "50%", background: `${bg}15`, color: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700 }}>{initials}</div>
      )}
      {status && <span style={{ position: "absolute", bottom: 0, right: 0, width: size * 0.3, height: size * 0.3, borderRadius: "50%", background: status === "online" ? colors.semantic.success : status === "busy" ? colors.semantic.error : colors.neutral[400], border: `2px solid ${colors.surface.raised}` }} />}
    </div>
  );
};

// ============================================================================
// TABS
// ============================================================================
export const Tabs: React.FC<{ tabs: Array<{ id: string; label: string; icon?: React.ReactNode; count?: number }>; active: string; onChange: (id: string) => void }> = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 2, padding: 3, background: colors.neutral[100], borderRadius: radius.lg }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: "13px", fontWeight: 500, color: active === t.id ? colors.neutral[900] : colors.neutral[500], background: active === t.id ? "#fff" : "transparent", border: "none", borderRadius: radius.md, cursor: "pointer", transition: `all ${transitions.fast}`, boxShadow: active === t.id ? shadows.xs : "none", whiteSpace: "nowrap" as const }}>
        {t.icon}{t.label}
        {t.count !== undefined && <span style={{ padding: "0 6px", height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, background: active === t.id ? colors.brand[500] : colors.neutral[200], color: active === t.id ? "#fff" : colors.neutral[600], borderRadius: 9999 }}>{t.count}</span>}
      </button>
    ))}
  </div>
);

// ============================================================================
// EMPTY STATE
// ============================================================================
export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; description?: string; action?: { label: string; onClick: () => void } }> = ({ icon, title, description, action }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
    {icon && <div style={{ width: 56, height: 56, borderRadius: radius.xl, background: colors.neutral[100], display: "flex", alignItems: "center", justifyContent: "center", color: colors.neutral[400], marginBottom: 16 }}>{icon}</div>}
    <h3 style={{ fontSize: "15px", fontWeight: 600, color: colors.neutral[900], marginBottom: 4 }}>{title}</h3>
    {description && <p style={{ fontSize: "13px", color: colors.neutral[500], maxWidth: 320, marginBottom: action ? 16 : 0 }}>{description}</p>}
    {action && <Button size="sm" onClick={action.onClick}>{action.label}</Button>}
  </div>
);

// ============================================================================
// SKELETON
// ============================================================================
export const Skeleton: React.FC<{ width?: string | number; height?: number; borderRadius?: string }> = ({ width, height = 16, borderRadius = radius.md }) => (
  <div style={{ width, height, borderRadius, background: `linear-gradient(90deg, ${colors.neutral[100]} 25%, ${colors.neutral[200]} 50%, ${colors.neutral[100]} 75%)`, backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
);

// ============================================================================
// TOGGLE
// ============================================================================
export const Toggle: React.FC<{ checked: boolean; onChange: (c: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
  <button role="switch" aria-checked={checked} disabled={disabled} onClick={() => !disabled && onChange(!checked)} style={{ width: 44, height: 24, padding: 2, background: checked ? colors.brand[500] : colors.neutral[300], border: "none", borderRadius: 9999, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: checked ? "flex-end" : "flex-start", transition: `background ${transitions.fast}` }}>
    <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: shadows.sm, transition: `transform ${transitions.fast}` }} />
  </button>
);

// ============================================================================
// PROGRESS BAR
// ============================================================================
export const ProgressBar: React.FC<{ value: number; color?: string; height?: number }> = ({ value, color = colors.brand[500], height = 6 }) => (
  <div style={{ width: "100%", height, background: colors.neutral[100], borderRadius: 9999, overflow: "hidden" }}>
    <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: "100%", background: color, borderRadius: 9999, transition: `width ${transitions.normal}` }} />
  </div>
);

// ============================================================================
// SEARCH INPUT
// ============================================================================
export const SearchInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }> = ({ value, onChange, placeholder, autoFocus }) => (
  <div style={{ position: "relative" }}>
    <svg style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: colors.neutral[400] }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    <input autoFocus={autoFocus} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || "بحث..."} style={{ width: "100%", height: 36, padding: "0 36px 0 12px", fontSize: "14px", fontFamily: typography.fontFamily.sans, color: colors.neutral[900], background: colors.neutral[50], border: `1px solid ${colors.border.subtle}`, borderRadius: radius.lg, outline: "none" }} />
    {value && <button onClick={() => onChange("")} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: colors.neutral[400], cursor: "pointer", padding: 4 }}>✕</button>}
  </div>
);

// ============================================================================
// DROPDOWN / SELECT
// ============================================================================
export const Select: React.FC<{ label?: string; value: string | number; onChange: (v: string) => void; options: Array<{ value: string | number; label: string }> }> = ({ label, value, onChange, options }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {label && <label style={{ fontSize: "13px", fontWeight: 500, color: colors.neutral[600] }}>{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)} style={{ height: 36, padding: "0 12px", fontSize: "14px", fontFamily: typography.fontFamily.sans, color: colors.neutral[900], background: colors.surface.raised, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, outline: "none", cursor: "pointer" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ============================================================================
// TOAST (simple inline)
// ============================================================================
export const Toast: React.FC<{ type: "success" | "error" | "info"; message: string; onClose: () => void }> = ({ type, message, onClose }) => {
  const bg = type === "success" ? colors.semantic.successBg : type === "error" ? colors.semantic.errorBg : colors.semantic.infoBg;
  const border = type === "success" ? colors.semantic.successBorder : type === "error" ? colors.semantic.errorBorder : colors.semantic.infoBorder;
  const fg = type === "success" ? "#065f46" : type === "error" ? "#991b1b" : "#1e40af";
  return (
    <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: bg, border: `1px solid ${border}`, color: fg, padding: "10px 16px", borderRadius: radius.lg, fontSize: "13px", fontWeight: 500, display: "flex", alignItems: "center", gap: 8, boxShadow: shadows.lg, animation: "slideDown .3s ease" }}>
      {message}
      <button onClick={onClose} style={{ background: "none", border: "none", color: fg, cursor: "pointer", padding: 2 }}>✕</button>
    </div>
  );
};
