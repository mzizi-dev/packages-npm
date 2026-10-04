#!/usr/bin/env node
/**
 * generate-tokens — emit every token artifact in this repo from ONE input.
 *
 * Input   tokens/canon.snapshot.json   (machine-written by scripts/fetch-canon.mjs)
 *
 * Output  packages/bundu-ui/styles/tokens.css   packages/ui/styles/tokens.css
 *         packages/bundu-ui/styles/theme.css    packages/ui/styles/theme.css
 *         packages/bundu-ui/tokens.json         packages/ui/tokens.json
 *
 * Both packages emit byte-identical token files on purpose. Until this change
 * @nyuchi/ui carried its own hand-written copy of the seven minerals inside
 * styles/globals.css — a second palette inside one repository, already drifted
 * the same way @bundu/ui's had. Two artifacts from one generator is not a
 * second source; two hand-maintained files are.
 *
 * Usage:  node scripts/generate-tokens.mjs           (pnpm tokens:build)
 *         node scripts/generate-tokens.mjs --check   (pnpm tokens:check)
 *
 * `--check` regenerates in memory and diffs against the working tree. It needs
 * no network and no credential, so it runs on every CI job, in the publish
 * workflow's prepack, and locally. It is the gate that makes hand-editing a
 * generated file a build failure rather than a slow-motion estate-wide bug.
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT = resolve(ROOT, "tokens/canon.snapshot.json");
const PACKAGES = ["packages/bundu-ui", "packages/ui"];

const byName = (list) => Object.fromEntries(list.map((e) => [e.name, e]));

/* ------------------------------------------------------------------ *
 * Package-local semantics.
 *
 * Canon (/v1/brand) is authoritative for every colour it carries. These are
 * the handful it does not carry, each with the reason it is local. Nothing
 * else in this file contains a literal hex.
 * ------------------------------------------------------------------ */
const LOCAL = {
  // Canon has no ink token; the brand document treats foreground as a
  // per-surface pairing rather than a palette entry. These are the values
  // @bundu/ui has shipped since 0.1.0 and all four consumers render against.
  foreground: { light: "#1a1a17", dark: "#f0efe9" },
  // Canon has no "card": a card is `surface` in the registry's own shell.
  // Marketing sites float a WHITE card on the light base for editorial
  // contrast, which is why light stays #ffffff while dark adopts canon
  // `surface` (this is drift fix 3 — dark was #1a1917).
  cardLight: "#ffffff",
  // Ink used on a saturated fill (primary / destructive) in dark mode.
  onBrightDark: "#1a1917",
  // Secondary/muted foreground. Canon `neutral` (#55514B/#A09C93) is close
  // but not identical; changing it was not in scope for this pass. See
  // RESIDUAL-DRIFT in the PR body.
  mutedForeground: { light: "#5d5c57", dark: "#a8a6a0" },
  // Canon `container` dark is #1E1D1A; @bundu/ui has shipped #2a2927 (equal to
  // `border` dark) since 0.1.0. Only the LIGHT value was in scope for this
  // pass. See RESIDUAL-DRIFT in the PR body.
  secondaryDark: "#2a2927",
  white: "#ffffff",
  // Touch targets — an accessibility mandate, not a colour.
  touchTarget: "56px",
  touchTargetSm: "48px",
};

/* ------------------------------------------------------------------ *
 * Model
 * ------------------------------------------------------------------ */

function buildModel(canon) {
  const bg = byName(canon.backgrounds);
  const sem = byName(canon.semanticColors);

  const minerals = canon.minerals.map((m) => ({
    name: m.name,
    light: m.lightHex,
    dark: m.darkHex,
    // The mineral's own brand colour, the same in both themes, for filled
    // brand surfaces (a primary button). lightHex is the darker variant for
    // text on light surfaces; it is not the brand fill.
    brand: m.hex,
    // Text on the brand fill: whichever of the mineral's own container pair
    // contrasts more with it (WCAG 2 ratio), so it is canon, not invented.
    onBrand: betterContrast(m.hex, m.onContainerLight, m.containerLight),
    containerLight: m.containerLight,
    containerDark: m.containerDark,
    // /v1/brand does not project on-container for minerals. fetch-canon
    // merges it in from palette.source.ts, the named on-disk source of truth.
    onContainerLight: m.onContainerLight,
    onContainerDark: m.onContainerDark,
    origin: m.origin,
    symbolism: m.symbolism,
    usage: m.usage,
  }));

  const heritage = canon.heritage.map((h) => ({
    name: h.name,
    light: h.lightHex,
    dark: h.darkHex,
    origin: h.origin,
    symbolism: h.symbolism,
    usage: h.usage,
  }));

  const experimental = canon.experimental.map((e) => ({
    name: e.name,
    light: e.lightHex,
    dark: e.darkHex,
    containerLight: e.containerLight,
    containerDark: e.containerDark,
    onContainerLight: e.onContainerLight,
    onContainerDark: e.onContainerDark,
    uiLight: e.uiLight,
    uiDark: e.uiDark,
    heptagonIndex: e.heptagonIndex,
  }));

  // The nine-step surface ladder, in depth order. `muted` is the tenth
  // background in canon; it is emitted as --surface-muted because the
  // semantic --muted (a shadcn token, mapped to canon `container`) already
  // owns that name in every consumer's Tailwind config.
  const LADDER = [
    "pitch",
    "void",
    "base",
    "surface",
    "container",
    "overlay",
    "raised",
    "scrim",
    "wash",
  ];
  const ladder = LADDER.map((name) => {
    if (!bg[name]) throw new Error(`canon has no background "${name}"`);
    return { name, cssVar: `--${name}`, ...bg[name] };
  });
  const surfaceMuted = {
    name: "muted",
    cssVar: "--surface-muted",
    ...bg.muted,
  };

  const STATUS = ["syncing", "offline", "neutral"];
  const status = STATUS.map((name) => {
    if (!sem[name]) throw new Error(`canon has no semantic "${name}"`);
    return { name, cssVar: `--${name}`, ...sem[name] };
  });

  return {
    canon,
    bg,
    sem,
    minerals,
    heritage,
    experimental,
    ladder,
    surfaceMuted,
    status,
  };
}

