# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. It is the repository's one agent guide: [`AGENTS.md`](./AGENTS.md) points every other agent here, and carries only the org's agent rules (the dev skills, progress reports and the merge gate), which apply to Claude Code too.

## What this is

A pnpm workspace (`packages/*`) that publishes Nyuchi's implementation of the Mzizi design system to npm:

- `packages/ui` → `@nyuchi/ui` (Svelte 5 / SvelteKit app UI, built with `svelte-package`)
- `packages/bundu-ui` → `@bundu/ui` (Astro components + React primitives for marketing sites and consoles; ships source, no build step)
- `packages/bundu-server` → `@bundu/server` (framework-free server helpers on Web APIs; built with `tsc`). `@bundu/ui` depends on it via `workspace:^`.

Tooling is Vite+ (`vp`, from `vite-plus`); its fmt/lint/test settings live in the root `vite.config.ts` and must stay identical to the org's `nyuchi/.github/.oxfmtrc.json`.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm build            # pnpm -r build: @bundu/server (tsc) and @nyuchi/ui (svelte-package)
pnpm lint             # vp lint (oxlint, type-aware but typeCheck: false on purpose)
pnpm check            # vp check (format + lint)
pnpm fmt              # vp fmt (write formatting)
pnpm test             # root vp test (scripts/*.test.mjs) + each package's `test` script
pnpm --filter @nyuchi/ui check   # svelte-check, the type check for @nyuchi/ui
```

Single test:

```sh
pnpm --filter @bundu/server test -- src/seal.test.ts
pnpm --filter @bundu/ui test -- src/app/contracts.test.ts
pnpm vp test scripts/release-tags.test.mjs     # root-level script tests
```

Run `@bundu/ui` tests through the package, never with a bare root `vp test`: its `vitest.config.ts` uses Astro's `getViteConfig` to compile `.astro` files, and the root config excludes `packages/bundu-ui/**` and `packages/bundu-server/**`. `@bundu/ui` tests alias `@bundu/server/table` to source, so no build is needed first.

Generation and drift gates (all are CI jobs; run the `--check` forms before pushing):

```sh
pnpm tokens:build / pnpm tokens:check       # offline: token artifacts from tokens/canon.snapshot.json
pnpm canon:fetch                            # network: refresh the snapshot from canon
pnpm canon:parity                           # network, CI only (refuses without CI set unless --force)
pnpm registry:sync / pnpm registry:check    # network: component sources from mzizi-registry at the pin
pnpm contracts:fetch [ref] / pnpm contracts:check [ref]   # network: packages/bundu-ui/contracts/
```

## Generated vs hand-written files

Most of the repo is generated. Hand-editing a generated file fails CI; fix the source instead.

- **Tokens** (`scripts/generate-tokens.mjs`, input `tokens/canon.snapshot.json`): `styles/tokens.css`, `styles/theme.css`, `styles/color-scheme.css`, `tokens.json`, `tailwind-palette.mjs` and every `styles/brand-*.css` in BOTH `packages/ui` and `packages/bundu-ui`, byte-identical across the two. The snapshot itself is machine-written by `scripts/fetch-canon.mjs` from `api.mzizi.dev/api/v1/brand` cross-checked with mzizi-registry's `palette.source.ts`. Never type a raw hex; the few local values with no canon equivalent live in the `LOCAL` table in the generator.
- **Components** (`scripts/sync-registry.mjs`): every `@bundu/ui` `.astro` component, the modules they use, brand assets, `@bundu/server` helpers and `packages/bundu-ui/test/contract-runner.ts` are built from `mzizi-dev/mzizi-registry` at the commit in `scripts/registry-ref.json`. `scripts/registry-map.json` maps each registry item to its package path; `scripts/registry-imports.mjs` rewrites flat registry imports into the package layout. `registry:check` also fails on any `.astro` not in the map (a hand-written component is a fork). To change a component: change it upstream, bump the pin in a PR, run `pnpm registry:sync`, record it in `CHANGELOG.md`.
- **Contracts** (`scripts/fetch-contracts.mjs`): `packages/bundu-ui/contracts/` is a committed copy of the registry's contracts so contract tests run offline. CI checks it against the registry pin.

Hand-written: the `scripts/` tooling, `styles/globals.css`, `@nyuchi/ui` Svelte source, React primitives not in the map, configs and docs.

## Branches, releases and versioning

- Work targets `staging`; `staging` is released to `main` with a "chore(release): staging to main" PR. Feature PRs go to `staging`.
- `.github/workflows/release.yml` runs on every push to `main`: `tokens:check`, `pnpm test`, then `scripts/release-publish.mjs` publishes each package whose `package.json` version is not yet on npm (dependency order, `pnpm pack` then `npm publish`, OIDC trusted publishing with provenance, no npm token ever), and `scripts/release-tags.mjs` tags `<name>@<version>` and creates a GitHub release from that version's `CHANGELOG.md` section.
- To release: bump the package's `version` and add a `## [<name> <version>] - <date>` section to `CHANGELOG.md` in the same PR. A version must be the next **minor** above the highest on npm (x.y.z → x.y+1.0); majors only via a manual workflow run with `bump: major`. The release job refuses anything else.
- Unreleased changes go under `## [Unreleased]` in `CHANGELOG.md`, with each entry naming the package it applies to, or `(repository)` for a change to no package (docs, CI, tooling).
- Keep each package's `repository.url` as `git+https://github.com/mzizi-dev/packages-npm.git` (npm checks it against the OIDC token). A never-published package needs a manual first publish by an owner (see README "Publishing").

## CI

- `tokens.yml`: offline `tokens:check` on every PR; `canon:parity` (network) on PRs and weekly.
- `registry.yml`: `registry:check` and `contracts:check` at the pinned ref.
- `release.yml`: publish on `main` (above).
- Formatting/lint run in the org-required `vite-plus` jobs from `nyuchi/.github`; YAML is linted by yamllint/actionlint (not Prettier), Markdown by markdownlint (`.markdownlint.jsonc`).
