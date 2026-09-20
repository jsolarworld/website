# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

E-commerce site for **J Solar World Energy**, a solar equipment retailer/installer at Alaba International Market, Lagos, Nigeria (inverters, lithium/tubular batteries, panels, street lights, accessories, complete system packages). Planned scope: landing, About, Products (store with cart/checkout), Services, a "Get a Quote" tool that sizes a solar setup from an appliance list, an admin panel for products/orders, and an optional SEO blog.

Current state: Prisma schema migrated and seeded; the design system is in place (see below); the storefront browse path is built and reads from the database: home, `/products` (GET-form filters, search, sort, pagination), `/categories/[slug]`, `/products/[slug]` (specs, package contents, Product/Breadcrumb JSON-LD), plus header, footer, floating WhatsApp button, 404, `robots.ts` and `sitemap.ts`. The quote tool is built: `/solar-quote` (3-step client wizard, `components/quote/quote-wizard.tsx`) and saved snapshots at `/solar-quote/[reference]` (noindex). Flow: `calculateQuote` server action shows results with no contact details; `saveQuoteAction` (phone + consent) creates/reuses an open Lead per phone and stores a `Quote` snapshot (`lib/quote/{actions,service,request,view}.ts`). All server-action input is re-validated in `request.ts` (actions are publicly POSTable). Not done for quotes: email sending (needs Resend key), add-package-to-cart, installation estimate, grid-hours input, rate limiting; with no approved packages in the DB every result routes to "site inspection". **Not built yet:** cart, checkout, Paystack/transfer flow, `/services`, `/about`, `/blog`, legal pages, customer accounts, and any real products (the catalogue is empty until staff import it). Header/footer link to several of those, so they 404 until built. Product pages use "Order on WhatsApp" until the cart exists. Live URL: https://j-solar-world.vercel.app (`NEXT_PUBLIC_SITE_URL` overrides `SITE.url`).

Quote engine lives in `lib/quote/` (pure TypeScript, no framework or DB imports; `engine.ts` holds the PRD 7.2/7.3 formulas and matching, `appliances.ts` the 7.5 library, `defaults.ts` the admin-editable settings); its tests use the PRD 7.4 worked example as the source of truth. The Prisma schema (`prisma/schema.prisma`) is migrated to the Neon database (`prisma/migrations/`) and seeded via `pnpm db:seed` (`prisma/seed.ts`: categories with spec templates, owner-listed brands, the 26-appliance library, `quote.settings`; idempotent, never overwrites edited settings).

Data access: `lib/catalogue.ts` holds the storefront queries (published-only; `effectivePrice`, `stockStatus`). Catalogue pages use `revalidate = 60`; pages reading `searchParams` are dynamic. Business constants (phones, WhatsApp, address, hours) and helpers (`whatsappLink`, `formatNaira`, `jsonLd`) are in `lib/site.ts`; use them instead of hard-coding contact details. `public/logo.webp` is the company logo (has dark-blue lettering, so it sits on a white tile over navy).

## Design system

Read `docs/DESIGN.md` before touching UI; browse components at `/design`. Tokens are in `app/globals.css`; components in `components/ui/` (import from `@/components/ui`). Use semantic tokens (`bg-surface`, `text-muted`, `border-line`, `bg-chassis`), never raw ramp stops. One gold (`primary`) action per view. New custom `@theme` keys must be registered in `lib/cn.ts`.

## Admin (built)

Staff-only back office at `/admin` (noindex, disallowed in `robots.ts`). Better Auth (`lib/auth.ts`, catch-all handler at `app/api/auth/[...all]`) with email + password and a mandatory authenticator app (TOTP) for staff; **public sign-up is disabled**. Create staff with `pnpm admin:create <email> "<Name>" <OWNER|STORE_MANAGER|SALES_REP|CONTENT_EDITOR> [password]` (prints a random password once); they enrol the authenticator at `/admin/security` on first sign-in. Env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (must equal the site origin, e.g. `https://j-solar-world.vercel.app` on Vercel; the origin check rejects other origins). `ADMIN_2FA_OPTIONAL=1` skips 2FA in non-production only.

- **Authorization rule:** call `requireStaff(permission?)` (`lib/admin/guard.ts`) at the top of EVERY admin page, server action and route handler. Layouts don't re-run on client navigation and server actions are publicly POSTable, so `app/admin/layout.tsx` is chrome only. Role/permission matrix is in `lib/admin/permissions.ts` (owner all; store manager catalogue + packages approve + orders + delivery; sales rep leads + orders; content editor content). `SiteChrome` hides the public header/footer under `/admin`.
- **Products** (`app/admin/products`): list/filter, one form for products and packages (`components/admin/product-form.tsx`, validation in `lib/admin/product-form.ts`), Cloudinary signed uploads (`app/api/admin/cloudinary-sign`, alt text required), CSV import/export keyed on SKU (`lib/admin/product-import.ts`; preview then apply, all-or-nothing, updates never blank a value), bulk price change with preview and guard rails (`lib/admin/pricing.ts`). Renaming a slug writes a `Redirect` row that the product page honours. Price/stock/status changes are written to `AuditLog`.
- **Package approval:** only owner/store manager can tick "engineer approved"; any edit to a package's sizing or contents by someone else withdraws approval. The quote engine only ever sees approved packages.
- **Leads** (`/admin/leads`): status pipeline for quote leads. Not built yet: orders, service bookings, staff management UI, content/blog editor, delivery zones, settings/quote-settings editor, audit-log viewer, customer accounts.

