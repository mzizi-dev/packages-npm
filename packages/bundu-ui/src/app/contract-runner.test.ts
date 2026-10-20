// The contract runner must fail what it cannot evaluate and catch the defect
// classes the contracts exist for. Each case is a mutation of a passing
// contract or markup, as RFC-0006 §9 measures `mz contract`.
import { describe, expect, test } from "vite-plus/test";

import {
  type Contract,
  evaluateChecks,
  evaluateClauses,
  evaluateDensity,
  evaluatePredicate,
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

describe("predicates", () => {
  // Each value predicate, with a value it holds on and one it fails on. The
  // grammar is the registry's (contracts/schema, RFC-0006); `has` and `not`
  // came with registry #477.
  const value =
    "inline-flex rounded-full bg-[var(--primary)] hover:line-through";
  test.each([
    [
      "is",
      '"inline-flex rounded-full bg-[var(--primary)] hover:line-through"',
      'is "inline-flex"',
    ],
    ["contains", 'contains "rounded"', 'contains "uppercase"'],
    ["has", 'has "rounded-full"', 'has "line-through"'],
    ["not_empty", "not_empty", "not_empty"],
    [
      "in",
      'in "a" "inline-flex rounded-full bg-[var(--primary)] hover:line-through"',
      'in "a" "b"',
    ],
    ["uses", 'uses "--primary"', 'uses "--ring"'],
    ["not", 'not has "line-through"', 'not contains "line-through"'],
  ])(
    "%s holds where it should and fails where it should not",
    (name, holds, fails) => {
      const passing = name === "is" ? `is ${holds}` : holds;
      expect(evaluatePredicate(value, passing)).toEqual({ ok: true });
      // not_empty fails only on an empty value.
      const failing =
        name === "not_empty"
          ? evaluatePredicate("  ", fails)
          : evaluatePredicate(value, fails);
      expect(failing).toEqual({ ok: false });
    },
  );

  test("a malformed predicate is unevaluable, and `not` never turns it into a pass", () => {
    for (const pred of [
      "is inline-flex", // unquoted operand
      'is "a" "b"', // an extra operand
      'contains "open', // a quote left open
      "in", // `in` with no operand
      'has "two tokens"', // `has` takes one class token
      'uses "primary"', // `uses` takes "--token"
      'not_empty "x"', // `not_empty` takes no operand
      'not not is "x"', // one `not` only
      "not", // `not` needs a predicate
      'resembles "x"', // not a predicate
      "not is inline-flex", // `not` of an unevaluable predicate
    ]) {
      expect(evaluatePredicate(value, pred), pred).toHaveProperty(
        "unevaluable",
      );
    }
  });

  test("each clause form holds on the markup it describes and fails on a mutation", () => {
    const cases: [string, string][] = [
      ['when other shows p "Other"', 'when other shows p "Another"'],
      ["uses x", "uses y"],
      ['button "Close" min_height 32', 'button "Close" min_height 48'],
      ['label is "Close"', 'label is "Open"'],
      ['class has "bg-card"', 'class not has "bg-card"'],
    ];
    const withLabel = {
      ...html,
      default: html.default.replace(
        'role="status"',
        'role="status" aria-label="Close"',
      ),
    };
    for (const [holds, fails] of cases) {
      expect(evaluateClauses(withClauses(holds), withLabel), holds).toEqual([]);
      expect(
        evaluateClauses(withClauses(fails), withLabel),
        fails,
      ).toHaveLength(1);
    }
  });

  test("a predicate on an attribute the root does not carry fails, with `not` too", () => {
    expect(evaluateClauses(withClauses('portal is "x"'), html)).toHaveLength(1);
    expect(
      evaluateClauses(withClauses('portal not is "x"'), html),
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
