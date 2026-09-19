import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends ComponentProps<"div"> {
  /**
   * Product tiles and anything wrapping a link. The border warms to gold and
   * the card lifts 2px — the whole hover state, no scale transform, no glow.
   */
  interactive?: boolean;
  /** Sunk into the page instead of raised off it. For asides and summaries. */
  muted?: boolean;
}

export function Card({
  interactive = false,
  muted = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line",
        muted ? "bg-sunken" : "bg-surface",
        interactive &&
          "group relative transition-[border-color,box-shadow,transform] duration-200 ease-out " +
            "hover:-translate-y-0.5 hover:border-solar-300 hover:shadow-md " +
            "focus-within:border-solar-300 focus-within:shadow-md",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-line px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-line px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The dark counterpart to Card. Quote results, order summaries, the footer —
 * anywhere the page should feel like it switched to instrument panel.
 */
export function Panel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg bg-chassis text-on-chassis",
        "[&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white",
        "[&_hr]:border-line-on-chassis",
        className,
      )}
      {...props}
    />
  );
}
