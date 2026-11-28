// @bundu/ui/starlight: the Mzizi shell and theme for Starlight docs sites.
// The plugin and its options are plain functions, tested directly. The
// .astro files compose Starlight's own components through its virtual
// modules, so they only render inside a Starlight build; here they are held
// to their sources: token-only colours, the exports that name them, and the
// imports they may use.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vite-plus/test";

import {
  MINERALS,
  ShellOptionsError,
  accentCss,
  isSafeHref,
  resolveShellOptions,
} from "./options";
import {
  COMPONENTS,
  OPTIONS_MODULE_ID,
  SHELL_CSS,
  THEME_CSS,
  TOKENS_CSS,
  starlightMziziShell,
} from "./plugin";
import { SCROLLED_ATTRIBUTE, initScrollState } from "./scroll-state";

const DIR = fileURLToPath(new URL(".", import.meta.url));
const PKG = fileURLToPath(new URL("../..", import.meta.url));
const pkg = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8")) as {
  exports: Record<string, string | { import?: string; types?: string }>;
};

describe("resolveShellOptions", () => {
  test("fills the defaults", () => {
    expect(resolveShellOptions()).toEqual({
      navLinks: [],
      footerColumns: [],
      tagline: "I am because we are.",
      legal: "",
      accent: null,
      theme: true,
    });
  });

  test("keeps valid links and marks external ones", () => {
    const r = resolveShellOptions({
      navLinks: [{ label: " API ", href: "/api/" }],
      footerColumns: [
        {
          title: "Ecosystem",
          links: [
            { label: "GitHub", href: "https://github.com/x", external: true },
            { label: "Home", href: "/", external: false },
          ],
        },
      ],
      accent: "copper",
      theme: false,
    });
    expect(r.navLinks).toEqual([{ label: "API", href: "/api/" }]);
    expect(r.footerColumns[0]?.links).toEqual([
      { label: "GitHub", href: "https://github.com/x", external: true },
      { label: "Home", href: "/" },
    ]);
    expect(r.accent).toBe("copper");
    expect(r.theme).toBe(false);
  });

  test.each([
    [{ colour: "gold" }, /unknown option "colour"/],
    [{ navLinks: [{ label: "x", href: "javascript:alert(1)" }] }, /href/],
    [{ navLinks: [{ label: "x", href: "//evil.example" }] }, /href/],
    [
      {
        navLinks: [
          { label: "a", href: "/a/" },
          { label: "b", href: "/a/" },
        ],
      },
      /repeats/,
    ],
    [
      {
        navLinks: Array.from({ length: 7 }, (_, i) => ({
          label: `${i}`,
          href: `/${i}/`,
        })),
      },
      /at most 6/,
    ],
    [{ footerColumns: [{ title: "Docs", links: [] }] }, /must not be empty/],
    [{ tagline: "" }, /tagline must be a non-empty string/],
    [{ accent: "#bf5a36" }, /must be one of the minerals/],
    [{ accent: "var(--color-copper)" }, /must be one of the minerals/],
    [{ accent: "hematite" }, /must be one of the minerals/],
    [{ theme: "yes" }, /theme must be a boolean/],
  ])("rejects %j", (input, message) => {
    expect(() => resolveShellOptions(input)).toThrow(ShellOptionsError);
    expect(() => resolveShellOptions(input)).toThrow(message);
  });

  test("isSafeHref accepts root-relative paths and http(s) only", () => {
    expect(isSafeHref("/docs/")).toBe(true);
    expect(isSafeHref("https://bundu.org")).toBe(true);
    expect(isSafeHref("mailto:a@b.c")).toBe(false);
    expect(isSafeHref("/a b")).toBe(false);
  });
});

