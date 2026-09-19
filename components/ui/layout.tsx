import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Eyebrow } from "./badge";

/**
 * One gutter rule for the whole site: 20px on phones, 32px from `sm`, capped
 * at 1200px. Every page uses this — nothing sets its own horizontal padding.
 */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[75rem] px-5 sm:px-8", className)}
      {...props}
    />
  );
}

export type SectionTone = "page" | "surface" | "sunken" | "chassis";

const tones: Record<SectionTone, string> = {
  page: "bg-page",
  surface: "bg-surface",
  sunken: "bg-sunken",
  chassis: "bg-chassis text-on-chassis",
};

/**
 * Vertical rhythm. Sections alternate tone rather than adding dividers, which
 * is what keeps a long landing page from turning into a stack of boxes.
 */
export function Section({
  tone = "page",
  bloom = false,
  className,
  children,
  ...props
}: ComponentProps<"section"> & {
  tone?: SectionTone;
  /** The one gold gradient. At most one section per page may set this. */
  bloom?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative py-14 sm:py-20",
        tones[tone],
        bloom && "sun-bloom",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

/**
 * Eyebrow / title / lead, with an optional action parked on the right. Every
 * section header on the site is this component, so the rhythm never drifts.
 */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  action,
  onChassis = false,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  onChassis?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <Eyebrow className={onChassis ? "text-solar-400" : "text-solar-700"}>
            {eyebrow}
          </Eyebrow>
        )}
        <h2
          className={cn(
            "text-display-3",
            eyebrow && "mt-2.5",
            onChassis && "text-white",
          )}
        >
          {title}
        </h2>
        {lead && (
          <p
            className={cn(
              "mt-3 text-base leading-relaxed",
              onChassis ? "text-on-chassis-muted" : "text-muted",
            )}
          >
            {lead}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Short gold rule. Used under a hero heading or above a footer column title —
 * the smallest way to put brand colour on a page without decorating it.
 */
export function Rule({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("block h-0.5 w-10 rounded-full bg-solar-400", className)}
    />
  );
}
