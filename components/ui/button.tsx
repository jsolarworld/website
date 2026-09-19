import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "chassis"
  | "outline"
  | "ghost"
  | "danger"
  | "link";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-display font-semibold " +
  "whitespace-nowrap rounded-md transition-[background-color,border-color,color,box-shadow,transform] " +
  "duration-150 ease-out select-none " +
  "disabled:pointer-events-none disabled:opacity-45 " +
  "[&_svg]:size-[1.15em] [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  /**
   * Gold on navy ink. The sun, and the only thing on a page allowed to look
   * like this — "Add to cart", "Get a quote", "Pay now". One per view.
   */
  primary:
    "bg-accent text-accent-ink shadow-xs hover:bg-accent-hover hover:shadow-solar " +
    "active:bg-accent-press active:translate-y-px",
  /** The workhorse. Secondary actions that still need weight. */
  chassis:
    "bg-chassis text-on-chassis shadow-xs hover:bg-chassis-raised active:translate-y-px",
  /** Hairline, not a filled box. Most buttons in the app are this one. */
  outline:
    "border border-line-strong bg-surface text-strong hover:border-navy-600 " +
    "hover:text-navy-700 hover:bg-navy-50 active:translate-y-px",
  /** Toolbar and table-row actions. No chrome until touched. */
  ghost: "text-default hover:bg-sunken hover:text-strong active:translate-y-px",
  danger:
    "bg-alert-600 text-white shadow-xs hover:bg-alert-700 active:translate-y-px",
  /** An action that reads as prose. Underline offset so it never crowds. */
  link: "text-navy-600 underline underline-offset-4 decoration-navy-300 hover:decoration-navy-600 rounded-xs",
};

const sizes: Record<ButtonSize, string> = {
  // 36/44/52px tall. `md` clears the 44px touch target on mobile.
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-13 px-7 text-base",
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
}

/**
 * Class string for the button system. Use this on `next/link` and on anything
 * else that must be an anchor — buttons and links then stay pixel-identical
 * without forcing a real `<button>` into places it does not belong.
 */
export function buttonClass({
  variant = "outline",
  size = "md",
  block = false,
  className,
}: ButtonStyleOptions = {}) {
  const chrome = variant === "link" ? "" : sizes[size];
  return cn(base, variants[variant], chrome, block && "w-full", className);
}

export type ButtonProps = ComponentProps<"button"> & ButtonStyleOptions;

export function Button({
  variant,
  size,
  block,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, block, className })}
      {...props}
    />
  );
}
