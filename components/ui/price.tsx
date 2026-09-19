import { cn } from "@/lib/cn";

const digits = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

export type PriceSize = "sm" | "md" | "lg" | "xl";

const sizes: Record<PriceSize, { amount: string; symbol: string }> = {
  sm: { amount: "text-[0.9375rem]", symbol: "text-[0.7em]" },
  md: { amount: "text-xl", symbol: "text-[0.62em]" },
  lg: { amount: "text-3xl", symbol: "text-[0.55em]" },
  xl: { amount: "text-display-3", symbol: "text-[0.45em]" },
};

export interface PriceProps {
  /** Whole naira, as stored in the database. */
  amount: number;
  /** Original price when `amount` is a sale price. Renders struck through. */
  was?: number | null;
  size?: PriceSize;
  /** Render on a dark Panel. */
  onChassis?: boolean;
  className?: string;
}

/**
 * Retail price typography: the naira sign is set smaller, lifted and muted so
 * the digits carry the weight, and everything is tabular so a column of
 * prices lines up on the decimal. Used for every money figure on the site.
 */
export function Price({
  amount,
  was,
  size = "md",
  onChassis = false,
  className,
}: PriceProps) {
  const s = sizes[size];
  const reduced = typeof was === "number" && was > amount;

  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span
        className={cn(
          "font-display font-bold tracking-tight numeric",
          s.amount,
          onChassis ? "text-white" : "text-strong",
        )}
      >
        <span
          className={cn(
            "mr-0.5 align-[0.12em] font-semibold",
            s.symbol,
            onChassis ? "text-on-chassis-muted" : "text-muted",
          )}
        >
          &#8358;
        </span>
        {digits.format(amount)}
      </span>

      {reduced && (
        <s
          className={cn(
            "numeric text-sm font-normal no-underline",
            onChassis ? "text-on-chassis-muted" : "text-subtle",
          )}
        >
          <span className="line-through">
            &#8358;{digits.format(was)}
          </span>
        </s>
      )}
    </span>
  );
}

/** Screen-reader-safe plain form, e.g. for `aria-label` and JSON-LD copy. */
export const priceLabel = (amount: number) =>
  `${digits.format(amount)} naira`;
