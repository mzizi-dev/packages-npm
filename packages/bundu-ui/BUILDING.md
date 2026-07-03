# Building with @bundu/ui

The toolchain a consumer or contributor uses to build marketing surfaces on top of
`@bundu/ui` — Nyuchi's implementation of the Mzizi design system.

## 1. Consume the package

### Styles (Option A — one canonical globals + a brand overlay)

Import the canonical token system first, then exactly one `brand-*.css` overlay to select
your site's primary mineral. Order matters: the brand overlay must come **after**
`globals.css` so its `--primary` / `--ring` win.

```css
@import "tailwindcss";
@import "@bundu/ui/styles/globals.css";
@import "@bundu/ui/styles/brand-nyuchi.css";
```

| Overlay              | Brand   | Primary mineral |
| -------------------- | ------- | --------------- |
| `brand-bundu.css`    | bundu   | terracotta      |
| `brand-nyuchi.css`   | nyuchi  | gold            |
| `brand-mukoko.css`   | mukoko  | tanzanite       |

`globals.css` alone defaults `--primary` / `--ring` to **cobalt** — the canonical Mzizi
default — so it's usable without any overlay.

### Tailwind preset

Add the preset so the mineral + semantic utility classes (`bg-cobalt`, `text-terracotta`,
`text-h2`, `rounded-xl`, `font-serif`, …) are generated:

```js
// tailwind.config.mjs
import preset from "@bundu/ui/tailwind-preset";

export default {
  presets: [preset],
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  // If you compose mineral classes from data (e.g. `bg-${mineral}`), safelist them:
  safelist: [
    {
      pattern:
        /^(bg|text|border|ring)-(cobalt|tanzanite|malachite|gold|terracotta|sodalite|copper)(-container|-on-container)?$/,
    },
  ],
};
```

### Components

Astro marketing components and React primitives import from their subpaths:

```astro
import Hero from "@bundu/ui/Hero.astro";
import MineralStrip from "@bundu/ui/MineralStrip.astro";
```

```tsx
import { Button } from "@bundu/ui/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@bundu/ui/ui/tabs";
```

Interactive React primitives (`Switch`, `Tabs`, `Tooltip`) are `"use client"` — hydrate
them with a client directive in Astro (`<Switch client:load />`).

## 2. The design-system tools

`@bundu/ui` is downstream of the **Mzizi** registry. The registry — not this package — is
the source of truth for tokens and net-new components.

### mzizi MCP

Point your AI client at the Mzizi Model Context Protocol server to read the registry
(components, tokens, brand, the N1–N10 architecture, Ubuntu doctrine):

- **Canonical:** `https://mzizi.dev/mcp` — the design-portal reference implementation.
- **Registry-driven:** `https://mcp.mzizi.dev/mcp` — the standalone Cloudflare Worker MCP
  whose tool catalog is built from the registry.

### shadcn CLI

Install registry components straight from Mzizi into a consuming app:

```sh
npx shadcn@latest add https://mzizi.dev/api/v1/ui/<component>
```

`@bundu/ui` never re-publishes Mzizi design-system components — it ships the marketing
composition layer (Astro building blocks + shadcn-pattern primitives). Net-new registry
primitives come from Mzizi via the shadcn CLI above.

## 3. The seven African minerals

Design decisions are data. The palette is seven minerals, each with a `DEFAULT`,
`-container`, and `-on-container` token, defined light + dark in `globals.css`:

`cobalt` · `tanzanite` · `malachite` · `gold` · `terracotta` · `sodalite` · `copper`

`MineralStrip.astro` renders the decorative **seven-mineral vertical strip** fixed to the
left edge of the page (top→bottom: cobalt, tanzanite, malachite, gold, terracotta,
sodalite, copper) — purely decorative (`aria-hidden`, `pointer-events: none`).

## 4. The hard rule — no raw hex in source

**Design values flow through CSS custom properties / Tailwind tokens — NEVER a raw hex in
component source.** Use `bg-primary`, `text-muted-foreground`, `border-border`,
`bg-cobalt-container`, `text-h2`, `rounded-full`, etc. The only place hex literals live is
`styles/globals.css`, where the `--color-*` and semantic tokens are defined; every
component consumes them via `var()` / Tailwind utility classes. This keeps a brand re-skin
(swap the `brand-*.css` overlay) landing everywhere at once, and keeps light/dark correct.

Related invariants carried from the Mzizi doctrine:

- **Buttons are pill-shaped** (`rounded-full`) across the ecosystem.
- **Touch targets** — 56px default, 48px minimum for interactive controls.
- **Brand wordmarks are lowercase** — `mzizi`, `bundu`, `nyuchi`, `mukoko`.

## 5. No build step

Like `@nyuchi/ui`, `@bundu/ui` is a **source-only** package — there is no compile step. The
published `files` are `src/`, `styles/`, and `tailwind-preset.mjs`; the consumer's own
Astro / bundler compiles the `.astro` and `.tsx` sources.
