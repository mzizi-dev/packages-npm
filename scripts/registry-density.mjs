/**
 * Derive @bundu/ui's `styles/density.css` from the Mzizi registry's
 * `components/registry/n1-tokens/mzizi-tokens-globals.css`. Pure function, no
 * I/O; scripts/sync-registry.mjs reads and writes, registry-density.test.mjs
 * pins the rules.
 *
 * The registry's stylesheet is a whole, self-contained globals.css (it imports
 * Tailwind and re-declares the palette), made to be COPIED into an app. Here
 * the palette already comes from `tokens.css` / `theme.css`, generated from
 * canon, so importing the file whole would declare every colour twice. What
 * the components need from it, and what `tokens.css` does not carry, is the
 * Bundu floor and the density layers:
 *
 *   - the size roles the components use as utilities (`h-control`,
 *     `h-control-sm`, `h-control-lg`, `size-control-icon`, `h-field`,
 *     `min-h-touch-min`): their `--spacing-*` registrations and the
 *     `--size-*`, `--control-floor` and `--target-floor` values behind them;
 *   - the body and caption floor (`--fs-*`, `--lh-*` and the `--text-*`
 *     registrations, with Tailwind's `text-xs`, `text-sm` and `text-base`
 *     remapped to 14, 14 and 17px);
 *   - the `hit-area` rule that grows every control to a 49px hit region, the
 *     tablet and desktop density layers, and the
 *     `:root[data-mzizi-sizes="legacy"]` opt-out.
 *
 * Declarations are filtered by name; the rules and media blocks are copied
 * verbatim. If the registry renames or drops what a filter expects, this
 * throws rather than writing a file with a layer missing.
 */

/** Skip a comment or string starting at `i`; return the index after it, or `i` if none. */
function skipOpaque(css, i) {
  const c = css[i];
  if (c === "/" && css[i + 1] === "*") {
    const end = css.indexOf("*/", i + 2);
    if (end === -1) throw new Error("unterminated comment");
    return end + 2;
  }
  if (c === '"' || c === "'") {
    let j = i + 1;
    while (j < css.length && css[j] !== c) j += css[j] === "\\" ? 2 : 1;
    return j + 1;
  }
  return i;
}

