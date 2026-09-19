import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Inputs are sunk into the page, not raised off it — a well you type into.
 * 44px tall so a thumb can hit them, and the focus ring is the brand blue
 * everything else in the system uses.
 */
const control =
  "w-full rounded-md border border-line-strong bg-sunken px-3.5 text-[0.9375rem] " +
  "text-strong placeholder:text-subtle transition-[border-color,background-color,box-shadow] " +
  "duration-150 ease-out " +
  "hover:border-slate-400 " +
  "focus:border-navy-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-navy-500/25 " +
  "disabled:cursor-not-allowed disabled:opacity-55 " +
  "aria-[invalid=true]:border-alert-500 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-alert-500/20";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea className={cn(control, "min-h-24 py-2.5", className)} {...props} />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        control,
        "h-11 appearance-none bg-no-repeat pr-10",
        // Chevron drawn in the muted text colour, so it never looks bolted on.
        "bg-size-[1.25rem] bg-position-[right_0.65rem_center]",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20stroke%3D%22%236f7c91%22%20stroke-width%3D%221.75%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')]",
        className,
      )}
      {...props}
    />
  );
}

export interface FieldChildProps {
  id: string;
  name: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
  required: boolean;
}

export interface FieldProps {
  /** Submitted field name, and the id the label points at. */
  name: string;
  label: string;
  /** Guidance shown before the user acts. Replaced by `error` once set. */
  hint?: string;
  error?: string;
  /** Required is the default; optional fields are the ones we label. */
  required?: boolean;
  /** Sits opposite the label — a unit, or a "why we ask" link. */
  aside?: ReactNode;
  /** Override when the same `name` appears twice on one page. */
  id?: string;
  className?: string;
  children: (props: FieldChildProps) => ReactNode;
}

/**
 * Wires label, hint, error and ARIA together so no form on the site has to
 * remember to. The control is a render prop, which keeps `Field` agnostic
 * about whether it wraps an Input, a Select or a custom widget — and keeps
 * the whole thing server-renderable, with no `useId` and no "use client".
 */
export function Field({
  name,
  label,
  hint,
  error,
  required = true,
  aside,
  id = name,
  className,
  children,
}: FieldProps) {
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-strong">
          {label}
          {!required && (
            <span className="ml-1.5 text-xs font-normal text-subtle">
              optional
            </span>
          )}
        </label>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </div>

      {children({
        id,
        name,
        "aria-describedby": errorId ?? hintId,
        "aria-invalid": error ? true : undefined,
        required,
      })}

      {error ? (
        <p id={errorId} className="text-xs text-alert-700">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
