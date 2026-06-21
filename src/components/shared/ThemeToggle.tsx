import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../theme";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "الوضع الفاتح" : "الوضع الداكن";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5 bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors ${
        compact ? "lg:justify-center lg:px-0" : ""
      }`}
    >
      <Icon size={20} />
      <span
        className={`font-semibold text-sm transition-all duration-300 ${
          compact ? "lg:opacity-0 lg:w-0 lg:overflow-hidden" : ""
        }`}
      >
        {label}
      </span>
    </button>
  );
}
