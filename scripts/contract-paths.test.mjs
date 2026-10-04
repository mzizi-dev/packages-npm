// scripts/fetch-contracts.mjs writes files named by fetched data; these are
// the names it must refuse.
import { resolve } from "node:path";
import { describe, expect, test } from "vite-plus/test";

import {
  CONTRACT_FILE,
  SCHEMA_FILE,
  safeJoin,
  safeRef,
} from "./contract-paths.mjs";

const dest = resolve("/tmp/pkg/contracts");

describe("safeJoin", () => {
  test("accepts the registry's own shapes", () => {
    expect(safeJoin(dest, "app/side-nav.contract.json", CONTRACT_FILE)).toBe(
      resolve(dest, "app/side-nav.contract.json"),
    );
    expect(
      safeJoin(dest, "schema/component-contract.schema.json", SCHEMA_FILE),
    ).toBe(resolve(dest, "schema/component-contract.schema.json"));
  });

  test.each([
    "../package.json",
    "app/../../package.json",
    "app/../../../.github/workflows/publish.yml",
    "/etc/passwd",
    "app\\..\\..\\x.contract.json",
    "app/x/../../y.contract.json",
    "app/.contract.json",
    "app/Side-Nav.contract.json",
    "app/side-nav.contract.json/..",
    "",
    "app/side-nav.json",
  ])("refuses %j", (rel) => {
    expect(() => safeJoin(dest, rel, CONTRACT_FILE)).toThrow(/refusing/);
  });

  test("refuses a non-string", () => {
    expect(() => safeJoin(dest, 42, CONTRACT_FILE)).toThrow(/refusing/);
    expect(() => safeJoin(dest, null, SCHEMA_FILE)).toThrow(/refusing/);
  });

  test("the schema pattern does not admit a contract path, or traversal", () => {
    expect(() =>
      safeJoin(dest, "../schema/x.schema.json", SCHEMA_FILE),
    ).toThrow();
    expect(() => safeJoin(dest, "app/x.contract.json", SCHEMA_FILE)).toThrow();
  });
});

describe("safeRef", () => {
  test.each(["main", "feat/component-contracts", "v1.2.3", "661be66"])(
    "accepts %s",
    (ref) => expect(safeRef(ref)).toBe(ref),
  );
  test.each([
    "../main",
    "a/../b",
    "/main",
    "-x",
    "a//b",
    "main/",
    "a b",
    "a?x=1",
    "a#b",
    "",
  ])("refuses %j", (ref) => expect(() => safeRef(ref)).toThrow(/refusing/));
});
