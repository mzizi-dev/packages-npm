# Building @nyuchi/ui

This package is the **SvelteKit app-UI layer** of the Nyuchi Design System —
Nyuchi's implementation of the [Mzizi](https://mzizi.dev) architecture.
SvelteKit is the framework Nyuchi apps are built on; this library ships the
Svelte 5 components those apps compose with.

## Toolchain

- **Svelte 5** (runes: `$props`, `$state`, `$derived`, `$bindable`, `$effect`).
- **`@sveltejs/package`** (`svelte-package`) compiles `src/lib/` → `dist/`
  (component `.svelte` + `.d.ts` + JS), which is what gets published.
- **`svelte-check`** for type + a11y checking.
- **pnpm** workspace (repo root lockfile), Node ≥ 20.

```sh
pnpm install                          # from repo root
pnpm --filter @nyuchi/ui build        # svelte-package -> dist/
pnpm --filter @nyuchi/ui check        # svelte-check (0 errors, 0 warnings)
```

`prepack` re-runs `svelte-package`, so `pnpm publish` always ships a fresh
`dist/`. `files` publishes `dist`, `styles`, and `tailwind-preset.mjs`.

## Design rules

- **Seven African minerals.** cobalt, tanzanite, malachite, gold, terracotta,
  sodalite, copper — light + dark — plus the semantic tokens. All defined as
  CSS custom properties in `styles/globals.css`. The canonical primary is
  **cobalt**; brand overlays (`brand-bundu` → terracotta, `brand-nyuchi` →
  gold, `brand-mukoko` → tanzanite) remap `--primary` / `--ring`.
- **No raw hex in components.** `src/lib/**` uses semantic-token utility
  classes only (`bg-primary`, `text-muted-foreground`, `bg-cobalt-container`,
  …). Hex literals live solely in the token CSS and preset. Enforce with:
  ```sh
  grep -rnE '#[0-9a-fA-F]{3,8}\b' src/   # must return nothing
  ```
- **Accessibility.** ARIA roles + keyboard support on interactive components;
  a ≥48px minimum touch target (`min-h-12`); pill-shaped buttons
  (`rounded-full`).
- **Dependency-light.** No Radix / component-library runtime deps — Svelte 5
  handles switch / tabs / tooltip natively. The only peer dep is `svelte`.

## The Mzizi MCP

The canonical design registry (tokens, components, brand, N1–N10 architecture,
Ubuntu doctrine) is reachable over the Model Context Protocol:

- `https://mzizi.dev/mcp` — portal reference implementation
- `https://mcp.mzizi.dev/mcp` — standalone Cloudflare Worker mirror

Use it to confirm token values and component contracts before adding or
changing a component here.

## Adding a component

1. Add `src/lib/<Name>.svelte` (Svelte 5 runes, semantic-token classes only).
2. Re-export it from `src/lib/index.ts`.
3. `pnpm --filter @nyuchi/ui check` and `... build` — both clean.
4. Confirm no raw hex crept in (grep above).
