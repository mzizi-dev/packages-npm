# @bundu/ui

The **marketing UI kit** for the Bundu Ecosystem — Nyuchi's implementation of the
[Mzizi](https://mzizi.dev) design system. It's the shared component layer behind the
marketing sites (bundu, nyuchi, mukoko): editorial Astro building blocks plus a set of
shadcn-style React primitives, all mapped onto the **seven African minerals** and the
semantic token system.

- **Astro marketing components** — `Hero`, `Section`, `SectionHeader`, `Container`,
  `MineralStrip`, `Icon`, `SocialIcon`, and `Breadcrumb` (emits valid schema.org
  `BreadcrumbList` JSON-LD for Google rich results).
- **shadcn CVA + `cn()` React primitives** — `Button`, `Card`, `Badge`, `Input`,
  `Textarea`, `Select`, `Label`, `Alert`, `Avatar`, `Separator`, `Skeleton`, `Switch`,
  `Checkbox`, `Tabs`, `Tooltip`.
- **Option-A styling** — one canonical `styles/globals.css` (all seven minerals, light +
  dark, semantic tokens, component/utility classes) plus tiny `brand-*.css` overlays that
  swap the brand primary, and a `tailwind-preset.mjs` that exposes the utility classes.

Every value flows through CSS custom properties / Tailwind tokens — **never a raw hex in
source**. All seven minerals are valid tokens: `cobalt`, `tanzanite`, `malachite`, `gold`,
`terracotta`, `sodalite`, `copper`.

## Install

```sh
pnpm add @bundu/ui
# peer deps (for the React primitives)
pnpm add react react-dom
```

## Quick usage

**1. Styles** — import the canonical tokens, then the brand overlay for your site, into
your global stylesheet (after `@import "tailwindcss";`):

```css
@import "tailwindcss";
@import "@bundu/ui/styles/globals.css";
@import "@bundu/ui/styles/brand-nyuchi.css"; /* or brand-bundu / brand-mukoko */
```

**2. Tailwind** — add the preset so the mineral + semantic utility classes exist:

```js
// tailwind.config.mjs
import preset from "@bundu/ui/tailwind-preset";

export default {
  presets: [preset],
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
};
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

See [BUILDING.md](./BUILDING.md) for the full toolchain — the mzizi MCP, the shadcn CLI, the
seven minerals, and the no-raw-hex rule.

## License

[MIT](../../LICENSE) © Nyuchi Africa (Pvt) Ltd
