// Publish every workspace package whose package.json version is not on npm
// yet, EACH ON ITS OWN. Run by .github/workflows/release.yml.
//
// `pnpm -r publish` stops at the first failure, so one package npm refuses
// (a token without rights to a new name, say) held back every other package
// in the same run. Here each package is published separately and the run
// carries on: a failure is recorded, not fatal. The workflow tags and
// releases whatever did publish, then fails the job if anything did not.
//
// Packages go in dependency order, and a package whose workspace dependency
// did not make it to npm is NOT published: @bundu/ui 0.4.1 depends on
// @bundu/server ^0.1.0, and publishing it while that version is missing would
// put a package on npm that nobody can install. It is reported as blocked.
//
// `pnpm publish` in the package directory rewrites `workspace:^` to the real
// range and runs `prepack`. Provenance comes from NPM_CONFIG_PROVENANCE.
//
// Writes a per-package table to $GITHUB_STEP_SUMMARY and `failed=<names>` to
// $GITHUB_OUTPUT. Always exits 0 unless the script itself breaks.
//
// Pass --dry-run to pack without publishing.
//
// Versioning policy (nyuchi/.github#80). Before a version is published it
// must be what the org policy allows next: the next MINOR above the highest
// stable version of that package on npm (x.y.z -> x.y+1.0), or a MAJOR only
// on a manual run with bump: major. npm is the record here, not git tags. The
// rules are the org's shared calculator, nyuchi/.github's next-version.mjs,
// which the workflow checks out pinned and names in NEXT_VERSION_SCRIPT. A
// refused version is recorded like an npm refusal: the rest still publish.

import { spawnSync } from "node:child_process";
import { appendFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { onNpm, workspacePackages } from "./release-tags.mjs";

const dryRun = process.argv.includes("--dry-run");

/** Names of the workspace packages `pkg` depends on, by any dependency kind. */
export function workspaceDeps(pkg, names) {
  const deps = {
    ...pkg.dependencies,
    ...pkg.peerDependencies,
    ...pkg.optionalDependencies,
  };
  return Object.keys(deps).filter((d) => names.has(d));
}

/**
 * Packages in dependency order: every package after the workspace packages it
 * depends on. Stable otherwise. Throws on a cycle.
 */
export function publishOrder(pkgs) {
  const names = new Set(pkgs.map((p) => p.name));
  const byName = new Map(pkgs.map((p) => [p.name, p]));
  const out = [];
  const state = new Map(); // name -> "visiting" | "done"
  const visit = (p) => {
    if (state.get(p.name) === "done") return;
    if (state.get(p.name) === "visiting")
      throw new Error(`dependency cycle through ${p.name}`);
    state.set(p.name, "visiting");
    for (const d of workspaceDeps(p, names)) visit(byName.get(d));
    state.set(p.name, "done");
    out.push(p);
  };
  for (const p of pkgs) visit(p);
  return out;
}

/**
 * Decide and carry out each package's publish. `isOnNpm(name, version)` and
 * `publish(pkg)` (returns true on success) are injected so tests need no
 * network, as is `checkVersion(pkg)`: null when the versioning policy allows
 * the version, else the reason it does not. Returns
 * [{ name, version, result, detail }] where result is one of
 * "already on npm", "published", "failed", "blocked", "refused".
 */
export function publishAll(
  pkgs,
  { isOnNpm, publish, checkVersion = () => null },
) {
  const names = new Set(pkgs.map((p) => p.name));
  const ok = new Set(); // names whose current version is on npm
  const results = [];
  for (const pkg of publishOrder(pkgs)) {
    const { name, version } = pkg;
    if (isOnNpm(name, version)) {
      ok.add(name);
      results.push({ name, version, result: "already on npm", detail: "" });
      continue;
    }
    const missing = workspaceDeps(pkg, names).filter((d) => !ok.has(d));
    if (missing.length > 0) {
      results.push({
        name,
        version,
        result: "blocked",
        detail: `needs ${missing.join(", ")} on npm first`,
      });
      continue;
    }
    const refusal = checkVersion(pkg);
    if (refusal) {
      results.push({ name, version, result: "refused", detail: refusal });
      continue;
    }
    if (publish(pkg)) {
      ok.add(name);
      results.push({ name, version, result: "published", detail: "" });
    } else {
      results.push({
        name,
        version,
        result: "failed",
        detail: "npm refused it; see the log above",
      });
    }
  }
  return results;
}

function publishWithPnpm(pkg) {
  console.log(`\n::group::pnpm publish ${pkg.name}@${pkg.version}`);
  const args = ["publish", "--access", "public", "--no-git-checks"];
  if (dryRun) args.push("--dry-run");
  const r = spawnSync("pnpm", args, { cwd: pkg.dir, stdio: "inherit" });
  console.log("::endgroup::");
  if (r.status !== 0)
    console.log(`::error::${pkg.name}@${pkg.version} was not published`);
  return r.status === 0;
}

/** Every version of `name` on npm ([] when it has never been published). */
function npmVersions(name) {
  const r = spawnSync("npm", ["view", name, "versions", "--json"], {
    encoding: "utf8",
  });
  if (r.status !== 0) return [];
  const v = JSON.parse(r.stdout || "[]");
  return Array.isArray(v) ? v : [v];
}

/**
 * The policy check, from the org calculator at NEXT_VERSION_SCRIPT. Bump and
 * manual come from the workflow (RELEASE_BUMP, RELEASE_MANUAL). Exported for
 * the tests, which pass their own calculator and npm lookup.
 */
export function policyCheck(calc, versionsOf, env = process.env) {
  const bump = env.RELEASE_BUMP ?? "";
  const allowMajor = env.RELEASE_MANUAL === "true" && bump === "major";
  return (pkg) => {
    const current = calc.highest(versionsOf(pkg.name), "");
    try {
      calc.check(current, pkg.version, { channel: "main", bump, allowMajor });
      return null;
    } catch (err) {
      return err.message;
    }
  };
}

async function main() {
  const script = process.env.NEXT_VERSION_SCRIPT;
  if (!script && !dryRun)
    throw new Error(
      "NEXT_VERSION_SCRIPT is not set: the versioning policy cannot be checked.",
    );
  const checkVersion = script
    ? policyCheck(
        await import(pathToFileURL(resolve(script)).href),
        npmVersions,
      )
    : () => null;
  const results = publishAll(workspacePackages(), {
    isOnNpm: (name, version) => onNpm(name, version, 1),
    publish: publishWithPnpm,
    checkVersion,
  });
  const failed = results.filter(
    (r) =>
      r.result === "failed" || r.result === "blocked" || r.result === "refused",
  );
  for (const r of results.filter((r) => r.result === "refused"))
    console.log(`::error::${r.name}@${r.version}: ${r.detail}`);

  const table = [
    "| Package | Version | Result |",
    "| --- | --- | --- |",
    ...results.map(
      (r) =>
        `| \`${r.name}\` | ${r.version} | ${r.result}${r.detail ? ` (${r.detail})` : ""} |`,
    ),
  ].join("\n");
  console.log(`\n${table}`);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## npm publish\n\n${table}\n`,
    );
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `failed=${failed.map((r) => `${r.name}@${r.version}`).join(" ")}\n`,
    );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  await main();
}
