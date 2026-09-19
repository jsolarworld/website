# Design system

Living reference: **`/design`** (noindex). Tokens: `app/globals.css`. Components: `components/ui/`.

## The idea

This shop sells power. The site should feel like the equipment it sells — engineered, legible,
heavy-duty, warm where it counts. Three roles, and nothing plays two of them:

| Role | Colour | Where |
| --- | --- | --- |
| **Chassis** | navy | Header, footer, spec panels, quote results. Structure and trust. |
| **Energy** | solar gold | The primary action. One per view. |
| **Status** | grid green / ember / alert | In stock, on sale, failed. Signal only, never decoration. |

Everything sits on **warm paper** (`#fbfaf6`), not the usual cold grey. A hair of yellow under cool
blue makes the blue read richer and the gold sing, and it holds up better on a cheap Android screen
in daylight — which is most of this traffic.

## Colour

Four ramps are sampled directly from the company logo (`chat/STK-20260919-WA0042.webp`); `slate` and
`alert` are derived to sit with them.

| Ramp | Logo source | Use |
| --- | --- | --- |
| `navy` | `#032f7f` wordmark, `#0153b7` panel | Chassis, links, focus |
| `solar` | `#fcd012` sun | Primary action, accents |
| `grid` | `#55a022` swoosh and globe | Positive status only |
| `ember` | `#f49518` the word "solar" | Sale and urgency only |
| `slate` | derived | Surfaces, lines, body text |
| `alert` | derived | Destructive actions, failed payments |

**Components reference semantic tokens, never a raw stop.** Use `bg-surface`, `text-muted`,
`border-line`, `bg-chassis`, `text-accent` — not `bg-slate-50`. The semantic layer is the `:root`
block in `globals.css`; re-pointing one variable there re-skins the site.

Contrast is checked: `navy-600` on white is 7.2:1, `navy-800` is 12.2:1. Gold is a **background**
colour — gold text on white fails, so `accent` always carries `accent-ink` (navy) on top of it.

## Type

- **Archivo** (`font-display`) — industrial grotesk, signage lineage. Headings, prices, buttons:
  anything stamped onto the page.
- **Inter** (`font-sans`) — body copy and spec tables, because they have to survive a 5-inch screen.
- **System mono** (`font-mono`) — SKUs and order references. Deliberately not a third webfont.

Display sizes are fluid (`clamp`), so `text-display-1` spans 360px→1440px with one token. The
smallest size, `text-micro`, is the system's most recurring voice: 11px, caps, `0.1em` tracking,
used for every eyebrow and spec key via the `<Eyebrow>` component.

Numbers are specifications, not prose — `numeric` (or the `Price` / `Spec*` components) sets
tabular figures so a column of prices lines up.

## Rules that keep it from drifting

1. **One gold action per view.** If two things are gold, neither is the answer.
2. **Hairlines, not shadows.** `shadow-*` is for things that genuinely float: dropdowns, modals,
   the sticky cart bar. A card gets `border-line`.
3. **One gradient.** `sun-bloom` is the only gradient in the system, at most once per page.
4. **Never pure black.** Ink is `#0c1524`, a navy at the bottom of the ramp.
5. **Motion is 120–200ms, ease-out, colour/opacity/transform only.** `prefers-reduced-motion` is
   honoured globally in `globals.css`.
6. **Focus is never removed.** One `:focus-visible` outline is defined globally; move it, don't kill it.
7. **Touch targets ≥ 44px.** `Button` size `md` and all form controls are 44px.

## Components

`components/ui/` — import from `@/components/ui`.

| Component | Notes |
| --- | --- |
| `Button` / `buttonClass()` | `primary · chassis · outline · ghost · danger · link`. Use `buttonClass()` on `next/link` so links and buttons stay identical. |
| `Badge` / `Eyebrow` | `soft` carries status; `solid` is only for badges overlaying imagery. |
| `Card` / `Panel` | `Card interactive` for product tiles. `Panel` is the dark counterpart. |
| `Price` | Lifted, muted naira sign; tabular digits; `was` renders the struck original. |
| `SpecStrip` / `SpecList` / `SpecFigure` | The recurring hardware rhythm. `SpecFigure` is for quote results. |
| `Container` / `Section` / `SectionHeader` / `Rule` | One gutter and one vertical rhythm for the whole site. |
| `Field` / `Input` / `Select` / `Textarea` | `Field` wires label + hint + error + ARIA. Server-renderable: it takes a `name` rather than calling `useId`, so forms need no `"use client"`. |
| `Notice` / `EmptyState` / `Skeleton` | Colour-rail messages, empty states that offer the next action, shimmer placeholders. |

## Gotcha: `cn()` and custom theme keys

`lib/cn.ts` extends `tailwind-merge` with this project's custom `@theme` names. This is not
optional. tailwind-merge only resolves conflicts between utilities it recognises; an unregistered
`text-micro` gets filed as a *colour*, collides with `text-muted`, and the font size is silently
dropped from every eyebrow on the site — no error, no warning.

**Any new non-standard `@theme` key (`--text-*`, `--font-*`, `--shadow-*`, `--animate-*`) must be
added to the `extend.theme` list in `lib/cn.ts`.** Plain colours need no entry.

## Not done yet

- **Dark mode.** Tokens are structured for it (the semantic layer is one block), but no dark theme
  ships — an untested dark variant across checkout and admin is worse than none. `color-scheme:
  light` is set so browsers don't auto-invert form controls.
- **The real landing page.** `app/page.tsx` is a placeholder; the hero, category grid, featured
  products and quote CTA are still to be built.
- Navigation, footer, product card and cart components — not yet extracted into `components/`.
