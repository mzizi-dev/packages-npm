import { describe, expect, it } from "vite-plus/test";

import {
  declarations,
  densityCss,
  topLevelBlocks,
} from "./registry-density.mjs";

const SOURCE = `
@import "tailwindcss";
@theme inline {
  --color-base: var(--base);
  --spacing-control: max( var(--size-control), var(--control-floor) ); /* note { } */
  --spacing-touch-min: var(--target-floor);
  --spacing-inset-floor: var(--inset-floor);
  --spacing-gap-floor: var(--gap-floor);
  --spacing-control-sm: var(--size-control-sm);
  --spacing-control-lg: var(--size-control-lg);
  --spacing-control-icon: var(--size-control-icon);
  --spacing-field: var(--size-field);
  --text-xs: var(--fs-caption);
  --text-base: var(--fs-body);
}
:root {
  --background: #fff;
  --size-control: 3.0625rem;
  --size-control-sm: 3.0625rem;
  --size-control-lg: 3.5rem;
  --size-control-icon: 3.0625rem;
  --size-field: 3.0625rem;
  --target-floor: 3.0625rem;
  --control-floor: 3.0625rem;
  --inset-floor: 0.875rem;
  --gap-floor: 0.4375rem;
  --leading-floor: 1.5;
  --fs-body: 1.0625rem;
  --fs-caption: 0.875rem;
}
/* the hit area */
@layer base { .hit-area::after { width: max(100%, var(--target-floor)); } }
/* the spacing floor */
@layer base { body { line-height: max(var(--lh-body), var(--leading-floor)); } dialog { padding: var(--inset-floor); } }
@media (min-width: 64rem) { :root { --control-floor: 1.75rem; } }
@media (min-width: 48rem) { :root { --size-control: 3rem; } }
:root[data-mzizi-sizes="legacy"] { --target-floor: 3rem; }
[data-brand="x"] { --primary: red; }
`;

describe("registry-density", () => {
  it("splits top-level blocks and ignores braces in comments", () => {
    const blocks = topLevelBlocks(SOURCE);
    expect(blocks.map((b) => b.prelude)).toContain("@theme inline");
    expect(blocks.at(-1).prelude).toBe('[data-brand="x"]');
  });

  it("reads declarations with nested parentheses", () => {
    const d = declarations("--a: max( var(--b), 1px ); --c: 2px;");
    expect(d).toEqual([
      { name: "--a", value: "max( var(--b), 1px )" },
      { name: "--c", value: "2px" },
    ]);
  });

  it("keeps the floor and density layers and drops the palette", () => {
    const out = densityCss(SOURCE, "abcdef1234567890");
    expect(out).toContain("--spacing-control: max( var(--size-control)");
    expect(out).toContain("--fs-body: 1.0625rem;");
    expect(out).toContain(".hit-area::after");
    expect(out).toContain("--inset-floor: 0.875rem;");
    expect(out).toContain("--spacing-gap-floor: var(--gap-floor);");
    expect(out).toContain("max(var(--lh-body), var(--leading-floor))");
    expect(out).toContain('data-mzizi-sizes="legacy"');
    expect(out).toContain("abcdef123456");
    expect(out).not.toContain("--color-base");
    expect(out).not.toContain("--background");
    expect(out).not.toContain("data-brand");
  });

  it("throws when the registry drops the spacing floor", () => {
    expect(() =>
      densityCss(SOURCE.replace("--inset-floor: 0.875rem;", ""), "abc"),
    ).toThrow(/--inset-floor/);
  });

  it("throws when the registry drops a role the components use", () => {
    expect(() =>
      densityCss(SOURCE.replace("--spacing-field", "--spacing-gone"), "abc"),
    ).toThrow(/--spacing-field/);
  });
});