/* ------------------------------------------------------------------ *
 * Declaration list
 *
 * One ordered list of { var, light, dark, comment, section } drives both the
 * CSS and the JSON, so the two can never disagree.
 * ------------------------------------------------------------------ */

const v = (name) => ({ ref: name });
const lit = (value) => ({ lit: value });

/** WCAG 2 relative luminance of a #rrggbb colour. */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
/** Of `options`, the colour with the highest contrast against `bg`. */
function betterContrast(bg, ...options) {
  return options.reduce((best, o) =>
    contrast(bg, o) > contrast(bg, best) ? o : best,
  );
}

function declarations(m) {
  const out = [];
  const push = (section, name, light, dark, comment) =>
    out.push({ section, name, light, dark, comment });
  const heading = (section, text) => out.push({ section, heading: text });

  /* --- 7 minerals ------------------------------------------------- */
  heading(
    "minerals",
    "Seven African Minerals — the deep-earth + hand families",
  );
  for (const x of m.minerals) {
    push("minerals", `--color-${x.name}`, lit(x.light), lit(x.dark), x.usage);
    push(
      "minerals",
      `--color-${x.name}-container`,
      lit(x.containerLight),
      lit(x.containerDark),
    );
    push(
      "minerals",
      `--color-${x.name}-on-container`,
      lit(x.onContainerLight),
      lit(x.onContainerDark),
    );
    push(
      "minerals",
      `--color-${x.name}-brand`,
      lit(x.brand),
      lit(x.brand),
      "The brand fill, both themes",
    );
    push(
      "minerals",
      `--color-${x.name}-on-brand`,
      lit(x.onBrand),
      lit(x.onBrand),
    );
  }

  /* --- 7 heritage ------------------------------------------------- */
  heading(
    "heritage",
    "Seven heritage tones — atmospheric anchors. Canon carries light/dark only for these; there is no container step.",
  );
  for (const x of m.heritage) {
    push("heritage", `--color-${x.name}`, lit(x.light), lit(x.dark), x.usage);
  }

  /* --- 7 experimental --------------------------------------------- */
  heading(
    "experimental",
    "Seven experimental tones — the computed heptagon (hues offset 17°, prime saturations). `-ui` is the solved interactive step.",
  );
  for (const x of m.experimental) {
    push("experimental", `--color-${x.name}`, lit(x.light), lit(x.dark));
    push(
      "experimental",
      `--color-${x.name}-container`,
      lit(x.containerLight),
      lit(x.containerDark),
    );
    push(
      "experimental",
      `--color-${x.name}-on-container`,
      lit(x.onContainerLight),
      lit(x.onContainerDark),
    );
    push("experimental", `--color-${x.name}-ui`, lit(x.uiLight), lit(x.uiDark));
  }

  /* --- surface ladder --------------------------------------------- */
  heading(
    "ladder",
    "Nine-step surface ladder, shallow to deep. Prime steps P2..P17.",
  );
  for (const s of m.ladder) {
    push("ladder", s.cssVar, lit(s.light), lit(s.dark), s.usage);
  }
  push(
    "ladder",
    m.surfaceMuted.cssVar,
    lit(m.surfaceMuted.light),
    lit(m.surfaceMuted.dark),
    `${m.surfaceMuted.usage}. Canon calls this background "muted"; the ` +
      "shadcn semantic --muted already owns that name below.",
  );

  /* --- brand accent (input to --wash) ------------------------------ */
  heading(
    "brand-accent",
    "Per-app brand mineral. --wash mixes it into --surface; the brand-*.css overlays repoint it alongside --primary.",
  );
  push(
    "brand-accent",
    "--brand-accent",
    lit(m.sem["brand-accent"].light),
    lit(m.sem["brand-accent"].dark),
    m.sem["brand-accent"].usage,
  );
  push(
    "brand-accent",
    "--brand-accent-foreground",
    lit(LOCAL.white),
    lit(m.bg.base.dark),
  );

  /* --- status trio ------------------------------------------------- */
  heading("status", "Connectivity status trio.");
  for (const s of m.status) {
    push("status", s.cssVar, lit(s.light), lit(s.dark), s.usage);
  }

  /* --- semantic (shadcn surface) ----------------------------------- */
  heading("semantic", "Semantic tokens — the shadcn/Tailwind contract.");
  push(
    "semantic",
    "--background",
    v("--base"),
    v("--base"),
    "Canon `base`. Was #faf9f4 / #100f0e before 0.2.0 — drift fixes 1 and 2.",
  );
  push("semantic", "--canvas", v("--background"), v("--background"));
  push(
    "semantic",
    "--foreground",
    lit(LOCAL.foreground.light),
    lit(LOCAL.foreground.dark),
  );
  push("semantic", "--ink", v("--foreground"), v("--foreground"));

  push(
    "semantic",
    "--card",
    lit(LOCAL.cardLight),
    v("--surface"),
    "Dark was #1a1917 before 0.2.0 — drift fix 3. Light stays white: a " +
      "marketing card floats above the base by design.",
  );
  push("semantic", "--card-foreground", v("--foreground"), v("--foreground"));
  push("semantic", "--popover", v("--card"), v("--card"));
  push(
    "semantic",
    "--popover-foreground",
    v("--card-foreground"),
    v("--card-foreground"),
  );

  push(
    "semantic",
    "--primary",
    v("--color-tanzanite"),
    v("--color-tanzanite"),
    'Drift fix 6. Canon: "Cobalt is the exceptional mineral for links/info ' +
      'only — do not use it as --primary." Every brand-*.css overlay ' +
      "repoints this; tanzanite is the unbranded default.",
  );
  push(
    "semantic",
    "--primary-foreground",
    lit(LOCAL.white),
    lit(LOCAL.onBrightDark),
  );

  push(
    "semantic",
    "--secondary",
    v("--container"),
    lit(LOCAL.secondaryDark),
    "Light was #f4f2ec before 0.2.0 — drift fix 5.",
  );
  push(
    "semantic",
    "--secondary-foreground",
    v("--foreground"),
    v("--foreground"),
  );

  push(
    "semantic",
    "--muted",
    v("--container"),
    lit(LOCAL.secondaryDark),
    "Light was #f4f2ec before 0.2.0 — drift fix 4.",
  );
  push(
    "semantic",
    "--muted-foreground",
    lit(LOCAL.mutedForeground.light),
    lit(LOCAL.mutedForeground.dark),
  );

  push(
    "semantic",
    "--accent",
    v("--color-cobalt-container"),
    v("--color-cobalt-container"),
  );
  push(
    "semantic",
    "--accent-foreground",
    v("--color-cobalt-on-container"),
    v("--color-cobalt-on-container"),
  );

  push(
    "semantic",
    "--destructive",
    lit(m.sem.error.light),
    lit(m.sem.error.dark),
  );
  push(
    "semantic",
    "--destructive-foreground",
    lit(LOCAL.white),
    lit(LOCAL.onBrightDark),
  );
  push(
    "semantic",
    "--destructive-container",
    lit(m.sem["destructive-container"].light),
    lit(m.sem["destructive-container"].dark),
  );

  push("semantic", "--border", lit(m.sem.border.light), lit(m.sem.border.dark));
  push("semantic", "--input", lit(m.sem.input.light), lit(m.sem.input.dark));
  push(
    "semantic",
    "--ring",
    v("--color-cobalt"),
    v("--color-cobalt"),
    m.sem.ring.usage,
  );

  push("semantic", "--success", v("--color-malachite"), v("--color-malachite"));
  push(
    "semantic",
    "--warning",
    lit(m.sem.warning.light),
    lit(m.sem.warning.dark),
  );
  push("semantic", "--error", v("--destructive"), v("--destructive"));
  push(
    "semantic",
    "--info",
    v("--color-cobalt"),
    v("--color-cobalt"),
    m.sem.info.usage,
  );

  /* --- legacy aliases ---------------------------------------------- */
  heading(
    "legacy",
    "Legacy aliases. 0.1.1 namespaced the heritage tones --heritage-*; they are --color-* now, like every other family. These keep the four existing consumers compiling unchanged. Do not use in new code.",
  );
  for (const x of m.heritage) {
    push(
      "legacy",
      `--heritage-${x.name}`,
      v(`--color-${x.name}`),
      v(`--color-${x.name}`),
    );
  }

  return out;
}

