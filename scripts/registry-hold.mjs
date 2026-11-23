/**
 * Holds: registry items built from an older registry commit than the pin.
 *
 * `scripts/registry-ref.json` pins one registry commit (`ref`) for every
 * component and contract. A hold keeps a named few at an earlier commit
 * (`hold.ref`) while the rest move, so a change the registry has made to one
 * item that is not yet safe to ship here (a breaking change held for a
 * coordinated major) does not stop the others from moving:
 *
 *   "hold": {
 *     "ref": "<registry commit>",
 *     "components": ["button"],          registry-map.json component keys
 *     "contracts": ["ui/button"],        contract names (<family>/<kebab>)
 *     "reason": "why, and when it lifts"
 *   }
 *
 * A held file is still built from the registry, byte for byte, and
 * `registry:check` and `contracts:check` still hold it to that commit. A hold
 * is not an exemption: nothing here may be hand-edited. Remove the entry (and
 * the hold once it is empty) to let an item follow `ref` again.
 *
 * Pure functions, no I/O; scripts/sync-registry.mjs and
 * scripts/fetch-contracts.mjs read the pin, registry-hold.test.mjs pins the
 * rules.
 */
import { FAMILIES, safeRef } from "./contract-paths.mjs";

const COMPONENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CONTRACT = new RegExp(
  `^(?:${FAMILIES.join("|")})\\/[a-z0-9]+(?:-[a-z0-9]+)*$`,
);

/**
 * The pin's hold, validated: `{ ref, components, contracts, reason }`, or
 * null when the pin has none. Throws on anything malformed, so a typo cannot
 * silently release an item from its hold or hold the wrong one.
 *
 * @param pin        registry-ref.json
 * @param components registry-map.json's `components` (every held component
 *                   must be one of them)
 */
export function readHold(pin, components = {}) {
  const hold = pin?.hold;
  if (hold === undefined) return null;
  if (hold === null || typeof hold !== "object" || Array.isArray(hold)) {
    throw new Error("registry-ref.json: hold must be an object");
  }
  const ref = safeRef(hold.ref);
  if (ref === pin.ref) {
    throw new Error("registry-ref.json: hold.ref is ref; remove the hold");
  }
  if (typeof hold.reason !== "string" || hold.reason.trim() === "") {
    throw new Error("registry-ref.json: a hold needs a reason");
  }
  const list = (key, shape) => {
    const v = hold[key] ?? [];
    if (!Array.isArray(v))
      throw new Error(`registry-ref.json: hold.${key} must be a list`);
    for (const name of v) {
      if (typeof name !== "string" || !shape.test(name)) {
        throw new Error(
          `registry-ref.json: hold.${key} has ${JSON.stringify(name)}`,
        );
      }
    }
    if (new Set(v).size !== v.length) {
      throw new Error(`registry-ref.json: hold.${key} repeats a name`);
    }
    return new Set(v);
  };
  const held = list("components", COMPONENT);
  const contracts = list("contracts", CONTRACT);
  for (const name of held) {
    if (!Object.hasOwn(components, name)) {
      throw new Error(
        `registry-ref.json: hold.components names ${name}, which is not in registry-map.json`,
      );
    }
  }
  if (held.size === 0 && contracts.size === 0) {
    throw new Error("registry-ref.json: the hold is empty; remove it");
  }
  return { ref, components: held, contracts, reason: hold.reason };
}

/** The registry commit a component is built from. */
export function componentRef(hold, name, ref) {
  return hold?.components.has(name) ? hold.ref : ref;
}

/** The registry commit a contract file (`ui/button.contract.json`) comes from. */
export function contractRef(hold, file, ref) {
  const name = file.replace(/\.contract\.json$/, "");
  return hold?.contracts.has(name) ? hold.ref : ref;
}
