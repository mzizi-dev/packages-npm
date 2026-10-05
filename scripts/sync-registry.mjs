#!/usr/bin/env node
/**
 * sync-registry — build the component sources of @bundu/ui and @bundu/server
 * FROM the Mzizi registry (mzizi-dev/mzizi-registry), the single source of
 * every component in every format.
 *
 * The registry holds each component's `.astro` (beside its `.tsx` and `.rs`),
 * the framework-free `.ts` modules they use, the brand assets they import,
 * the component contracts and the contract runner. This repo ships them in
 * the packages' published layout: `scripts/registry-map.json` names the
 * package file each registry item becomes, and scripts/registry-imports.mjs
 * rewrites the registry's flat imports (`./button.astro`, `./ui-utils`) into
 * that layout (`./Button.astro`, `../lib/utils`). Nothing else changes.
 *
 * The registry commit is pinned in `scripts/registry-ref.json`. Move it in a
 * pull request: the diff is the review.
 *
 *   node scripts/sync-registry.mjs            write every mapped file  (pnpm registry:sync)
 *   node scripts/sync-registry.mjs --check    write nothing; fail on drift (pnpm registry:check)
 *   ... --from <dir>                          read a local registry checkout instead of GitHub
 *
 * --check also fails if a package holds a component source that is not in
 * the map: a hand-authored `.astro` here is a fork of the registry.
 *
 * Never edit a mapped file in this repo. Change the registry, bump the pin,
 * run this.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { safeRef } from "./contract-paths.mjs";
import { toPackage } from "./registry-imports.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES = {
  "bundu-ui": join(ROOT, "packages/bundu-ui"),
  "bundu-server": join(ROOT, "packages/bundu-server"),
};
/** Registry files that are not components but ship with @bundu/ui. */
const EXTRA = [
  {
    registry: "contracts/runner.ts",
    package: "bundu-ui",
    path: "test/contract-runner.ts",
  },
];

const args = process.argv.slice(2);
const check = args.includes("--check");
const fromIdx = args.indexOf("--from");
const from = fromIdx === -1 ? null : resolve(args[fromIdx + 1] ?? "");
const map = JSON.parse(
  readFileSync(join(ROOT, "scripts/registry-map.json"), "utf8"),
);
const pin = JSON.parse(
  readFileSync(join(ROOT, "scripts/registry-ref.json"), "utf8"),
);
const ref = safeRef(pin.ref);

/** A file from the registry, at the pinned ref (or the local checkout). */
async function read(path, binary = false) {
  if (from) {
    const buf = readFileSync(join(from, path));
    return binary ? buf : buf.toString("utf8");
  }
  const url = `https://raw.githubusercontent.com/mzizi-dev/mzizi-registry/${ref}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return binary ? Buffer.from(await res.arrayBuffer()) : res.text();
}

const SAFE =
  /^(?:n\d+-[a-z]+(?:-[a-z]+)*\/[A-Za-z0-9._-]+|assets\/[A-Za-z0-9._-]+|contracts\/[a-z.-]+)$/;
const OUT = /^(?:src|test|assets)\/[A-Za-z0-9/._-]+$/;
function dest(pkg, path) {
  if (!PACKAGES[pkg] || !OUT.test(path) || path.split("/").includes("..")) {
    throw new Error(`refusing destination ${pkg}:${path}`);
  }
  return join(PACKAGES[pkg], path);
}

const outputs = [];
for (const [name, e] of Object.entries(map.components)) {
  if (!SAFE.test(e.registry))
    throw new Error(`${name}: refusing registry path ${e.registry}`);
  const source = await read(`components/registry/${e.registry}`);
  outputs.push({
    file: dest(e.package, e.path),
    body: toPackage(source, e.registry, e.package, e.path, map),
  });
}
for (const [key, a] of Object.entries(map.assets)) {
  if (!SAFE.test(key)) throw new Error(`refusing asset path ${key}`);
  outputs.push({
    file: dest(a.package, a.path),
    body: await read(`components/registry/${key}`, true),
  });
}
for (const x of EXTRA) {
  outputs.push({ file: dest(x.package, x.path), body: await read(x.registry) });
}

let drift = 0;
for (const { file, body } of outputs) {
  const current = existsSync(file) ? readFileSync(file) : null;
  const want = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
  if (current && current.equals(want)) continue;
  const rel = relative(ROOT, file);
  if (check) {
    console.error(
      `drift: ${rel} differs from mzizi-registry at ${ref.slice(0, 12)}`,
    );
    drift += 1;
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, want);
    console.log(`wrote ${rel}`);
  }
}

// No hand-authored component source: every .astro in a package is mapped.
const mapped = new Set(outputs.map((o) => o.file));
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)],
  );
}
for (const pkg of Object.values(PACKAGES)) {
  const src = join(pkg, "src");
  if (!existsSync(src)) continue;
  for (const file of walk(src)) {
    if (file.endsWith(".astro") && !mapped.has(file)) {
      console.error(
        `unmapped: ${relative(ROOT, file)} is not built from the registry. Move it to mzizi-registry and add it to scripts/registry-map.json.`,
      );
      drift += 1;
    }
  }
}

if (drift > 0) {
  console.error(
    `\n${drift} file(s) out of step with mzizi-registry@${ref.slice(0, 12)}. ` +
      "Run `pnpm registry:sync` (never edit these files here: change the registry and bump scripts/registry-ref.json).",
  );
  process.exit(1);
}
console.log(
  check
    ? `ok: ${outputs.length} files match mzizi-registry@${ref.slice(0, 12)}`
    : `synced ${outputs.length} files from mzizi-registry@${ref.slice(0, 12)}`,
);