## Planned architecture (from the PRD, dated 2026-09-17)

Full PRD: [docs/PRD.md](docs/PRD.md) (requirement IDs, appliance library values, worked sizing example). These are the parts that shape code structure:

- **Routes:** flat product URLs `/products/:slug` (never nest under category, so links survive moves); `/categories/:slug`, `/cart`, `/checkout`, `/track-order` (guest lookup by order number + phone/email), `/services/:slug`, `/solar-quote` and `/solar-quote/:reference` (shareable saved quotes), `/about` (also holds contact; no separate Contact page), `/blog/*`, `/account`, legal pages, and `/admin` (never indexed). Changing a slug must create a 301 redirect.
- **Rendering:** every public page is server-rendered/static HTML with per-page metadata and JSON-LD (LocalBusiness, Product, BreadcrumbList, FAQPage, BlogPosting). Cart/checkout/account/admin are excluded from the sitemap. Mobile-first, key pages under 1 MB, LCP ≤ 2.5 s / INP ≤ 200 ms / CLS ≤ 0.1.
- **Quote engine** (`/solar-quote`) does not assemble parts. It computes needs and picks among **engineer-approved packages** defined in admin, so it never pairs incompatible inverter/battery/panels. Formulas: peak load P = Σ watts×qty; surge S = P + largest motor (watts×(surge−1)); daily energy E = Σ watts×qty×hours×duty; inverter continuous ≥ P×1.25 and surge ≥ S; backup load L = Σ backup watts×qty×duty × 0.7 diversity; battery Wh = L×hours ÷ (DoD×0.9 inverter efficiency); array W = E ÷ (peak sun hours×0.75 derate). Defaults (all admin-editable): 4.0 sun hours (Lagos), DoD 0.8 lithium / 0.5 tubular, 12 h backup, 7-day quote validity. Check inverter against its rated continuous **watts** spec, not the kVA in its name. Options shown: Recommended (cheapest full fit), Budget (≥60% of battery need), More headroom, or Custom (route to site inspection). Results show before the phone number is asked; the number unlocks send/save. Saved quotes snapshot inputs, outputs and prices.
- **Orders:** Pending payment → Paid → Processing → Ready for pickup / Out for delivery → Completed; exits Cancelled (unpaid orders expire, e.g. 24 h, releasing stock) and Refunded. **Paystack payments are confirmed by server-side verify (`/transaction/verify/:reference`), not webhooks** (owner decision, overrides PRD CHK-09): never trust the browser redirect or client-sent status; verify on the callback page, and re-verify from the track-order page and an admin "re-verify" action so a customer who closes the tab before the redirect isn't left pending. Order updates must be idempotent (same reference verified twice = one Paid transition). Manual bank transfer needs proof upload and staff confirmation. Price locks at payment. Installation is a linked service booking, not an order status.
- **Admin roles:** Owner, Store manager, Sales rep, Content editor; all price/stock/order changes are audit-logged; 2FA for staff. Bulk CSV import and bulk price change (for exchange-rate swings) are required.
- **Decided stack (all-in Next.js, no separate backend; supersedes PRD section 12 options A/B):** Next.js 16 + TypeScript + Tailwind v4 with route handlers/server actions; PostgreSQL (database supplied by the owner) via **Prisma**; **Better Auth** for customers and staff (staff 2FA); **Paystack** (verify-based) plus manual bank transfer as the only two payment methods; **Cloudinary** URLs for product images and transfer-proof uploads; **Resend** for email; hosted on **Vercel**. SMS provider not chosen. WhatsApp is click-to-chat only at launch.
- Priorities in the PRD: P0 required for launch, P1 planned for launch but can slip, P2 post-launch.

Where the PRD's open questions are already answered by the owner (see `chat/` section): VAT is not charged, returns are same-day/unopened only, warranty terms per product type, brands list, delivery to all 36 states with customer paying transport, installation only on complete systems. Still open: domain, stock-update routine, wholesale/installer pricing, instalments, and whether quote results are gated behind the phone number.

## Commands

Package manager is **pnpm** (see `packageManager` in `package.json`).

