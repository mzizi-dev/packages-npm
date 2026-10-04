# Changelog

All notable changes to the packages in this repository are recorded here:
[`@bundu/ui`](https://www.npmjs.com/package/@bundu/ui) (`packages/bundu-ui`) and
[`@nyuchi/ui`](https://www.npmjs.com/package/@nyuchi/ui) (`packages/ui`) and
[`@bundu/server`](https://www.npmjs.com/package/@bundu/server) (`packages/bundu-server`).
Each entry names the package it applies to.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and both
packages follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While they
are below 1.0.0, a minor release may carry breaking changes; each one is marked
**Breaking** below.

Entries before 0.2.0 were backfilled on 2026-09-30 from the git history, the tags and
the npm registry.

## [Unreleased]

## [@bundu/ui 0.3.0, @bundu/server 0.1.0] - 2026-10-04

Published to npm from the `v0.3.0` tag. `@nyuchi/ui` is unchanged at 0.2.0.

### Added

- **`@bundu/server` 0.1.0 — a new package: server-side helpers**, the companion to
  `@bundu/ui` as `mzizi-roots-server` is to `mzizi-roots`. Dependency-free on Web APIs,
  so it runs in Astro server routes, Node 20+ and Cloudflare Workers alike:
  `createSealer` (AES-256-GCM values bound to a purpose, wire-compatible with the Rust
  sealer in the Nyuchi console backend, checked both ways), `randomToken`,
  `pkceChallenge`, cookie helpers with safe defaults, `createFlash` (one-shot messages
  carried as a key, never text), the theme preference, `safeBack` (same-origin return
  paths, refusing `//`, `\` and control characters), `parseOrigin` (bare `https`
  origins), `withSecurityHeaders`, and the table query and paging core. Built from
  TypeScript to `dist/` with declarations on `prepack`. 36 unit tests. Tracking:
  mzizi-dev/packages-npm#19.
- **`@bundu/ui` — `@bundu/ui/lib/table` now re-exports `@bundu/server/table`**, which
  holds the code, and `@bundu/ui` depends on `@bundu/server`. The same API.
- **`@bundu/ui` — app patterns for signed-in apps and consoles** (`@bundu/ui/app/*`).
  `AppShell`, `SideNav`, `AccountMenu`, `PageHeader`, `DataTable` (one card per row on
  phones), `FilterBar`, `Pagination`, `DetailPanel`, `FormLayout`, `FormField`,
  `StateMessage`, `Toast`, `StatTile` and `BarChart`, and the primitives under them
  (`Button`, `Badge`, `Card`, `Alert`, `Input`, `Label`, `Skeleton`). All are **pure
  Astro**: no React or other framework under them and no client JavaScript. `Badge`
  follows the Mzizi registry's `badge` contract (`default`, `secondary`, `destructive`,
  `outline`, `ghost`, `link`). Plus `@bundu/ui/lib/table` (`parseTableQuery`,
  `filterRows`, `paginate`, `withParams`). Built for the Nyuchi console's move to Astro
  and Rust (nyuchi/nyuchi-platform#330), which keeps local copies until this release
  is published.
- **`@bundu/ui` — `@bundu/ui/ui/variants`.** The class recipes (`buttonVariants`,
  `cardVariants`, `alertVariants`, `inputClasses`, `labelClasses`, `skeletonClasses`,
  `badgeClasses`) with no React in them, shared by the React primitives and the Astro
  components. Each `.tsx` still exports its own recipe, so existing imports keep
  working.
- **`@bundu/ui` — rendering tests for the app patterns.** `src/app/app.test.ts` renders
  every component through Astro's container API with **no framework renderer
  registered**, and checks the semantics each one promises (landmarks, labels, `aria-*`
  wiring, escaped cell text, no `<script>` and no island), plus a source check that no
  app component imports a framework. `@bundu/ui` gains a `test` script, a
  `vitest.config.ts` (Astro's `getViteConfig`) and an `astro` dev dependency; the root
  `pnpm test` runs each package's tests. Not in the tarball.

### Changed

- **Repository tooling: Vite+ 1.0.** `vite-plus` joins the root dev dependencies
  (`prettier` stays, for the token generator only), and `vp check` (format plus
  type-aware lint) is the repo's check. Source files in both packages were re-wrapped
  by the formatter, and `@nyuchi/ui`'s `Breadcrumb` writes its JSON-LD closing tag as
  `<\/script>` (the same string at runtime) so the linter can parse the component.
  No API change.
- **Removed `.github/workflows/lint.yml`.** The `mzizi-dev` org ruleset now runs the shared lint on every pull request through `mzizi-dev/.github`'s `org-lint.yml`, publishing the same five `lint / …` checks, so the repo's own caller only ran lint a second time.

## [@bundu/ui 0.2.0, @nyuchi/ui 0.2.0] - 2026-09-30

Published to npm from the `v0.2.0` tag. `@nyuchi/ui` 0.2.0 is **Breaking**: the Svelte 5
library replaces the Astro components published as 0.1.2.

### Added

- **`@bundu/ui` — `Hero` media slot and split layout.** All of these are optional, and
  with none of them `Hero` renders byte-identical markup to 0.1.1.
  - A named `media` slot renders a demo, screenshot or live widget. It sits beside the
    text column under `layout="split"`, or below it under the default `layout="stack"`.
  - `layout="split"` puts text and media side by side from the `lg` breakpoint and
    stacks them, text first, below it.
  - `badge` renders a short status pill above the headline.
  - `variant="showcase"` gives a richer, token-only background.
  - `mediaLabel` gives the media region an accessible name.
- **Both — `styles/color-scheme.css`, an opt-in file that follows the OS colour
  scheme.** It repeats `tokens.css`'s dark block under
  `@media (prefers-color-scheme: dark)` for sites with no theme script, and an explicit
  `data-theme="light"` or `.light` still wins. Its selector is `:root:where(…)`, so a
  brand overlay imported after it keeps its `--primary`. It is generated like every
  other token file, bringing the count to 20, and exported as
  `./styles/color-scheme.css`.
- **`@bundu/ui` — `Icon` glyphs `search`, `code` and `terminal`.**
- **`@bundu/ui` — `TabsContent` `forceMount`.** It renders an inactive panel's content
  (still `hidden`), so a statically rendered tab set, with no hydration, carries every
  panel in its HTML. The default is unchanged.
- **`@bundu/ui` — `.gradient-showcase` utility** in `styles/globals.css`. It lays soft
  washes of the brand `--primary` and cobalt over `--background`, with no hex and no
  image.
- **Both — the type scale, reading widths and named spacing in `styles/theme.css`.**
  This adds `--text-display` … `--text-caption` with their line-height, tracking and
  weight, `--container-narrow` / `--container-prose`, and `--spacing-xxs` …
  `--spacing-2xl-plus`. These values are read from each package's `tailwind-preset.mjs`,
  so the Tailwind v4 path and the v3 preset share one definition. Without them, the
  Astro components' `text-display`, `text-body-lg` and `eyebrow` classes had no value
  under the v4-only setup the README recommends.
- **Both — all 21 Mzizi colour families** in `styles/tokens.css`, under one `--color-*`
  namespace: 7 minerals, 7 heritage tones and 7 experimental tones. It also carries the
  nine-step surface ladder (`--pitch` … `--wash`, plus `--surface-muted`) and the
  connectivity status trio (`--syncing`, `--offline`, `--neutral`). That is 113 custom
  properties, up from 62. (#9)
- **Both — `styles/theme.css`**, a native Tailwind v4 `@theme` entrypoint, so no
  `tailwind.config.mjs` is needed. (#9)
- **Both — `tokens.json`.** It holds the same values in machine-readable form, including
  every custom property resolved to a literal hex per mode, for Expo and Satori. (#9)
- **Both — `brand-shamwari.css` (sodalite) and `brand-mzizi.css` (hematite).** Mzizi's
  brand mineral is hematite by owner decision (2026-09-30), recorded in canon as
  mzizi-dev/mzizi-registry#378. (#9)
- **Both — `tailwind-palette.mjs`**, the generated colour map shared by the v3 preset
  and `theme.css`. (#9)
- **`@bundu/ui` — package exports** for `./styles/theme.css`,
  `./styles/brand-shamwari.css`, `./styles/brand-mzizi.css`, `./tokens.json` and
  `./tailwind-palette`. (#9)
- **`@nyuchi/ui` — a Svelte 5 / SvelteKit component library on the same tokens.** It
  covers Alert, Avatar, Badge, Breadcrumb, Button, Card, Checkbox, Container, Input,
  Label, Select, Separator, Skeleton, SocialIcon, Switch, Tabs, Textarea and Tooltip, with
  `brand-*.css` overlays and a Tailwind preset. (#6)
- **Repository — token gates.** These scripts, and a `Tokens` workflow that runs them,
  are new (#9):
  - `pnpm tokens:check` is offline and runs in every CI job and in `prepack`.
  - `pnpm canon:parity` reaches the network, runs in CI only, and refuses to run outside
    CI.
  - `pnpm canon:fetch` regenerates the snapshot. Every token file is generated from
    `tokens/canon.snapshot.json`, which is cross-checked against `api.mzizi.dev/v1/brand`
    and mzizi-registry's `palette.source.ts`.
- **Repository — this changelog.**

### Changed

- **Both — Breaking (visual): six token values move to canon.** Apps that load a brand
  overlay keep their brand primary, and apps that set these tokens themselves are
  unaffected. (#9)

  | Token                           | Before    | After     |
  | ------------------------------- | --------- | --------- |
  | `--background` (light)          | `#faf9f4` | `#f3f3f1` |
  | `--background` (dark)           | `#100f0e` | `#0e0d0c` |
  | `--card` (dark)                 | `#1a1917` | `#131211` |
  | `--muted` (light)               | `#f4f2ec` | `#e5e4e1` |
  | `--secondary` (light)           | `#f4f2ec` | `#e5e4e1` |
  | `--primary` (unbranded default) | cobalt    | tanzanite |

  The `--primary` change follows canon's doctrine, which reserves cobalt for links and
  info. `--ring` stays cobalt. `--canvas` and `--popover` follow `--background` and
  `--card` as before.

- **Both — heritage tones move to `--color-<name>`** (for example `--color-savanna`). The
  old `--heritage-<name>` names are still declared as aliases and resolve to the same
  values. (#9)
- **`@nyuchi/ui` — `brand-bundu.css` is now copper, not terracotta**, matching canon and
  `@bundu/ui`. (#9)
- **`@nyuchi/ui` — `styles/globals.css` no longer carries its own copy of the palette.**
  It `@import`s the generated `tokens.css` and keeps only its `@layer` component and
  utility rules. (#9)
- **Both — the Tailwind preset's colour map is generated**, and the `@nyuchi/ui` safelist
  is built from the full family list. (#9)
- **Both — `repository`, `homepage` and `bugs`** point at `mukoko-dev/packages-ui`, and
  the README links are absolute so they resolve inside the npm tarball.

### Deprecated

- **Both — `--heritage-<name>` custom properties.** Use `--color-<name>`. The aliases
  still resolve and will be removed in a later minor release, with its own entry here.

### Removed

- **`@nyuchi/ui` — Breaking: the Astro components.** 0.1.2 on npm shipped
  `Breadcrumb.astro`, `SocialIcon.astro` and the `src/index.ts` breadcrumb helpers.
  0.2.0 is the Svelte library, with `Breadcrumb.svelte` and `SocialIcon.svelte` in their
  place. Astro sites should use `@bundu/ui`, which carries the Astro components. (#6)

### Fixed

- **Both — the `tokens.css` header** no longer claims the hex values are "the DB's source
  of truth". No Mzizi token data lives in a database. (#9)

## [@bundu/ui 0.1.1] - 2026-07-03

### Added

- `styles/tokens.css`, a Tailwind-free token file that `globals.css` now `@import`s, so
  plain-CSS sites can use the palette. It is exported as `./styles/tokens.css`.
- The seven heritage tones, as `--heritage-*`.
- `[data-theme="dark"]` support beside `.dark` in the tokens and brand overlays.

### Changed

- `brand-bundu.css` uses copper for `--primary` and `--ring`, not terracotta.

## [@bundu/ui 0.1.0] - 2026-07-03

### Added

- **First release of the marketing UI kit.**
  - Astro components: `Hero`, `Section`, `SectionHeader`, `Container`, `MineralStrip`,
    `Icon`, `SocialIcon` and `Breadcrumb` (with valid `BreadcrumbList` JSON-LD), plus
    `deriveBreadcrumbs`.
  - shadcn-style CVA + `cn()` React primitives.
  - A `globals.css` on the seven mineral tokens, the `brand-bundu`, `brand-nyuchi` and
    `brand-mukoko` overlays, and a Tailwind preset. (#5)

## [@nyuchi/ui 0.1.2] - 2026-05-22

### Changed

- Publish workflow only: a `workflow_dispatch` trigger. No package content changed. This
  is the only 0.1.x version on npm.

## [@nyuchi/ui 0.1.1] - 2026-05-22

### Changed

- Publish workflow only: Node is pinned. No package content changed. Tagged, not
  published to npm.

## [@nyuchi/ui 0.1.0] - 2026-05-22

### Added

- **First version**, extracted from `bundu-labs/marketing` `packages/ui` and renamed from
  `@bundu-labs/ui`. It carries the Astro `Breadcrumb` and `SocialIcon` components and the
  breadcrumb helpers. Tagged, not published to npm. (#1)

[Unreleased]: https://github.com/mukoko-dev/packages-ui/compare/v0.1.2...HEAD
[@bundu/ui 0.1.1]: https://github.com/mukoko-dev/packages-ui/commit/b76dc6f
[@bundu/ui 0.1.0]: https://github.com/mukoko-dev/packages-ui/pull/5
[@nyuchi/ui 0.1.2]: https://github.com/mukoko-dev/packages-ui/releases/tag/v0.1.2
[@nyuchi/ui 0.1.1]: https://github.com/mukoko-dev/packages-ui/releases/tag/v0.1.1
[@nyuchi/ui 0.1.0]: https://github.com/mukoko-dev/packages-ui/releases/tag/v0.1.0
