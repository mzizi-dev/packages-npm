# @bundu/ui

> The marketing UI kit for the Bundu ecosystem — editorial Astro building blocks plus shadcn-style React primitives on the Mzizi tokens (all 21 colour families).

[![npm](https://img.shields.io/npm/v/%40bundu%2Fui?style=flat-square&logo=npm)](https://www.npmjs.com/package/@bundu/ui)
[![Lint](https://img.shields.io/github/actions/workflow/status/mzizi-dev/packages-npm/lint.yml?branch=main&label=lint&style=flat-square)](https://github.com/mzizi-dev/packages-npm/actions/workflows/lint.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Repo:** [mzizi-dev/packages-npm](https://github.com/mzizi-dev/packages-npm) | **Architecture:** [mzizi.dev](https://mzizi.dev)

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
  `brand-mzizi`, and the sub-apps `brand-events` (Mukoko Events), `brand-lingo`,
  `brand-bushtrade`, `brand-campfire`, `brand-news`, `brand-weather`, `brand-kweli` and
  `brand-learning`. `brand-nhimbe` is a deprecated alias that re-exports `brand-events`
  (the nhimbe brand is retired; the events platform is Mukoko Events).
  Each repoints `--primary` and `--ring` and nothing else; the mineral comes from
  canon's ecosystem table.
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
@import "@bundu/ui/styles/globals.css"; /* the @layer rules the Astro components use */
@import "@bundu/ui/styles/color-scheme.css"; /* optional: follow the OS dark setting */
@import "@bundu/ui/styles/brand-nyuchi.css";
@source "../../node_modules/@bundu/ui/src"; /* v4 does not scan node_modules itself */
```

`color-scheme.css` is opt-in. `tokens.css` only turns dark under `.dark` or
`[data-theme="dark"]`, and this file adds the same dark values under
`prefers-color-scheme: dark`, for sites with no theme script. An explicit
`data-theme="light"` still wins. Import it before the brand overlay.

`theme.css` carries the palette, the type scale (`text-display` … `text-caption`), the
reading widths (`max-w-narrow`) and the named spacing, so `globals.css`'s `@apply` rules
and the components' classes resolve with no preset. Tailwind imports `tokens.css` once
even though both files reference it. The Astro components render the React primitives
(for example `Hero`'s buttons), so an Astro site also needs `@astrojs/react`. With no
`client:*` directive they render to static HTML and ship no JavaScript.

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

## Hero

```astro
---
import Hero from "@bundu/ui/Hero.astro";
---

<!-- 0.1.x usage, unchanged: a single text column -->
<Hero
  title="Build in the open"
  subtitle="Bundu Ecosystem"
  description="One line that says what this is."
  primaryCTA={{ text: "Get started", href: "/start" }}
  secondaryCTA={{ text: "Read the docs", href: "https://docs.example.org", external: true }}
/>

<!-- Split: text beside a live demo at lg, stacked (text first) below it -->
<Hero
  layout="split"
  variant="showcase"
  badge="Beta"
  title="A short, bold headline"
  description="One line of subtext."
  primaryCTA={{ text: "Try it", href: "#demo" }}
  mediaLabel="Live demo"
>
  <div slot="media"><!-- your demo, screenshot or widget --></div>
</Hero>
```

| Prop           | Type                                               | Default     | Notes                                                                                |
| -------------- | -------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------ |
| `title`        | `string`                                           | —           | The `h1`.                                                                            |
| `subtitle`     | `string`                                           | —           | Eyebrow above the headline.                                                          |
| `description`  | `string`                                           | —           | One paragraph of subtext.                                                            |
| `primaryCTA`   | `{ text, href, external? }`                        | —           | Pill button.                                                                         |
| `secondaryCTA` | `{ text, href, external? }`                        | —           | Ghost button with an arrow.                                                          |
| `variant`      | `"default" \| "gradient" \| "light" \| "showcase"` | `"default"` | `showcase` washes the brand `--primary` and cobalt over `--background`; tokens only. |
| `align`        | `"start" \| "center"`                              | `"start"`   |                                                                                      |
| `layout`       | `"stack" \| "split"`                               | `"stack"`   | `split` sets text and the `media` slot side by side from `lg`.                       |
| `badge`        | `string`                                           | —           | Status pill above the headline. It is read as a claim, so keep it accurate.          |
| `mediaLabel`   | `string`                                           | —           | Accessible name for the media region (`role="group"`).                               |
| `media` (slot) | markup                                             | —           | Rendered beside (split) or below (stack) the text column.                            |

With no `media` slot, no `badge`, `layout` left at `stack` and a 0.1.x `variant`, `Hero`
renders **byte-identical** markup to 0.1.1. That was checked by building every
combination of the 0.1.x props against the published 0.1.1 tarball.

See [BUILDING.md](https://github.com/mzizi-dev/packages-npm/blob/main/packages/bundu-ui/BUILDING.md) for the full toolchain — the mzizi MCP, the shadcn CLI, the
21 colour families, and the no-raw-hex rule.

## App patterns (0.3.0)

Server-rendered building blocks for signed-in apps and consoles, under
`@bundu/ui/app/*`. They are **pure Astro**: no React (or any framework) under
them and no client JavaScript, as the Mzizi doctrine has it for Astro. Filters
are GET forms, paging is links, menus are `<details>`, and a toast is dismissed
with a label for a hidden checkbox. Every colour is a token, so light and dark
follow `tokens.css` / `color-scheme.css`. The class recipes are shared with the
React primitives through `@bundu/ui/ui/variants`, so both builds look the same.

| Component                                                                   | What it does                                                                                                      |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `AppShell.astro`                                                            | Sticky top bar (`brand`, `account` slots), sidebar navigation from `lg` and a disclosure below, `main#main`       |
| `SideNav.astro`                                                             | Section list with label and summary; `aria-current="page"` on the current item; 48px targets                      |
| `AccountMenu.astro`                                                         | Who is signed in, a slot for account actions (an appearance form, links), and a sign-out POST form                |
| `PageHeader.astro`                                                          | The page's one `<h1>`, description, breadcrumbs, `actions` slot                                                   |
| `DataTable.astro`                                                           | A real `<table>` with caption and scoped headers; one card per row on narrow screens; cells are data, not markup  |
| `FilterBar.astro`                                                           | Search and select filters as a `role="search"` GET form; "Clear" when anything is set                             |
| `Pagination.astro`                                                          | "Showing 26–50 of 112" and previous, numbered and next links; hidden when one page is enough                      |
| `DetailPanel.astro`                                                         | One record as a description list, an optional "Full record" JSON disclosure, an `actions` slot                    |
| `FormLayout.astro`                                                          | A titled form card; fields in two columns when the card is wide (container query); form-level alert               |
| `FormField.astro`                                                           | Visible label, input, hint and error wired with `aria-describedby` and `aria-invalid`                             |
| `StateMessage.astro`                                                        | Empty, error, not-configured, unavailable and loading (skeleton) states with fixed wording                        |
| `Toast.astro`                                                               | The last action's result in a polite live region; stays until dismissed (WCAG 2.2.3)                              |
| `StatTile.astro`                                                            | One headline figure in a `<dl>`: label, value ("Not available", never 0), the trend written in words              |
| `BarChart.astro`                                                            | Columns or rows of bars as HTML, a captioned `<figure>`, and the exact figures in a real table under a disclosure |
| `Button.astro`                                                              | `<a>` with `href`, else `<button>`; `appButtonVariants`, incl. `destructive` and `destructive-outline`            |
| `Badge.astro`                                                               | The Mzizi registry `badge` contract: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`            |
| `Card.astro`, `Alert.astro`, `Input.astro`, `Label.astro`, `Skeleton.astro` | The primitives the patterns are built from, pure Astro                                                            |

`@bundu/ui/lib/table` holds the pure helpers behind `DataTable`, `FilterBar` and
`Pagination`: `parseTableQuery` (URL → query, clamped), `filterRows` (every word,
case- and accent-insensitive, plus exact-match filters), `paginate` and `withParams`.

```astro
---
import AppShell from "@bundu/ui/app/AppShell.astro";
import SideNav from "@bundu/ui/app/SideNav.astro";
import AccountMenu from "@bundu/ui/app/AccountMenu.astro";
import PageHeader from "@bundu/ui/app/PageHeader.astro";
import FilterBar from "@bundu/ui/app/FilterBar.astro";
import DataTable from "@bundu/ui/app/DataTable.astro";
import Pagination from "@bundu/ui/app/Pagination.astro";
import { filterRows, paginate, parseTableQuery, withParams } from "@bundu/ui/lib/table";

const query = parseTableQuery(Astro.url.searchParams, ["role"]);
const rows = filterRows(people, query, (p) => [p.name], (p, f) => (f === "role" ? p.role : null));
const page = paginate(rows, query.page, query.perPage);
---

<AppShell>
  <a slot="brand" href="/">Your app</a>
  <AccountMenu slot="account" name="Tendai Moyo" email="tendai@example.com" signOutAction="/auth/logout" />
  <SideNav slot="nav" items={[{ href: "/people", label: "People", summary: "Everyone in your family" }]} />

  <PageHeader title="People" description="Everyone in your family." />
  <FilterBar searchLabel="Search people" q={query.q} values={query.filters} clearHref={withParams(Astro.url, { q: null, role: null, page: null })} />
  <DataTable
    caption={`People, ${page.total} in all`}
    columns={[{ key: "name", label: "Name" }, { key: "role", label: "Role" }]}
    rows={page.rows.map((p) => ({ name: { text: p.name, href: `/people/${p.id}` }, role: { text: p.role, badge: "outline" } }))}
  />
  <Pagination url={Astro.url} {...page} noun="people" />
</AppShell>
```

They need only Astro and the Tailwind v4 setup above, including the `@source`
line so the classes inside the package are generated. `BarChart` sizes its bars
with inline `style` attributes, so a Content-Security-Policy needs
`style-src 'unsafe-inline'` (or the hashes) on pages that use it.

`DataTable` badges (`{ text, badge }`) take the registry badge variants. Before
0.3.0 the console's copy used the mineral variants of the React `Badge`;
`primary` there is `default` here.

### The product-dashboard shell (0.4.0)

0.4.0 makes the app patterns a full-width product dashboard, dense like a
console rather than roomy like a marketing page.

| Component                                    | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AppShell.astro`                             | The whole viewport: a fixed 16.25rem sidebar (`workspace`, `search`, `nav` slots, a collapse toggle at the bottom) and a main column filling the rest (a thin top bar with `brand`, `actions`, `account`; the page; `footerLinks` / `footer`). No centred page container. Collapses to a 3.5rem icon rail (a real checkbox; `collapsed` and `persist` keep it across pages). Below 64rem the sidebar is an off-canvas drawer: the same element as a Popover API popover, so Escape and a click outside close it. `overlay` slot for a `CommandPalette` |
| `SideNav.astro`                              | `groups` under quiet labels (or 0.3's flat `items`), an icon per item, `badge` ("New"), nested items under a chevron disclosure (open when a child is current), the current item filled with a gold indicator. **Label only**: an item's `description` is a tooltip on hover and keyboard focus and its `aria-describedby`; in the collapsed rail the tooltip shows the label too                                                                                                                                                                      |
| `WorkspaceSwitcher.astro`                    | The product mark (`mark` slot) over the current workspace; a `<details>` list of workspaces and links, or a plain link home when there is nothing to switch to                                                                                                                                                                                                                                                                                                                                                                                         |
| `QuickSearch.astro` + `CommandPalette.astro` | The sidebar's search button with its ⌘K hint opens the palette (`popovertarget`): every nav item, grouped, as links, and with `action` a GET search form for the server                                                                                                                                                                                                                                                                                                                                                                                |
| `TopBarAction.astro`                         | An icon-and-label link or button for the top bar ("Ask AI", "Support"); icon only below `sm` with the label as its name                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `Toolbar.astro` + `ToolbarMenu.astro`        | A full-width GET search box joined to a button group; `ToolbarMenu` is a `<details>` list of links (a date range)                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `StatTiles.astro`                            | One bordered row of equal `StatTile`s with hairline dividers; `StatTile` gains `info`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `InfoTip.astro`                              | A focusable info icon whose tooltip is its accessible description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `EmptyState.astro`                           | A bordered card: a heading, help text and actions; `StateMessage kind="empty"` uses it                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `BrandMark.astro`                            | The official Nyuchi mark (the bee, the Mzizi registry's light/dark icon pair, scaled, never redrawn), with the lowercase serif wordmark and a muted suffix when asked; the right variant per theme by CSS                                                                                                                                                                                                                                                                                                                                              |

`@bundu/ui/app/nav` (also from the root) holds the pure helpers: `groupNav` turns
flat one-line registrations (`group`, `parent`) into ordered, nested groups;
`currentHref` picks the longest matching href; `searchNav` / `matchesQuery`
match every word, case- and accent-insensitively.

**Density.** `Button`, `Input`, `FilterBar`, `DataTable`, `Pagination`,
`DetailPanel`, `FormLayout`, `PageHeader` and `StatTile` take the app density
(`appButtonVariants`, `appInputClasses` in `@bundu/ui/ui/variants`): 36px
controls, 14px text and ~40px table rows with a fine pointer; 44–48px targets
and 16px inputs on touch (`pointer-coarse:`). Headings inside `AppShell` use the
body sans. The marketing primitives are unchanged.

**Script.** Two components carry one small module each, and both work without
it: `AppShell` (it writes the collapse choice to the `persist` cookie and lets
Escape hide a tooltip) and `CommandPalette` (the ⌘K / Ctrl+K shortcut, live
filtering with the count announced, Enter and the arrow keys). A keyboard
shortcut and live filtering cannot be done in CSS. Astro bundles them as files,
so a `script-src 'self'` CSP works if the app does not inline small scripts
(set `vite.build.assetsInlineLimit: 0`).

```astro
---
import AppShell from "@bundu/ui/app/AppShell.astro";
import BrandMark from "@bundu/ui/app/BrandMark.astro";
import CommandPalette from "@bundu/ui/app/CommandPalette.astro";
import QuickSearch from "@bundu/ui/app/QuickSearch.astro";
import SideNav from "@bundu/ui/app/SideNav.astro";
import TopBarAction from "@bundu/ui/app/TopBarAction.astro";
import WorkspaceSwitcher from "@bundu/ui/app/WorkspaceSwitcher.astro";
import { groupNav } from "@bundu/ui/app/nav";

const groups = groupNav(
  [
    { href: "/", label: "Home", icon: "home" },
    { href: "/people", label: "People", icon: "users", group: "Identity & people", description: "Everyone in your organisation" },
    { href: "/keys", label: "API keys", group: "Developer", parent: "/dev" },
    { href: "/dev", label: "Developer", icon: "terminal", group: "Developer" },
  ],
  ["Identity & people", "Developer"],
);
---

<AppShell collapsed={Astro.cookies.get("sidebar")?.value === "collapsed"} persist="sidebar" footerLinks={[{ label: "Status", href: "https://status.example" }]}>
  <WorkspaceSwitcher slot="workspace" name="Nyuchi Africa" href="/"><BrandMark slot="mark" wordmark suffix="console" /></WorkspaceSwitcher>
  <QuickSearch slot="search" target="palette" />
  <SideNav slot="nav" groups={groups} />
  <TopBarAction slot="actions" label="Support" icon="help" href="/support" />
  <slot />
  <CommandPalette slot="overlay" id="palette" groups={groups} action="/search" />
</AppShell>
```

## Component contracts

Every app component carries a contract, as everything built in Mzizi does. The
contracts are authored in the Mzizi registry
([`mzizi-dev/mzizi-registry`, `contracts/`](https://github.com/mzizi-dev/mzizi-registry/tree/main/contracts))
and shipped here, one JSON file per component:

```js
import contract from "@bundu/ui/contracts/app/side-nav.contract.json" with { type: "json" };
```

Each states the component's props and slots with types, its behaviour and named
states, accessibility (roles, keyboard, focus, ARIA), density for a fine and a
coarse pointer, theming (brand overlay tokens only; layout never varies by
brand), the no-JavaScript fallback and the responsive rules, plus a
`contract … end` block in the Mzizi language's clause grammar. The schema is
`@bundu/ui/contracts/schema/component-contract.schema.json`.

`src/app/contracts.test.ts` renders every component in every named state and
evaluates its contract: the clauses, the selector checks, the density table and
the brand-overlay rule. A clause the runner cannot evaluate fails. Together the
contracts are the **Mzizi Dashboard Standard** (docs.mzizi.dev).

Do not edit `contracts/` here. Change the registry, then
`pnpm contracts:fetch` (or `pnpm contracts:check [ref]` to compare).

## Licence

[MIT](https://github.com/mzizi-dev/packages-npm/blob/main/LICENSE) © Nyuchi Africa (Pvt) Ltd.
