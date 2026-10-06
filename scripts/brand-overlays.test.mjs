// The generated brand-*.css overlays, in both packages. Each overlay repoints
// --primary and --ring to one family (and --brand-accent to a second, for a
// brand with an accent) and nothing else, every one is exported,
// and the owner's brand mineral decisions hold (mzizi-registry#404).
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vite-plus/test";

const ROOT = resolve(import.meta.dirname, "..");
const PACKAGES = ["packages/bundu-ui", "packages/ui"];

/** Owner decisions: kweli malachite, learning gold (every Nyuchi brand is
 * gold), news and weather cobalt (2026-10-04); mzizi hematite (2026-09-30). */
const DECIDED = {
  kweli: "malachite",
  learning: "gold",
  news: "cobalt",
  weather: "cobalt",
  nyuchi: "gold",
  mzizi: "hematite",
  // Mukoko Events, formerly nhimbe (owner decision, 2026-10-04,
  // mukoko-dev/nhimbe#155): malachite.
  events: "malachite",
};

/** Owner decision, 2026-10-06: Mukoko Circles is tanzanite (primary, ring)
 * with a terracotta --brand-accent. The only brands with an accent. */
const ACCENTED = { circles: { primary: "tanzanite", accent: "terracotta" } };

/** Retired overlay names, each re-exporting the overlay that replaced it. */
const ALIASES = { nhimbe: "events" };

function overlays(pkg) {
  const dir = resolve(ROOT, pkg, "styles");
  return readdirSync(dir)
    .filter((f) => /^brand-[a-z]+\.css$/.test(f))
    .map((f) => [
      f.slice("brand-".length, -".css".length),
      readFileSync(resolve(dir, f), "utf8"),
    ]);
}

/** The custom properties an overlay sets, with comments removed. */
function declarations(css) {
  return [
    ...css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .matchAll(/(--[a-z-]+)\s*:\s*([^;]+);/g),
  ].map(([, prop, value]) => [prop, value.trim()]);
}

for (const pkg of PACKAGES) {
  describe(`${pkg} brand overlays`, () => {
    const all = overlays(pkg);
    const exportsMap = JSON.parse(
      readFileSync(resolve(ROOT, pkg, "package.json"), "utf8"),
    ).exports;

    test("ships an overlay for every decided brand, on the decided family", () => {
      const byBrand = Object.fromEntries(all);
      for (const [brand, family] of Object.entries(DECIDED)) {
        expect(byBrand[brand], brand).toBeDefined();
        const values = new Set(declarations(byBrand[brand]).map(([, v]) => v));
        expect([...values], brand).toEqual([`var(--color-${family})`]);
      }
    });

    test("gives an accented brand its --brand-accent, light and dark", () => {
      const byBrand = Object.fromEntries(all);
      for (const [brand, { primary, accent }] of Object.entries(ACCENTED)) {
        expect(byBrand[brand], brand).toBeDefined();
        expect(declarations(byBrand[brand]), brand).toEqual([
          ["--primary", `var(--color-${primary})`],
          ["--ring", `var(--color-${primary})`],
          ["--brand-accent", `var(--color-${accent})`],
          ["--primary", `var(--color-${primary})`],
          ["--ring", `var(--color-${primary})`],
          ["--brand-accent", `var(--color-${accent})`],
        ]);
      }
    });

    test("keeps each retired overlay as a re-export of its replacement", () => {
      const byBrand = Object.fromEntries(all);
      for (const [alias, target] of Object.entries(ALIASES)) {
        expect(byBrand[alias], alias).toBeDefined();
        expect(declarations(byBrand[alias]), alias).toEqual([]);
        const imports = [
          ...byBrand[alias]
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .matchAll(/@import\s+"([^"]+)";/g),
        ].map(([, path]) => path);
        expect(imports, alias).toEqual([`./brand-${target}.css`]);
      }
    });

    test("each overlay repoints --primary and --ring only, light and dark", () => {
      for (const [brand, css] of all) {
        if (brand in ALIASES || brand in ACCENTED) continue;
        const decls = declarations(css);
        expect(
          decls.map(([p]) => p),
          brand,
        ).toEqual(["--primary", "--ring", "--primary", "--ring"]);
        expect(new Set(decls.map(([, v]) => v)).size, brand).toBe(1);
      }
    });

    test("exports every overlay", () => {
      for (const [brand] of all) {
        const key = `./styles/brand-${brand}.css`;
        expect(exportsMap[key], key).toBe(key);
      }
    });
  });
}
