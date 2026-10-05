// Publish every workspace package whose package.json version is not on npm
// yet, EACH ON ITS OWN. Run by .github/workflows/release.yml.
//
// `pnpm -r publish` stops at the first failure, so one package npm refuses
// (a name with no trusted publisher on npmjs.com yet, say) would hold back
// every other package in the same run. Here each package is published
// separately and the run carries on: a failure is recorded, not fatal. The workflow tags and
// releases whatever did publish, then fails the job if anything did not.
//
// Packages go in dependency order, and a package whose workspace dependency
// did not make it to npm is NOT published: @bundu/ui 0.3.0 depends on
// @bundu/server ^0.1.0, and publishing it while that version is missing would
// put a package on npm that nobody can install. It is reported as blocked.
//
// Each package is packed with `pnpm pack` in its directory, which rewrites
// `workspace:^` to the real range and runs `prepack`, and the tarball is
// published with the npm CLI (`npm publish <tarball>`). npm, not pnpm, does
// the publish because npm trusted publishing (OIDC) is an npm CLI feature
// (npm >= 11.5.1): in GitHub Actions with `id-token: write`, npm exchanges the
// job's OIDC token for a short-lived publish token for that one package, so
// no long-lived npm token is involved. Provenance comes from
// NPM_CONFIG_PROVENANCE (and trusted publishing turns it on for a public
// repository anyway).
//
// Trusted publishing only: no npm token, ever (owner decision, 2026-10-05).
// npm attaches a trusted publisher only to a package that already exists, so
// a name npm has never had cannot be published here. Before publishing, each
// package is checked: if npm answers E404 for its name it is reported as
// "failed" with the manual first-publish steps (see firstPublishMessage), and
// anything that depends on it is held back as "blocked". Any other failure to
// look the name up (network, rate limit) is not proof, and the publish is
// attempted by OIDC as usual. Every child process runs with npm token
// variables (a stray NODE_AUTH_TOKEN, NPM_TOKEN, ...) stripped from its
// environment, so OIDC is npm's only credential.
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
import {
  appendFileSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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
 * the version, else the reason it does not, and `isNew(name)`: true when npm
 * has never had the name (it then fails with firstPublishMessage, since OIDC
 * cannot publish it, and its dependants are blocked). Returns
 * [{ name, version, result, detail }] where result is one of
 * "already on npm", "published", "failed", "blocked", "refused".
 */
export function publishAll(
  pkgs,
  { isOnNpm, publish, checkVersion = () => null, isNew = () => false },
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
    if (isNew(name)) {
      results.push({
        name,
        version,
        result: "failed",
        detail: firstPublishMessage(name),
        firstPublish: true,
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
        detail:
          "npm refused it; see the log above (does it have a trusted publisher on npmjs.com?)",
      });
    }
  }
  return results;
}

/**
 * The `npm publish` arguments for one packed tarball. No `--tag`: npm applies
 * `latest`, as before. Exported for the tests.
 */
export function npmPublishArgs(tarball, { dryRun = false } = {}) {
  const args = ["publish", tarball, "--access", "public"];
  if (dryRun) args.push("--dry-run");
  return args;
}

/**
 * Environment variables that could hand npm a token. Removed from every child
 * process so a stray one can never stand in for (or mask a failure of) OIDC.
 */
const TOKEN_VARS = new Set(["NODE_AUTH_TOKEN", "NPM_TOKEN"]);
const isTokenVar = (key) =>
  TOKEN_VARS.has(key) || /^npm_config_.*_auth(token)?$/i.test(key);

/**
 * The environment for a child process: `env` without any npm token variable.
 * Exported for the tests.
 */
export function childEnv(env = process.env) {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => !isTokenVar(key)),
  );
}

/**
 * Why a never-published package was not published, and what to do. Exported
 * for the tests.
 */
export function firstPublishMessage(name) {
  return (
    `${name} has never been published: npm can attach a trusted publisher only ` +
    `to an existing package. Publish its first version manually ` +
    `(npm login --auth-type=web; pnpm pack; npm publish <tgz> --access public), ` +
    `add its trusted publisher on npmjs.com, then re-run.`
  );
}

/**
 * True only when npm answers E404 for `name`: it has never been published.
 * A lookup that fails any other way returns false. `view` is injectable for
 * the tests: (name) => { status, stdout, stderr }.
 */
export function neverPublished(name, view = npmViewName) {
  const r = view(name);
  if (r.status === 0) return false;
  return /\bE404\b/.test(`${r.stdout ?? ""}\n${r.stderr ?? ""}`);
}

function npmViewName(name) {
  return spawnSync("npm", ["view", name, "name", "--json"], {
    encoding: "utf8",
    env: childEnv(),
  });
}

/**
 * `pnpm pack` the package into a fresh directory, then `npm publish` that
 * tarball by OIDC. True on success.
 */
function packAndPublish(pkg) {
  const dest = mkdtempSync(join(tmpdir(), "release-pack-"));
  try {
    const packed = spawnSync("pnpm", ["pack", "--pack-destination", dest], {
      cwd: pkg.dir,
      stdio: "inherit",
      env: childEnv(),
    });
    if (packed.status !== 0) return false;
    const tarballs = readdirSync(dest).filter((f) => f.endsWith(".tgz"));
    if (tarballs.length !== 1) {
      console.log(
        `expected one tarball from pnpm pack, got ${tarballs.length}`,
      );
      return false;
    }
    const r = spawnSync(
      "npm",
      npmPublishArgs(join(dest, tarballs[0]), { dryRun }),
      { cwd: pkg.dir, stdio: "inherit", env: childEnv() },
    );
    return r.status === 0;
  } finally {
    rmSync(dest, { recursive: true, force: true });
  }
}

function publishWithNpm(pkg) {
  console.log(
    `\n::group::npm publish ${pkg.name}@${pkg.version} (trusted publishing, OIDC)`,
  );
  const ok = packAndPublish(pkg);
  console.log("::endgroup::");
  if (!ok) console.log(`::error::${pkg.name}@${pkg.version} was not published`);
  return ok;
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
    publish: publishWithNpm,
    checkVersion,
    isNew: (name) => neverPublished(name),
  });
  const failed = results.filter(
    (r) =>
      r.result === "failed" || r.result === "blocked" || r.result === "refused",
  );
  for (const r of results.filter(
    (r) => r.result === "refused" || r.firstPublish,
  ))
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
