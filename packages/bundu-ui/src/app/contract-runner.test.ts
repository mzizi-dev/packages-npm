// The contract runner must fail what it cannot evaluate and catch the defect
// classes the contracts exist for. Each case is a mutation of a passing
// contract or markup, as RFC-0006 §9 measures `mz contract`.
import { describe, expect, test } from "vite-plus/test";

import {
  type Contract,
  evaluateChecks,
  evaluateClauses,
  evaluateDensity,
  evaluateTheming,
  heightOf,
} from "../../test/contract-runner";

const base: Contract = {
  name: "app/x",
  title: "X",
  version: "1.0.0",
  states: { default: {}, other: {} },
  contract: 'contract\n  slot is "x"\nend',
  checks: [],
  density: [],
  theming: { tokens: [], brandOverlay: "", statusColours: [] },
  noJs: { script: "none", without: "" },
  props: [],
  slots: [],
  implementations: { astro: null },
};
const html = {
  default:
    '<div data-slot="x" role="status" class="bg-card"><button class="h-8 pointer-coarse:h-11" aria-label="Close">✕</button><a href="/a?b=1&amp;c=2">Go</a></div>',
  other: '<div data-slot="x"><p>Other</p></div>',
};
const withClauses = (...lines: string[]): Contract => ({
  ...base,
  contract: `contract\n${lines.map((l) => `  ${l}`).join("\n")}\nend`,
});

describe("clauses", () => {
  test("hold on the markup they describe", () => {
    expect(
      evaluateClauses(
        withClauses(
          'slot is "x"',
          'role in "status" "alert"',
          'class contains "bg-card"',
          'button "Close" min_height 32',
          'when other shows p "Other"',
        ),
        html,
      ),
    ).toEqual([]);
  });

  test("a wrong value fails", () => {
    expect(evaluateClauses(withClauses('slot is "y"'), html)).toHaveLength(1);
  });

  test("a touch floor below the contract fails", () => {
    expect(
      evaluateClauses(withClauses('button "Close" min_height 44'), html),
    ).toHaveLength(1);
  });

  test("an element no state renders fails", () => {
    expect(
      evaluateClauses(withClauses('button "Open" min_height 32'), html),
    ).toHaveLength(1);
  });

  test("an unknown form, predicate or state fails rather than passing (FM-12)", () => {
    expect(
      evaluateClauses(withClauses("every size height at_least 48"), html),
    ).toHaveLength(1);
    expect(
      evaluateClauses(withClauses('slot resembles "x"'), html),
    ).toHaveLength(1);
    expect(
      evaluateClauses(withClauses('when missing slot is "x"'), html),
    ).toHaveLength(1);
    expect(
      evaluateClauses(withClauses('class uses "primary"'), html),
    ).toHaveLength(1);
  });
});

describe("checks", () => {
  test("count, attr (entities decoded) and text", () => {
    const c: Contract = {
      ...base,
      checks: [
        {
          say: "link",
          select: "div a",
          count: 1,
          attr: { href: "/a?b=1&c=2" },
          text: "Go",
        },
        { say: "no form", select: "form", absent: true },
      ],
    };
    expect(evaluateChecks(c, html)).toEqual([]);
  });

  test("a count mismatch, a missing attribute and an empty match fail", () => {
    const c: Contract = {
      ...base,
      checks: [
        { say: "two links", select: "a", count: 2 },
        { say: "named", select: "a", attr: { "aria-label": true } },
        { say: "a form", select: "form", min: 1 },
      ],
    };
    expect(evaluateChecks(c, html).length).toBeGreaterThanOrEqual(3);
  });
});

describe("density", () => {
  test("reads the spacing scale for both pointers", () => {
    expect(heightOf("h-8 pointer-coarse:h-11")).toBe(32);
    expect(heightOf("h-8 pointer-coarse:h-11", "pointer-coarse:")).toBe(44);
    expect(heightOf("min-h-[48px]")).toBe(48);
    expect(heightOf("sm:h-12 h-auto")).toBeNull();
  });

  test("a coarse height that drifts fails", () => {
    const c: Contract = {
      ...base,
      density: [{ part: "close", select: "button", fine: 32, coarse: 48 }],
    };
    expect(evaluateDensity(c, html)).toHaveLength(1);
  });
});

describe("brand overlay", () => {
  test("a hard-coded mineral or colour fails; a declared status colour passes", () => {
    const bad = {
      default:
        '<div class="bg-gold text-[#5D4037]" style="color: rgb(0 0 0)"></div>',
    };
    // A mineral class, a hex value, a colour function, and the inline style itself.
    expect(evaluateTheming(base, bad)).toHaveLength(4);
    const inline = { default: '<span style="--x: 1"></span>' };
    expect(evaluateTheming(base, inline)).toEqual([
      "[default] an inline style attribute on <span> (needs style-src-attr 'unsafe-inline')",
    ]);
    const status = { default: '<div class="bg-malachite-container"></div>' };
    expect(
      evaluateTheming(
        { ...base, theming: { ...base.theming, statusColours: ["malachite"] } },
        status,
      ),
    ).toEqual([]);
  });
});
