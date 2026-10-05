// scripts/registry-imports.mjs: the import rewriting between the registry's
// flat layout and the packages' published layout. Every mapped file must
// survive the round trip unchanged, or the build from the registry would not
// reproduce the package.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vite-plus/test";

import { toPackage, toRegistry } from "./registry-imports.mjs";

const map = JSON.parse(
  readFileSync(new URL("./registry-map.json", import.meta.url), "utf8"),
);
const ROOTS = {
  "bundu-ui": new URL("../packages/bundu-ui/", import.meta.url),
  "bundu-server": new URL("../packages/bundu-server/", import.meta.url),
};

describe("registry-imports", () => {
  test("maps a flat registry import to the package layout", () => {
    const src = `import Card from "./card.astro";\nimport { cn } from "./ui-utils";\nimport { withParams } from "./server-table";\n`;
    expect(
      toPackage(
        src,
        "n6-pages/app-data-table.astro",
        "bundu-ui",
        "src/app/DataTable.astro",
        map,
      ),
    ).toBe(
      `import Card from "./Card.astro";\nimport { cn } from "../lib/utils";\nimport { withParams } from "../lib/table";\n`,
    );
  });

  test("keeps a .js suffix for the server package's NodeNext imports", () => {
    expect(
      toPackage(
        `import { getCookie } from "./server-cookies.js";`,
        "n4-safety/server-flash.ts",
        "bundu-server",
        "src/flash.ts",
        map,
      ),
    ).toBe(`import { getCookie } from "./cookies.js";`);
  });

  test("maps a registry brand asset to the package's assets", () => {
    expect(
      toPackage(
        `import m from "./assets/nyuchi-mark-light.png";`,
        "n3-brand/app-brand-mark.astro",
        "bundu-ui",
        "src/app/BrandMark.astro",
        map,
      ),
    ).toBe(`import m from "../../assets/brand/nyuchi-mark-light.png";`);
  });

  test("refuses an import the map cannot place", () => {
    expect(() =>
      toPackage(
        `import X from "./not-mapped.astro";`,
        "n6-pages/x.astro",
        "bundu-ui",
        "src/X.astro",
        map,
      ),
    ).toThrow(/registry-map\.json/);
  });

  test.each(Object.entries(map.components))(
    "%s survives the round trip",
    (_name, e) => {
      const src = readFileSync(new URL(e.path, ROOTS[e.package]), "utf8");
      const reg = toRegistry(src, e.registry, e.package, e.path, map);
      expect(toPackage(reg, e.registry, e.package, e.path, map)).toBe(src);
      // Registry files only import flat.
      expect(reg).not.toMatch(/from\s*["']\.\.\//);
    },
  );
});
