// Vite+ configuration: the org's standard check, lint and format settings.
// See nyuchi/.github/.github/workflows/reusable-vite-plus.yml.
import { defineConfig } from "vite-plus";

export default defineConfig({
  // @bundu/ui's Astro component tests render .astro files, which need
  // Astro's own Vite pipeline (packages/bundu-ui/vitest.config.ts). The root
  // runner has no Astro plugin, so it leaves them to
  // `pnpm --filter @bundu/ui test`.
  test: { exclude: ["**/node_modules/**", "packages/bundu-ui/test/**"] },
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
    overrides: [
      {
        files: ["*.md", "*.mdx"],
        options: { embeddedLanguageFormatting: "off" },
      },
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
