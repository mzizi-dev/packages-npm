# @nyuchi/ui

Shared UI primitives for the Nyuchi Design System — Nyuchi's implementation of
the Mzizi architecture. Consumed by the Nyuchi marketing and documentation
sites.

## Install

```sh
pnpm add @nyuchi/ui
```

## Exports

- `deriveBreadcrumbs`, `BreadcrumbItem`, `BreadcrumbLabelMap` — breadcrumb
  helpers (`@nyuchi/ui`).
- `Breadcrumb.astro` — visual breadcrumb nav plus `BreadcrumbList` JSON-LD
  (`@nyuchi/ui/Breadcrumb.astro`).
- `SocialIcon.astro` — platform-aware social link with auto-detected glyph
  (`@nyuchi/ui/SocialIcon.astro`).

The Astro components consume design-system utility classes (e.g.
`text-muted-foreground`); they expect the host app to provide the matching
Tailwind theme tokens.

## License

[MIT](../../LICENSE) © Nyuchi Africa (Pvt) Ltd
