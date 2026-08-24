const PALETTE = ["#102A50", "#7654C7", "#0F766E", "#B45309", "#B91C1C", "#1D4ED8", "#15803D", "#7C2D92"];

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((p) => p[0]).join("").toUpperCase();
  return initials || "؟";
}

export function CrmAvatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: colorFor(name || "؟"), fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}
