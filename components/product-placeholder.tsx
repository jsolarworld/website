import { cn } from "@/lib/cn";
import { PLACEHOLDER_GRID, placeholderArt } from "@/lib/placeholder";

const CELL = 32;
const GAP = 4;
const PAD = 12;
const SIZE = PAD * 2 + PLACEHOLDER_GRID * CELL + (PLACEHOLDER_GRID - 1) * GAP;

// Written out in full: Tailwind only generates classes it can read in the source.
const TONES = ["fill-solar-200", "fill-navy-100", "fill-navy-200", "fill-navy-300"];

/**
 * Stands in for a product that has no photo or video yet: solar cells under a corner sun, in the brand colours.
 * It fills its parent, so the parent sets the size and the shape. Pass `label={null}` for small thumbnails.
 */
export function ProductPlaceholder({ seed, label = "Photo coming soon", className }: { seed: string; label?: string | null; className?: string }) {
  const art = placeholderArt(seed);
  const sunX = art.sun === "left" ? 0 : SIZE;

  return (
    <div className={cn("relative size-full overflow-hidden bg-navy-50", className)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} preserveAspectRatio="xMidYMid slice" className="size-full" aria-hidden>
        {art.tones.map((tone, i) => (
          <rect
            key={i}
            x={PAD + (i % PLACEHOLDER_GRID) * (CELL + GAP)}
            y={PAD + Math.floor(i / PLACEHOLDER_GRID) * (CELL + GAP)}
            width={CELL}
            height={CELL}
            rx={4}
            className={TONES[tone]}
          />
        ))}
        <circle cx={sunX} cy={0} r={98} strokeWidth={2} className="fill-none stroke-solar-200" />
        <circle cx={sunX} cy={0} r={80} strokeWidth={3} className="fill-none stroke-solar-300" />
        <circle cx={sunX} cy={0} r={60} className="fill-solar-400" />
      </svg>
      {label && (
        <span className="absolute inset-x-0 bottom-0 bg-surface/85 px-2 py-1.5 text-center font-display text-micro uppercase text-navy-800">{label}</span>
      )}
    </div>
  );
}
