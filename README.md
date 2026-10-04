# Nyuchi Design System

> Shared, publishable UI packages — Nyuchi's implementation of the Mzizi architecture, consumed by the marketing and documentation sites.

[![Lint](https://github.com/mzizi-dev/packages-npm/actions/workflows/lint.yml/badge.svg)](https://github.com/mzizi-dev/packages-npm/actions/workflows/lint.yml)
[![Release](https://github.com/mzizi-dev/packages-npm/actions/workflows/release.yml/badge.svg)](https://github.com/mzizi-dev/packages-npm/actions/workflows/release.yml)
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

Releases are automatic. On every push to `main` the
[`release` workflow](https://github.com/mzizi-dev/packages-npm/blob/main/.github/workflows/release.yml)
runs the token check and the tests, publishes each package whose `package.json`
version is not on npm yet, then tags it `<name>@<version>` (for example
`@bundu/ui@0.3.0`) and creates a GitHub release from that version's
`CHANGELOG.md` section. Nobody pushes a tag by hand.

To release a package, bump its `version` in its `package.json` and add a
`## [<name> <version>] - <date>` section to `CHANGELOG.md` (one heading may name
several packages) in the same pull request. A merge that bumps nothing publishes
nothing, and a re-run skips every version npm already has.

`@nyuchi/*` publish under the [`@nyuchi`](https://www.npmjs.com/org/nyuchi) npm org
and `@bundu/*` under the [`@bundu`](https://www.npmjs.com/org/bundu) npm org, with
npm provenance. Two **organisation** secrets on `mzizi-dev` are used, so no
repository-level secret is needed: `NPM_TOKEN` (publish access to both npm orgs)
and `RELEASE_BUMP_TOKEN` (pushes the tags and creates the releases).

## Versioning

From 2026-10-04 each package follows the org versioning policy
([nyuchi/.github#80](https://github.com/nyuchi/.github/issues/80)):

- A release is the next **minor** above that package's highest version on npm
  (x.y.z → x.y+1.0). The releasing PR sets `version` to it.
- A **major** is only released by hand: run the Release workflow with
  `bump: major`. Each segment holds 0–999.
- The Release workflow refuses any other version before publishing it, names
  the version it expects, and still publishes the other packages. Versions
  already on npm are never renumbered.

## Licence

[MIT](https://github.com/mzizi-dev/packages-npm/blob/main/LICENSE) © Nyuchi
Africa (Pvt) Ltd.