/** The top-level blocks of `css`, each with the last comment before it. */
export function topLevelBlocks(css) {
  const blocks = [];
  let i = 0;
  let start = 0;
  while (i < css.length) {
    const next = skipOpaque(css, i);
    if (next !== i) {
      i = next;
    } else if (css[i] === ";") {
      i += 1;
      start = i; // a statement (`@import ...;`), not a block
    } else if (css[i] === "{") {
      const open = i;
      let depth = 1;
      i += 1;
      while (i < css.length && depth > 0) {
        const skipped = skipOpaque(css, i);
        if (skipped !== i) {
          i = skipped;
          continue;
        }
        if (css[i] === "{") depth += 1;
        else if (css[i] === "}") depth -= 1;
        i += 1;
      }
      if (depth !== 0) throw new Error("unbalanced braces");
      const head = css.slice(start, open);
      const comments = head.match(/\/\*[\s\S]*?\*\//g) ?? [];
      blocks.push({
        prelude: head.replace(/\/\*[\s\S]*?\*\//g, "").trim(),
        comment: comments.at(-1) ?? "",
        body: css.slice(open + 1, i - 1),
        text: css.slice(open, i),
      });
      start = i;
    } else {
      i += 1;
    }
  }
  return blocks;
}

/** The `--name: value` declarations of a block body: comments dropped, values collapsed. */
export function declarations(body) {
  const clean = body.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  const re = /(--[A-Za-z0-9_-]+)\s*:/g;
  let m;
  while ((m = re.exec(clean))) {
    let j = re.lastIndex;
    let depth = 0;
    while (j < clean.length && !(clean[j] === ";" && depth === 0)) {
      if (clean[j] === "(") depth += 1;
      if (clean[j] === ")") depth -= 1;
      j += 1;
    }
    out.push({
      name: m[1],
      value: clean.slice(re.lastIndex, j).replace(/\s+/g, " ").trim(),
    });
    re.lastIndex = j + 1;
  }
  return out;
}

const SIZE_ROLE =
  /^--spacing-(?:touch|touch-min|control|control-sm|control-lg|control-icon|control-dense|field|field-sm)$/;
const TEXT_ROLE =
  /^--text-(?:body-lg|body|body-sm|small|caption|code|xs|sm|base)(?:--line-height)?$/;
const ROOT_VAR =
  /^--(?:size-[a-z-]+|control-floor|target-floor|touch-target(?:-lg|-sm)?|h-button-default|h-button-sm|h-input|fs-[a-z0-9-]+|lh-[a-z0-9-]+)$/;

/** Names the derived file must define, or the registry has moved under it. */
const REQUIRED = [
  "--spacing-control",
  "--spacing-control-sm",
  "--spacing-control-lg",
  "--spacing-control-icon",
  "--spacing-field",
  "--spacing-touch-min",
  "--text-base",
  "--text-xs",
  "--size-control",
  "--target-floor",
  "--control-floor",
  "--fs-body",
  "--fs-caption",
];

function rule(decls) {
  return decls.map((d) => `  ${d.name}: ${d.value};`).join("\n");
}

/** A block as the registry wrote it, with its comment. */
function verbatim(b) {
  return `${b.comment ? `${b.comment}\n` : ""}${b.prelude} ${b.text}`;
}

export function densityCss(source, ref) {
  const blocks = topLevelBlocks(source);
  const theme = blocks
    .filter((b) => b.prelude === "@theme inline")
    .flatMap((b) => declarations(b.body))
    .filter((d) => SIZE_ROLE.test(d.name) || TEXT_ROLE.test(d.name));
  const root = blocks
    .filter((b) => b.prelude === ":root")
    .flatMap((b) => declarations(b.body))
    .filter((d) => ROOT_VAR.test(d.name));
  const hit = blocks.filter(
    (b) => b.prelude === "@layer base" && b.body.includes("hit-area"),
  );
  const media = blocks.filter(
    (b) =>
      b.prelude.startsWith("@media") &&
      /--control-floor|--fs-display|--size-/.test(b.body),
  );
  const legacy = blocks.filter(
    (b) => b.prelude === ':root[data-mzizi-sizes="legacy"]',
  );

  const have = new Set([...theme, ...root].map((d) => d.name));
  const missing = REQUIRED.filter((n) => !have.has(n));
  if (missing.length) {
    throw new Error(
      `registry stylesheet no longer defines ${missing.join(", ")}`,
    );
  }
  if (hit.length !== 1) throw new Error("expected one hit-area rule");
  if (media.length < 2) {
    throw new Error("expected the tablet and desktop density layers");
  }
  if (legacy.length !== 1) {
    throw new Error('expected one data-mzizi-sizes="legacy" block');
  }

  return `/* ════════════════════════════════════════════════════════════════════════════
 * THE BUNDU FLOOR AND DENSITY — GENERATED. Do not edit.
 *
 * Derived by \`pnpm registry:sync\` (scripts/registry-density.mjs) from
 * mzizi-registry's components/registry/n1-tokens/mzizi-tokens-globals.css at
 * ${ref.slice(0, 12)}; \`pnpm registry:check\` holds it to that. Change the registry,
 * bump scripts/registry-ref.json, sync.
 *
 * What it is: body text 17px, captions 14px, a 49px hit region on every
 * control (a control may be DRAWN 28 to 40px at desktop density), and the size
 * roles the components use (h-control, h-control-sm, h-control-lg,
 * size-control-icon, h-field, min-h-touch-min). Without it those utilities
 * resolve to nothing. \`styles/globals.css\` imports it. An app that imports the
 * pieces separately adds it AFTER theme.css and tokens.css:
 *
 *   @import "@bundu/ui/styles/theme.css";
 *   @import "@bundu/ui/styles/density.css";
 *
 * \`:root[data-mzizi-sizes="legacy"]\` restores the pre-floor sizes (16px body,
 * 12px captions, 48/56px controls) until an app has migrated.
 * ════════════════════════════════════════════════════════════════════════════ */

@theme inline {
${rule(theme)}
}

:root {
${rule(root)}
}

${hit.map(verbatim).join("\n\n")}

${media.map(verbatim).join("\n\n")}

${legacy.map(verbatim).join("\n\n")}
`;
}
