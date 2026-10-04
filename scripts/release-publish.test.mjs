// scripts/release-publish.mjs publishes each package on its own; these are
// the orders and outcomes it must produce without touching npm.
import { describe, expect, test } from "vite-plus/test";

import { publishAll, publishOrder } from "./release-publish.mjs";

const ui = {
  name: "@bundu/ui",
  version: "0.4.1",
  dependencies: { "@bundu/server": "workspace:^", clsx: "^2.1.1" },
};
const server = { name: "@bundu/server", version: "0.1.0" };
const nyuchi = { name: "@nyuchi/ui", version: "0.3.0" };
const pkgs = [server, ui, nyuchi].sort((a, b) => (a.name < b.name ? 1 : -1));

const names = (ps) => ps.map((p) => p.name);

describe("publishOrder", () => {
  test("puts a package after its workspace dependencies", () => {
    const order = names(publishOrder(pkgs));
    expect(order.indexOf("@bundu/server")).toBeLessThan(
      order.indexOf("@bundu/ui"),
    );
    expect(order).toHaveLength(3);
  });

  test("throws on a cycle", () => {
    const a = {
      name: "a",
      version: "1.0.0",
      dependencies: { b: "workspace:^" },
    };
    const b = {
      name: "b",
      version: "1.0.0",
      dependencies: { a: "workspace:^" },
    };
    expect(() => publishOrder([a, b])).toThrow(/cycle/);
  });
});

describe("publishAll", () => {
  const run = (onNpm, refuse) => {
    const attempted = [];
    const results = publishAll(pkgs, {
      isOnNpm: (n) => onNpm.includes(n),
      publish: (p) => {
        attempted.push(p.name);
        return !refuse.includes(p.name);
      },
    });
    const by = Object.fromEntries(results.map((r) => [r.name, r.result]));
    return { attempted, by };
  };

  test("one refusal does not stop an unrelated package", () => {
    const { attempted, by } = run([], ["@bundu/server"]);
    expect(by).toEqual({
      "@bundu/server": "failed",
      "@bundu/ui": "blocked",
      "@nyuchi/ui": "published",
    });
    // A dependant of a failed package is never even attempted.
    expect(attempted).not.toContain("@bundu/ui");
  });

  test("skips versions npm already has, and builds on them", () => {
    const { attempted, by } = run(["@bundu/server", "@nyuchi/ui"], []);
    expect(attempted).toEqual(["@bundu/ui"]);
    expect(by["@bundu/ui"]).toBe("published");
    expect(by["@bundu/server"]).toBe("already on npm");
  });

  test("publishes a dependency and then its dependant in one run", () => {
    const { attempted } = run([], []);
    expect(attempted.indexOf("@bundu/server")).toBeLessThan(
      attempted.indexOf("@bundu/ui"),
    );
    expect(attempted).toHaveLength(3);
  });
});
