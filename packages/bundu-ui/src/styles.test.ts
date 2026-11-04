// The package stylesheet, compiled with Tailwind v4 the way an app does:
// `@import "tailwindcss"; theme.css; globals.css`. It holds the Bundu floor
// (mzizi-registry 4.23.0) and the spacing floor (4.24.0, #617) to what the components need: the size utilities
// they use resolve, the body, caption and hit-area floors are in, the legacy
// alias is there, and the hand-written globals.css classes sit at or above it.
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { compile } from "tailwindcss";
import { beforeAll, describe, expect, it } from "vite-plus/test";

const styles = resolve(dirname(fileURLToPath(import.meta.url)), "../styles");
const require = createRequire(import.meta.url);

const UTILITIES = [
  "h-control",
  "h-control-sm",
  "h-control-lg",
  "size-control-icon",
  "h-field",
  "min-h-touch-min",
  "px-inset-floor",
  "p-inset-floor",
  "gap-gap-floor",
  "text-xs",
  "text-sm",
  "text-base",
  "text-base-foreground",
  "bg-base",
  "border-base",
  "text-body",
];

let css = "";

beforeAll(async () => {
  const compiler = await compile(
    `@import "tailwindcss"; @import "./theme.css"; @import "./globals.css";`,
    {
      base: styles,
      async loadStylesheet(id, base) {
        const path =
          id === "tailwindcss"
            ? require.resolve("tailwindcss/index.css")
            : resolve(base, id);
        return {
          path,
          base: dirname(path),
          content: readFileSync(path, "utf8"),
        };
      },
    },
  );
  css = compiler.build(UTILITIES);
});

const flat = (s: string) => s.replace(/\s+/g, " ");

/** The first declaration of `--name` in the compiled CSS: the mobile default. */
function rootDefaults(): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of flat(css).matchAll(/(--[a-z0-9-]+):\s*([^;{}]+);/g)) {
    if (!map.has(m[1])) map.set(m[1], m[2].trim());
  }
  return map;
}

/** Evaluate a length: px, rem, `var(--x)` through `vars`, and `max(a, b)`. */
function px(value: string, vars: Map<string, string>): number {
  const v = value.replace(/\s+/g, " ").trim();
  const max = /^max\((.*)\)$/.exec(v);
  if (max) {
    const parts: string[] = [];
    let depth = 0;
    let cur = "";
    for (const ch of max[1]) {
      if (ch === "(") depth += 1;
      if (ch === ")") depth -= 1;
      if (ch === "," && depth === 0) {
        parts.push(cur);
        cur = "";
      } else cur += ch;
    }
    parts.push(cur);
    return Math.max(...parts.map((p) => px(p, vars)));
  }
  const ref = /^var\(\s*(--[a-z0-9-]+)\s*\)$/.exec(v);
  if (ref) {
    const next = vars.get(ref[1]);
    if (next === undefined) throw new Error(`${ref[1]} is not defined`);
    return px(next, vars);
  }
  const calc = /^calc\(\s*var\(--spacing\)\s*\*\s*([\d.]+)\s*\)$/.exec(v);
  if (calc)
    return px(vars.get("--spacing") ?? "0.25rem", vars) * Number(calc[1]);
  const rem = /^([\d.]+)rem$/.exec(v);
  if (rem) return Number(rem[1]) * 16;
  const pixels = /^([\d.]+)px$/.exec(v);
  if (pixels) return Number(pixels[1]);
  throw new Error(`cannot evaluate "${value}"`);
}

/** One declaration of a compiled rule: `.selector { prop: value }`. */
function declared(selector: string, prop: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(flat(css));
  if (!rule) throw new Error(`no rule for ${selector}`);
  const decl = new RegExp(`(?:^|[; ])${prop}:\\s*([^;]+)`).exec(rule[1]);
  if (!decl) throw new Error(`${selector} has no ${prop}`);
  return decl[1];
}

describe("text-base is the 17px body size, base stays a colour", () => {
  it("text-base sets 17px and the body line height", () => {
    const vars = rootDefaults();
    expect(px(declared(".text-base", "font-size"), vars)).toBe(17);
    expect(declared(".text-base", "line-height")).toBe("var(--lh-body)");
    expect(declared(".text-base", "font-size")).not.toMatch(/--color-base/);
    expect(px(declared(".text-body", "font-size"), vars)).toBe(17);
  });

  it("the base colour utilities still compile to the colour", () => {
    expect(declared(".bg-base", "background-color")).toMatch(/--base/);
    expect(declared(".border-base", "border-color")).toMatch(/--base/);
  });

  it("text-base compiles to no colour", () => {
    // the single-class colour rule is outranked by the doubled-class reset
    expect(flat(css)).toMatch(
      /\.text-base \{[^}]*&\.text-base \{ color: inherit; \}/,
    );
  });
});

