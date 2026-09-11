# @bundu/ui

> The marketing UI kit for the Bundu ecosystem — editorial Astro building blocks plus shadcn-style React primitives on the Mzizi tokens (all 21 colour families).

[![npm](https://img.shields.io/npm/v/%40bundu%2Fui?style=flat-square&logo=npm)](https://www.npmjs.com/package/@bundu/ui)
[![Lint](https://img.shields.io/github/actions/workflow/status/mukoko-dev/packages-ui/lint.yml?branch=main&label=lint&style=flat-square)](https://github.com/mukoko-dev/packages-ui/actions/workflows/lint.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Repo:** [mukoko-dev/packages-ui](https://github.com/mukoko-dev/packages-ui) | **Architecture:** [mzizi.dev](https://mzizi.dev)

---

## What it is

The shared component layer behind the marketing sites (bundu, nyuchi, mukoko).
It is Nyuchi's implementation of the [Mzizi](https://mzizi.dev) design
system — an open-architecture project of the Bundu Foundation, operated and
developed by Nyuchi. This package is not Mzizi itself.

- **Astro marketing components** — `Hero`, `Section`, `SectionHeader`, `Container`,
  `MineralStrip`, `Icon`, `SocialIcon`, and `Breadcrumb` (emits valid schema.org
  `BreadcrumbList` JSON-LD for Google rich results).
- **shadcn CVA + `cn()` React primitives** — `Button`, `Card`, `Badge`, `Input`,
  `Textarea`, `Select`, `Label`, `Alert`, `Avatar`, `Separator`, `Skeleton`, `Switch`,
  `Checkbox`, `Tabs`, `Tooltip`.
- **The whole Mzizi palette** — `styles/tokens.css` carries all **21 colour families**
  under one `--color-*` namespace: 7 minerals, 7 heritage tones, 7 experimental tones.
  Plus the nine-step surface ladder (`--pitch --void --base --surface --container
--overlay --raised --scrim --wash`) and the connectivity status trio (`--syncing
--offline --neutral`).
- **Tailwind v3 and v4** — `styles/theme.css` is a native v4 `@theme` entrypoint;
  `tailwind-preset.mjs` is the v3-shape preset, still shipped and still working (v4 loads
  it through `@config`).
- **Brand overlays** — `brand-bundu`, `brand-nyuchi`, `brand-mukoko`, `brand-shamwari`,
  `brand-mzizi`. Each repoints `--primary` and `--ring` and nothing else.
- **`tokens.json`** — the same values machine-readable, including every custom property
  resolved to a literal hex per mode, for the surfaces that cannot consume CSS at all:
  Expo (`mukoko-weather-mobile`) and Satori-based OG-image / email / PDF generators.

## Generated, not transcribed

`styles/tokens.css`, `styles/theme.css`, `tokens.json`, `tailwind-palette.mjs` and every
`styles/brand-*.css` are **generated** by `scripts/generate-tokens.mjs` from
`tokens/canon.snapshot.json`, which is itself machine-written by `scripts/fetch-canon.mjs`
from canon:

| Source                                                      | Supplies                                                                                |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `https://api.mzizi.dev/api/v1/brand`                        | the 21 families, semantic tokens, the background ladder, radii, the brand→mineral table |
| `mzizi-dev/mzizi-registry` → `lib/tokens/palette.source.ts` | the minerals' `onContainer` pairs, which `/v1/brand` does not project                   |

The two are cross-checked against each other on every fetch: if they disagree about a hex,
the fetch fails rather than silently preferring one. That disagreement is how an estate
ends up with four different terracottas.

The hex values do **not** live in a database. Mzizi holds no brand or primitive token data
in Supabase or anywhere else — 0.1.1's `tokens.css` header said otherwise and was wrong.

Three gates, none of which can pass vacuously:

| Command             | Network | Runs                    | Fails when                                         |
| ------------------- | ------- | ----------------------- | -------------------------------------------------- |
| `pnpm tokens:check` | no      | every CI job, `prepack` | a generated file disagrees with the generator      |
| `pnpm canon:parity` | yes     | **CI only**             | the committed snapshot has drifted from live canon |
| `pnpm canon:fetch`  | yes     | on demand               | the API and `palette.source.ts` disagree           |

`canon:parity` refuses to run outside CI without `--force`, so it cannot creep into a build
or a runtime path. A token package that phones home to render a page is a page that goes
blank the afternoon the API is unwell.

Every value flows through CSS custom properties / Tailwind tokens — **never a raw hex in
source**.

## Install

```sh
pnpm add @bundu/ui
# peer deps (for the React primitives)
pnpm add react react-dom
```

## Quick usage

**1a. Tailwind v4 (recommended)** — one stylesheet, no `tailwind.config.mjs` at all:

```css
@import "tailwindcss";
@import "@bundu/ui/styles/theme.css"; /* @imports tokens.css, adds @theme */
@import "@bundu/ui/styles/brand-nyuchi.css";
```

**1b. Tailwind v3, or v4 via `@config`** — unchanged from 0.1.x, still supported:

```css
@import "tailwindcss";
@import "@bundu/ui/styles/tokens.css"; /* or globals.css for the @layer rules */
@import "@bundu/ui/styles/brand-nyuchi.css";
@config "../../tailwind.config.mjs";
```

```js
// tailwind.config.mjs
import preset from "@bundu/ui/tailwind-preset";

export default {
  presets: [preset],
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
};
```

**2. Outside the browser** — Expo, Satori, PDF:

```js
import tokens from "@bundu/ui/tokens.json" with { type: "json" };

tokens.resolved.dark["--color-sodalite"]; // "#3d5afe"
tokens.color.heritage.savanna.dark; // "#e5c158"
tokens.surface.base.light; // "#f3f3f1"
```

**3. Components:**

```astro
---
import Hero from "@bundu/ui/Hero.astro";
import Container from "@bundu/ui/Container.astro";
import MineralStrip from "@bundu/ui/MineralStrip.astro";
import Breadcrumb from "@bundu/ui/Breadcrumb.astro";
import { deriveBreadcrumbs } from "@bundu/ui";

const crumbs = deriveBreadcrumbs(Astro.url.pathname, { about: "About" }, "Nyuchi");
---

<MineralStrip />
<Hero title="Build in the open" subtitle="Bundu Ecosystem" />
<Container>
  <Breadcrumb items={crumbs} origin={Astro.site?.toString()} />
</Container>
```

```tsx
import { Button } from "@bundu/ui/ui/button";
import { Alert, AlertTitle } from "@bundu/ui/ui/alert";

export function CTA() {
  return (
    <>
      <Alert variant="success">
        <AlertTitle>Saved</AlertTitle>
      </Alert>
      <Button variant="primary" href="/start" arrow>
        Get started
      </Button>
    </>
  );
}
```

See [BUILDING.md](https://github.com/mukoko-dev/packages-ui/blob/main/packages/bundu-ui/BUILDING.md) for the full toolchain — the mzizi MCP, the shadcn CLI, the
21 colour families, and the no-raw-hex rule.

## Licence

[MIT](https://github.com/mukoko-dev/packages-ui/blob/main/LICENSE) © Nyuchi Africa (Pvt) Ltd.
