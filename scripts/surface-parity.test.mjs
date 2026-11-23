// The semantic surfaces and text colours @bundu/ui ships are the registry's:
// the roles in tokens/canon.snapshot.json (mzizi-registry
// lib/tokens/roles.source.ts, which styles/pattern/tokens.css and the N1
// globals.css are built from) and canon's backgrounds (api.mzizi.dev
// /v1/brand). Until 0.18.0 the package carried its own card (#ffffff),
// popover (= card), muted (= container) and text colours; this holds it to
// the registry so that drift cannot come back unnoticed.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";

const read = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const canon = read("../tokens/canon.snapshot.json");
const tokens = read("../packages/bundu-ui/tokens.json");
const role = Object.fromEntries(canon.roles.map((r) => [r.name, r]));
const bg = Object.fromEntries(canon.backgrounds.map((b) => [b.name, b]));

const ROLES = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "muted",
  "muted-foreground",
];

describe("surfaces and text follow the registry", () => {
  it.each(ROLES)("--%s is the registry role in both themes", (name) => {
    const r = role[name];
    expect(r, name).toBeDefined();
    for (const theme of ["light", "dark"]) {
      expect(tokens.resolved[theme][`--${name}`], `${theme} --${name}`).toBe(
        r[theme].toLowerCase(),
      );
    }
  });

  it("card is surface, popover is overlay and muted is canon muted", () => {
    for (const theme of ["light", "dark"]) {
      const t = tokens.resolved[theme];
      expect(t["--card"]).toBe(bg.surface[theme].toLowerCase());
      expect(t["--popover"]).toBe(bg.overlay[theme].toLowerCase());
      expect(t["--muted"]).toBe(bg.muted[theme].toLowerCase());
      expect(t["--void"]).toBe(bg.void[theme].toLowerCase());
      expect(t["--pitch"]).toBe(bg.pitch[theme].toLowerCase());
    }
  });
});
