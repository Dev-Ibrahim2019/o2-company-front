import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Debounces the outgoing onChange (which drives the URL param + API
// request) while keeping the input itself fully responsive to typing —
// the input's own value is local state, synced back from `value` whenever
// it changes externally (e.g. "reset filters").
const DEBOUNCE_MS = 350;

export function CrmSearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [local, setLocal] = useState(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    if (local === value) return;
    const timer = setTimeout(() => onChangeRef.current(local), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const clear = () => {
    setLocal("");
    onChangeRef.current("");
    inputRef.current?.focus();
  };

  return (
    <label className="relative min-w-[220px] flex-1">
      <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--crmx-text-muted)]" />
      <span className="sr-only">بحث</span>
      <input
        ref={inputRef}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white ps-10 pe-9 text-[14px] text-[var(--crmx-text)] outline-none transition placeholder:text-[var(--crmx-text-muted)] focus:border-[var(--crmx-navy)] focus:ring-2 focus:ring-[var(--crmx-navy)]/10"
      />
      {local && (
        <button
          type="button"
          onClick={clear}
          aria-label="مسح البحث"
          className="absolute end-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-text)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </label>
  );
}
