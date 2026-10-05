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

From 2026-10-04 each package follows the org versioning policy
([nyuchi/.github#80](https://github.com/nyuchi/.github/issues/80)): a release is the next
minor above that package's highest version on npm, and a major is only released by hand.
Versions published before then are not renumbered.

## [Unreleased]

### Changed (repository): `@bundu/ui` and `@bundu/server` are built from the Mzizi registry

Owner decision, 2026-10-04: `mzizi-dev/mzizi-registry` is the single source of every component in every format. The 54 Astro components and their modules moved there (mzizi-dev/mzizi-registry#430), beside each component's `.tsx` and `.rs`, and this repo now builds them from it.

- **`pnpm registry:sync`** (`scripts/sync-registry.mjs`) writes, from the registry at the commit pinned in `scripts/registry-ref.json`:
  - every `@bundu/ui` `.astro` component and the modules they use (`lib/utils`, `ui/variants`, `app/nav`, `icons`, `breadcrumbs`, `safe-area`, `discover/open`);
  - every `@bundu/server` helper (the registry's `n4-safety/server-*.ts`, the TypeScript mirror of `mzizi-roots-server`);
  - the brand-mark PNGs;
  - the contract runner.

  `scripts/registry-map.json` names the package file each registry item becomes. `scripts/registry-imports.mjs` rewrites the registry's flat imports into the published layout, and its test checks every mapped file survives the round trip.

- **`pnpm registry:check`**, run by the new `Registry` workflow on every PR and push, fails if any of those files differs from the registry, or if a package holds an `.astro` that the registry does not. The same workflow checks `contracts/` at the same pin. Never edit these files here: fix the registry, then bump the pin.
- **Package APIs are unchanged.** Every export keeps its path and its props.
- **`@nyuchi/ui` is not built from the registry.** It is Svelte, and the registry has no Svelte format.

### Added

- **`@bundu/ui`: the Discover detail pattern** (mzizi-dev/mzizi-registry#429): `@bundu/ui/discover/DetailHero.astro`, `DiscoverBreadcrumb.astro`, `MetaList.astro`, `DetailActions.astro` and `RelatedRail.astro`, each with its registry contract.
- **`@bundu/ui/discover/open`** (`openInMukokoUrl`) builds the canonical Open in Mukoko link, `https://mukoko.com/open/<service>/<id>`. `OpenInApp` (contract 1.1.0) gains `service` and `id`, and `href` stays as an override.
- **`@bundu/ui`: contracts for every component.** The `site/` family covers Hero, Section, SectionHeader, Container, Breadcrumb, Icon, SocialIcon and MineralStrip. The `ui/` family covers NativeSelect, SegmentedControl, Toaster and SafeAreaFrame. `src/app/contracts.test.ts` runs all 59.
- **`@bundu/ui`: `Hero` no longer renders `@bundu/ui/ui/button` (React) under Astro.** It uses an internal pure-Astro `CtaButton` that renders the same markup from the same `buttonVariants`.
- **`SafeAreaFrame` draws SVG geometry** instead of inline `style` attributes, so pages can keep `style-src 'self'`.
- **`Breadcrumb` and `SocialIcon` gain a root `data-slot`.**

- **`@bundu/ui`: `SegmentedControl`, `NativeSelect`, `Toaster` and
  `SafeAreaFrame`** (`@bundu/ui/<Name>.astro`), first used by nyuchi-tools
  (`nyuchi/workspace-tools`). `SegmentedControl` is native radios, so it needs
  no script; `NativeSelect` is a real `<select>` in the pill input style;
  `Toaster` is `window.toast(message, kind?)` in a polite live region, for
  client-side feedback (server-rendered flash messages stay with
  `@bundu/ui/app/Toast.astro`); `SafeAreaFrame` draws a canvas shape with its
  platform-covered bands, and its geometry, `safeAreaBands`, is exported from the
  root and `@bundu/ui/safe-area` with the same numbers as the registry's
  `safe-area-frame` in React and Rust (mzizi-dev/mzizi-registry#398). `Icon`
  gains `image`, `layers`, `mail`, `grid`, `download`, `upload`, `copy`, `sun`,
  `moon`, `sparkle`, `shield` and `history`. `src/components.test.ts` renders
  each through Astro's container API. None of the four has a registry contract
  yet, so they are not under `@bundu/ui/app/*`.

### Added (repository): the README links the published Mzizi design system

The README links the Design System artifact
(<https://claude.ai/artifact/G8CCtAbZ8w717uQ3R5itCc>), the Mzizi design system published on
claude.ai, and names its source of truth: the `design-system/` folder in
`mzizi-dev/mzizi-registry`, arriving with mzizi-registry#418. No package changes.

### Changed (repository): releases publish with npm trusted publishing (OIDC), not `NPM_TOKEN`

npm refused the `NPM_TOKEN` secret (401), so nothing published. The Release workflow
now publishes by [npm trusted publishing](https://docs.npmjs.com/trusted-publishers):
the job's GitHub OIDC token (`id-token: write`) is exchanged for a short-lived token for
each package, and no npm token is read. The workflow installs npm 11.21.0 (pinned;
trusted publishing needs npm >= 11.5.1) and prints `npm --version`;
`scripts/release-publish.mjs` packs each package with `pnpm pack` (which still rewrites
`workspace:` ranges and runs `prepack`) and publishes the tarball with
`npm publish <tarball> --access public`, with provenance. The already-published skip,
the versioning policy check, the tags and releases (`RELEASE_BUMP_TOKEN`) and the
"Not published" failure are unchanged. Each package needs a one-time trusted publisher
setup on npmjs.com before it can publish this way; the README's "Publishing" section has
the steps. No package changes.

### Changed (repository): releases follow the org versioning policy

The Release workflow checks each unpublished version against the org's shared calculator
(nyuchi/.github `next-version.mjs`, at a pinned commit) before publishing it. A version
that is not the next minor above that package's highest version on npm is refused, with the
version it should be, and the other packages still publish. A major needs a manual run with
`bump: major`.

### Changed (repository)

- **`pnpm contracts:fetch` reads every contract family** (`FAMILIES` in
  `scripts/contract-paths.mjs`: `app`, `discover`), and the path guard accepts
  only those directories.
- **The canon snapshot carries `events` (Mukoko Events).** `api.mzizi.dev` now
  serves canon's `events` row (mzizi-dev/mzizi-registry#411, through
  mzizi-dev/mzizi-api-gateway#39), so the `LOCAL_BRAND_MINERALS` bridge for it is
  gone. `brand-events.css` names its canon row, and the `--brand-accent` usage
  note in `tokens.css` and `color-scheme.css` says "Mukoko Events" where it said
  "nhimbe". No value changes.
- **The canon parity gates compare values, not text.** `pnpm canon:parity` and
  `canon:fetch --check` parse both snapshots before comparing. The org
  formatter puts a short array such as `"aliases": ["nhimbe"]` on one line,
  which changed the text but not the value, and the text comparison failed on
  that whitespace.
- **The release workflow pins every action to a commit SHA** (the version in a
  trailing comment), keeps no credential in the checkout, and gives
  `NPM_TOKEN` and `RELEASE_BUMP_TOKEN` only to the step that uses each one.
- **The release workflow publishes each package on its own.** One package npm
  refuses no longer stops the others: the rest publish, get tagged and released,
  and the job fails at the end naming what did not publish. A package whose
  workspace dependency is not on npm is held back, not published uninstallable.

## [@bundu/ui 0.3.0, @nyuchi/ui 0.3.0, @bundu/server 0.1.0] - 2026-10-04

The first release from the release workflow, which publishes and tags on merge to
`main` with no hand-pushed tag (mzizi-dev/packages-npm#25). Owner decision, 2026-10-04:
versions that were bumped here but never published are reset to the org versioning
policy, so each package's next release is one minor above what npm has. npm has
`@bundu/ui` 0.2.0 and `@nyuchi/ui` 0.2.0, so both are 0.3.0; `@bundu/server` is new,
at 0.1.0.

**This one entry carries all of the unreleased entries before it.** The changes this
file recorded under `@bundu/ui` 0.3.0, 0.4.0, 0.4.1 and 0.5.0, `@nyuchi/ui` 0.3.0 and
0.4.0, and the Discover Standard (Unreleased) are all here. None of those versions
reached npm, and 0.4.0, 0.4.1 and 0.5.0 are not used. Breaking changes are marked
**Breaking**.

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

- **`brand-kweli.css` (malachite) and `brand-learning.css` (gold), in both
  packages**, so Kweli and Nyuchi Learning dashboards can adopt the Mzizi
  Dashboard Standard (mzizi-dev/mzizi-registry#404). Owner decisions,
  2026-10-04: Kweli is malachite (it used to borrow Mukoko's tanzanite), and
  Nyuchi Learning / education is gold, because every Nyuchi brand is gold.
  Canon's ecosystem table now carries `kweli`, `learning`, `news` and
  `weather` rows (mzizi-dev/mzizi-registry#409); until the snapshot picks them
  up through `/v1/brand`, `LOCAL_BRAND_MINERALS` gives the same answers, and
  the news and weather overlays now cite canon instead of the mini-app accent
  table. A canon row that disagrees still fails the generator. New
  `scripts/brand-overlays.test.mjs` checks, in both packages, that every
  decided brand ships on its decided family, that every overlay repoints
  `--primary` and `--ring` only, and that every overlay is exported.
- **Brand overlays for six sub-apps, in both packages:** `brand-nhimbe.css`
  (malachite), `brand-lingo.css` (cobalt), `brand-bushtrade.css` (gold),
  `brand-campfire.css` (malachite), `brand-news.css` (cobalt) and
  `brand-weather.css` (cobalt), so their dashboards can adopt the Mzizi
  Dashboard Standard (mzizi-dev/mzizi-registry#404). Generated like the others:
  the first four from canon's ecosystem table; news and weather have no canon
  row yet, so their mineral comes from the registry's own mini-app accent table
  (`lib/tokens/index.ts` `brandOverrides`) until canon carries one, and a canon
  row that disagrees fails the generator. Each repoints `--primary` and
  `--ring` only.
- **`@bundu/ui` — a contract for every app component.** The 31 components under
  `@bundu/ui/app/*` each have a Mzizi component contract, authored in
  mzizi-dev/mzizi-registry (`contracts/`, mzizi-dev/mzizi-registry#404) and
  shipped in `contracts/` (exports `@bundu/ui/contracts/index.json`,
  `…/contracts/app/*` and the schema). New `src/app/contracts.test.ts` renders
  every component in every named state and evaluates its clauses, selector
  checks, fine and coarse pointer heights, the brand-overlay rule (no colour
  values; minerals only as declared status colours), the no-JS rule, and that
  its props and slots are the contract's. An unevaluable clause fails.
  `pnpm contracts:fetch` / `contracts:check` sync the copy from the registry.
  Together the contracts are the Mzizi Dashboard Standard.

- **`@bundu/ui` — Button `destructive` and `destructive-outline` variants**
  in both `buttonVariants` (`ui/button`) and `appButtonVariants`
  (`app/Button.astro`). They use only the `destructive` /
  `destructive-foreground` tokens, so brand overlays never change them. Use
  `destructive` for the one irreversible action on a page and
  `destructive-outline` for secondary ones (revoke, remove). The Button
  contract delta is on mzizi-dev/mzizi-registry#404. This replaces the
  console's local `TODO(mzizi)` destructive buttons
  (nyuchi/nyuchi-platform#330).
- **`@bundu/ui` — the app patterns become a full-width product dashboard.**
  New under `@bundu/ui/app/*`: `WorkspaceSwitcher`,
  `QuickSearch` and `CommandPalette` (⌘K), `TopBarAction`, `Toolbar` and
  `ToolbarMenu`, `StatTiles`, `InfoTip`, `EmptyState`, and `BrandMark` with the
  official Nyuchi mark (the Mzizi registry's bee icon pair, scaled to 128px, in
  `assets/brand/`). `@bundu/ui/app/nav` (and the root) gains `groupNav`,
  `currentHref`, `flattenNav`, `searchNav` and `matchesQuery`. `Icon` gains 36
  app glyphs. `ui/variants` gains `appButtonVariants` and `appInputClasses`.
  Built for the Nyuchi console (nyuchi/nyuchi-platform#330).

- **`styles/brand-events.css`** (Mukoko Events; owner decisions, 2026-10-04,
  [mukoko-dev/nhimbe#155](https://github.com/mukoko-dev/nhimbe/issues/155): the nhimbe
  brand is retired, the events platform is Mukoko Events at events.mukoko.com, and its
  mineral stays malachite): the Mukoko Events overlay (malachite), exported
  in both packages. Canon's row is `events` (mzizi-dev/mzizi-registry#411). Until
  the snapshot carries it, the mineral is bridged in `LOCAL_BRAND_MINERALS`.

#### The Mzizi Discover Standard (`@bundu/ui`)

Owner decision, 2026-10-04: the discover pages of news, events, circles and
weather must be identical, so they move into the Mukoko super-app on the web
unchanged (mzizi-dev/mzizi-registry#413).

- **Eleven pure Astro components, `@bundu/ui/discover/*`**: `DiscoverShell`,
  `DiscoverMeta`, `DiscoverHero`, `DiscoverSearch`, `CategoryChips`,
  `CategoryChip`, `DiscoverSection`, `ResultGrid`, `DiscoverCard` (variants
  `article`, `event`, `circle`, `place`), `LoadMore` and `OpenInApp`. No client
  JavaScript, no inline styles, and each works in a server-filled shell
  (`{{placeholders}}`).
- **Contracts**: `contracts/discover/` (11), fetched from the registry, rendered
  in every state by `src/app/contracts.test.ts`; `src/discover/discover.test.ts`
  renders a whole Discover page and the server-filled mode.

### Changed

- **Repository tooling: Vite+ 1.0.** `vite-plus` joins the root dev dependencies
  (`prettier` stays, for the token generator only), and `vp check` (format plus
  type-aware lint) is the repo's check. Source files in both packages were re-wrapped
  by the formatter, and `@nyuchi/ui`'s `Breadcrumb` writes its JSON-LD closing tag as
  `<\/script>` (the same string at runtime) so the linter can parse the component.
  No API change.
- **Removed `.github/workflows/lint.yml`.** The `mzizi-dev` org ruleset now runs the shared lint on every pull request through `mzizi-dev/.github`'s `org-lint.yml`, publishing the same five `lint / …` checks, so the repo's own caller only ran lint a second time.

- **Breaking — `AppShell` is full width.** A fixed sidebar (16.25rem) and a main
  column filling the rest, with no `max-w-[96rem]` centred container; the nav
  is rendered once (the sidebar is a popover drawer below 64rem) instead of
  twice; new slots `workspace`, `search`, `actions`, `overlay`; new props
  `collapsed`, `persist`, `footerLinks`, `sidebarLabel`, `id`. The sidebar
  collapses to an icon rail.
- **Breaking — `SideNav` shows the label only.** An item's `description` (or
  the earlier `summary`) is a tooltip and the link's `aria-describedby`, no longer
  printed under the label. Takes `groups` with icons, badges and nested items;
  flat `items` still work.
- **App density.** `Button` (36px; 48px on touch), `Input`, `FilterBar`,
  `DataTable` (~40px rows, 14px text), `Pagination`, `DetailPanel`,
  `FormLayout`, `PageHeader` (a 20px title and a `docsHref` pill, no rule),
  `StatTile` (`info` tooltip) and `AccountMenu` are compact with a fine pointer
  and keep 44–48px targets on touch. `StateMessage kind="empty"` is an
  `EmptyState` card. Headings inside `AppShell` use the body sans.
- `AppShell` and `CommandPalette` each carry one small enhancement script (the
  collapse cookie and Escape for tooltips; the ⌘K shortcut and live filtering);
  everything works without them. The app components stay framework-free.

- **Brand fills from canon.** The generator now emits `--color-<mineral>-brand`
  (the mineral's brand `hex` from canon, the same in both themes) and
  `--color-<mineral>-on-brand` (whichever of the mineral's own container pair
  has the higher WCAG contrast on it) in `tokens.css`, `theme.css`,
  `color-scheme.css` and `tokens.json`, for both packages. Light-mode
  `--color-gold` stays the deep `lightHex` for text on light surfaces.
- **`AppShell` `accent`.** A mineral whose brand fill colours primary actions
  and the current item's indicator inside the shell (`"gold"` for Nyuchi:
  #FFD740 with #3E2723 text, about 11:1). Text links and the focus ring keep
  the contrast-safe primary and ring.
- **`StatTile` trend.** The badge is short and never wraps ("+12.5%",
  "−3 pts", "No change"), with "vs …" after it as quiet text; screen readers
  still hear the full sentence once.
- **`BrandMark`.** 28px by default, and the official mark in its deeper,
  higher-contrast colourway with a tighter frame (the bundu-ecosystem-icons
  pair), still scaled to 128px and never redrawn.

- **`@nyuchi/ui` is 0.3.0.** 0.2.0 is on npm, so the eight
  brand overlays added since (`brand-nhimbe`, `brand-lingo`, `brand-bushtrade`,
  `brand-campfire`, `brand-news`, `brand-weather`, `brand-kweli`,
  `brand-learning`) need a new version to ship. Additive only: new exports.

- **No inline `style` attributes anywhere**, so a page's CSP needs no
  `style-src-attr 'unsafe-inline'`. `MineralStrip` colours its segments from
  its stylesheet (`data-mineral`); `AppShell accent` is `data-accent` plus the
  shell's stylesheet; `BarChart` draws bars as SVG geometry. The contract
  runner now fails any rendered `style` attribute.
- **`app/FilterBar`**: `search={false}` leaves the search field out (selects
  only); `searchLabel` and `q` are optional; a select whose value is `""` is no
  longer an active filter, so it no longer shows "Clear".
- **Contracts**: `app/filter-bar` 1.1.0, `app/app-shell` 1.1.0, `app/bar-chart`
  1.0.1.
- **`.link` in `globals.css`**: inline text links, underlined at rest (WCAG
  1.4.1). Upstreamed from circles.mukoko.com, which defined it locally.

### Changed (repository)

- **Releases are automatic.** `.github/workflows/release.yml` replaces `publish.yml`.
  On every push to `main` it runs the token check and the tests, publishes each
  package whose `package.json` version is not on npm yet (with npm provenance), then
  tags it `<name>@<version>` (for example `@bundu/ui@0.3.0`) and creates a GitHub
  release from that version's section here, using `RELEASE_BUMP_TOKEN`. Bumping a
  package's version in a PR is the release; a merge that bumps nothing publishes
  nothing. The old `v*` tags stay as history; new tags are per package.

### Changed (canon snapshot)

- **The canon snapshot carries `kweli`, `learning`, `news` and `weather`.**
  `pnpm canon:fetch` after api.mzizi.dev's registry pin moved to
  mzizi-registry `50fc537` (mzizi-dev/mzizi-registry#409; mzizi-api-gateway#38):
  `tokens/canon.snapshot.json` gains the four `ecosystem` rows. The generator's
  `LOCAL_BRAND_MINERALS` bridge entries for them, and the stale `mzizi` one
  (canon has carried that row since the hematite decision), are removed, so
  every overlay's mineral now comes from canon. The four overlays, in both
  packages, are unchanged apart from their header comment, which now cites
  canon. No colour changes.

### Deprecated

- **`styles/brand-nhimbe.css`** is now a generated re-export of `brand-events.css`
  (`@import "./brand-events.css";`), so existing imports keep working. Import
  `brand-events.css` in new code. `DEPRECATED_OVERLAY_ALIASES` in
  `scripts/generate-tokens.mjs` generates it, and a test keeps it a pure
  re-export.

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
