// Guards nyuchi/packages-npm#45: every plain-TypeScript export must import
// under plain `node`, with no loader and no flags, from node_modules. Node
// refuses to strip types from files under node_modules
// (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING), so an export that points at
// `.ts` source breaks every consumer that is not a bundler.
//
// The package is copied into a scratch `node_modules/@bundu/ui` (a symlink
// would resolve back out of node_modules) and its dependencies are linked
// beside it, which is the layout a consumer has after `npm install`.
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8")) as {
  exports: Record<string, string | { types?: string; import?: string }>;
  dependencies: Record<string, string>;
};

const targetOf = (v: string | { import?: string }) =>
  typeof v === "string" ? v : (v.import ?? "");

// Exports whose published target is a TypeScript module (not .astro/.tsx,
// which only bundlers consume). `.d.ts` is a declaration, not source.
const isTsSource = (t: string) => /\.ts$/.test(t) && !t.endsWith(".d.ts");
const tsExports = Object.entries(pkg.exports).filter(([, v]) => {
  const t = targetOf(v);
  return t.endsWith(".js") || isTsSource(t);
});

let root = "";

beforeAll(() => {
  if (!existsSync(join(PKG, "dist"))) {
    throw new Error("dist/ is missing: run `pnpm --filter @bundu/ui build`");
  }
  root = mkdtempSync(join(tmpdir(), "bundu-ui-node-"));
  const modules = join(root, "node_modules");
  const self = join(modules, "@bundu", "ui");
  mkdirSync(self, { recursive: true });
  for (const f of ["package.json", "dist", "src"]) {
    cpSync(join(PKG, f), join(self, f), { recursive: true });
  }
  for (const dep of Object.keys(pkg.dependencies)) {
    const link = join(modules, dep);
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(realpathSync(join(PKG, "node_modules", dep)), link, "junction");
  }
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("plain-Node imports of the .ts exports", () => {
  it("finds the .ts exports", () => {
    expect(tsExports.length).toBeGreaterThanOrEqual(11);
  });

  it("points no export, nor main/types, at .ts source", () => {
    for (const [name, v] of Object.entries(pkg.exports)) {
      const t = targetOf(v);
      const types = typeof v === "string" ? "" : (v.types ?? "");
      if (name.endsWith(".astro") || t.endsWith(".tsx")) continue;
      expect(isTsSource(t), `${name} -> ${t}`).toBe(false);
      expect(isTsSource(types), `${name} types -> ${types}`).toBe(false);
    }
  });

  it.each(tsExports.map(([name]) => name))(
    "imports %s with plain node",
    (name) => {
      const spec = name === "." ? "@bundu/ui" : `@bundu/ui/${name.slice(2)}`;
      const out = execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `const m = await import(${JSON.stringify(spec)}); console.log(Object.keys(m).length)`,
        ],
        {
          cwd: root,
          encoding: "utf8",
          env: { ...process.env, NODE_OPTIONS: "" },
        },
      );
      expect(Number(out.trim())).toBeGreaterThan(0);
    },
  );
});
