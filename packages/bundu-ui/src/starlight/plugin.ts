// Starlight plugin that replaces the stock chrome with the standard Mzizi
// shell (header, sidebar and footer) and, by default, maps Starlight's theme
// onto the @bundu/ui tokens. One shell for every Starlight docs site in the
// ecosystem (docs.nyuchi.com, docs.bundu.org), so they cannot drift apart.
//
// Usage in astro.config.mjs:
//   import { starlightMziziShell } from "@bundu/ui/starlight";
//   starlight({
//     plugins: [
//       starlightMziziShell({
//         navLinks: [{ label: "API", href: "/api/" }],
//         footerColumns: [{ title: "Docs", links: [{ label: "API", href: "/api/" }] }],
//         legal: "© 2026 Example",
//         accent: "copper",
//       }),
//     ],
//   })
//
// Components it registers: Header, Sidebar, PageFrame and a blank
// MobileMenuToggle (the header carries the menu button itself). The footer is
// mounted by PageFrame, not by Starlight's Footer slot, because Starlight
// renders Footer inside the narrow article column and the standard footer is
// full width with its own top-level landmark. A site that already overrides
// PageFrame keeps its own and wraps `@bundu/ui/starlight/PageFrame.astro`.
//
// Plain TypeScript with no imports beyond its siblings, so it loads under
// plain Node from node_modules (astro.config.mjs is run by Node).

import { resolveShellOptions } from "./options";
import type { MziziShellOptions } from "./options";

// Starlight's plugin contract is loosely typed across versions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StarlightPlugin = any;

export const OPTIONS_MODULE_ID = "virtual:bundu-ui/starlight-options";
const RESOLVED_ID = `\0${OPTIONS_MODULE_ID}`;

/** The tokens, then the Starlight theme mapping, then the shell. */
export const TOKENS_CSS = "@bundu/ui/styles/tokens.css";
export const THEME_CSS = "@bundu/ui/starlight/theme.css";
export const SHELL_CSS = "@bundu/ui/starlight/shell.css";

export const COMPONENTS = {
  Header: "@bundu/ui/starlight/Header.astro",
  Sidebar: "@bundu/ui/starlight/Sidebar.astro",
  PageFrame: "@bundu/ui/starlight/PageFrame.astro",
  // Blanked: the header renders its own menu button (see Header.astro).
  MobileMenuToggle: "@bundu/ui/starlight/MobileMenuToggle.astro",
} as const;

export function starlightMziziShell(
  options: MziziShellOptions = {},
): StarlightPlugin {
  // Validate at call time so a bad option fails the config load, not a render.
  const resolved = resolveShellOptions(options);

  return {
    name: "@bundu/ui/starlight",
    hooks: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "config:setup"({ updateConfig, addIntegration, config, logger }: any) {
        const existing: Record<string, string> = config?.components ?? {};
        const components: Record<string, string> = { ...existing };
        for (const [name, path] of Object.entries(COMPONENTS)) {
          if (existing[name]) {
            logger?.info?.(
              `${name} is already overridden by the site; leaving it. Compose ${path} inside it to get the Mzizi shell.`,
            );
          } else {
            components[name] = path;
          }
        }

        const ours = resolved.theme
          ? [TOKENS_CSS, THEME_CSS, SHELL_CSS]
          : [SHELL_CSS];
        updateConfig({
          components,
          // Ours first, so the site's own stylesheet can still refine it.
          customCss: [...ours, ...(config?.customCss ?? [])],
        });

        addIntegration({
          name: "@bundu/ui/starlight-options",
          hooks: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            "astro:config:setup": ({ updateConfig: updateAstro }: any) => {
              updateAstro({
                vite: {
                  plugins: [
                    {
                      name: "vite-plugin-bundu-ui-starlight-options",
                      resolveId(id: string) {
                        return id === OPTIONS_MODULE_ID
                          ? RESOLVED_ID
                          : undefined;
                      },
                      load(id: string) {
                        return id === RESOLVED_ID
                          ? `export default ${JSON.stringify(resolved)};`
                          : undefined;
                      },
                    },
                  ],
                },
              });
            },
          },
        });
      },
    },
  };
}

export default starlightMziziShell;
