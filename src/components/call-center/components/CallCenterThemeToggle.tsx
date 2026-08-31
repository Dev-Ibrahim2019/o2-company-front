import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../../theme";
import { colors, radius, shadows, transitions } from "../design/tokens";

export const CallCenterThemeToggle: React.FC<{ size?: number }> = ({ size = 36 }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "تبديل إلى الوضع الفاتح" : "تبديل إلى الوضع الداكن"}
      title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
      className="cc-theme-toggle"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: radius.full,
        border: `1px solid ${colors.border.subtle}`,
        background: colors.surface.raised,
        color: colors.brand[500],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: shadows.sm,
        position: "relative",
        overflow: "hidden",
        transition: `background ${transitions.fast}, border-color ${transitions.fast}, transform ${transitions.fast}, box-shadow ${transitions.fast}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.brand[500];
        e.currentTarget.style.boxShadow = shadows.md;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border.subtle;
        e.currentTarget.style.boxShadow = shadows.sm;
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: `opacity ${transitions.normal}, transform ${transitions.normal}`,
          opacity: isDark ? 0 : 1,
          transform: isDark ? "rotate(-90deg) scale(0.5)" : "rotate(0deg) scale(1)",
        }}
      >
        <Sun size={Math.round(size * 0.5)} />
      </span>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: `opacity ${transitions.normal}, transform ${transitions.normal}`,
          opacity: isDark ? 1 : 0,
          transform: isDark ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0.5)",
        }}
      >
        <Moon size={Math.round(size * 0.5)} />
      </span>
    </button>
  );
};
