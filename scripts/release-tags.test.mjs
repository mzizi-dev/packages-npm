// scripts/release-tags.mjs writes a GitHub release from a CHANGELOG.md
// section; these are the headings it must and must not match.
import { describe, expect, test } from "vite-plus/test";

import { changelogSection, workspacePackages } from "./release-tags.mjs";

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
  test("lists the three public packages with a name and version", () => {
    const names = workspacePackages().map((p) => p.name);
    expect(names.sort()).toEqual(["@bundu/server", "@bundu/ui", "@nyuchi/ui"]);
  });
});
