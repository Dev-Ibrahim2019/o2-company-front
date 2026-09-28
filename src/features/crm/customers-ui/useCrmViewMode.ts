import { useCallback, useEffect, useState } from "react";

export type CrmViewMode = "table" | "cards";

// Below this width a wide table is a sideways-scroll chore, so a page with no
// saved choice opens as cards. Matches Tailwind's `lg` — the same line
// CrmShell collapses its sidebar on.
const CARDS_BELOW_PX = 1024;
const STORAGE_PREFIX = "crm:view:";

const narrowQuery = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(`(max-width: ${CARDS_BELOW_PX - 1}px)`)
    : null;

function readSaved(key: string): CrmViewMode | null {
  try {
    const v = window.localStorage.getItem(STORAGE_PREFIX + key);
    return v === "table" || v === "cards" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Table-or-cards choice for one list, remembered per list in this browser.
 *
 * Until the reader picks, the mode follows the screen: cards on phones and
 * tablets, a table on desktop — and it keeps following it across a rotation
 * or a resized window. Once they pick, their choice wins on every width
 * (a table on a phone still works: it scrolls inside its own box).
 */
export function useCrmViewMode(key: string): [CrmViewMode, (mode: CrmViewMode) => void] {
  const [saved, setSaved] = useState<CrmViewMode | null>(() => readSaved(key));
  const [narrow, setNarrow] = useState(() => narrowQuery()?.matches ?? false);

  useEffect(() => {
    const mq = narrowQuery();
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setMode = useCallback((mode: CrmViewMode) => {
    setSaved(mode);
    try {
      window.localStorage.setItem(STORAGE_PREFIX + key, mode);
    } catch {
      // Private mode / blocked storage: the choice still holds for this visit.
    }
  }, [key]);

  return [saved ?? (narrow ? "cards" : "table"), setMode];
}
