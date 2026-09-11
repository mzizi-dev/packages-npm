#!/usr/bin/env node
/**
 * check-canon-parity — CI-ONLY gate: does the committed snapshot still match
 * live canon?
 *
 * This is the ONLY script in the repo that touches the network, and it is
 * deliberately not wired into any build, prepack, postinstall or runtime path.
 * A token package that phones home to render a page is a page that goes blank
 * when api.mzizi.dev has a bad afternoon.
 *
 * The build-time gate is `pnpm tokens:check`, which is offline and compares
 * the generated files to the generator. This one compares the snapshot to the
 * upstream it was taken from, so a canon change shows up as a red CI job on a
 * scheduled run rather than as a surprise the next time someone regenerates.
 *
 * Refuses to run outside CI unless --force, so it cannot quietly creep into
 * somebody's build script.
 *
 *   pnpm canon:parity              (in CI)
 *   pnpm canon:parity -- --force   (locally, on purpose)
 */

import { readFile } from "node:fs/promises";
import { buildSnapshot, serialize, SNAPSHOT_PATH } from "./fetch-canon.mjs";

const force = process.argv.includes("--force");
if (!process.env.CI && !force) {
  console.error(
    "check-canon-parity is a CI-only gate — it reaches the network.\n" +
      "  In CI:    set CI=true (GitHub Actions does this for you)\n" +
      "  Locally:  pnpm canon:parity -- --force",
  );
  process.exit(2);
}

const [{ url, snapshot }, committed] = await Promise.all([
  buildSnapshot(),
  readFile(SNAPSHOT_PATH, "utf8"),
]);

const live = serialize(snapshot);
if (live === committed) {
  console.log(`canon parity OK — tokens/canon.snapshot.json matches ${url}`);
  process.exit(0);
}

/* Report the actual differing values, not just "files differ". */
const a = JSON.parse(committed);
const b = JSON.parse(live);
const flat = (obj, prefix = "", out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flat(v, key, out);
    else out[key] = v;
  }
  return out;
};
const fa = flat(a);
const fb = flat(b);
const keys = [...new Set([...Object.keys(fa), ...Object.keys(fb)])].sort();

console.error(
  `CANON PARITY FAILED — the committed snapshot has drifted from ${url}`,
);
let shown = 0;
for (const k of keys) {
  if (fa[k] === fb[k]) continue;
  if (k.startsWith("_meta.")) continue;
  console.error(
    `  ${k}\n    committed: ${fa[k] ?? "(absent)"}\n    canon:     ${fb[k] ?? "(absent)"}`,
  );
  shown++;
}
if (!shown) {
  console.error(
    "  (only _meta differs — canon was republished with no value change)",
  );
}
console.error(
  "\nFix: `pnpm canon:fetch && pnpm tokens:build`, then commit both.",
);
process.exit(1);
