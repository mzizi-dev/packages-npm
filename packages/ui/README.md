# @nyuchi/ui

> Svelte 5 / SvelteKit component library for the Nyuchi Design System — accessible primitives on the seven African-mineral tokens.

[![npm](https://img.shields.io/npm/v/%40nyuchi%2Fui?style=flat-square&logo=npm)](https://www.npmjs.com/package/@nyuchi/ui)
[![Lint](https://img.shields.io/github/actions/workflow/status/mukoko-dev/packages-ui/lint.yml?branch=main&label=lint&style=flat-square)](https://github.com/mukoko-dev/packages-ui/actions/workflows/lint.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Repo:** [mukoko-dev/packages-ui](https://github.com/mukoko-dev/packages-ui) | **Architecture:** [mzizi.dev](https://mzizi.dev)

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
import "@nyuchi/ui/styles/globals.css";      // the 7 minerals + semantic tokens
import "@nyuchi/ui/styles/brand-nyuchi.css";  // gold primary (or brand-bundu / brand-mukoko)
```

`globals.css` ships the seven minerals (light + dark), the semantic tokens,
and `@layer` component/utility classes. The minerals are the mineral subset of
the Mzizi palette, which is 21 colour families in total (7 minerals, 7
heritage, 7 experimental); this package ships the mineral seven only. The canonical `--primary` / `--ring`
mineral is **cobalt**; a brand overlay remaps them:

| Overlay            | Primary mineral |
| ------------------ | --------------- |
| `brand-bundu.css`  | terracotta      |
| `brand-nyuchi.css` | gold            |
| `brand-mukoko.css` | tanzanite       |

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

See [BUILDING.md](https://github.com/mukoko-dev/packages-ui/blob/main/packages/ui/BUILDING.md).

## Licence

[MIT](https://github.com/mukoko-dev/packages-ui/blob/main/LICENSE) © Nyuchi Africa (Pvt) Ltd.