describe("accentCss", () => {
  test("points the accent at one mineral's tokens, never a colour", () => {
    for (const mineral of MINERALS) {
      const css = accentCss(mineral);
      expect(css).toContain(`--mzizi-accent:var(--color-${mineral})`);
      expect(css).toContain(
        `--mzizi-accent-container:var(--color-${mineral}-container)`,
      );
      expect(css).toContain(
        `--mzizi-accent-on-container:var(--color-${mineral}-on-container)`,
      );
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb|hsl|oklch/i);
    }
  });

  test("is empty without an accent, so the theme follows --primary", () => {
    expect(accentCss(null)).toBe("");
  });

  test("names the seven minerals in strip order", () => {
    expect(MINERALS).toEqual([
      "cobalt",
      "tanzanite",
      "malachite",
      "gold",
      "terracotta",
      "sodalite",
      "copper",
    ]);
  });
});

// A stand-in for Starlight's config:setup hook arguments.
function setup(config: Record<string, unknown> = {}) {
  const updates: Record<string, unknown>[] = [];
  const integrations: { hooks: Record<string, (a: unknown) => void> }[] = [];
  const logged: string[] = [];
  return {
    updates,
    integrations,
    logged,
    args: {
      config,
      updateConfig: (u: Record<string, unknown>) => updates.push(u),
      addIntegration: (i: { hooks: Record<string, (a: unknown) => void> }) =>
        integrations.push(i),
      logger: { info: (m: string) => logged.push(m) },
    },
  };
}

describe("starlightMziziShell", () => {
  test("fails at config time on a bad option", () => {
    expect(() => starlightMziziShell({ accent: "red" as never })).toThrow(
      ShellOptionsError,
    );
  });

  test("registers the shell components and the stylesheets, ours first", () => {
    const s = setup({ customCss: ["./src/site.css"] });
    starlightMziziShell({ accent: "gold" }).hooks["config:setup"](s.args);
    expect(s.updates[0]).toEqual({
      components: { ...COMPONENTS },
      customCss: [TOKENS_CSS, THEME_CSS, SHELL_CSS, "./src/site.css"],
    });
  });

  test("theme: false adds only the shell stylesheet", () => {
    const s = setup();
    starlightMziziShell({ theme: false }).hooks["config:setup"](s.args);
    expect(s.updates[0]?.customCss).toEqual([SHELL_CSS]);
  });

  test("leaves a component the site already overrides, and says so", () => {
    const s = setup({ components: { PageFrame: "./src/PageFrame.astro" } });
    starlightMziziShell().hooks["config:setup"](s.args);
    const components = s.updates[0]?.components as Record<string, string>;
    expect(components.PageFrame).toBe("./src/PageFrame.astro");
    expect(components.Header).toBe(COMPONENTS.Header);
    expect(s.logged.join("\n")).toMatch(/PageFrame is already overridden/);
  });

  test("serves the resolved options as a virtual module", () => {
    const s = setup();
    starlightMziziShell({
      legal: "© 2026 Bundu Foundation",
      accent: "copper",
    }).hooks["config:setup"](s.args);
    let plugin:
      | {
          resolveId: (id: string) => string | undefined;
          load: (id: string) => string | undefined;
        }
      | undefined;
    s.integrations[0]?.hooks["astro:config:setup"]?.({
      updateConfig: (u: {
        vite: { plugins: NonNullable<typeof plugin>[] };
      }) => {
        plugin = u.vite.plugins[0];
      },
    });
    const resolved = plugin?.resolveId(OPTIONS_MODULE_ID);
    expect(resolved).toBe(`\0${OPTIONS_MODULE_ID}`);
    expect(plugin?.resolveId("something-else")).toBeUndefined();
    const code = plugin?.load(resolved ?? "") ?? "";
    const json = JSON.parse(
      code.replace(/^export default /, "").replace(/;$/, ""),
    );
    expect(json.legal).toBe("© 2026 Bundu Foundation");
    expect(json.accent).toBe("copper");
  });
});

