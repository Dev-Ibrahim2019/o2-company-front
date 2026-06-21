import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppTheme = "light" | "dark";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = "o2-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

const getInitialTheme = (): AppTheme => {
  if (typeof window === "undefined") return "dark";

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
};

const applyTheme = (theme: AppTheme) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("theme-light", theme === "light");
  root.classList.toggle("theme-dark", theme === "dark");

  const metaTheme = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  metaTheme?.setAttribute("content", theme === "light" ? "#F8F9FA" : "#0B0F12");
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(getInitialTheme);

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return value;
};
