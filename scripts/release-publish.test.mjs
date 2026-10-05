// scripts/release-publish.mjs publishes each package on its own; these are
// the orders and outcomes it must produce without touching npm.
import { describe, expect, test } from "vite-plus/test";

import {
  childEnv,
  firstPublishMessage,
  neverPublished,
  npmPublishArgs,
  policyCheck,
  publishAll,
  publishOrder,
} from "./release-publish.mjs";

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

describe("versioning policy", () => {
  // A stand-in for nyuchi/.github's next-version.mjs: the real one is checked
  // out by the workflow; here only the wiring is under test.
  const calc = {
    highest: (versions) => versions.at(-1) ?? "0.0.0",
    check: (current, proposed, { allowMajor }) => {
      const [ma, mi] = current.split(".").map(Number);
      const ok =
        current === "0.0.0" ||
        proposed === `${ma}.${mi + 1}.0` ||
        (allowMajor && proposed === `${ma + 1}.0.0`);
      if (!ok) throw new Error(`policy allows ${ma}.${mi + 1}.0`);
    },
  };
  const npm = { "@bundu/ui": ["0.2.0"], "@nyuchi/ui": ["0.2.0"] };
  const versionsOf = (name) => npm[name] ?? [];

  test("a version that is not the next minor is refused, and the rest publish", () => {
    const check = policyCheck(calc, versionsOf, {});
    const published = [];
    const results = publishAll(
      [server, { ...ui, version: "0.5.0" }, { ...nyuchi, version: "0.3.0" }],
      {
        isOnNpm: () => false,
        publish: (p) => (published.push(p.name), true),
        checkVersion: check,
      },
    );
    const by = Object.fromEntries(results.map((r) => [r.name, r]));
    expect(by["@bundu/ui"].result).toBe("refused");
    expect(by["@bundu/ui"].detail).toMatch(/0\.3\.0/);
    expect(by["@bundu/server"].result).toBe("published");
    expect(by["@nyuchi/ui"].result).toBe("published");
    expect(published).not.toContain("@bundu/ui");
  });

  test("a major needs a manual run with bump: major", () => {
    const pkg = { name: "@nyuchi/ui", version: "1.0.0" };
    expect(policyCheck(calc, versionsOf, {})(pkg)).toMatch(/policy/);
    expect(
      policyCheck(calc, versionsOf, {
        RELEASE_BUMP: "major",
        RELEASE_MANUAL: "true",
      })(pkg),
    ).toBeNull();
  });
});

describe("npmPublishArgs", () => {
  // The npm CLI publishes the tarball pnpm packed: trusted publishing (OIDC)
  // is an npm feature. No token flag and no --tag: npm applies `latest`.
  test("publishes the packed tarball, public", () => {
    expect(npmPublishArgs("/tmp/x/bundu-ui-0.4.0.tgz")).toEqual([
      "publish",
      "/tmp/x/bundu-ui-0.4.0.tgz",
      "--access",
      "public",
    ]);
  });

  test("passes --dry-run through", () => {
    expect(npmPublishArgs("a.tgz", { dryRun: true })).toContain("--dry-run");
  });
});

describe("first publish of a never-published package", () => {
  test("childEnv strips every npm token variable and keeps the rest", () => {
    const env = {
      PATH: "/bin",
      NODE_AUTH_TOKEN: "XXXXX-XXXXX-XXXXX-XXXXX",
      NPM_TOKEN: "npm_x",
      npm_config__authToken: "npm_y",
      "npm_config_//registry.npmjs.org/:_authToken": "npm_z",
      NPM_CONFIG_PROVENANCE: "true",
    };
    expect(childEnv(env)).toEqual({
      PATH: "/bin",
      NPM_CONFIG_PROVENANCE: "true",
    });
  });

  test("neverPublished is true only on an E404", () => {
    const e404 = () => ({
      status: 1,
      stdout: '{"error":{"code":"E404"}}',
      stderr: "npm error code E404",
    });
    const found = () => ({ status: 0, stdout: '"@bundu/ui"', stderr: "" });
    const offline = () => ({
      status: 1,
      stdout: "",
      stderr: "npm error code ETIMEDOUT",
    });
    expect(neverPublished("@bundu/server", e404)).toBe(true);
    expect(neverPublished("@bundu/ui", found)).toBe(false);
    expect(neverPublished("@bundu/ui", offline)).toBe(false);
  });

  test("a never-published package fails with the manual steps; its dependants are blocked", () => {
    const published = [];
    const results = publishAll(pkgs, {
      isOnNpm: () => false,
      isNew: (name) => name === "@bundu/server",
      publish: (p) => {
        published.push(p.name);
        return true;
      },
    });
    const by = Object.fromEntries(results.map((r) => [r.name, r]));
    expect(by["@bundu/server"]).toMatchObject({
      result: "failed",
      detail: firstPublishMessage("@bundu/server"),
      firstPublish: true,
    });
    expect(by["@bundu/ui"]).toMatchObject({
      result: "blocked",
      detail: "needs @bundu/server on npm first",
    });
    expect(by["@nyuchi/ui"].result).toBe("published");
    expect(published).toEqual(["@nyuchi/ui"]);
  });

  test("the first-publish message names the package and the manual steps", () => {
    const msg = firstPublishMessage("@bundu/server");
    expect(msg).toMatch(/^@bundu\/server has never been published/);
    expect(msg).toContain("npm login --auth-type=web");
    expect(msg).toContain("npm publish <tgz> --access public");
    expect(msg).toContain("trusted publisher on npmjs.com");
  });
});