/** Non-colour scalars — same in both modes, so they live in :root only. */
function scalars(m) {
  const r = m.canon.radii;
  return [
    { heading: "Touch targets — accessibility mandate, 56px comfortable." },
    { name: "--touch-target", value: LOCAL.touchTarget },
    { name: "--touch-target-sm", value: LOCAL.touchTargetSm },
    {
      heading:
        "Radius scale. Ecosystem numbers 7/12/14/17; buttons are always pill.",
    },
    { name: "--radius-unit", value: r.sm },
    { name: "--radius-sm", value: r.sm },
    { name: "--radius-md", value: r.md },
    { name: "--radius-lg", value: r.lg },
    { name: "--radius-xl", value: r.xl },
    { name: "--radius-2xl", value: r["2xl"] },
    { name: "--radius-full", value: r.full },
  ];
}

/* ------------------------------------------------------------------ *
 * Emitters
 * ------------------------------------------------------------------ */

/** Lowercase hex; canon serves #RRGGBB uppercase, the estate's CSS is lower. */
const norm = (value) =>
  String(value)
    .replace(/#[0-9A-Fa-f]{3,8}\b/g, (h) => h.toLowerCase())
    .replace(
      /rgba\(([^)]*)\)/g,
      (_, inner) =>
        `rgba(${inner
          .split(",")
          .map((n) => n.trim().replace(/^(0?\.\d*?)0+$/, "$1"))
          .join(", ")})`,
    );

const expr = (e) => (e.ref ? `var(${e.ref})` : norm(e.lit));

const WIDTH = 80;

/** Wrap a prose comment to WIDTH at the given indent, as a CSS block comment. */
function wrapComment(text, indent, lead = "") {
  const pad = " ".repeat(indent);
  const body = `${lead}${text}`.replace(/\s+/g, " ").trim();
  const budget = WIDTH - indent - 3;
  const lines = [[]];
  let len = 0;
  for (const word of body.split(" ")) {
    if (len && len + 1 + word.length > budget) {
      lines.push([]);
      len = 0;
    }
    lines.at(-1).push(word);
    len += (len ? 1 : 0) + word.length;
  }
  const rendered = lines.map((l) => l.join(" "));
  if (rendered.length === 1) return `${pad}/* ${rendered[0]} */`;
  return [
    `${pad}/* ${rendered[0]}`,
    ...rendered.slice(1).map((l) => `${pad}   ${l}`),
  ]
    .join("\n")
    .concat(" */");
}

