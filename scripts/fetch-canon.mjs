#!/usr/bin/env node
/**
 * fetch-canon — refresh `tokens/canon.snapshot.json` from canon.
 *
 * The snapshot is the ONLY place a hex value enters this repository, and this
 * script is the only thing that writes it. Everything a consumer sees —
 * styles/tokens.css, styles/theme.css and tokens.json, in BOTH packages — is
 * generated from it by scripts/generate-tokens.mjs. Nobody types a colour.
 *
 * TWO SOURCES, because canon has two faces and neither is complete alone:
 *
 *   1. https://api.mzizi.dev/api/v1/brand
 *      The 21 colour families, the semantic tokens, the background ladder and
 *      the radius scale.
 *
 *   2. mzizi-dev/mzizi-registry -> lib/tokens/palette.source.ts (raw, public)
 *      The named on-disk source of truth, and the only place the minerals'
 *      `onContainer` pairs exist — /v1/brand does not project them, and
 *      @bundu/ui has shipped them since 0.1.0. Fetched, not transcribed.
 *
 * The two are cross-checked against each other here: if the API and the
 * on-disk source disagree about any mineral hex, this script fails rather than
 * silently preferring one. That disagreement is precisely how an estate ends
 * up with four different terracottas.
 *
 * Why a COMMITTED snapshot rather than a fetch at build time:
 *   - `pnpm tokens:check` must run on every CI job and in prepack, offline,
 *     with no credential and no flaky third party.
 *   - A package build that reaches the network to learn what colour cobalt is
 *     can produce two different tarballs from one commit.
 * Staleness is caught instead by scripts/check-canon-parity.mjs, which does
 * hit the network and runs in CI only — never at build or runtime.
 *
 * Usage:  node scripts/fetch-canon.mjs            (pnpm canon:fetch)
 *         node scripts/fetch-canon.mjs --check    (pnpm canon:parity)
 */

import { writeFile, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SNAPSHOT_PATH = resolve(ROOT, "tokens/canon.snapshot.json");

/** The canonical form. 404s until mzizi-registry#335 merges. */
export const BRAND_URL_CANONICAL = "https://api.mzizi.dev/v1/brand";
/** The form that works today, with the `/api/` prefix. */
export const BRAND_URL = "https://api.mzizi.dev/api/v1/brand";

export const PALETTE_SOURCE_URL =
  "https://raw.githubusercontent.com/mzizi-dev/mzizi-registry/main/lib/tokens/palette.source.ts";

const SECTIONS = [
  "minerals",
  "heritage",
  "experimental",
  "semanticColors",
  "backgrounds",
  "radii",
  // brand -> mineral, which drives the generated styles/brand-*.css overlays.
  "ecosystem",
];

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sortDeep(value[k])]),
    );
  }
  return value;
}

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

export async function fetchBrand() {
  let res;
  try {
    res = await fetch(BRAND_URL_CANONICAL, {
      headers: { accept: "application/json" },
    });
  } catch {
    res = null;
  }
  if (res?.ok) return { url: BRAND_URL_CANONICAL, body: await res.json() };
  return { url: BRAND_URL, body: await getJson(BRAND_URL) };
}

/**
 * Pull the `minerals` array out of palette.source.ts.
 *
 * A regex rather than a TS parse: the file is a flat list of string-valued
 * object literals with no computation in it, and adding a TypeScript
 * dependency to a CSS package to read seven objects would be worse. If the
 * shape ever stops being flat this throws on the family count instead of
 * quietly returning less.
 */
export function parseMinerals(ts) {
  const start = ts.indexOf("export const minerals");
  if (start < 0)
    throw new Error("palette.source.ts: no `export const minerals`");
  const end = ts.indexOf("\n]", start);
  if (end < 0)
    throw new Error("palette.source.ts: unterminated minerals array");
  const body = ts.slice(start, end);

  const out = [];
  for (const [, block] of body.matchAll(/\{([^{}]*)\}/g)) {
    const fields = Object.fromEntries(
      [...block.matchAll(/(\w+):\s*"((?:[^"\\]|\\.)*)"/g)].map(([, k, v]) => [
        k,
        v,
      ]),
    );
    if (fields.name) out.push(fields);
  }
  if (out.length !== 7) {
    throw new Error(`palette.source.ts: parsed ${out.length} minerals, want 7`);
  }
  return out;
}

