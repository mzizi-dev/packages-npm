# Nyuchi Design System

> Shared, publishable UI packages — Nyuchi's implementation of the Mzizi architecture, consumed by the marketing and documentation sites.

[![Lint](https://github.com/mzizi-dev/packages-npm/actions/workflows/lint.yml/badge.svg)](https://github.com/mzizi-dev/packages-npm/actions/workflows/lint.yml)
[![Publish](https://github.com/mzizi-dev/packages-npm/actions/workflows/publish.yml/badge.svg)](https://github.com/mzizi-dev/packages-npm/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Packages:** [`@nyuchi/ui`](https://www.npmjs.com/package/@nyuchi/ui) · [`@bundu/ui`](https://www.npmjs.com/package/@bundu/ui) · [`@bundu/server`](https://www.npmjs.com/package/@bundu/server) | **Architecture:** [mzizi.dev](https://mzizi.dev)

---

## What this is

A [pnpm workspace](https://pnpm.io/workspaces) holding the UI packages Nyuchi
publishes to npm. The packages implement the [Mzizi](https://mzizi.dev)
architecture — an open-architecture project of the Bundu Foundation, operated
and developed by Nyuchi — but the packages themselves are **Nyuchi-owned
implementations**, not Mzizi itself. Mzizi's own registry lives at
[`mzizi-dev/mzizi-registry`](https://github.com/mzizi-dev/mzizi-registry).

| Package                                                                                      | Framework          | What it is                                                                                                         |
| -------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| [`@nyuchi/ui`](https://github.com/mzizi-dev/packages-npm/tree/main/packages/ui)              | Svelte 5/SvelteKit | The app-UI layer for Nyuchi apps                                                                                   |
| [`@bundu/ui`](https://github.com/mzizi-dev/packages-npm/tree/main/packages/bundu-ui)         | Astro + React      | The marketing UI kit behind the bundu, nyuchi and mukoko marketing sites, and pure-Astro app patterns for consoles |
| [`@bundu/server`](https://github.com/mzizi-dev/packages-npm/tree/main/packages/bundu-server) | Any (Web APIs)     | Server-side helpers: sealed cookies, flash, theme, safe redirects, origin checks, security headers, table paging   |

Both UI packages ship **byte-identical** `styles/tokens.css`, `styles/theme.css`,
`tokens.json`, `tailwind-palette.mjs` and `styles/brand-*.css`. They are two outputs of
one generator, not two hand-maintained files.

## Tokens

All 21 Mzizi colour families (7 minerals, 7 heritage, 7 experimental) under one
`--color-*` namespace, plus the nine-step surface ladder and the connectivity status
trio, in light and dark, with `brand-*.css` overlays that swap the brand primary.
Everything is **generated** from `tokens/canon.snapshot.json`:

```sh
pnpm canon:fetch     # refresh the snapshot from canon (network, on demand)
pnpm tokens:build    # regenerate every artifact from the snapshot (offline)
pnpm tokens:check    # CI gate: fail if any generated file was hand-edited (offline)
pnpm canon:parity    # CI gate: fail if the snapshot has drifted from canon (network)
```

The snapshot is machine-written from two sources that are cross-checked against each
other — [`api.mzizi.dev/api/v1/brand`](https://api.mzizi.dev/api/v1/brand) and
`mzizi-dev/mzizi-registry`'s `lib/tokens/palette.source.ts`. Nobody types a hex, and
never a raw hex in source. The values do **not** live in a database; Mzizi holds no
brand or primitive token data in one.

`canon:parity` reaches the network and therefore runs in **CI only** — it refuses to run
without `CI` set unless given `--force`. It is never in a build, a `prepack`, a
`postinstall` or a runtime path.

## Development

```sh
pnpm install
pnpm lint
```

## Publishing

Published to npm automatically by the
[`publish` workflow](https://github.com/mzizi-dev/packages-npm/blob/main/.github/workflows/publish.yml)
when a GitHub Release is published (or a `v*` tag is pushed) — `@nyuchi/*` under the
[`@nyuchi`](https://www.npmjs.com/org/nyuchi) npm org and `@bundu/*` under the
[`@bundu`](https://www.npmjs.com/org/bundu) npm org. The workflow requires an
`NPM_TOKEN` with publish access to both orgs. `NPM_TOKEN` is an **organisation** secret
on `mzizi-dev`, visible to all its repositories (the repo moved here from
`mukoko-dev` on 2026-10-02), so no repository-level secret is needed. Check that
this token can publish to both npm orgs before the first release from here.

Publishing is the owner's call. CI does not publish on a branch push — only on a
published GitHub Release or a `v*` tag.

## Licence

[MIT](https://github.com/mzizi-dev/packages-npm/blob/main/LICENSE) © Nyuchi
Africa (Pvt) Ltd.
