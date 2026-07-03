# @nyuchi/ui

Svelte 5 / SvelteKit component library for the **Nyuchi Design System** —
accessible primitives built on the seven African-mineral tokens. Nyuchi's
implementation of the [Mzizi](https://mzizi.dev) architecture. This is the
**app-UI layer** for Nyuchi apps, which are built on SvelteKit.

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
import "@nyuchi/ui/styles/globals.css";       // 7 minerals + semantic tokens
import "@nyuchi/ui/styles/brand-nyuchi.css";  // gold primary (or brand-bundu / brand-mukoko)
```

`globals.css` ships the seven minerals (light + dark), the semantic tokens,
and `@layer` component/utility classes. The canonical `--primary` / `--ring`
mineral is **cobalt**; a brand overlay remaps them:

| Overlay             | Primary mineral |
| ------------------- | --------------- |
| `brand-bundu.css`   | terracotta      |
| `brand-nyuchi.css`  | gold            |
| `brand-mukoko.css`  | tanzanite       |

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

See [BUILDING.md](./BUILDING.md).

## License

[MIT](../../LICENSE) © Nyuchi Africa (Pvt) Ltd
