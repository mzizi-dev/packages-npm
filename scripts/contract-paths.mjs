/**
 * Path safety for scripts/fetch-contracts.mjs.
 *
 * The file list comes from the registry's contracts/index.json, which is
 * fetched over the network. A name in it is data, never a path to trust: an
 * entry such as `../../../.github/workflows/publish.yml` or `/etc/x` must not
 * make the script read or write outside packages/bundu-ui/contracts/. So
 * every name is checked against the exact shapes the registry uses, and the
 * resolved path is then asserted to stay inside the destination.
 */
import { isAbsolute, relative, resolve, sep } from "node:path";

/** `app/<kebab>.contract.json`: the only shape a contract file has. */
export const CONTRACT_FILE = /^app\/[a-z0-9]+(?:-[a-z0-9]+)*\.contract\.json$/;
/** `schema/<kebab>.schema.json`: the only shape the schema file has. */
export const SCHEMA_FILE = /^schema\/[a-z0-9]+(?:-[a-z0-9]+)*\.schema\.json$/;
/** A git branch, tag or commit: no `..`, no leading `/` or `-`, no `//`. */
export const REF =
  /^(?!.*\.\.)(?!.*\/\/)(?![-/])[A-Za-z0-9._/-]{1,200}(?<!\/)$/;

/**
 * Resolve `rel` under `dest`, or throw. `shape` is the pattern `rel` must
 * match in full; the resolved path must also stay strictly inside `dest`.
 */
export function safeJoin(dest, rel, shape) {
  if (typeof rel !== "string" || !shape.test(rel)) {
    throw new Error(
      `refusing contract path ${JSON.stringify(rel)}: not ${shape}`,
    );
  }
  if (isAbsolute(rel) || rel.includes("\\") || rel.split("/").includes("..")) {
    throw new Error(`refusing contract path ${JSON.stringify(rel)}`);
  }
  const root = resolve(dest);
  const out = resolve(root, rel);
  const inside = relative(root, out);
  if (
    inside === "" ||
    inside.startsWith("..") ||
    isAbsolute(inside) ||
    !out.startsWith(root + sep)
  ) {
    throw new Error(
      `refusing contract path ${JSON.stringify(rel)}: resolves outside ${root}`,
    );
  }
  return out;
}

/** Validate a registry ref before it goes into a URL. */
export function safeRef(ref) {
  if (typeof ref !== "string" || !REF.test(ref))
    throw new Error(`refusing ref ${JSON.stringify(ref)}`);
  return ref;
}
