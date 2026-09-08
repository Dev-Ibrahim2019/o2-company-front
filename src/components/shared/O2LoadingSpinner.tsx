/**
 * O2LoadingSpinner.tsx
 * ────────────────────
 * The three-ring spinner shown on full-page loading screens (auth check on
 * reload, permission check before a protected route renders) — same
 * animation/action as the reference markup this was built from (three
 * rings, top-border-only so each one reads as an open arc, spinning at
 * 3s/2s/1s linear so the innermost visibly outpaces the outer two), with
 * the O2 mark centred and static in the middle instead of an empty circle.
 *
 * The "0<sup>2</sup>"-style mark (small raised "2") is the same treatment
 * already used on the login screen (Login.tsx) — reused verbatim here
 * rather than inventing a second version of the same logo.
 */
export function O2LoadingSpinner({ size = 160 }: { size?: number }) {
  const ringBase: React.CSSProperties = {
    position: "absolute",
    borderRadius: "9999px",
    borderTopStyle: "solid",
    borderTopWidth: 7,
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    animationName: "o2-spinner-spin",
  };

  return (
    <div className="relative" style={{ width: size, height: size }} role="status" aria-label="جارٍ التحميل">
      <div style={{ ...ringBase, inset: 0, borderTopColor: "orange", animationDuration: "3s" }} />
      <div style={{ ...ringBase, inset: size * 0.05, borderTopColor: "cyan", animationDuration: "2s" }} />
      <div style={{ ...ringBase, inset: size * 0.0875, borderTopColor: "deeppink", animationDuration: "1s" }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-black text-white select-none" style={{ fontSize: size * 0.2 }}>
          0<span className="relative" style={{ top: size * 0.02, fontSize: size * 0.14 }}>2</span>
        </span>
      </div>
      {/* Scoped keyframes, not a Tailwind utility — the three rings need
          three different durations, which animate-spin's fixed 1s can't
          give without overriding it three separate ways anyway. */}
      <style>{`
        @keyframes o2-spinner-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
