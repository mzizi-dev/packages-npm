// Builds the plain-TypeScript modules of @bundu/ui to dist/ as ES modules
// plus .d.ts, so plain Node can import them from node_modules (Node refuses
// to strip types from files under node_modules; nyuchi/packages-npm#45).
//
// Hand-written tooling. It reads the synced sources in src/ and never edits
// them. The .astro and .tsx files are not built: only bundlers consume them,
// and they stay as source.
//
// The synced sources import each other extensionless (`../icons`), which a
// bundler resolves but Node's ESM loader does not. tsc emits the specifiers
// as written, so this script then appends `.js` to every relative specifier
// in dist/ (in the .js and the .d.ts).
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(PKG, "dist");

// `from "./x"`, `import("./x")` and `import "./x"`, relative only.
const SPECIFIER = /(\bfrom\s*|\bimport\s*\(?\s*)(["'])(\.{1,2}\/[^"']+)\2/g;

/** Appends `.js` (or `/index.js`) to a relative specifier that has no extension. */
export function withExtension(spec, fromFile) {
  if (/\.(?:[cm]?js|json|css|astro|tsx?)$/.test(spec)) return spec;
  const target = resolve(dirname(fromFile), spec);
  if (existsSync(`${target}.js`)) return `${spec}.js`;
  if (existsSync(join(target, "index.js"))) return `${spec}/index.js`;
  throw new Error(
    `cannot resolve ${spec} from ${fromFile}: no ${target}.js or index.js`,
  );
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)],
  );
}

export function rewriteDist(dist = DIST) {
  let files = 0;
  for (const file of walk(dist)) {
    if (!/\.(?:js|d\.ts)$/.test(file)) continue;
    const before = readFileSync(file, "utf8");
    const after = before.replace(
      SPECIFIER,
      (_m, kw, q, spec) => `${kw}${q}${withExtension(spec, file)}${q}`,
    );
    if (after !== before) {
      writeFileSync(file, after);
      files++;
    }
  }
  return files;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const tsc = createRequire(join(PKG, "package.json")).resolve(
    "typescript/bin/tsc",
  );
  rmSync(DIST, { recursive: true, force: true });
  execFileSync(process.execPath, [tsc, "-p", "tsconfig.build.json"], {
    cwd: PKG,
    stdio: "inherit",
  });
  console.log(`dist: rewrote relative specifiers in ${rewriteDist()} files`);
}
