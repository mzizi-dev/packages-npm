// The navigation helpers behind SideNav and CommandPalette: pure functions,
// so an app's one-line section registrations group, nest and match the same
// way everywhere.
import { describe, expect, test } from "vite-plus/test";

import {
  currentHref,
  flattenNav,
  groupNav,
  isCurrentHref,
  matchesQuery,
  searchNav,
} from "./nav";

describe("isCurrentHref", () => {
  test("matches the path and anything below it, not a shared prefix", () => {
    expect(isCurrentHref("/dashboard/family", "/dashboard/family")).toBe(true);
    expect(
      isCurrentHref("/dashboard/family/7?tab=x", "/dashboard/family"),
    ).toBe(true);
    expect(isCurrentHref("/dashboard/family/", "/dashboard/family")).toBe(true);
    expect(isCurrentHref("/dashboard/family-tree", "/dashboard/family")).toBe(
      false,
    );
    expect(isCurrentHref("/anything", "/")).toBe(false);
    expect(isCurrentHref("/", "/")).toBe(true);
  });
});

describe("groupNav", () => {
  const entries = [
    { href: "/d/news", label: "News", group: "Content" },
    { href: "/d", label: "Overview" },
    {
      href: "/d/keys",
      label: "API keys",
      group: "Developer",
      parent: "/d/developer",
    },
    { href: "/d/identity", label: "Identity", group: "Identity & people" },
    { href: "/d/developer", label: "Developer", group: "Developer" },
    {
      href: "/d/orphan",
      label: "Orphan",
      group: "Developer",
      parent: "/d/missing",
    },
    { href: "/d/zz", label: "Unlisted group", group: "Zebra" },
  ];

  test("orders groups as asked, then by first appearance; ungrouped first, unlabelled", () => {
    const groups = groupNav(entries, [
      "Identity & people",
      "Content",
      "Developer",
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      undefined,
      "Identity & people",
      "Content",
      "Developer",
      "Zebra",
    ]);
    expect(groups[0]?.items.map((i) => i.label)).toEqual(["Overview"]);
  });

  test("nests children under their parent, whatever the registration order", () => {
    const dev = groupNav(entries).find((g) => g.label === "Developer");
    expect(dev?.items.map((i) => i.label)).toEqual(["Developer", "Orphan"]);
    expect(dev?.items[0]?.children?.map((c) => c.label)).toEqual(["API keys"]);
  });

  test("never drops an entry and leaks no registration fields", () => {
    const flat = flattenNav(groupNav(entries));
    expect(flat).toHaveLength(entries.length);
    for (const item of flat) {
      expect(item).not.toHaveProperty("parent");
    }
  });
});

describe("currentHref", () => {
  test("is the longest current href in the tree, children included", () => {
    const groups = groupNav([
      { href: "/d", label: "Overview" },
      { href: "/d/developer", label: "Developer" },
      { href: "/d/developer/keys", label: "Keys", parent: "/d/developer" },
    ]);
    expect(currentHref("/d/developer/keys/9", groups)).toBe(
      "/d/developer/keys",
    );
    expect(currentHref("/d/other", groups)).toBe("/d");
    expect(currentHref("/elsewhere", groups)).toBeNull();
  });
});

describe("searchNav and matchesQuery", () => {
  const groups = groupNav([
    {
      href: "/d/lingo",
      label: "Lingo",
      description: "Mukoko Lingo phrases, languages",
      group: "Content",
    },
    {
      href: "/d/keys",
      label: "API keys",
      group: "Developer",
      parent: "/d/dev",
    },
    { href: "/d/dev", label: "Developer", group: "Developer" },
  ]);

  test("every word must match, ignoring case and accents", () => {
    expect(matchesQuery("Café Ñandú", "cafe nandu")).toBe(true);
    expect(matchesQuery("Lingo phrases", "lingo weather")).toBe(false);
  });

  test("searches label, description, group and parent trail", () => {
    expect(searchNav(groups, "phrases").map((i) => i.href)).toEqual([
      "/d/lingo",
    ]);
    expect(searchNav(groups, "developer keys").map((i) => i.href)).toEqual([
      "/d/keys",
    ]);
    expect(searchNav(groups, "  ")).toEqual([]);
  });
});
