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

The Mzizi design system itself is published on claude.ai as the Design System artifact,
<https://claude.ai/artifact/G8CCtAbZ8w717uQ3R5itCc>: voice and content fundamentals, visual
foundations, the marks, and component previews. Its source of truth is the `design-system/`
folder in `mzizi-dev/mzizi-registry` (arriving with mzizi-registry#418), which the artifact is
built from file for file, so a change to the design system goes there, never on the artifact
page.

## Components are built from the Mzizi registry

Every `@bundu/ui` `.astro` component and the modules it uses, `@bundu/server`'s helpers, the
brand marks and the contract runner are **built from**
[`mzizi-dev/mzizi-registry`](https://github.com/mzizi-dev/mzizi-registry), the single source
of every component in every format, at the commit pinned in `scripts/registry-ref.json`:

```sh
pnpm registry:sync   # write them from the registry at the pin (network)
pnpm registry:check  # CI gate: fail on any drift, or on an .astro the registry does not have
```

Never edit those files here. Change the component in the registry (its contract, `.astro` and
`.tsx` together), then bump the pin and run `pnpm registry:sync`.

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
npm provenance, by
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC): the
workflow holds no npm token. Each package is packed with `pnpm pack` (which
rewrites `workspace:` ranges) and published with `npm publish` (npm >= 11.5.1,
pinned in the workflow), which exchanges the job's GitHub OIDC token for a
short-lived token for that one package. The only secret used is the
**organisation** secret `RELEASE_BUMP_TOKEN` on `mzizi-dev` (pushes the tags and
creates the releases).

### Trusted publisher setup (once per package, on npmjs.com)

An owner of the npm org does this for every package the workflow publishes
(`@bundu/server`, `@bundu/ui`, `@nyuchi/ui`, and any package added under
`packages/` later):

1. On npmjs.com, open the package → **Settings** → **Trusted publishing** →
   **GitHub Actions**, and enter: organization `mzizi-dev`, repository
   `packages-npm`, workflow filename `release.yml` (no environment). Under
   **Allowed actions**, allow **`npm publish`** (direct publishing): the
   workflow publishes directly, and a configuration made after 2026-09-03
   allows only `npm stage publish` unless this is ticked.
2. Then **Settings** → **Publishing access** → **Require two-factor
   authentication and disallow tokens** → **Update Package Settings**.

Publishing is **trusted publishing only: no npm token, ever** (owner decision,
2026-10-05). There is no `NPM_TOKEN` secret and no token fallback; do not add one.

### First publish of a new package (manual, by an owner)

npm attaches a trusted publisher only to a package that already exists, so a
package that has never been published (check with `npm view <name> version`) cannot
be published by the workflow. The release run checks for that first: it reports the
package as "failed" with the steps below, holds back anything that depends on it
(`@bundu/ui` on `@bundu/server`) as "blocked", and publishes the others. An owner
then does the first publish by hand, signed in with their own npm account and no
token:

1. From a clean checkout of the release commit: `npm login --auth-type=web`
   (2FA in the browser).
2. In the package directory: `pnpm pack` (rewrites `workspace:` ranges), then
   `npm publish <tarball>.tgz --access public`.
3. Set up its trusted publisher on npmjs.com as above (both steps), then re-run
   the Release workflow (by hand if nothing new has merged). From then on it
   publishes by OIDC, and its dependants follow.

Each package's `repository.url` must stay
`git+https://github.com/mzizi-dev/packages-npm.git`: npm checks it against the
repository the OIDC token comes from.

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
