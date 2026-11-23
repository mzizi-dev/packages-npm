// scripts/registry-hold.mjs: which registry commit a held component or
// contract is built from, and the shapes a hold may take. A malformed hold
// must fail, never silently release or widen.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vite-plus/test";

import { componentRef, contractRef, readHold } from "./registry-hold.mjs";

const REF = "82aafedef083eb979d6521a8e68cb8b29f4c249b";
const OLD = "a64e57f23b598dfb7484230bcf156218bf578d1d";
const components = { button: {}, "app-button": {} };
const pin = (hold) => ({ ref: REF, hold });
const ok = {
  ref: OLD,
  components: ["button"],
  contracts: ["ui/button"],
  reason: "held for the coordinated major",
};

describe("registry-hold", () => {
  test("no hold is null, and everything follows ref", () => {
    expect(readHold({ ref: REF }, components)).toBeNull();
    expect(componentRef(null, "button", REF)).toBe(REF);
    expect(contractRef(null, "ui/button.contract.json", REF)).toBe(REF);
  });

  test("a held component and contract come from hold.ref, the rest from ref", () => {
    const hold = readHold(pin(ok), components);
    expect(componentRef(hold, "button", REF)).toBe(OLD);
    expect(componentRef(hold, "app-button", REF)).toBe(REF);
    expect(contractRef(hold, "ui/button.contract.json", REF)).toBe(OLD);
    expect(contractRef(hold, "app/button.contract.json", REF)).toBe(REF);
  });

  test.each([
    ["no reason", { ...ok, reason: "" }, /reason/],
    ["hold.ref equal to ref", { ...ok, ref: REF }, /remove the hold/],
    ["a bad ref", { ...ok, ref: "../x" }, /refusing ref/],
    [
      "an unknown component",
      { ...ok, components: ["nope"] },
      /not in registry-map/,
    ],
    [
      "a bad contract name",
      { ...ok, contracts: ["ui/../x"] },
      /hold.contracts/,
    ],
    ["a repeated name", { ...ok, components: ["button", "button"] }, /repeats/],
    ["an empty hold", { ...ok, components: [], contracts: [] }, /empty/],
    ["a non-object", ["button"], /must be an object/],
  ])("refuses %s", (_label, hold, message) => {
    expect(() => readHold(pin(hold), components)).toThrow(message);
  });

  test("the pinned hold names real map entries", () => {
    const repoPin = JSON.parse(
      readFileSync(new URL("./registry-ref.json", import.meta.url), "utf8"),
    );
    const map = JSON.parse(
      readFileSync(new URL("./registry-map.json", import.meta.url), "utf8"),
    );
    expect(() => readHold(repoPin, map.components)).not.toThrow();
  });
});