function emitBlock(decls, mode, indent = 2) {
  const pad = " ".repeat(indent);
  const lines = [];
  let first = true;
  let lastGroup = null;
  for (const d of decls) {
    if (d.heading) {
      if (!first) lines.push("");
      lines.push(wrapComment(d.heading, indent, "=== "));
      first = false;
      lastGroup = null;
      continue;
    }
    first = false;
    // Blank line between families within a section (--color-ember... then
    // --color-acacia...), so 84 declarations stay readable.
    const group = d.name.replace(/^(--color-[a-z]+).*$/, "$1");
    if (lastGroup && group !== lastGroup && group.startsWith("--color-")) {
      lines.push("");
    }
    lastGroup = group.startsWith("--color-") ? group : null;

    const decl = `${pad}${d.name}: ${expr(d[mode])};`;
    if (!d.comment) {
      lines.push(decl);
      continue;
    }
    const inline = `${decl} /* ${d.comment.replace(/\s+/g, " ")} */`;
    if (inline.length <= WIDTH) {
      lines.push(inline);
    } else {
      lines.push(wrapComment(d.comment, indent));
      lines.push(decl);
    }
  }
  return lines.join("\n");
}

const HEADER = (
  pkg,
  meta,
) => `/* ${pkg} — design tokens. GENERATED FILE — DO NOT EDIT.

   Source      tokens/canon.snapshot.json (brand v${meta.canonVersion}, ${meta.canonLastUpdated})
   Generator   scripts/generate-tokens.mjs   (\`pnpm tokens:build\`)
   Gate        \`pnpm tokens:check\` fails if this file and the generator disagree

   All 21 colour families of the Mzizi design system under one --color-*
   namespace: seven minerals, seven heritage tones, seven experimental tones.
   Plus the nine-step surface ladder, the connectivity status trio, and the
   semantic (shadcn) contract.

   The hex values do NOT live in a database. Mzizi holds no brand or primitive
   token data in Supabase or anywhere else — the on-disk source of truth is
   mzizi-dev/mzizi-registry -> lib/tokens/palette.source.ts (+ brand.source.ts),
   projected over https://api.mzizi.dev/api/v1/brand and snapshotted into this
   repo by \`pnpm canon:fetch\`. (0.1.1's header claimed "they are the DB's
   source of truth". That was already wrong and is corrected here.)

   PURE custom properties — no @layer, no @apply, no Tailwind — so any site
   can @import it. Dark mode under both conventions: the .dark class
   (shadcn/Tailwind) and [data-theme="dark"] (Starlight and friends).

   Tailwind v4 users: import ./theme.css instead, which @imports this file and
   adds the @theme entrypoint. The v3 preset (./tailwind-preset.mjs) keeps
   working unchanged. */
`;

const COLOR_SCHEME_HEADER = (
  pkg,
) => `/* ${pkg} — follow the reader's OS colour scheme. GENERATED FILE — DO NOT EDIT.

   OPT-IN. tokens.css switches to dark only under .dark or
   [data-theme="dark"], which needs something (a class toggle, a script) to
   set them. A site with no theme script that should still honour
   prefers-color-scheme imports this file as well:

     @import "@bundu/ui/styles/theme.css";          (or tokens.css)
     @import "@bundu/ui/styles/color-scheme.css";   <- after it
     @import "@bundu/ui/styles/brand-mzizi.css";    <- brand overlays last

   It repeats tokens.css's dark block under @media (prefers-color-scheme:
   dark). An explicit data-theme="light" or .light still wins. The selector
   is wrapped in :where(), so it has :root's specificity and a brand overlay
   imported after it keeps its --primary. Same values, same generator. */
`;

function emitColorSchemeCss(pkg, decls) {
  const dark = emitBlock(decls, "dark")
    .split("\n")
    .map((line) => (line ? `  ${line}` : line))
    .join("\n");
  return [
    COLOR_SCHEME_HEADER(pkg),
    ":root {",
    "  color-scheme: light dark;",
    "}",
    "",
    '[data-theme="light"],',
    ".light {",
    "  color-scheme: light;",
    "}",
    "",
    "@media (prefers-color-scheme: dark) {",
    '  :root:where(:not([data-theme="light"], .light)) {',
    dark,
    "  }",
    "}",
    "",
  ].join("\n");
}

function emitTokensCss(pkg, m, decls, meta) {
  return [
    HEADER(pkg, meta),
    ":root {",
    emitBlock(decls, "light"),
    "",
    emitBlock(
      scalars(m).map((s) =>
        s.heading
          ? { heading: s.heading }
          : { name: s.name, light: lit(s.value) },
      ),
      "light",
    ),
    "}",
    "",
    ".dark,",
    '[data-theme="dark"] {',
    emitBlock(decls, "dark"),
    "}",
    "",
  ].join("\n");
}

const THEME_HEADER = (
  pkg,
) => `/* ${pkg} — Tailwind v4 entrypoint. GENERATED FILE — DO NOT EDIT.

   Every consumer in the estate is on Tailwind v4. Until 0.2.0 this package
   shipped only a v3-shape preset, which v4 can still load through \`@config\`
   — that is how all four current consumers work today, and it keeps working.
   This file is the native path for new consumers:

     @import "tailwindcss";
     @import "@bundu/ui/styles/theme.css";
     @import "@bundu/ui/styles/globals.css";   (for the Astro components)
     @import "@bundu/ui/styles/brand-mzizi.css";
     @source "../../node_modules/@bundu/ui/src";

   and no tailwind.config.mjs at all. The type scale, reading widths and
   named spacing below are read from tailwind-preset.mjs, so the v3 preset
   and this file cannot drift apart.

   Palette families are declared with their light-mode value as the @theme
   fallback; tokens.css's own :root / .dark rules are unlayered and therefore
   win at runtime, which is what makes dark mode work. Tokens that alias a
   bare ladder variable use \`@theme inline\` so no second definition is
   emitted. */
`;