describe("the size utilities resolve", () => {
  it.each([
    [".h-control", "height"],
    [".h-control-sm", "height"],
    [".h-control-lg", "height"],
    [".size-control-icon", "height"],
    [".size-control-icon", "width"],
    [".h-field", "height"],
    [".min-h-touch-min", "min-height"],
  ])("%s sets %s", (selector, prop) => {
    expect(declared(selector, prop)).toMatch(/var\(/);
  });

  it("is at the 49px floor on touch, and 49px for the hit region everywhere", () => {
    const vars = rootDefaults();
    for (const [selector, prop] of [
      [".h-control", "height"],
      [".h-control-sm", "height"],
      [".h-field", "height"],
      [".size-control-icon", "height"],
      [".min-h-touch-min", "min-height"],
    ] as const) {
      expect(px(declared(selector, prop), vars), selector).toBe(49);
    }
    expect(px(declared(".h-control-lg", "height"), vars)).toBe(56);
  });
});

describe("the Bundu floor", () => {
  it("is body 17px and captions 14px, and text-xs follows the caption", () => {
    const vars = rootDefaults();
    expect(px("var(--fs-body)", vars)).toBe(17);
    expect(px("var(--fs-caption)", vars)).toBe(14);
    expect(px("var(--fs-small)", vars)).toBe(14);
    expect(px(declared(".text-xs", "font-size"), vars)).toBe(14);
    expect(px(declared(".text-sm", "font-size"), vars)).toBe(14);
    expect(readFileSync(resolve(styles, "density.css"), "utf8")).toMatch(
      /--text-base: var\( ?--fs-body ?\)/,
    );
  });

  it("holds the hit region at 49px and draws no control under 28px", () => {
    const vars = rootDefaults();
    expect(px("var(--target-floor)", vars)).toBe(49);
    expect(px("var(--control-floor)", vars)).toBe(49);
    expect(flat(css)).toMatch(/--control-floor: 1\.75rem/); // desktop density: 28px
    for (const [name, value] of vars) {
      if (/^--size-(?!control-dense|inset-floor|gap-floor)/.test(name)) {
        expect(px(value, vars), name).toBeGreaterThanOrEqual(49);
      }
    }
  });

  it("has the hit-area rule, growing the hit region with a pseudo-element", () => {
    const text = flat(css);
    expect(text).toMatch(/\.hit-area[^{]*::after \{[^}]*content: ""/);
    expect(text).toMatch(
      /width: max\(100%, var\(--target-floor\)\); height: max\(100%, var\(--target-floor\)\)/,
    );
    expect(text).toMatch(/min-height: var\(--target-floor\)/); // menu rows
  });

  it("has the tablet and desktop density layers", () => {
    const text = flat(css);
    expect(text).toMatch(
      /@media \(min-width: 64rem\) and \(pointer: fine\) and \(hover: hover\)/,
    );
    expect(text).toMatch(/@media \(min-width: 48rem\)/);
  });

  it('keeps the legacy alias: data-mzizi-sizes="legacy" restores the old sizes', () => {
    const text = flat(css);
    const legacy = /:root\[data-mzizi-sizes="legacy"\] \{([^}]*)\}/.exec(text);
    expect(legacy).not.toBeNull();
    expect(legacy![1]).toMatch(/--target-floor: 3rem/);
    expect(legacy![1]).toMatch(/--fs-body: 1rem/);
    expect(legacy![1]).toMatch(/--fs-caption: 0\.75rem/);
  });
});

describe("styles/globals.css classes are not under the floor", () => {
  it.each([".btn-primary", ".btn-secondary", ".btn-outline", ".btn-ghost"])(
    "%s is drawn at 49px or more",
    (selector) => {
      expect(
        px(declared(selector, "height"), rootDefaults()),
      ).toBeGreaterThanOrEqual(49);
    },
  );

  it(".input is drawn at 49px or more, desktop included", () => {
    expect(
      px(declared(".input", "height"), rootDefaults()),
    ).toBeGreaterThanOrEqual(49);
    // --size-field stays 49px in the desktop layer too.
    expect(flat(css)).toMatch(/--size-field: 3\.0625rem/);
  });

  it("is imported by globals.css and exported by the package", () => {
    expect(readFileSync(resolve(styles, "globals.css"), "utf8")).toMatch(
      /@import "\.\/density\.css"/,
    );
    const pkg = JSON.parse(
      readFileSync(resolve(styles, "../package.json"), "utf8"),
    );
    expect(pkg.exports["./styles/density.css"]).toBe("./styles/density.css");
  });
});

describe("the spacing floor (#617)", () => {
  const density = readFileSync(resolve(styles, "density.css"), "utf8");

  it("sets the floors: inset 14px, gap 7px, body leading 1.5", () => {
    const vars = rootDefaults();
    expect(px("var(--inset-floor)", vars)).toBe(14);
    expect(px("var(--gap-floor)", vars)).toBe(7);
    expect(vars.get("--leading-floor")).toBe("1.5");
    expect(px(declared(".px-inset-floor", "padding-inline"), vars)).toBe(14);
    expect(px(declared(".p-inset-floor", "padding"), vars)).toBe(14);
    expect(px(declared(".gap-gap-floor", "gap"), vars)).toBe(7);
  });

  it("applies the floor in the base layer", () => {
    // Anchored on the rules' own selectors, not on the declarations: the
    // px-inset-floor, p-inset-floor and gap-gap-floor utilities compile to the
    // same declarations, so a bare declaration match would pass without them.
    const text = flat(css);
    expect(text).toMatch(
      /body \{ line-height: max\(var\(--lh-body\), var\(--leading-floor\)\)/,
    );
    expect(text).toMatch(
      /\[role="tab"\][^{]*\{ padding-inline: var\(--inset-floor\)/,
    ); // controls with text
    expect(text).toMatch(
      /dialog,[^{]*\[role="alertdialog"\][^{]*\{ padding: var\(--inset-floor\)/,
    ); // dialogs, alert surfaces, cards
    // A bare role="alert" or role="status" is inline error or live-region text,
    // not a surface, so it takes no surface padding (mzizi-registry 4.25.0,
    // "Base layer corrected"). A data-slot="alert" box still does.
    expect(text).not.toMatch(
      /\[role="(alert|status)"\][^{]*\{ padding: var\(--inset-floor\)/,
    );
    expect(text).toMatch(/\[role="toolbar"\][^{]*\{ gap: var\(--gap-floor\)/); // toolbars, groups, lists
  });

  it("keeps the legacy opt-out, which zeroes the floors", () => {
    const legacy = /:root\[data-mzizi-sizes="legacy"\] \{([^}]*)\}/.exec(
      flat(css),
    );
    expect(legacy).not.toBeNull();
    expect(legacy![1]).toMatch(/--inset-floor: 0px/);
    expect(legacy![1]).toMatch(/--gap-floor: 0px/);
    expect(legacy![1]).toMatch(/--leading-floor: 1;/);
  });

  it("is not lowered by any other stylesheet, brand pack or density layer", () => {
    const FLOOR = /--(?:inset-floor|gap-floor|leading-floor)\s*:/;
    for (const name of readdirSync(styles).filter((f) => f.endsWith(".css"))) {
      if (name === "density.css") continue;
      expect(
        readFileSync(resolve(styles, name), "utf8"),
        `${name} must not redefine a spacing floor`,
      ).not.toMatch(FLOOR);
    }
    // in density.css only the root default and the legacy opt-out set them,
    // never a media (density) layer
    const media = [...density.matchAll(/@media[^{]*\{([\s\S]*?\n\})/g)].map(
      (m) => m[1],
    );
    expect(media.length).toBeGreaterThan(0);
    for (const block of media) expect(block).not.toMatch(FLOOR);
    const decls = [
      ...density.matchAll(/(--(?:inset-floor|gap-floor|leading-floor)):/g),
    ].map((m) => m[1]);
    expect(decls.sort()).toEqual(
      [
        "--gap-floor",
        "--gap-floor",
        "--inset-floor",
        "--inset-floor",
        "--leading-floor",
        "--leading-floor",
      ].sort(),
    );
  });

  it("holds the hand-written globals.css classes to it", () => {
    const vars = rootDefaults();
    for (const sel of [
      ".badge",
      ".badge-primary",
      ".badge-success",
      ".badge-warning",
      ".badge-info",
      ".badge-accent",
      ".badge-premium",
    ]) {
      expect(
        px(declared(sel, "padding-inline"), vars),
        sel,
      ).toBeGreaterThanOrEqual(14);
    }
    for (const sel of [".btn-primary", ".btn-secondary", ".btn-outline"]) {
      expect(
        px(declared(sel, "padding-inline"), vars),
        sel,
      ).toBeGreaterThanOrEqual(14);
    }
    expect(
      px(declared(".btn-ghost", "padding-inline"), vars),
    ).toBeGreaterThanOrEqual(14);
    expect(
      px(declared(".input", "padding-inline"), vars),
    ).toBeGreaterThanOrEqual(14);
    for (const sel of [
      ".btn-primary",
      ".btn-secondary",
      ".btn-outline",
      ".btn-ghost",
    ]) {
      expect(px(declared(sel, "gap"), vars), sel).toBeGreaterThanOrEqual(7);
    }
  });
});
