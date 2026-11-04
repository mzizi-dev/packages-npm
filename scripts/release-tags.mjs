// Tag and release every workspace package whose current version is on npm
// but has no git tag yet. Run by .github/workflows/release.yml after
// scripts/release-publish.mjs, which publishes only the versions npm does not
// have, each package on its own.
//
// For each public package under packages/*:
//   - the tag is `<name>@<version>` (for example `@bundu/ui@0.3.0`), annotated,
//     on the commit the workflow built (GITHUB_SHA, else HEAD);
//   - the GitHub release carries that version's CHANGELOG.md section, the one
//     whose `## [...]` heading names `<name> <version>`, the package name and
//     version, its npm link and a "Full changelog" compare link (owner,
//     2026-11-04: "Every release should have release notes too with a
//     changelog"). A version with NO such section fails the run (it never gets
//     generic notes); release-publish.mjs checks the same before publishing.
//   - the release is created as a draft with those notes and published once
//     by .github/scripts/publish-release.sh (immutable releases: the notes are
//     set at creation and a published release is never edited).
//
// Idempotent: a tag that already exists on origin is left alone, and so is a
// release that already exists. A version that is not on npm (yet) is skipped,
// so a failed publish never gets a tag.
//
// Pass --dry-run to print what would be tagged without touching anything.
//
// Needs `git` with push access to origin and `gh` with GH_TOKEN set. The
// workflow uses RELEASE_BUMP_TOKEN for both, so the tags and releases are made
// by a real token and can trigger other workflows.

import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dryRun = process.argv.includes("--dry-run");

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: root, encoding: "utf8", ...opts }).trim();

const tryRun = (cmd, args) => {
  try {
    return run(cmd, args, { stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
};

/**
 * The public workspace packages, in directory order, each with `dir`, its
 * directory.
 */
export function workspacePackages(dir = join(root, "packages")) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({
      ...JSON.parse(readFileSync(join(dir, d.name, "package.json"), "utf8")),
      dir: join(dir, d.name),
    }))
    .filter((p) => !p.private && p.name && p.version);
}

/**
 * The CHANGELOG.md section for one package version: the body under the first
 * `## [...]` heading whose bracket text names `<name> <version>`, up to the
 * next `## ` heading. Null when there is none.
 */
export function changelogSection(changelog, name, version) {
  const lines = changelog.split("\n");
  const wanted = `${name} ${version}`;
  const start = lines.findIndex((l) => {
    const m = /^## \[([^\]]+)\]/.exec(l);
    return m !== null && m[1].split(",").some((s) => s.trim() === wanted);
  });
  if (start === -1) return null;
  let end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  if (end === -1) end = lines.length;
  // Drop trailing link reference definitions, which belong to the whole file.
  const body = lines
    .slice(start + 1, end)
    .filter((l) => !/^\[[^\]]+\]: /.test(l))
    .join("\n")
    .trim();
  return body.length > 0 ? body : null;
}

/**
 * Whether npm serves this exact version. `tries` above 1 waits between tries:
 * a version published seconds ago can lag on the registry.
 */
export function onNpm(name, version, tries = 5) {
  for (let attempt = 0; attempt < tries; attempt++) {
    if (tryRun("npm", ["view", `${name}@${version}`, "version"]) === version)
      return true;
    if (attempt < tries - 1) execFileSync("sleep", [String(5 * (attempt + 1))]);
  }
  return false;
}

/**
 * The release notes for one package version: its CHANGELOG.md section, the
 * package name and version, the npm and changelog links and, when `prevTag`
 * is given, a "Full changelog" compare link. Throws when the changelog has no
 * section for the version: a release with no changelog content must fail, not
 * publish generic notes.
 */
export function releaseNotes({ changelog, name, version, repo, tag, prevTag }) {
  const section = changelogSection(changelog, name, version);
  if (section === null) {
    throw new Error(
      `CHANGELOG.md has no "## [${name} ${version}]" section; add one before releasing ${name} ${version}.`,
    );
  }
  return (
    `## ${name} ${version}\n\n${section}\n\n---\n\n` +
    `Package: \`${name}\` ${version}\n` +
    `npm: https://www.npmjs.com/package/${name}/v/${version}\n` +
    `Changelog: https://github.com/${repo}/blob/${tag}/CHANGELOG.md\n` +
    (prevTag
      ? `**Full changelog**: https://github.com/${repo}/compare/${prevTag}...${tag}\n`
      : "")
  );
}

/**
 * The highest tag `<name>@<x.y.z>` below `version`, or null. Compared
 * numerically, so 0.10.0 is above 0.9.0.
 */
export function previousTag(tags, name, version) {
  const parse = (v) => v.split(".").map(Number);
  const cmp = (a, b) => {
    for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  };
  const cur = parse(version);
  const prefix = `${name}@`;
  const lower = tags
    .filter(
      (t) =>
        t.startsWith(prefix) && /^\d+\.\d+\.\d+$/.test(t.slice(prefix.length)),
    )
    .map((t) => ({ tag: t, v: parse(t.slice(prefix.length)) }))
    .filter(({ v }) => cmp(v, cur) < 0)
    .sort((a, b) => cmp(a.v, b.v));
  return lower.length ? lower[lower.length - 1].tag : null;
}

const tagOnOrigin = (tag) =>
  (tryRun("git", [
    "ls-remote",
    "--tags",
    "--refs",
    "origin",
    `refs/tags/${tag}`,
  ]) ?? "") !== "";

function main() {
  const sha = process.env.GITHUB_SHA || run("git", ["rev-parse", "HEAD"]);
  const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
  const repo = process.env.GITHUB_REPOSITORY || "mzizi-dev/packages-npm";
  let made = 0;

  for (const { name, version } of workspacePackages()) {
    const tag = `${name}@${version}`;
    const tagged = tagOnOrigin(tag);
    if (
      tagged &&
      tryRun("gh", ["release", "view", tag, "--repo", repo]) !== null
    ) {
      console.log(`${tag}: tag and release exist, skipped`);
      continue;
    }
    if (!onNpm(name, version)) {
      console.log(`${tag}: not on npm, not tagged`);
      continue;
    }
    // Built before anything is tagged: no changelog section throws here.
    const notes = releaseNotes({
      changelog,
      name,
      version,
      repo,
      tag,
      prevTag: previousTag(
        (tryRun("git", ["tag", "-l", `${name}@*`]) ?? "").split("\n"),
        name,
        version,
      ),
    });

    if (dryRun) {
      console.log(
        `${tag}: would tag ${sha.slice(0, 7)} and release\n${notes}\n`,
      );
      continue;
    }

    // A tag left by a run that died before its release keeps the tag and
    // still gets its release.
    if (!tagged) {
      run("git", ["tag", "-a", tag, sha, "-m", `${name} ${version}`]);
      run("git", ["push", "origin", `refs/tags/${tag}`]);
    }
    const file = join(mkdtempSync(join(tmpdir(), "notes-")), "notes.md");
    writeFileSync(file, notes);
    // Draft with the notes, then published once; never edited afterwards.
    run(
      "bash",
      [
        ".github/scripts/publish-release.sh",
        tag,
        `${name} ${version}`,
        file,
        "plain",
      ],
      { env: { ...process.env, GH_REPO: repo } },
    );
    console.log(`${tag}: tagged ${sha.slice(0, 7)} and released`);
    made++;
  }
  console.log(`${made} release(s) made`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  main();
}
