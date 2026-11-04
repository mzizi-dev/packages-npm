// scripts/release-tags.mjs writes a GitHub release from a CHANGELOG.md
// section; these are the headings it must and must not match.
import { describe, expect, test } from "vite-plus/test";

import {
  changelogSection,
  previousTag,
  releaseNotes,
  workspacePackages,
} from "./release-tags.mjs";

const changelog = `# Changelog

## [Unreleased]

- Not released.

## [@bundu/ui 0.4.1, @bundu/server 0.1.0, @nyuchi/ui 0.3.0] - 2026-10-04

### Added

- Both.

## [@bundu/ui 0.4.10] - 2026-10-05

- Not 0.4.1.

## [@nyuchi/ui 0.2.0] - 2026-09-30

- Older.

[Unreleased]: https://example.com/compare
`;

describe("changelogSection", () => {
  test("finds a version named anywhere in a combined heading", () => {
    for (const [name, version] of [
      ["@bundu/ui", "0.4.1"],
      ["@bundu/server", "0.1.0"],
      ["@nyuchi/ui", "0.3.0"],
    ]) {
      expect(changelogSection(changelog, name, version)).toBe(
        "### Added\n\n- Both.",
      );
    }
  });

  test("does not match a version that only starts the same", () => {
    expect(changelogSection(changelog, "@bundu/ui", "0.4.10")).toBe(
      "- Not 0.4.1.",
    );
    expect(changelogSection(changelog, "@bundu/ui", "0.4")).toBeNull();
  });

  test("stops at the next heading and drops link definitions", () => {
    expect(changelogSection(changelog, "@nyuchi/ui", "0.2.0")).toBe("- Older.");
  });

  test("returns null for a version with no section, and never Unreleased", () => {
    expect(changelogSection(changelog, "@bundu/ui", "9.9.9")).toBeNull();
    expect(changelogSection(changelog, "Unreleased", "")).toBeNull();
  });
});

describe("workspacePackages", () => {
  test("lists the two public packages with a name and version", () => {
    const names = workspacePackages().map((p) => p.name);
    expect(names.sort()).toEqual(["@bundu/server", "@bundu/ui"]);
  });
});

describe("releaseNotes", () => {
  const args = {
    changelog,
    name: "@nyuchi/ui",
    version: "0.2.0",
    repo: "o/r",
    tag: "@nyuchi/ui@0.2.0",
  };

  test("carries the section, package, npm link, changelog link and compare link", () => {
    const out = releaseNotes({ ...args, prevTag: "@nyuchi/ui@0.1.0" });
    expect(out).toContain("## @nyuchi/ui 0.2.0");
    expect(out).toContain("- Older.");
    expect(out).toContain(
      "npm: https://www.npmjs.com/package/@nyuchi/ui/v/0.2.0",
    );
    expect(out).toContain("blob/@nyuchi/ui@0.2.0/CHANGELOG.md");
    expect(out).toContain(
      "**Full changelog**: https://github.com/o/r/compare/@nyuchi/ui@0.1.0...@nyuchi/ui@0.2.0",
    );
  });

  test("a version with no changelog section throws instead of making generic notes", () => {
    expect(() => releaseNotes({ ...args, version: "9.9.9" })).toThrow(
      /no "## \[@nyuchi\/ui 9\.9\.9\]" section/,
    );
  });
});

describe("previousTag", () => {
  test("is the highest lower version of the same package, compared numerically", () => {
    const tags = [
      "@bundu/ui@0.9.0",
      "@bundu/ui@0.10.0",
      "@bundu/ui@0.11.0",
      "@bundu/server@0.10.5",
      "v1.0.0",
    ];
    expect(previousTag(tags, "@bundu/ui", "0.11.0")).toBe("@bundu/ui@0.10.0");
    expect(previousTag(tags, "@bundu/ui", "0.9.0")).toBeNull();
  });
});
