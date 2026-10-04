// Contract tests: every app component against its Mzizi component contract.
//
// The contracts are the registry's (mzizi-dev/mzizi-registry, contracts/),
// copied into ../../contracts/ by `pnpm contracts:fetch` and shipped with the
// package. For each component this renders every named state through Astro's
// container API (no framework renderer, as in app.test.ts) and evaluates the
// `contract … end` clauses, the selector checks, the density table and the
// brand-overlay rule. A clause the runner cannot evaluate fails: an
// unevaluable contract must never read as a passing one (RFC-0006 FM-12).
import { readFileSync, readdirSync } from "node:fs";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import {
  type Contract,
  type Rendered,
  declaredProps,
  declaredSlots,
  evaluateChecks,
  evaluateClauses,
  evaluateDensity,
  evaluateTheming,
  hydrate,
} from "../../test/contract-runner";

const contractsDir = new URL("../../contracts/", import.meta.url);
const appDir = new URL(".", import.meta.url);
const pkg = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { exports: Record<string, string> };
const index = JSON.parse(
  readFileSync(new URL("index.json", contractsDir), "utf8"),
) as { contracts: { name: string; version: string; file: string }[] };

const contracts: Contract[] = index.contracts.map(
  (entry) =>
    JSON.parse(
      readFileSync(new URL(entry.file, contractsDir), "utf8"),
    ) as Contract,
);

const components = import.meta.glob<{ default: unknown }>("./*.astro", {
  eager: true,
});

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

type Component = Parameters<AstroContainer["renderToString"]>[0];

async function renderStates(c: Contract): Promise<Rendered> {
  const file = `./${c.title}.astro`;
  const mod = components[file];
  if (!mod) throw new Error(`${c.name}: no ${file}`);
  const out: Rendered = {};
  for (const [name, state] of Object.entries(c.states)) {
    const html = await container.renderToString(mod.default as Component, {
      props: hydrate(state.props),
      slots: state.slots ?? {},
      request: new Request("https://console.example/content/news"),
    });
    out[name] = html.replace(/ data-astro-source-(?:file|loc)="[^"]*"/g, "");
  }
  return out;
}

describe("coverage", () => {
  const astroFiles = readdirSync(appDir)
    .filter((f) => f.endsWith(".astro"))
    .sort();

  test("every app component has exactly one contract, and every contract a component", () => {
    const titles = contracts.map((c) => `${c.title}.astro`).sort();
    expect(titles).toEqual(astroFiles);
  });

  test("the index lists every contract file, at its version", () => {
    const files = readdirSync(new URL("app/", contractsDir))
      .filter((f) => f.endsWith(".contract.json"))
      .map((f) => `app/${f}`)
      .sort();
    expect(index.contracts.map((e) => e.file).sort()).toEqual(files);
    for (const [i, entry] of index.contracts.entries()) {
      expect(contracts[i]?.version, entry.name).toBe(entry.version);
      expect(contracts[i]?.name).toBe(entry.name);
    }
  });

  test("every contract's Astro export is a package export of this file", () => {
    for (const c of contracts) {
      const exp = c.implementations.astro?.export ?? "";
      const sub = `./${exp.replace(/^@bundu\/ui\//, "")}`;
      expect(pkg.exports[sub], c.name).toBe(`./src/${sub.slice(2)}`);
    }
  });
});

describe.each(contracts.map((c) => [c.title, c] as const))(
  "%s keeps its contract",
  (_title, c) => {
    const source = readFileSync(new URL(`${c.title}.astro`, appDir), "utf8");
    let rendered: Rendered;
    beforeAll(async () => {
      rendered = await renderStates(c);
    });

    test("its props are the contract's props", () => {
      const declared = declaredProps(source);
      const named = c.props.map((p) => p.name);
      if (declared === null) {
        // `type Props = HTMLAttributes<…>`: a pass-through, declared as one
        // `...attributes` row.
        expect(named).toEqual(["...attributes"]);
      } else {
        expect([...declared].sort()).toEqual([...named].sort());
      }
    });

    test("its slots are the contract's slots", () => {
      expect(declaredSlots(source)).toEqual(c.slots.map((s) => s.name).sort());
    });

    test("every clause holds", () => {
      expect(evaluateClauses(c, rendered)).toEqual([]);
    });

    test("every check holds", () => {
      expect(evaluateChecks(c, rendered)).toEqual([]);
    });

    test("density: fine and coarse pointer heights", () => {
      expect(evaluateDensity(c, rendered)).toEqual([]);
    });

    test("brand overlay: no colour values, minerals only as status colours", () => {
      expect(evaluateTheming(c, rendered)).toEqual([]);
    });

    test("no-JS: the script the contract allows, and no islands", () => {
      const scripts = source.match(/<script\b/g) ?? [];
      expect(scripts.length).toBe(c.noJs.script === "none" ? 0 : 1);
      for (const html of Object.values(rendered)) {
        expect(html).not.toMatch(/<astro-island/i);
      }
      expect(source).not.toMatch(/client:(load|idle|visible|media|only)/);
    });
  },
);
