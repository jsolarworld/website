import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only resolves conflicts between utilities it recognises.
 * Custom theme keys from app/globals.css have to be declared here or it
 * guesses wrong — `text-micro` gets filed as a colour, collides with
 * `text-muted`, and the font size is silently dropped from every eyebrow on
 * the site. Anything added to @theme with a non-standard name belongs below.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      // --text-* (font sizes)
      text: ["display-1", "display-2", "display-3", "title", "subtitle", "micro"],
      // --font-*
      font: ["display", "sans", "mono"],
      // --shadow-*
      shadow: ["solar"],
      // --animate-*
      animate: ["shimmer"],
      // Colours need no entry: tailwind-merge already treats an unrecognised
      // `text-*` / `bg-* `/ `border-*` value as a colour, which is right for
      // both the ramps (navy-600) and the semantic aliases (muted, chassis).
    },
  },
});

/**
 * Join class names and let the last conflicting Tailwind utility win, so a
 * caller's `className` can always override a component's variant.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
