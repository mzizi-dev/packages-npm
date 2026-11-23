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
 *
 * A contract named in the `hold` of scripts/registry-ref.json
 * (scripts/registry-hold.mjs) is fetched from `hold.ref` instead, and checked
 * against it; index.json and every other contract come from `ref`.
 */
import { readFileSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTRACT_FILE,
  FAMILIES,
  SCHEMA_FILE,
  safeJoin,
  safeRef,
} from "./contract-paths.mjs";
import { contractRef, readHold } from "./registry-hold.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = resolve(ROOT, "packages/bundu-ui/contracts");
const args = process.argv.slice(2);
const check = args.includes("--check");
const ref = safeRef(args.find((a) => !a.startsWith("--")) ?? "main");
const pin = JSON.parse(
  readFileSync(resolve(ROOT, "scripts/registry-ref.json"), "utf8"),
);
const map = JSON.parse(
  readFileSync(resolve(ROOT, "scripts/registry-map.json"), "utf8"),
);
const hold = readHold(pin, map.components);
const base = (at) =>
  `https://raw.githubusercontent.com/mzizi-dev/mzizi-registry/${at}/contracts/`;

async function get(path, at = ref) {
  const url = base(at) + path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

const indexText = await get("index.json");
const index = JSON.parse(indexText);
// Every name below comes from fetched data. Each is checked against the
// registry's exact shapes and resolved inside DEST before it is fetched or
// written (scripts/contract-paths.mjs); anything else stops the script.
safeJoin(DEST, index.schema, SCHEMA_FILE);
if (!Array.isArray(index.contracts))
  throw new Error("index.json: no contracts");
for (const entry of index.contracts) safeJoin(DEST, entry?.file, CONTRACT_FILE);
const files = new Map([
  ["index.json", indexText],
  [index.schema, await get(index.schema)],
]);
for (const name of hold?.contracts ?? []) {
  if (!index.contracts.some((e) => e.name === name)) {
    throw new Error(
      `registry-ref.json: hold.contracts names ${name}, which the registry at ${ref} does not list`,
    );
  }
}
for (const entry of index.contracts)
  files.set(
    entry.file,
    await get(entry.file, contractRef(hold, entry.file, ref)),
  );

let drift = 0;
for (const [path, text] of files) {
  const dest =
    path === "index.json"
      ? resolve(DEST, "index.json")
      : safeJoin(
          DEST,
          path,
          path.startsWith("schema/") ? SCHEMA_FILE : CONTRACT_FILE,
        );
  const local = await readFile(dest, "utf8").catch(() => null);
  if (local === text) continue;
  if (check) {
    console.error(
      `drift: contracts/${path} differs from the registry at ${contractRef(hold, path, ref)}`,
    );
    drift += 1;
  } else {
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, text);
    console.log(`wrote contracts/${path}`);
  }
}
// A contract removed upstream must not linger here.
const known = new Set(files.keys());
for (const family of FAMILIES) {
  const present = await readdir(resolve(DEST, family)).catch(() => []);
  for (const f of present) {
    if (!known.has(`${family}/${f}`)) {
      console.error(
        `stale: contracts/${family}/${f} is not in the registry at ${ref}${check ? "" : "; delete it"}`,
      );
      drift += 1;
    }
  }
}
if (drift > 0) process.exit(1);
console.log(
  `contracts match mzizi-registry@${ref} (${index.contracts.length} contracts` +
    (hold?.contracts.size
      ? `; ${[...hold.contracts].join(", ")} held at ${hold.ref}`
      : "") +
    ")",
);
