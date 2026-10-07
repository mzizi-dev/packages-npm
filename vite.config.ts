// Vite+ configuration: the org's standard check, lint and format settings.
// See nyuchi/.github/.github/workflows/reusable-vite-plus.yml.
import { defineConfig } from "vite-plus";

export default defineConfig({
  // `vp check` reads ONLY this block, not .oxfmtrc.json. These values mirror
  // nyuchi/.github/.oxfmtrc.json, which the org-required `vite-plus / fmt`
  // job uses on Markdown and JSON. Keep the two identical: two formatters
  // with different settings on one file can never both pass.
  fmt: {
    printWidth: 80,
    proseWrap: "preserve",
    tabWidth: 2,
    useTabs: false,
    endOfLine: "lf",
    trailingComma: "all",
    sortPackageJson: false,
    // A stopgap. This file is written by `pnpm registry:sync` and held byte
    // for byte by `registry:check`, so it can't be reformatted here, and the
    // registry doesn't run a formatter over it (no semicolons, long lines),
    // unlike the other synced modules. The fix belongs at the source: the
    // registry PR that formats components/registry/n2-primitives/
    // markdown-parse.ts (it also fixes parser bugs found in review of
    // mzizi-dev/packages-npm#55). Once a pin carries it, drop this entry and
    // run `pnpm registry:sync`.
    ignorePatterns: ["packages/bundu-ui/src/markdown-parse.ts"],
    overrides: [
      {
        files: ["*.md", "*.mdx"],
        options: { embeddedLanguageFormatting: "off" },
      },
    ],
  },
  // Tests run per package (`pnpm test` runs each package's `test` script),
  // because @bundu/ui's vitest.config.ts compiles .astro files and a root
  // run would not. Excluded here so a bare `vp test` at the root neither
  // runs them with the wrong config nor runs them twice.
  test: {
    exclude: [
      "**/node_modules/**",
      "packages/bundu-ui/**",
      "packages/bundu-server/**",
    ],
  },
  lint: {
    // typeCheck is OFF here, deliberately and visibly (the org CI job warns
    // about it on every PR). Turned on, it reports 112 errors that are about
    // the workspace, not the code: @bundu/ui ships React .tsx source whose
    // peers (react, @types/react, class-variance-authority, ...) are not
    // installed in this repo, and tsgolint does not resolve .svelte modules
    // (@nyuchi/ui is type checked by svelte-check instead). Turn it on once
    // @bundu/ui declares its peers as devDependencies.
    options: { typeAware: true, typeCheck: false },
  },
});