/**
 * The type scale, reading widths and named spacing the Astro components use
 * (`text-display`, `text-body-lg`, `text-caption`, `max-w-narrow`, `p-xxs`,
 * ...). They are hand-authored package policy in the v3 preset; theme.css
 * READS them from there rather than restating them, so a v4 consumer and a
 * v3 consumer get the same scale from one definition. Both presets must agree
 * on type and widths (theme.css is byte-identical across the packages), and
 * the generator fails if they do not. Named spacing comes from @bundu/ui's
 * preset; @nyuchi/ui's declares none, and the extra names are inert there.
 */
async function presetScale() {
  const [bundu, nyuchi] = await Promise.all(
    PACKAGES.map((dir) =>
      import(resolve(ROOT, dir, "tailwind-preset.mjs")).then(
        (mod) => mod.default.theme.extend,
      ),
    ),
  );
  for (const key of ["fontSize", "maxWidth"]) {
    if (JSON.stringify(bundu[key]) !== JSON.stringify(nyuchi[key])) {
      throw new Error(
        `the two tailwind-preset.mjs files disagree on theme.extend.${key}; ` +
          "theme.css is shared, so they must match",
      );
    }
  }
  return {
    fontSize: bundu.fontSize,
    maxWidth: bundu.maxWidth,
    spacing: bundu.spacing ?? {},
  };
}

const SCALE = await presetScale();

function emitThemeCss(pkg, m) {
  const lines = [];
  const push = (s) => lines.push(s);

  push(THEME_HEADER(pkg));
  push('@import "./tokens.css";');
  push("");
  push("/* Palette — bg-cobalt, text-savanna, border-ember-ui, ... */");
  push("@theme {");
  for (const x of m.minerals) {
    push(`  --color-${x.name}: ${norm(x.light)};`);
    push(`  --color-${x.name}-container: ${norm(x.containerLight)};`);
    push(`  --color-${x.name}-on-container: ${norm(x.onContainerLight)};`);
    push(`  --color-${x.name}-brand: ${norm(x.brand)};`);
    push(`  --color-${x.name}-on-brand: ${norm(x.onBrand)};`);
  }
  push("");
  for (const x of m.heritage) push(`  --color-${x.name}: ${norm(x.light)};`);
  push("");
  for (const x of m.experimental) {
    push(`  --color-${x.name}: ${norm(x.light)};`);
    push(`  --color-${x.name}-container: ${norm(x.containerLight)};`);
    push(`  --color-${x.name}-on-container: ${norm(x.onContainerLight)};`);
    push(`  --color-${x.name}-ui: ${norm(x.uiLight)};`);
  }
  push("");
  push(
    "  /* Fonts, radius and easing — the same values the v3 preset ships. */",
  );
  push('  --font-sans: "Noto Sans", system-ui, sans-serif;');
  push('  --font-serif: "Noto Serif", Georgia, serif;');
  push('  --font-mono: "JetBrains Mono", ui-monospace, monospace;');
  const r = m.canon.radii;
  push(`  --radius-sm: ${r.sm};`);
  push(`  --radius-md: ${r.md};`);
  push(`  --radius-lg: ${r.lg};`);
  push(`  --radius-xl: ${r.xl};`);
  push(`  --radius-2xl: ${r["2xl"]};`);
  push(`  --radius-full: ${r.full};`);
  push(`  --radius-pill: ${r.full};`);
  push("  --ease-soft: cubic-bezier(0.4, 0, 0.2, 1);");
  push("");
  push(
    "  /* Type scale, reading widths and named spacing — read from the v3\n" +
      "     preset (tailwind-preset.mjs), so both Tailwind paths share them. */",
  );
  const cssProp = {
    lineHeight: "line-height",
    letterSpacing: "letter-spacing",
    fontWeight: "font-weight",
  };
  for (const [name, value] of Object.entries(SCALE.fontSize)) {
    const [size, opts = {}] = Array.isArray(value) ? value : [value];
    push(`  --text-${name}: ${size};`);
    for (const [k, v] of Object.entries(opts)) {
      if (!cssProp[k])
        throw new Error(`fontSize.${name}: unsupported option ${k}`);
      push(`  --text-${name}--${cssProp[k]}: ${v};`);
    }
  }
  for (const [name, value] of Object.entries(SCALE.maxWidth)) {
    push(`  --container-${name}: ${value};`);
  }
  for (const [name, value] of Object.entries(SCALE.spacing)) {
    // Numeric keys (18, 88) are already covered by v4's spacing multiplier.
    if (/^\d+$/.test(name)) continue;
    push(`  --spacing-${name}: ${value};`);
  }
  push("}");
  push("");
  push(
    "/* Ladder, status and semantic tokens alias bare variables, so they are\n" +
      "   inlined rather than redefined — no duplicate declaration, one source. */",
  );
  push("@theme inline {");
  for (const s of m.ladder) push(`  --color-${s.name}: var(${s.cssVar});`);
  push(`  --color-surface-muted: var(${m.surfaceMuted.cssVar});`);
  push("");
  for (const s of m.status) push(`  --color-${s.name}: var(${s.cssVar});`);
  push("");
  for (const name of [
    "background",
    "foreground",
    "canvas",
    "ink",
    "card",
    "card-foreground",
    "popover",
    "popover-foreground",
    "primary",
    "primary-foreground",
    "secondary",
    "secondary-foreground",
    "muted",
    "muted-foreground",
    "accent",
    "accent-foreground",
    "destructive",
    "destructive-foreground",
    "border",
    "input",
    "ring",
    "success",
    "warning",
    "error",
    "info",
    "brand-accent",
    "brand-accent-foreground",
  ]) {
    push(`  --color-${name}: var(--${name});`);
  }
  push("}");
  push("");
  return lines.join("\n");
}

