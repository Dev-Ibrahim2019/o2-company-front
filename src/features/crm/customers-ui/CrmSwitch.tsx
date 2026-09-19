/**
 * A real switch, shared across CRM screens (staff permissions, settings) —
 * "checked" always reflects the true state, including when disabled because
 * some other layer (a role, a locked-in default) already decided it.
 */
export function CrmSwitch({
  checked, disabled, tone = "success", onChange, title,
}: { checked: boolean; disabled?: boolean; tone?: "success" | "danger"; onChange?: () => void; title?: string }) {
  const onColor = tone === "success" ? "bg-[var(--crmx-success)]" : "bg-[var(--crmx-danger)]";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      title={title}
      className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:cursor-not-allowed ${
        checked ? `${onColor} ${disabled ? "opacity-50" : ""} justify-end` : "justify-start bg-[var(--crmx-border)]"
      } ${!disabled && !checked ? "hover:bg-[var(--crmx-text-muted)]/40" : ""}`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow-sm transition-transform" />
    </button>
  );
}