/** Fail loudly if the API and the on-disk source disagree about a hex. */
function crossCheck(apiMinerals, diskMinerals) {
  const disk = Object.fromEntries(diskMinerals.map((m) => [m.name, m]));
  const disagreements = [];
  const pairs = [
    ["lightHex", "lightHex"],
    ["darkHex", "darkHex"],
    ["containerLight", "containerLight"],
    ["containerDark", "containerDark"],
  ];
  for (const m of apiMinerals) {
    const d = disk[m.name];
    if (!d) {
      disagreements.push(`${m.name}: absent from palette.source.ts`);
      continue;
    }
    for (const [a, b] of pairs) {
      if (m[a].toLowerCase() !== d[b].toLowerCase()) {
        disagreements.push(`${m.name}.${a}: api ${m[a]} vs disk ${d[b]}`);
      }
    }
  }
  if (disagreements.length) {
    throw new Error(
      "canon disagrees with itself — /v1/brand and palette.source.ts differ:\n  " +
        disagreements.join("\n  "),
    );
  }
}

export function project(brand, brandUrl, diskMinerals) {
  for (const section of SECTIONS) {
    if (!(section in brand)) throw new Error(`canon is missing "${section}"`);
  }
  const counts = {
    minerals: brand.minerals.length,
    heritage: brand.heritage.length,
    experimental: brand.experimental.length,
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total !== 21) {
    throw new Error(
      `expected 21 colour families, canon served ${total} (${JSON.stringify(counts)})`,
    );
  }

  crossCheck(brand.minerals, diskMinerals);

  const disk = Object.fromEntries(diskMinerals.map((m) => [m.name, m]));
  const minerals = brand.minerals.map((m) => {
    const { onContainerLight, onContainerDark } = disk[m.name];
    if (!onContainerLight || !onContainerDark) {
      throw new Error(`palette.source.ts: ${m.name} has no onContainer pair`);
    }
    return { ...m, onContainerLight, onContainerDark };
  });

  return sortDeep({
    _meta: {
      brandSource: brandUrl,
      paletteSource: PALETTE_SOURCE_URL,
      canonVersion: brand.version,
      canonLastUpdated: brand.lastUpdated,
      onDiskSourceOfTruth:
        "mzizi-dev/mzizi-registry -> lib/tokens/palette.source.ts + brand.source.ts",
      note: "Machine-written by scripts/fetch-canon.mjs. Do not hand-edit.",
    },
    ...Object.fromEntries(SECTIONS.map((s) => [s, brand[s]])),
    minerals,
  });
}

export const serialize = (snapshot) => `${JSON.stringify(snapshot, null, 2)}\n`;

export async function buildSnapshot() {
  const [{ url, body }, ts] = await Promise.all([
    fetchBrand(),
    fetch(PALETTE_SOURCE_URL).then((r) => {
      if (!r.ok) throw new Error(`${PALETTE_SOURCE_URL} -> HTTP ${r.status}`);
      return r.text();
    }),
  ]);
  return { url, brand: body, snapshot: project(body, url, parseMinerals(ts)) };
}

async function main() {
  const check = process.argv.includes("--check");
  const { url, brand, snapshot } = await buildSnapshot();
  const next = serialize(snapshot);

  if (check) {
    const current = await readFile(SNAPSHOT_PATH, "utf8").catch(() => "");
    if (current !== next) {
      console.error(
        "CANON PARITY FAILED — tokens/canon.snapshot.json no longer matches canon.\n" +
          `  brand:   ${url}\n` +
          `  palette: ${PALETTE_SOURCE_URL}\n` +
          "  Fix: `pnpm canon:fetch && pnpm tokens:build`, then commit both.",
      );
      process.exit(1);
    }
    console.log(
      `canon parity OK — snapshot matches ${url} and palette.source.ts`,
    );
    return;
  }

  await writeFile(SNAPSHOT_PATH, next);
  const n =
    brand.minerals.length + brand.heritage.length + brand.experimental.length;
  console.log(
    `wrote tokens/canon.snapshot.json from ${url} + palette.source.ts ` +
      `(brand v${brand.version}, ${n} families)`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