describe("initScrollState", () => {
  test("marks the document once it scrolls past the threshold", () => {
    const attrs = new Set<string>();
    const listeners: (() => void)[] = [];
    const win = {
      scrollY: 0,
      document: {
        documentElement: {
          toggleAttribute: (name: string, on: boolean) =>
            on ? attrs.add(name) : attrs.delete(name),
        },
      },
      addEventListener: (_t: string, fn: () => void) => listeners.push(fn),
      removeEventListener: () => listeners.pop(),
      requestAnimationFrame: (fn: () => void) => {
        fn();
        return 0;
      },
      cancelAnimationFrame: () => {},
    };
    const stop = initScrollState(win as unknown as Window);
    expect(attrs.has(SCROLLED_ATTRIBUTE)).toBe(false);
    win.scrollY = 40;
    listeners[0]?.();
    expect(attrs.has(SCROLLED_ATTRIBUTE)).toBe(true);
    win.scrollY = 0;
    listeners[0]?.();
    expect(attrs.has(SCROLLED_ATTRIBUTE)).toBe(false);
    stop();
    expect(listeners).toHaveLength(0);
  });
});

/** Removes every match, repeating until none is left, so a match that a removal reveals goes too. */
function stripAll(text: string, pattern: RegExp): string {
  let previous: string;
  do {
    previous = text;
    text = text.replace(pattern, "");
  } while (text !== previous);
  return text;
}

describe("the shell sources", () => {
  const files = readdirSync(DIR).filter((f) => /\.(astro|css)$/.test(f));

  test("carry no literal colour, only tokens", () => {
    for (const file of files) {
      // Comments and the font URL are not colours.
      let text = readFileSync(join(DIR, file), "utf8");
      text = stripAll(text, /\/\*[\s\S]*?\*\//g);
      text = stripAll(text, /<!--[\s\S]*?-->/g);
      text = stripAll(text, /url\([^)]*\)/g);
      expect(text, file).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(text, file).not.toMatch(
        /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/i,
      );
    }
  });

  test("are every one exported, and every starlight export exists", () => {
    const targets = Object.entries(pkg.exports).filter(([name]) =>
      name.startsWith("./starlight"),
    );
    for (const file of files) {
      expect(
        targets.some(([, t]) => t === `./src/starlight/${file}`),
        file,
      ).toBe(true);
    }
    for (const [name, t] of targets) {
      const target = typeof t === "string" ? t : (t.import ?? "");
      if (target.startsWith("./dist/")) continue; // built by `pnpm build`
      expect(existsSync(join(PKG, target)), `${name} -> ${target}`).toBe(true);
    }
  });

  test("the plugin registers paths the package exports", () => {
    for (const path of [
      ...Object.values(COMPONENTS),
      SHELL_CSS,
      THEME_CSS,
      TOKENS_CSS,
    ]) {
      expect(Object.keys(pkg.exports)).toContain(
        path.replace("@bundu/ui", "."),
      );
    }
  });

  test("the .astro files import Starlight, siblings or tokens, never a framework", () => {
    for (const file of files.filter((f) => f.endsWith(".astro"))) {
      // Usage examples in doc comments are not imports.
      const text = readFileSync(join(DIR, file), "utf8").replace(
        /\/\*[\s\S]*?\*\//g,
        "",
      );
      const specs = [...text.matchAll(/\bfrom\s*["']([^"']+)["']/g)].map(
        (m) => m[1] ?? "",
      );
      for (const spec of specs) {
        expect(spec, `${file} imports ${spec}`).toMatch(
          /^(?:virtual:starlight\/|virtual:bundu-ui\/|@astrojs\/starlight\/|\.\/|\.\.\/app\/nav$)/,
        );
      }
    }
  });

  test("the theme maps Starlight onto the accent and the semantic tokens", () => {
    const theme = readFileSync(join(DIR, "theme.css"), "utf8");
    expect(theme).toMatch(/--mzizi-accent: var\(--primary\)/);
    for (const v of [
      "--sl-color-accent",
      "--sl-color-accent-low",
      "--sl-color-accent-high",
      "--sl-color-white",
      "--sl-color-black",
      "--sl-font",
    ]) {
      expect(theme).toContain(`${v}:`);
    }
  });
});