/**
 * Flatten every declaration to a literal value per mode, following var()
 * chains. This is the half of tokens.json that mukoko-weather-mobile (Expo,
 * no CSS) and the OG-image / email / PDF generators (Satori cannot resolve
 * CSS variables) consume instead of mirroring hexes by hand.
 */
function flatten(decls, scalarList, mode) {
  const raw = {};
  for (const d of decls) if (!d.heading) raw[d.name] = d[mode];
  for (const s of scalarList) if (!s.heading) raw[s.name] = lit(s.value);

  const seen = new Set();
  const resolveOne = (name) => {
    if (seen.has(name)) throw new Error(`cycle resolving ${name}`);
    const e = raw[name];
    if (!e) throw new Error(`dangling reference ${name}`);
    if (!e.ref) return e.lit;
    seen.add(name);
    const out = resolveOne(e.ref);
    seen.delete(name);
    return out;
  };

  const out = {};
  for (const name of Object.keys(raw)) out[name] = norm(resolveOne(name));
  return out;
}

function emitTokensJson(pkg, m, decls, meta) {
  const scalarList = scalars(m);
  // Hex is lowercased throughout, matching the emitted CSS, so a consumer can
  // string-compare tokens.json against tokens.css. Canon serves uppercase.
  const family = (x, extra = {}) =>
    Object.fromEntries(
      Object.entries({
        light: x.light,
        dark: x.dark,
        cssVar: `--color-${x.name}`,
        ...extra,
      }).map(([k, val]) => [
        k,
        typeof val === "string" && val.startsWith("#") ? norm(val) : val,
      ]),
    );

  return {
    $comment:
      "GENERATED by scripts/generate-tokens.mjs from tokens/canon.snapshot.json. " +
      "Do not edit. `pnpm tokens:check` fails if you do.",
    package: pkg,
    canon: {
      brandSource: meta.brandSource,
      paletteSource: meta.paletteSource,
      version: meta.canonVersion,
      lastUpdated: meta.canonLastUpdated,
      onDiskSourceOfTruth: meta.onDiskSourceOfTruth,
    },
    color: {
      minerals: Object.fromEntries(
        m.minerals.map((x) => [
          x.name,
          family(x, {
            containerLight: x.containerLight,
            containerDark: x.containerDark,
            onContainerLight: x.onContainerLight,
            onContainerDark: x.onContainerDark,
            origin: x.origin,
            symbolism: x.symbolism,
            usage: x.usage,
          }),
        ]),
      ),
      heritage: Object.fromEntries(
        m.heritage.map((x) => [
          x.name,
          family(x, {
            origin: x.origin,
            symbolism: x.symbolism,
            usage: x.usage,
          }),
        ]),
      ),
      experimental: Object.fromEntries(
        m.experimental.map((x) => [
          x.name,
          family(x, {
            containerLight: x.containerLight,
            containerDark: x.containerDark,
            onContainerLight: x.onContainerLight,
            onContainerDark: x.onContainerDark,
            uiLight: x.uiLight,
            uiDark: x.uiDark,
            heptagonIndex: x.heptagonIndex,
          }),
        ]),
      ),
    },
    surface: Object.fromEntries(
      [...m.ladder, m.surfaceMuted].map((s) => [
        s.name,
        {
          light: norm(s.light),
          dark: norm(s.dark),
          cssVar: s.cssVar,
          usage: s.usage,
        },
      ]),
    ),
    status: Object.fromEntries(
      m.status.map((s) => [
        s.name,
        {
          light: norm(s.light),
          dark: norm(s.dark),
          cssVar: s.cssVar,
          usage: s.usage,
        },
      ]),
    ),
    radius: m.canon.radii,
    /* Every custom property resolved to a literal value, var() chains
       followed. Satori / Expo / PDF read this. --wash stays a color-mix()
       expression: it is defined relative to the live brand accent and has no
       single literal. */
    resolved: {
      light: flatten(decls, scalarList, "light"),
      dark: flatten(decls, scalarList, "dark"),
    },
  };
}

/* ------------------------------------------------------------------ *
 * Brand overlays
 *
 * One file per brand, each repointing --primary and --ring and NOTHING else.
 * The brand -> mineral mapping comes from canon's own `ecosystem` table, so
 * these are generated too. Before this change the two packages disagreed:
 * @bundu/ui's brand-bundu.css said copper (canon), @nyuchi/ui's said
 * terracotta. Generating both from one table is how that stops recurring.
 * ------------------------------------------------------------------ */

/**
 * Brands that ship an overlay. Canon's `ecosystem` table supplies the mineral
 * for every one of these.
 */
const OVERLAY_BRANDS = [
  "bundu",
  "nyuchi",
  "mukoko",
  "shamwari",
  "mzizi",
  // Sub-apps that adopt the Mzizi Dashboard Standard (mzizi-registry#404).
  // `events` is Mukoko Events (events.mukoko.com), formerly nhimbe; see
  // DEPRECATED_OVERLAY_ALIASES for the old file name.
  "events",
  "lingo",
  "bushtrade",
  "campfire",
  "news",
  "weather",
  "kweli",
  "learning",
];

