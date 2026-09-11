# Nyuchi Design System

> Shared, publishable UI packages — Nyuchi's implementation of the Mzizi architecture, consumed by the marketing and documentation sites.

[![Lint](https://github.com/mukoko-dev/packages-ui/actions/workflows/lint.yml/badge.svg)](https://github.com/mukoko-dev/packages-ui/actions/workflows/lint.yml)
[![Publish](https://github.com/mukoko-dev/packages-ui/actions/workflows/publish.yml/badge.svg)](https://github.com/mukoko-dev/packages-ui/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Packages:** [`@nyuchi/ui`](https://www.npmjs.com/package/@nyuchi/ui) · [`@bundu/ui`](https://www.npmjs.com/package/@bundu/ui) | **Architecture:** [mzizi.dev](https://mzizi.dev)

---

## What this is

A [pnpm workspace](https://pnpm.io/workspaces) holding the UI packages Nyuchi
publishes to npm. Both packages implement the [Mzizi](https://mzizi.dev)
architecture — an open-architecture project of the Bundu Foundation, operated
and developed by Nyuchi — but the packages themselves are **Nyuchi-owned
implementations**, not Mzizi itself. Mzizi's own registry lives at
[`mzizi-dev/mzizi-registry`](https://github.com/mzizi-dev/mzizi-registry).

| Package                                                                              | Framework          | What it is                                                               |
| ------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------ |
| [`@nyuchi/ui`](https://github.com/mukoko-dev/packages-ui/tree/main/packages/ui)      | Svelte 5/SvelteKit | The app-UI layer for Nyuchi apps                                         |
| [`@bundu/ui`](https://github.com/mukoko-dev/packages-ui/tree/main/packages/bundu-ui) | Astro + React      | The marketing UI kit behind the bundu, nyuchi and mukoko marketing sites |

## Tokens

Both packages ship the **seven African minerals** — `cobalt`, `tanzanite`,
`malachite`, `gold`, `terracotta`, `sodalite`, `copper` — as CSS custom
properties, in light and dark, with `brand-*.css` overlays that swap the brand
primary.

The minerals are the mineral subset of the Mzizi palette, which is **21 colour
families** in total (7 minerals, 7 heritage, 7 experimental). These packages
deliberately ship the mineral seven only; the full palette is served from
[`api.mzizi.dev`](https://api.mzizi.dev/api/v1/brand). Never a raw hex in
source.

## Development

```sh
pnpm install
pnpm lint
```

## Publishing

Published to npm automatically by the
[`publish` workflow](https://github.com/mukoko-dev/packages-ui/blob/main/.github/workflows/publish.yml)
when a GitHub Release is published — `@nyuchi/*` under the `@nyuchi` npm org
and `@bundu/*` under the `@bundu` npm org. The workflow requires an `NPM_TOKEN`
repository secret with publish access to both orgs.

## Licence

[MIT](https://github.com/mukoko-dev/packages-ui/blob/main/LICENSE) © Nyuchi
Africa (Pvt) Ltd.
