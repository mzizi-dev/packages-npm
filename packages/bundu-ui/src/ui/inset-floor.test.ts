import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The spacing floor (mzizi-registry#617, #627): text keeps at least 14px of
// inset from the edge of the box that draws it. For a one-line label chip or
// pill (a Badge) only the inline axis is held; its block axis is its line
// height. This scans the React primitives in src/ui for side
// padding under the floor, so a new primitive cannot go under it unnoticed.
//
// These .tsx files are built from the registry's react-* items (they are in
// scripts/registry-map.json) and `react` is only a peer dependency here, so
// they cannot be imported in a test; their class strings are read from source.
const INSET_FLOOR_PX = 14;
const PX_PER_SPACING_UNIT = 4;

const dir = new URL("./", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".tsx"));

function sidePaddings(source: string): { token: string; px: number }[] {
  // `px-<n>` as a class token, with or without a variant prefix (`sm:px-2`).
  return [
    ...source.matchAll(/(?:^|[\s:"'`])px-([0-9]+(?:\.[0-9]+)?)(?![\w.-])/g),
  ].map((m) => ({
    token: `px-${m[1]}`,
    px: Number(m[1]) * PX_PER_SPACING_UNIT,
  }));
}

describe("React primitives keep the inline inset floor", () => {
  it("finds the primitives", () => {
    expect(files).toContain("badge.tsx");
    expect(files).toContain("tooltip.tsx");
  });

  for (const file of files) {
    it(`${file} has no side padding under ${INSET_FLOOR_PX}px`, () => {
      const source = readFileSync(new URL(file, dir), "utf8");
      const under = sidePaddings(source).filter((p) => p.px < INSET_FLOOR_PX);
      expect(under).toEqual([]);
    });
  }

  it("reads the Badge sizes at the floor", () => {
    const source = readFileSync(new URL("badge.tsx", dir), "utf8");
    const sizeBlock = /size:\s*\{([^}]*)\}/.exec(source)?.[1] ?? "";
    const sizes = [...sizeBlock.matchAll(/(\w+):\s*"([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(sizes).toEqual(["sm", "md"]);
  });
});