/**
 * A bridge for a brand whose canon row is decided but not yet in
 * tokens/canon.snapshot.json: canon's `ecosystem` table reaches `/v1/brand`
 * (and so the snapshot) only once api.mzizi.dev's registry pin moves past the
 * merge that adds the row. An entry here is `{ mineral, note }`, with the note
 * naming the owner decision and the canon row it is recorded in. Once the
 * snapshot carries the row, canon wins, and a canon row that disagrees with an
 * entry here fails the generator rather than silently picking one; remove the
 * entry then.
 *
 * Empty: every overlay brand has its canon row. mzizi (hematite, owner
 * decision 2026-09-30), news, weather, kweli and learning (cobalt, cobalt,
 * malachite, gold; owner decisions 2026-10-04, mzizi-registry#404 and #409)
 * and events (malachite, Mukoko Events, formerly nhimbe; owner decision
 * 2026-10-04, mzizi-registry#411) were bridged here until the snapshot picked
 * them up.
 */
const LOCAL_BRAND_MINERALS = {};

/**
 * Overlay files kept under a retired brand name, each re-exporting the
 * overlay that replaced it so an existing `@import` keeps working. Never
 * import one in new code. Mirrors canon's `aliases` on the replacing row.
 *
 * nhimbe -> events: owner decision, 2026-10-04 (mukoko-dev/nhimbe#155). The
 * nhimbe brand is retired; the events platform is Mukoko Events.
 */
const DEPRECATED_OVERLAY_ALIASES = {
  nhimbe: "events",
};

function brandOverlays(m) {
  const eco = byName(m.canon.ecosystem);
  const families = {
    ...Object.fromEntries(m.minerals.map((x) => [x.name, "mineral"])),
    ...Object.fromEntries(m.heritage.map((x) => [x.name, "heritage tone"])),
  };

  const overlays = OVERLAY_BRANDS.map((brand) => {
    const canonMineral = eco[brand]?.mineral;
    const local = canonMineral ? undefined : LOCAL_BRAND_MINERALS[brand];
    if (
      canonMineral &&
      LOCAL_BRAND_MINERALS[brand] &&
      LOCAL_BRAND_MINERALS[brand].mineral !== canonMineral
    ) {
      throw new Error(
        `canon maps ${brand} to "${canonMineral}" but LOCAL_BRAND_MINERALS ` +
          `says "${LOCAL_BRAND_MINERALS[brand].mineral}" — resolve in canon`,
      );
    }
    const mineral = canonMineral ?? local?.mineral;
    if (!mineral) {
      throw new Error(`canon has no ecosystem row for brand "${brand}"`);
    }
    if (!families[mineral]) {
      throw new Error(`brand ${brand} points at unknown family "${mineral}"`);
    }
    const meta = eco[brand];
    const provenance = local
      ? local.note
      : `Canon (/v1/brand -> ecosystem) maps ${brand} to ${mineral}` +
        (meta?.role ? ` — ${meta.role.toLowerCase()}.` : ".");

    const body = [
      wrapComment(
        `brand-${brand} — ${brand} primary: ${mineral} (${families[mineral]}). ` +
          `${provenance} GENERATED by scripts/generate-tokens.mjs; ` +
          "edit the canon ecosystem table, not this file. Import AFTER " +
          "tokens.css (or globals.css / theme.css) so it wins.",
        0,
      ),
      ":root {",
      `  --primary: var(--color-${mineral});`,
      `  --ring: var(--color-${mineral});`,
      "}",
      ".dark,",
      '[data-theme="dark"] {',
      `  --primary: var(--color-${mineral});`,
      `  --ring: var(--color-${mineral});`,
      "}",
      "",
    ].join("\n");

    return [`styles/brand-${brand}.css`, body, mineral];
  });

  const aliases = Object.entries(DEPRECATED_OVERLAY_ALIASES).map(
    ([alias, target]) => {
      const live = overlays.find(
        ([rel]) => rel === `styles/brand-${target}.css`,
      );
      if (!live) {
        throw new Error(
          `deprecated overlay ${alias} points at "${target}", which ships no overlay`,
        );
      }
      if (OVERLAY_BRANDS.includes(alias)) {
        throw new Error(
          `${alias} is both a live overlay and a deprecated alias`,
        );
      }
      const body = [
        wrapComment(
          `brand-${alias} — DEPRECATED alias of brand-${target}.css. ` +
            `The ${alias} brand is retired (owner decision, 2026-10-04): ` +
            `import brand-${target}.css instead. This file re-exports it so ` +
            "existing imports keep working. GENERATED by " +
            "scripts/generate-tokens.mjs; do not edit.",
          0,
        ),
        `@import "./brand-${target}.css";`,
        "",
      ].join("\n");
      return [`styles/brand-${alias}.css`, body, live[2]];
    },
  );

  return [...overlays, ...aliases];
}

/* ------------------------------------------------------------------ *
 * Tailwind v3 palette module
 *
 * The v3 preset stays — shamwari/site imports it and all four consumers reach
 * it through v4's `@config`. Only its colour map is generated, so adding a
 * family to canon reaches both the v3 and the v4 surface in one command and
 * neither can quietly fall behind the other.
 * ------------------------------------------------------------------ */

