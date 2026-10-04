#!/usr/bin/env node
/**
 * fetch-contracts — refresh `packages/bundu-ui/contracts/` from the Mzizi
 * registry, where component contracts are authored
 * (mzizi-dev/mzizi-registry, contracts/).
 *
 * The registry owns the contracts; this package ships a committed copy, so
 * the contract tests (`src/app/contracts.test.ts`) run offline and a tarball
 * carries the contracts its components were tested against. Never edit the
 * copy: change the registry, then run this.
 *
 * Usage:  node scripts/fetch-contracts.mjs [ref]          (pnpm contracts:fetch)
 *         node scripts/fetch-contracts.mjs --check [ref]  (pnpm contracts:check)
 *
 * `ref` is a registry branch, tag or commit (default `main`). `--check`
 * writes nothing and fails if the copy differs from the registry at `ref`.
 * It needs the network, so it is not part of `pnpm test`.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = resolve(ROOT, "packages/bundu-ui/contracts");
const args = process.argv.slice(2);
const check = args.includes("--check");
const ref = args.find((a) => !a.startsWith("--")) ?? "main";
const base = `https://raw.githubusercontent.com/mzizi-dev/mzizi-registry/${ref}/contracts/`;

async function get(path) {
  const res = await fetch(base + path);
  if (!res.ok) throw new Error(`${base + path}: HTTP ${res.status}`);
  return res.text();
}

const indexText = await get("index.json");
const index = JSON.parse(indexText);
const files = new Map([
  ["index.json", indexText],
  [index.schema, await get(index.schema)],
]);
for (const entry of index.contracts)
  files.set(entry.file, await get(entry.file));

let drift = 0;
for (const [path, text] of files) {
  const dest = resolve(DEST, path);
  const local = await readFile(dest, "utf8").catch(() => null);
  if (local === text) continue;
  if (check) {
    console.error(
      `drift: contracts/${path} differs from the registry at ${ref}`,
    );
    drift += 1;
  } else {
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, text);
    console.log(`wrote contracts/${path}`);
  }
}
// A contract removed upstream must not linger here.
const known = new Set([...files.keys()].filter((p) => p.startsWith("app/")));
for (const f of await readdir(resolve(DEST, "app"))) {
  if (!known.has(`app/${f}`)) {
    console.error(
      `stale: contracts/app/${f} is not in the registry at ${ref}${check ? "" : "; delete it"}`,
    );
    drift += 1;
  }
}
if (drift > 0) process.exit(1);
console.log(
  `contracts match mzizi-registry@${ref} (${index.contracts.length} contracts)`,
);