- `pnpm dev` — dev server on http://localhost:3000
- `pnpm build` / `pnpm start` — production build / serve
- `pnpm lint` — ESLint (flat config, `eslint.config.mjs`, `eslint-config-next`)
- `pnpm test` — Vitest (`vitest run`); single file: `pnpm exec vitest run lib/quote/engine.test.ts`, single test: add `-t "name"`
- Type check: `pnpm exec tsc --noEmit`
- If Turbopack still serves a stale Prisma client after a restart, stop `pnpm dev`, delete the `.next` folder, and start again (its persistent cache under `.next/dev/turbopack` can outlive a restart). A fresh cache is verified fine: `NEXT_DIST_DIR=.next-alt pnpm exec next dev -p 3001` runs a second server with its own cache (`/.next-*/` is gitignored).
- After ANY schema change: `prisma migrate dev`, then `pnpm exec prisma generate`, then **restart `pnpm dev`** (Turbopack keeps the old generated client in memory; symptom is Better Auth's "Prisma schema mismatch ... Missing columns" even though the DB is correct).
- Prisma 7 (pinned `prisma@7.10.0` to match `@prisma/client`; don't let the CLI drift to the 8.x RC): `pnpm exec prisma validate | format | generate`, `pnpm db:migrate`, `pnpm db:studio`. Client is generated into `generated/prisma` (gitignored; `postinstall` regenerates it, needed for Vercel builds). CLI uses `DATABASE_URL` (direct) via `prisma.config.ts`; the app uses `DATABASE_URL_POOLED` through the single client in `lib/db.ts`, which needs the `@prisma/adapter-pg` driver adapter. Money columns are whole naira `Int`; convert to kobo only for Paystack. Secrets live in gitignored `.env` (DB, Paystack, Cloudinary)—never print or commit them.

## Design system

Full rationale: [docs/DESIGN.md](docs/DESIGN.md). Living style guide: `/design` (noindex). Tokens in `app/globals.css`, components in `components/ui/` (import from `@/components/ui`).

Colours are sampled from the company logo: navy `#032f7f`/`#0153b7` is the chassis, solar gold `#fcd012` is the primary action (one per view), grid green `#55a022` is positive status, ember `#f49518` is sale/urgency. Type is Archivo (display) + Inter (text). Build on the **semantic** tokens (`bg-surface`, `text-muted`, `border-line`, `bg-chassis`), not raw ramp stops.

Two things that bite:

- **`lib/cn.ts` must list every custom `@theme` key** (`--text-*`, `--font-*`, `--shadow-*`, `--animate-*`). tailwind-merge silently files an unregistered `text-micro` as a colour, so it collides with `text-muted` and the font size vanishes from every eyebrow on the site — no error, no warning. Add new keys to `extend.theme` there.
- **`sun-bloom` is for light surfaces; `sun-bloom-dark` for navy** (it needs to be an overlay element, since it relies on `mix-blend-mode`). Painting plain `sun-bloom` on the chassis turns the gold olive.

## Stack notes

- Next.js **16.3.5** App Router, React 19.2, Tailwind CSS v4 (via `@tailwindcss/postcss`, configured in `app/globals.css`, no `tailwind.config`), TypeScript strict-style config.
- Path alias `@/*` maps to the repo root (not `src/`); code lives in `app/`.
- Next 16 differs from older versions: `LayoutProps<"/">` / typed route helpers are used in `app/layout.tsx`, and `params` are async. Read `node_modules/next/dist/docs/` before writing Next-specific code (see AGENTS.md).

## Client data: `chat/` (gitignored)

`chat/` holds a WhatsApp export with the owner (`WhatsApp Chat with J solar world.txt`) plus ~240 product photos/videos (`IMG-*.jpg`, `VID-*.mp4`), 2 PDFs and a webp. Facts about it:

- Text lines are mostly captions attached to the media immediately above them (e.g. "12kVA felicity inverter 48v", "10kwh felicity lithium ion battery 51.2v", "Felicity solar street lights … D2 80wt"). Prices are sparse and inconsistent (e.g. "1.000,000"); verify before using any price.
- The chat also contains the discovery questionnaire sent to the owner and their answers (brands, warranty, contact, payment, returns, delivery). Those verified facts are the source of truth for site copy: phones 08100362453 / 09044871185 (WhatsApp 09044871185), email Jsolarworld2@gmail.com, Mon–Sat 24h / closed Sunday, shop F-Line 1424 Ojo Alaba International Market, FCMB account 1049984602 (J SOLAR WORLD ENERGY), slogan "Reliable & Trusted Solar Energy Solutions", no VAT added, returns only if unopened and same day.
- CAC documents (the two PDFs in `chat/`, extracted 2026-09-19): J SOLAR WORLD ENERGY is a **registered business name, sole proprietor**, **BN 9403389** (the logo says "RC:", but that is wrong for a business name; on the site say "BN" or "registered business name", never "RC" or "Ltd"), registered **10 March 2026**, activity "supply, sales and services of solar equipment and inverters". CAC lists a different email (JSOLARWORLDENERGY@MAIL.COM) from the one used on the site; ask which is right. The PDFs also hold the proprietor's personal details and TIN: do not publish them or commit the PDFs.
- Still open: business story, solar panel brands/models, the full ~780-item catalogue with prices, and a shop landmark.
- The owner has low literacy: gather missing info by WhatsApp voice call, and read drafts back rather than sending text to read.
- Keep `chat/` out of git (personal data and customer phone numbers); it is gitignored (`/chat`).