function emitPaletteModule(pkg, m) {
  /** Quote an object key only when it is not a bare identifier. */
  const key = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));
  const entry = (name, keys) =>
    keys.length === 0
      ? `  ${key(name)}: "var(--color-${name})",`
      : [
          `  ${key(name)}: {`,
          `    DEFAULT: "var(--color-${name})",`,
          ...keys.map((k) => `    ${key(k)}: "var(--color-${name}-${k})",`),
          "  },",
        ].join("\n");

  const lines = [];
  lines.push(
    `/* ${pkg} — Tailwind v3 colour map. GENERATED FILE — DO NOT EDIT.`,
  );
  lines.push("");
  lines.push(
    "   Generator  scripts/generate-tokens.mjs  (`pnpm tokens:build`)",
  );
  lines.push("   Gate       `pnpm tokens:check`");
  lines.push("");
  lines.push(
    "   Spread into `theme.extend.colors` by ./tailwind-preset.mjs. Every value",
  );
  lines.push(
    "   is a var() into styles/tokens.css — there is no hex in this file, so",
  );
  lines.push("   light/dark and the brand-*.css overlays all keep working. */");
  lines.push("");
  lines.push("export const colors = {");
  lines.push("  /* Seven African Minerals. */");
  for (const x of m.minerals)
    lines.push(entry(x.name, ["container", "on-container"]));
  lines.push("");
  lines.push(
    "  /* Seven heritage tones. NOTE: `indigo` shadows Tailwind's built-in",
  );
  lines.push(
    "     indigo scale — `bg-indigo-500` becomes unavailable, `bg-indigo` is",
  );
  lines.push(
    "     the heritage tone. The estate forbids default-palette utilities",
  );
  lines.push(
    "     anyway (bundu-labs/marketing scripts/check-token-consistency.mjs). */",
  );
  for (const x of m.heritage) lines.push(entry(x.name, []));
  lines.push("");
  lines.push("  /* Seven experimental tones. */");
  for (const x of m.experimental) {
    lines.push(entry(x.name, ["container", "on-container", "ui"]));
  }
  lines.push("");
  lines.push("  /* Nine-step surface ladder. */");
  for (const sfc of m.ladder) {
    lines.push(`  ${key(sfc.name)}: "var(${sfc.cssVar})",`);
  }
  lines.push(`  "surface-muted": "var(${m.surfaceMuted.cssVar})",`);
  lines.push("");
  lines.push("  /* Connectivity status trio. */");
  for (const st of m.status) {
    lines.push(`  ${key(st.name)}: "var(${st.cssVar})",`);
  }
  lines.push("");
  lines.push("  /* Semantic tokens — the shadcn/Tailwind contract. */");
  const semantic = [
    ["background", null],
    ["foreground", null],
    ["canvas", null],
    ["ink", null],
    ["primary", "foreground"],
    ["secondary", "foreground"],
    ["muted", "foreground"],
    ["accent", "foreground"],
    ["destructive", "foreground"],
    ["card", "foreground"],
    ["popover", "foreground"],
    ["border", null],
    ["input", null],
    ["ring", null],
    ["success", null],
    ["warning", null],
    ["error", null],
    ["info", null],
    ["brand-accent", "foreground"],
  ];
  for (const [name, sub] of semantic) {
    if (!sub) {
      lines.push(`  ${key(name)}: "var(--${name})",`);
    } else {
      lines.push(`  ${key(name)}: {`);
      lines.push(`    DEFAULT: "var(--${name})",`);
      lines.push(`    ${key(sub)}: "var(--${name}-${sub})",`);
      lines.push("  },");
    }
  }
  lines.push("};");
  lines.push("");
  lines.push(
    "/* The 21 colour family names, in canon order. Used for the v3 preset's",
  );
  lines.push("   safelist: mineral utilities are often composed from data");
  lines.push("   (`bg-${mineral}`), which Tailwind's scanner cannot see. */");
  lines.push("export const families = [");
  for (const x of [...m.minerals, ...m.heritage, ...m.experimental]) {
    lines.push(`  ${JSON.stringify(x.name)},`);
  }
  lines.push("];");
  lines.push("");
  return lines.join("\n");
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

async function format(source, parser) {
  return prettier.format(source, {
    ...(await prettier.resolveConfig(resolve(ROOT, ".prettierrc"))),
    parser,
  });
}

async function build() {
  const canon = JSON.parse(await readFile(SNAPSHOT, "utf8"));
  const meta = canon._meta;
  const m = buildModel(canon);
  const decls = declarations(m);

  const files = [];
  for (const dir of PACKAGES) {
    const pkgJson = JSON.parse(
      await readFile(resolve(ROOT, dir, "package.json"), "utf8"),
    );
    const pkg = pkgJson.name;
    for (const [rel, body] of brandOverlays(m)) {
      files.push([`${dir}/${rel}`, body]);
    }
    files.push(
      [`${dir}/tailwind-palette.mjs`, emitPaletteModule(pkg, m)],
      [`${dir}/styles/tokens.css`, emitTokensCss(pkg, m, decls, meta)],
      [`${dir}/styles/theme.css`, emitThemeCss(pkg, m)],
      [`${dir}/styles/color-scheme.css`, emitColorSchemeCss(pkg, decls)],
      [
        `${dir}/tokens.json`,
        await format(
          JSON.stringify(emitTokensJson(pkg, m, decls, meta)),
          "json",
        ),
      ],
    );
  }
  return files;
}

async function main() {
  const check = process.argv.includes("--check");
  const files = await build();
  let drifted = 0;

  for (const [rel, content] of files) {
    const path = resolve(ROOT, rel);
    const current = await readFile(path, "utf8").catch(() => null);
    if (current === content) continue;
    if (check) {
      drifted++;
      console.error(
        `DRIFT  ${rel}\n       ${
          current === null
            ? "missing — run `pnpm tokens:build`"
            : "differs from the generator — hand edits to generated files are not kept"
        }`,
      );
    } else {
      await writeFile(path, content);
      console.log(`wrote  ${relative(ROOT, path)}`);
    }
  }

  if (check) {
    if (drifted) {
      console.error(
        `\n${drifted} generated file(s) drifted. Run \`pnpm tokens:build\` and commit.`,
      );
      process.exit(1);
    }
    console.log(`tokens up to date (${files.length} generated files)`);
  }
}

await main();
