# packages-ui

Nyuchi Design System — shared, publishable UI packages. Nyuchi's
implementation of the [Mzizi](https://github.com/bundu-labs) architecture,
consumed by the marketing sites and the documentation sites.

This is a [pnpm workspace](https://pnpm.io/workspaces) monorepo so it can hold
additional UI packages over time.

## Packages

| Package                       | Description                                          |
| ------------------------------ | ---------------------------------------------------- |
| [`@nyuchi/ui`](./packages/ui)  | Shared UI primitives — Astro components plus helpers |

## Development

```sh
pnpm install
```

## Publishing

Packages are published to **both** [npm](https://www.npmjs.com/org/nyuchi) and
[GitHub Packages](https://github.com/orgs/nyuchi/packages) automatically by the
[`publish` workflow](./.github/workflows/publish.yml) when a GitHub Release is
published. The workflow requires an `NPM_TOKEN` repository secret; GitHub
Packages uses the built-in `GITHUB_TOKEN`.

## License

[MIT](./LICENSE) © Nyuchi Africa (Pvt) Ltd
