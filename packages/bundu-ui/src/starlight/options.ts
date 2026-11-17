// Options for the Mzizi Starlight shell, with strict validation and defaults.
//
// Everything a site passes in ends up in markup (link hrefs, the footer text)
// or picks a token (the accent mineral), so it is checked once, at config
// time, and a mistake fails the build with a message that names the option,
// rather than shipping a broken or unsafe header.

/** The seven minerals, in strip order. Each is a `--color-<mineral>` token. */
export const MINERALS = [
  "cobalt",
  "tanzanite",
  "malachite",
  "gold",
  "terracotta",
  "sodalite",
  "copper",
] as const;

export type Mineral = (typeof MINERALS)[number];

export interface ShellLink {
  label: string;
  /** Root-relative ("/api/") or absolute http(s) URL. */
  href: string;
  /** Opens in a new tab with `rel="noopener noreferrer"`. */
  external?: boolean;
}

export interface FooterColumn {
  title: string;
  links: ShellLink[];
}

export interface MziziShellOptions {
  /**
   * Top-level links in the header (desktop). By design these are the sidebar's
   * top-level sections. Default: none.
   */
  navLinks?: ShellLink[];
  /** Link columns in the footer, beside the brand column. Default: none. */
  footerColumns?: FooterColumn[];
  /** The line under the footer logo. Default: "I am because we are." */
  tagline?: string;
  /** The legal line at the foot of the footer. Default: none. */
  legal?: string;
  /**
   * The brand mineral: the site's accent (links, the header pill, the active
   * sidebar item), read from the `--color-<mineral>` tokens. Default: none,
   * which follows `--primary` (cobalt, or a `brand-*.css` overlay's mineral).
   */
  accent?: Mineral;
  /**
   * Map Starlight's colours, fonts and radii onto the @bundu/ui tokens
   * (`@bundu/ui/starlight/theme.css`, with `@bundu/ui/styles/tokens.css`).
   * Default: true. Set false to keep a site's own theme; the shell stylesheet
   * is added either way.
   */
  theme?: boolean;
}

export interface ResolvedShellOptions {
  navLinks: ShellLink[];
  footerColumns: FooterColumn[];
  tagline: string;
  legal: string;
  accent: Mineral | null;
  theme: boolean;
}

export const DEFAULT_TAGLINE = "I am because we are.";

export const MAX_NAV_LINKS = 6;
export const MAX_FOOTER_COLUMNS = 4;
export const MAX_FOOTER_LINKS = 8;

const OPTION_KEYS = [
  "navLinks",
  "footerColumns",
  "tagline",
  "legal",
  "accent",
  "theme",
] as const;

export class ShellOptionsError extends Error {
  constructor(message: string) {
    super(`[@bundu/ui/starlight] ${message}`);
    this.name = "ShellOptionsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, where: string, max: number): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ShellOptionsError(`${where} must be a non-empty string.`);
  }
  if (value.length > max) {
    throw new ShellOptionsError(`${where} must be at most ${max} characters.`);
  }
  return value.trim();
}

