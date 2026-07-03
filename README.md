# packages-ui

Nyuchi Design System — shared, publishable UI packages. Nyuchi's
implementation of the [Mzizi](https://github.com/bundu-labs) architecture,
consumed by the marketing sites and the documentation sites.

This is a [pnpm workspace](https://pnpm.io/workspaces) monorepo so it can hold
additional UI packages over time.

## Packages

| Package                                    | Description                                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [`@nyuchi/ui`](./packages/ui)              | Shared UI primitives — Astro components plus helpers                                           |
| [`@bundu/ui`](./packages/bundu-ui)         | Marketing UI kit — Astro marketing components + shadcn primitives on the seven-mineral tokens |

## Development

```sh
pnpm install
```

## Publishing

Packages are published to [npm](https://www.npmjs.com) automatically by the
[`publish` workflow](./.github/workflows/publish.yml) when a GitHub Release is
published — `@nyuchi/*` under the [`@nyuchi`](https://www.npmjs.com/org/nyuchi)
org and `@bundu/*` under the [`@bundu`](https://www.npmjs.com/org/bundu) org.
The workflow requires an `NPM_TOKEN` repository secret with publish access to
both orgs.

## License

[MIT](./LICENSE) © Nyuchi Africa (Pvt) Ltd
