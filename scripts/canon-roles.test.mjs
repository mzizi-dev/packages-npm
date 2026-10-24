import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";

import { parseRoles } from "./fetch-canon.mjs";

const region = (body) =>
  `export const roles = {\n  /* tokens:generated:ts-roles:start */${body}\n  /* tokens:generated:ts-roles:end */\n} as const;\n`;

describe("parseRoles (the registry's generated role region)", () => {
  it("takes colour roles with both themes, sorted, and skips sizes and fonts", () => {
    const ts = region(`
  "tier-otp": {
    kind: "ui",
    cssVar: "--tier-otp",
    light: "#0047AB",
    dark: "#00B0FF",
  },
  scrim: {
    kind: "surface",
    cssVar: "--scrim",
    light: "rgba(0, 0, 0, 0.4)",
    dark: "rgba(0, 0, 0, 0.6)",
  },
  "spacing-touch": {
    kind: "size",
    cssVar: "--size-touch",
    light: "56px",
    dark: "56px",
  },`);
    expect(parseRoles(ts)).toEqual([
      {
        name: "scrim",
        kind: "surface",
        cssVar: "--scrim",
        light: "rgba(0, 0, 0, 0.4)",
        dark: "rgba(0, 0, 0, 0.6)",
      },
      {
        name: "tier-otp",
        kind: "ui",
        cssVar: "--tier-otp",
        light: "#0047AB",
        dark: "#00B0FF",
      },
    ]);
  });

  it("fails loudly on a colour role it cannot read, rather than dropping it", () => {
    const ts = region(`
  primary: {
    kind: "fill",
    cssVar: "--primary",
    light: "var(--x)",
    dark: "#FFFFFF",
  },`);
    expect(() => parseRoles(ts)).toThrow(/primary/);
  });

  it("fails without the region", () => {
    expect(() => parseRoles("export const roles = {}")).toThrow(/ts-roles/);
  });

  it("the committed snapshot carries the roles", () => {
    const snap = JSON.parse(
      readFileSync(
        new URL("../tokens/canon.snapshot.json", import.meta.url),
        "utf8",
      ),
    );
    const names = snap.roles.map((r) => r.name);
    expect(names).toContain("status-error");
    expect(names).toContain("surface-qr");
  });
});
