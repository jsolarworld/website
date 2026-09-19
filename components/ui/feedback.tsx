import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type NoticeTone = "info" | "positive" | "warning" | "danger";

const notices: Record<NoticeTone, string> = {
  info: "border-navy-200 bg-navy-50 text-navy-900",
  positive: "border-grid-200 bg-grid-50 text-grid-900",
  warning: "border-ember-300/70 bg-ember-50 text-ember-700",
  danger: "border-alert-100 bg-alert-50 text-alert-700",
};

const rails: Record<NoticeTone, string> = {
  info: "bg-navy-600",
  positive: "bg-grid-600",
  warning: "bg-ember-500",
  danger: "bg-alert-600",
};

/**
 * Inline message: payment pending, stock released, transfer proof needed. A
 * 3px colour rail down the left does the signalling — no icon set to load,
 * and it stays legible when a screen is washed out by daylight.
 */
export function Notice({
  tone = "info",
  title,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { tone?: NoticeTone; title?: ReactNode }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "relative overflow-hidden rounded-md border py-3 pl-5 pr-4 text-sm",
        notices[tone],
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-[3px]", rails[tone])}
      />
      {title && <p className="font-semibold">{title}</p>}
      {children && (
        <div className={cn("leading-relaxed", title && "mt-1 opacity-90")}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Loading placeholder. A slow shimmer, not a pulse — pulsing blocks read as
 * broken on the mid-range Android hardware most of this traffic arrives on.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-sm bg-slate-100",
        "relative overflow-hidden isolate",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-white/70 after:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Empty state: no search results, empty cart, no orders yet. Always offers
 * the next action rather than apologising.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-dashed border-line-strong",
        "bg-surface px-6 py-14 text-center",
        className,
      )}
    >
      <span aria-hidden className="h-0.5 w-10 rounded-full bg-solar-400" />
      <p className="mt-5 font-display text-subtitle text-strong">{title}</p>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
