import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SpecItem {
  label: string;
  value: ReactNode;
}

/**
 * The spec strip: label above value, separated by hairlines, numbers tabular.
 * Inverters, batteries and panels are bought on numbers, so those numbers get
 * a consistent home on cards, product pages and quote results alike.
 */
export function SpecStrip({
  items,
  onChassis = false,
  className,
}: {
  items: SpecItem[];
  onChassis?: boolean;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid auto-cols-fr grid-flow-col divide-x",
        onChassis ? "divide-line-on-chassis" : "divide-line",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="px-3 first:pl-0 last:pr-0">
          <dt
            className={cn(
              "font-display text-micro uppercase",
              onChassis ? "text-on-chassis-muted" : "text-subtle",
            )}
          >
            {item.label}
          </dt>
          <dd
            className={cn(
              "mt-1 numeric text-sm font-semibold",
              onChassis ? "text-white" : "text-strong",
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Full specification table. Zebra striping rather than borders on every row —
 * long inverter spec sheets stay readable without turning into a grid.
 */
export function SpecList({
  items,
  onChassis = false,
  className,
}: {
  items: SpecItem[];
  onChassis?: boolean;
  className?: string;
}) {
  return (
    <dl className={cn("text-sm", className)}>
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "grid grid-cols-[minmax(7rem,38%)_1fr] gap-4 px-3 py-2.5",
            "rounded-xs sm:grid-cols-[minmax(9rem,30%)_1fr]",
            i % 2 === 1 && (onChassis ? "bg-white/[0.04]" : "bg-sunken"),
          )}
        >
          <dt className={onChassis ? "text-on-chassis-muted" : "text-muted"}>
            {item.label}
          </dt>
          <dd
            className={cn(
              "numeric font-medium",
              onChassis ? "text-white" : "text-strong",
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A single headline figure — 12 kVA, 10 kWh, 4.0 sun hours. Built for quote
 * results, where three or four of these carry the whole answer.
 */
export function SpecFigure({
  label,
  value,
  unit,
  note,
  onChassis = false,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: string;
  onChassis?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p
        className={cn(
          "font-display text-micro uppercase",
          onChassis ? "text-on-chassis-muted" : "text-subtle",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 font-display text-3xl font-bold tracking-tight numeric",
          onChassis ? "text-white" : "text-strong",
        )}
      >
        {value}
        {unit && (
          <span
            className={cn(
              "ml-1 text-base font-semibold",
              onChassis ? "text-on-chassis-muted" : "text-muted",
            )}
          >
            {unit}
          </span>
        )}
      </p>
      {note && (
        <p
          className={cn(
            "mt-1 text-xs",
            onChassis ? "text-on-chassis-muted" : "text-muted",
          )}
        >
          {note}
        </p>
      )}
    </div>
  );
}
