import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "solar"
  | "positive"
  | "warning"
  | "danger";

/**
 * Soft badges carry status (stock, order state). Solid badges shout, so they
 * are reserved for things that overlay imagery — a "Sale" flag on a product
 * photo. Nothing else in the system uses solid.
 */
const soft: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-navy-50 text-navy-700 ring-navy-200",
  solar: "bg-solar-50 text-solar-800 ring-solar-200",
  positive: "bg-grid-50 text-grid-800 ring-grid-200",
  warning: "bg-ember-50 text-ember-700 ring-ember-300/70",
  danger: "bg-alert-50 text-alert-700 ring-alert-100",
};

const solid: Record<BadgeTone, string> = {
  neutral: "bg-slate-800 text-white ring-transparent",
  brand: "bg-navy-700 text-white ring-transparent",
  solar: "bg-solar-400 text-navy-900 ring-transparent",
  positive: "bg-grid-600 text-white ring-transparent",
  warning: "bg-ember-500 text-white ring-transparent",
  danger: "bg-alert-600 text-white ring-transparent",
};

export interface BadgeProps extends ComponentProps<"span"> {
  tone?: BadgeTone;
  variant?: "soft" | "solid";
  /** Leading 6px disc. Use for live status; skip it for labels. */
  dot?: boolean;
}

export function Badge({
  tone = "neutral",
  variant = "soft",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "text-xs font-medium leading-none ring-1 ring-inset",
        variant === "solid" ? solid[tone] : soft[tone],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-current opacity-70"
        />
      )}
      {children}
    </span>
  );
}

/**
 * The instrument label: 11px, caps, wide tracking. Sits above section titles
 * and marks spec keys. This is the system's quietest, most recurring voice.
 */
export function Eyebrow({
  className,
  children,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "font-display text-micro uppercase text-muted",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}
