# @nyuchi/ui

> Svelte 5 / SvelteKit component library for the Nyuchi Design System — accessible primitives on the Mzizi tokens (all 21 colour families).

[![npm](https://img.shields.io/npm/v/%40nyuchi%2Fui?style=flat-square&logo=npm)](https://www.npmjs.com/package/@nyuchi/ui)
[![Lint](https://img.shields.io/github/actions/workflow/status/mzizi-dev/packages-npm/lint.yml?branch=main&label=lint&style=flat-square)](https://github.com/mzizi-dev/packages-npm/actions/workflows/lint.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Repo:** [mzizi-dev/packages-npm](https://github.com/mzizi-dev/packages-npm) | **Architecture:** [mzizi.dev](https://mzizi.dev)

---

## What it is

The **app-UI layer** for Nyuchi apps, which are built on SvelteKit. It is
Nyuchi's implementation of the [Mzizi](https://mzizi.dev) architecture — an
open-architecture project of the Bundu Foundation, operated and developed by
Nyuchi. This package is not Mzizi itself.

## Install

```sh
pnpm add @nyuchi/ui svelte
```

`svelte@^5` is a peer dependency.

## Usage

Import the tokens once (e.g. in your root `+layout.svelte` or app CSS), then
import components anywhere:

```svelte
<script lang="ts">
  import { Button, Card, Badge, Breadcrumb } from "@nyuchi/ui";
</script>

<Card>
  <Badge variant="success">Stable</Badge>
  <Button variant="primary" onclick={() => alert("hi")}>Get started</Button>
</Card>
```

### Tokens (framework-agnostic CSS)

```ts
// app.css / root layout
import "@nyuchi/ui/styles/tokens.css"; // all 21 colour families + semantic tokens
import "@nyuchi/ui/styles/brand-nyuchi.css"; // gold primary
```

`tokens.css` carries the whole Mzizi palette — **21 colour families** under one
`--color-*` namespace (7 minerals, 7 heritage tones, 7 experimental tones), the
nine-step surface ladder (`--pitch --void --base --surface --container --overlay
--raised --scrim --wash`), the connectivity status trio (`--syncing --offline
--neutral`) and the semantic (shadcn) contract, in light and dark.

It is **generated** — see the [repo README](https://github.com/mzizi-dev/packages-npm#tokens) — and is
byte-identical to `@bundu/ui`'s. Until 0.2.0 this package carried its own
hand-written copy of the palette inside `globals.css`, which had drifted and
disagreed with `@bundu/ui` about Bundu's own brand mineral. That copy is gone.

`globals.css` now just `@import`s `tokens.css` and adds the `@layer`
component/utility classes the Svelte components lean on. Tailwind v4 users
should import `theme.css` instead — it `@import`s `tokens.css` and adds a
native `@theme` entrypoint, so no `tailwind.config.mjs` is needed.

The unbranded `--primary` / `--ring` default is **tanzanite** / **cobalt**
(canon: "Cobalt is the exceptional mineral for links/info only — do not use it
as `--primary`"). A brand overlay remaps `--primary` and `--ring`, and nothing
else:

| Overlay               | Primary mineral                                 |
| --------------------- | ----------------------------------------------- |
| `brand-bundu.css`     | copper                                          |
| `brand-nyuchi.css`    | gold                                            |
| `brand-mukoko.css`    | tanzanite                                       |
| `brand-shamwari.css`  | sodalite                                        |
| `brand-mzizi.css`     | hematite (heritage)                             |
| `brand-events.css`    | malachite                                       |
| `brand-nhimbe.css`    | deprecated alias: re-exports `brand-events.css` |
| `brand-lingo.css`     | cobalt                                          |
| `brand-bushtrade.css` | gold                                            |
| `brand-campfire.css`  | malachite                                       |
| `brand-news.css`      | cobalt                                          |
| `brand-weather.css`   | cobalt                                          |
| `brand-kweli.css`     | malachite                                       |
| `brand-learning.css`  | gold                                            |

### Outside the browser

`tokens.json` ships the same values machine-readable, including every custom
property resolved to a literal hex per mode — for Expo and for Satori-based
OG-image / email / PDF generators, neither of which can resolve a CSS variable.

```js
import tokens from "@nyuchi/ui/tokens.json" with { type: "json" };
tokens.resolved.dark["--color-savanna"]; // "#e5c158"
```

### Tailwind consumers

The token utility classes the components use (`bg-primary`,
`text-muted-foreground`, `bg-cobalt-container`, `text-h1`, …) come from the
shipped preset:

```js
// tailwind.config.mjs
import nyuchiPreset from "@nyuchi/ui/tailwind-preset";

export default {
  presets: [nyuchiPreset],
  content: [
    "./src/**/*.{svelte,ts,html}",
    "./node_modules/@nyuchi/ui/dist/**/*.svelte",
  ],
};
```

## Components

`Alert`, `Avatar`, `Badge`, `Breadcrumb`, `Button`, `Card`, `Checkbox`,
`Container`, `Input`, `Label`, `Select`, `Separator`, `Skeleton`,
`SocialIcon`, `Switch`, `Tabs`, `Textarea`, `Tooltip`.

Plus the `deriveBreadcrumbs` helper (with `BreadcrumbItem` /
`BreadcrumbLabelMap` types) and the `cx` className joiner.

- **`Breadcrumb`** — visual nav plus a schema.org `BreadcrumbList` JSON-LD
  block (rendered via `<svelte:head>`) for Google rich results. Pass
  `origin` (e.g. `$page.url.origin`) so the item URLs are absolute at SSR
  time. Renders nothing for a single-item trail.
- **`SocialIcon`** — platform-aware social link with an auto-detected glyph.
- Interactive components (`Switch`, `Tabs`, `Tooltip`, `Checkbox`, …) are
  keyboard-accessible with ARIA roles and keep a ≥48px touch target.

All components use semantic-token classes only — **no raw hex**.

## Building

See [BUILDING.md](https://github.com/mzizi-dev/packages-npm/blob/main/packages/ui/BUILDING.md).

## Licence

[MIT](https://github.com/mzizi-dev/packages-npm/blob/main/LICENSE) © Nyuchi Africa (Pvt) Ltd.
