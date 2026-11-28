// `@bundu/ui/starlight`: the standard Mzizi shell and theme for Astro
// Starlight docs sites. Astro components and CSS, plus this plain-TypeScript
// plugin; no UI framework and no runtime dependencies.
export {
  starlightMziziShell,
  COMPONENTS,
  OPTIONS_MODULE_ID,
  SHELL_CSS,
  THEME_CSS,
  TOKENS_CSS,
} from "./plugin";
export { default } from "./plugin";
export {
  accentCss,
  isSafeHref,
  resolveShellOptions,
  ShellOptionsError,
  DEFAULT_TAGLINE,
  MAX_FOOTER_COLUMNS,
  MAX_FOOTER_LINKS,
  MAX_NAV_LINKS,
  MINERALS,
  type FooterColumn,
  type Mineral,
  type MziziShellOptions,
  type ResolvedShellOptions,
  type ShellLink,
} from "./options";
export {
  initScrollState,
  SCROLLED_ATTRIBUTE,
  SCROLL_THRESHOLD_PX,
} from "./scroll-state";
