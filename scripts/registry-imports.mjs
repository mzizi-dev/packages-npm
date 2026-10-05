/**
 * Import-specifier rewriting between the Mzizi registry's layout and this
 * repo's package layout. Pure functions, no I/O; scripts/sync-registry.mjs
 * does the reading and writing, and registry-imports.test.mjs pins the rules.
 *
 * The registry (mzizi-dev/mzizi-registry, components/registry/) is the one
 * source of every component. Its `.astro` and framework-free `.ts` files
 * import each other FLAT, the way `mzizi add --target astro` installs them
 * into one directory: `./button.astro`, `./ui-utils`, `./server-cookies.js`,
 * and a brand asset (`components/registry/assets/`) as `./assets/<file>.png`. A package keeps its own,
 * published, layout (`@bundu/ui/app/Button.astro`, `../lib/utils`), so the
 * sync maps each flat specifier to the package file that registry item
 * becomes, and writes the relative path from the importing file.
 *
 * `registry-map.json` is that table: registry name -> package + path, the
 * registry assets -> package paths, and per-package aliases (a registry item
 * a package re-exports from elsewhere, such as `server-table`, which
 * @bundu/ui reaches through its `src/lib/table.ts` re-export).
 */
import { posix } from "node:path";

/** `from "…"` and `import "…"` / `import("…")` specifiers. */
const SPECIFIER = /(\bfrom\s*|\bimport\s*\(?\s*)(["'])(\.\/[^"']+)\2/g;

/** `./name`, `./name.astro`, `./name.js`, or `./assets/<file>`. */
function parseFlat(spec) {
  const m =
    /^\.\/(assets\/[A-Za-z0-9._-]+|[a-z0-9]+(?:-[a-z0-9]+)*)(\.astro|\.js|\.ts)?$/.exec(
      spec,
    );
  if (!m) return null;
  if (m[1].startsWith("assets/")) return { asset: m[1] };
  return { name: m[1], ext: m[2] ?? "" };
}

function relativeImport(fromPath, toPath) {
  let rel = posix.relative(posix.dirname(fromPath), toPath);
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

/**
 * Rewrite one registry file's flat specifiers into the package layout.
 *
 * @param source     the registry file's text
 * @param registryPath its path under components/registry/ (`n6-pages/app-data-table.astro`)
 * @param pkg        package key in the map (`bundu-ui`)
 * @param packagePath where it is written in that package (`src/app/DataTable.astro`)
 * @param map        registry-map.json
 */
export function toPackage(source, registryPath, pkg, packagePath, map) {
  const missing = [];
  const out = source.replace(SPECIFIER, (whole, lead, q, spec) => {
    const flat = parseFlat(spec);
    if (!flat) {
      missing.push(spec);
      return whole;
    }
    let target;
    let ext = "";
    if (flat.asset) {
      // Brand assets are registry-wide: `components/registry/assets/<file>`.
      const asset = map.assets[flat.asset];
      if (asset && asset.package === pkg) target = asset.path;
    } else {
      const alias = map.aliases?.[pkg]?.[flat.name];
      const entry = map.components[flat.name];
      const path =
        alias ?? (entry && entry.package === pkg ? entry.path : undefined);
      if (path) {
        if (path.endsWith(".astro")) target = path;
        else {
          target = path.replace(/\.ts$/, "");
          ext = flat.ext === ".js" ? ".js" : "";
        }
      }
    }
    if (!target) {
      missing.push(spec);
      return whole;
    }
    return `${lead}${q}${relativeImport(packagePath, target)}${ext}${q}`;
  });
  if (missing.length) {
    throw new Error(
      `${registryPath}: no ${pkg} file for ${missing.map((s) => JSON.stringify(s)).join(", ")} (add it to scripts/registry-map.json)`,
    );
  }
  return out;
}

/**
 * The inverse: a package file's relative specifiers into the registry's flat
 * form. Used once to move the hand-authored files into the registry, and by
 * the test that proves the two directions agree.
 */
export function toRegistry(source, registryPath, pkg, packagePath, map) {
  const byPath = new Map();
  for (const [name, e] of Object.entries(map.components))
    if (e.package === pkg) byPath.set(e.path, name);
  for (const [name, path] of Object.entries(map.aliases?.[pkg] ?? {}))
    byPath.set(path, name);
  const assets = new Map();
  for (const [key, a] of Object.entries(map.assets))
    if (a.package === pkg) assets.set(a.path, key);
  const missing = [];
  const out = source.replace(
    /(\bfrom\s*|\bimport\s*\(?\s*)(["'])(\.{1,2}\/[^"']+)\2/g,
    (whole, lead, q, spec) => {
      const abs = posix.normalize(posix.join(posix.dirname(packagePath), spec));
      const asset = assets.get(abs);
      if (asset) return `${lead}${q}./${asset}${q}`;
      const js = abs.endsWith(".js");
      const candidates = abs.endsWith(".astro")
        ? [abs]
        : [abs.replace(/\.js$/, ".ts"), `${abs}.ts`];
      const name = candidates.map((c) => byPath.get(c)).find(Boolean);
      if (!name) {
        missing.push(spec);
        return whole;
      }
      const suffix = abs.endsWith(".astro") ? ".astro" : js ? ".js" : "";
      return `${lead}${q}./${name}${suffix}${q}`;
    },
  );
  if (missing.length)
    throw new Error(`${packagePath}: not in the map: ${missing.join(", ")}`);
  return out;
}