/** A root-relative path or an absolute http(s) URL. Nothing else is linkable. */
export function isSafeHref(href: string): boolean {
  if (href.startsWith("//")) return false;
  if (href.startsWith("/")) return !/[\s\\]/.test(href);
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function link(value: unknown, where: string): ShellLink {
  if (!isRecord(value)) {
    throw new ShellOptionsError(`${where} must be an object.`);
  }
  for (const key of Object.keys(value)) {
    if (key !== "label" && key !== "href" && key !== "external") {
      throw new ShellOptionsError(`${where} has an unknown key "${key}".`);
    }
  }
  const label = text(value.label, `${where}.label`, 60);
  const href = text(value.href, `${where}.href`, 300);
  if (!isSafeHref(href)) {
    throw new ShellOptionsError(
      `${where}.href "${href}" must be a root-relative path or an http(s) URL.`,
    );
  }
  if (value.external !== undefined && typeof value.external !== "boolean") {
    throw new ShellOptionsError(`${where}.external must be a boolean.`);
  }
  const result: ShellLink = { label, href };
  if (value.external) result.external = true;
  return result;
}

function list(value: unknown, where: string, max: number): unknown[] {
  if (!Array.isArray(value)) {
    throw new ShellOptionsError(`${where} must be an array.`);
  }
  if (value.length > max) {
    throw new ShellOptionsError(`${where} must have at most ${max} entries.`);
  }
  return value;
}

function column(value: unknown, where: string): FooterColumn {
  if (!isRecord(value)) {
    throw new ShellOptionsError(`${where} must be an object.`);
  }
  for (const key of Object.keys(value)) {
    if (key !== "title" && key !== "links") {
      throw new ShellOptionsError(`${where} has an unknown key "${key}".`);
    }
  }
  const title = text(value.title, `${where}.title`, 40);
  const links = list(value.links, `${where}.links`, MAX_FOOTER_LINKS).map(
    (entry, i) => link(entry, `${where}.links[${i}]`),
  );
  if (links.length === 0) {
    throw new ShellOptionsError(`${where}.links must not be empty.`);
  }
  return { title, links };
}

function unique(values: string[], where: string): void {
  const seen = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) {
      throw new ShellOptionsError(`${where} repeats "${v}".`);
    }
    seen.add(v);
  }
}

/** Validate user options and fill in the defaults. Throws ShellOptionsError. */
export function resolveShellOptions(input: unknown = {}): ResolvedShellOptions {
  if (input === undefined || input === null) input = {};
  if (!isRecord(input)) {
    throw new ShellOptionsError("options must be an object.");
  }
  for (const key of Object.keys(input)) {
    if (!(OPTION_KEYS as readonly string[]).includes(key)) {
      throw new ShellOptionsError(
        `unknown option "${key}". Known options: ${OPTION_KEYS.join(", ")}.`,
      );
    }
  }

  const navLinks =
    input.navLinks === undefined
      ? []
      : list(input.navLinks, "navLinks", MAX_NAV_LINKS).map((entry, i) =>
          link(entry, `navLinks[${i}]`),
        );
  unique(
    navLinks.map((l) => l.href),
    "navLinks",
  );

  const footerColumns =
    input.footerColumns === undefined
      ? []
      : list(input.footerColumns, "footerColumns", MAX_FOOTER_COLUMNS).map(
          (entry, i) => column(entry, `footerColumns[${i}]`),
        );
  unique(
    footerColumns.map((c) => c.title),
    "footerColumns",
  );

  const tagline =
    input.tagline === undefined
      ? DEFAULT_TAGLINE
      : text(input.tagline, "tagline", 120);
  const legal =
    input.legal === undefined ? "" : text(input.legal, "legal", 240);

  let accent: Mineral | null = null;
  if (input.accent !== undefined) {
    if (!(MINERALS as readonly unknown[]).includes(input.accent)) {
      throw new ShellOptionsError(
        `accent ${JSON.stringify(input.accent)} must be one of the minerals: ${MINERALS.join(", ")}. It names a token, never a colour.`,
      );
    }
    accent = input.accent as Mineral;
  }

  if (input.theme !== undefined && typeof input.theme !== "boolean") {
    throw new ShellOptionsError("theme must be a boolean.");
  }
  const theme = input.theme ?? true;

  return { navLinks, footerColumns, tagline, legal, accent, theme };
}

/**
 * The `:root` declarations that point the shell's accent at one mineral's
 * tokens. Token references only; empty when no accent is chosen, so the theme
 * falls back to `--primary`.
 */
export function accentCss(accent: Mineral | null): string {
  if (!accent) return "";
  return (
    `:root{--mzizi-accent:var(--color-${accent});` +
    `--mzizi-accent-container:var(--color-${accent}-container);` +
    `--mzizi-accent-on-container:var(--color-${accent}-on-container)}`
  );
}
