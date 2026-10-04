// Rendering tests for the Discover Standard (src/discover/). The contracts
// (src/app/contracts.test.ts) check each component on its own; these check
// what only shows when they are put together: a whole Discover page, the
// server-filled shell mode circles.mukoko.com uses, and the CSP promises
// (no inline style, no script but JSON-LD).
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import MineralStrip from "../MineralStrip.astro";
import FilterBar from "../app/FilterBar.astro";
import CategoryChip from "./CategoryChip.astro";
import CategoryChips from "./CategoryChips.astro";
import DiscoverCard from "./DiscoverCard.astro";
import DiscoverHero from "./DiscoverHero.astro";
import DiscoverMeta from "./DiscoverMeta.astro";
import DiscoverSearch from "./DiscoverSearch.astro";
import DiscoverSection from "./DiscoverSection.astro";
import DiscoverShell from "./DiscoverShell.astro";
import LoadMore from "./LoadMore.astro";
import OpenInApp from "./OpenInApp.astro";
import ResultGrid from "./ResultGrid.astro";

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

type Component = Parameters<AstroContainer["renderToString"]>[0];
async function render(
  component: Component,
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<string> {
  const html = await container.renderToString(component, { props, slots });
  return html.replace(/ data-astro-source-(?:file|loc)="[^"]*"/g, "");
}

/** The CSP promises: no inline style, no script except JSON-LD, no islands. */
function expectCspSafe(html: string): void {
  expect(html).not.toMatch(/\sstyle=/);
  expect(html).not.toMatch(/<script\b(?![^>]*application\/ld\+json)/i);
  expect(html).not.toMatch(/<astro-island/i);
}

/** A whole home page, composed as an app composes it. */
async function homePage(): Promise<string> {
  const card = (title: string) =>
    render(DiscoverCard, {
      variant: "circle",
      href: `/c/${title.toLowerCase()}`,
      title,
      initial: title[0],
      badge: "Public",
      badgeTone: "brand",
      meta: ["12 members"],
    });
  const cards = (
    await Promise.all(["Runners", "Readers", "Chess"].map(card))
  ).join("");
  const grid = await render(
    ResultGrid,
    { label: "Featured circles", summary: "3 circles" },
    {
      default: cards,
      more: await render(LoadMore, {
        href: "/circles?cursor=abc",
        label: "More circles",
      }),
    },
  );
  const featured = await render(
    DiscoverSection,
    {
      id: "featured",
      eyebrow: "Featured",
      title: "Circles worth joining",
      seeAllHref: "/circles",
      seeAllLabel: "See every circle",
    },
    { default: grid },
  );
  const chips = await render(CategoryChips, {
    label: "Categories",
    items: [{ href: "/categories/running", label: "Running", count: 3 }],
  });
  const browse = await render(
    DiscoverSection,
    { id: "browse", title: "Find circles by what you love", tone: "muted" },
    { default: chips },
  );
  const hero = await render(
    DiscoverHero,
    {
      size: "home",
      eyebrow: "Mukoko Circles",
      title: "Find your people.",
      count: "3 circles on Mukoko",
    },
    {
      search: await render(DiscoverSearch, { label: "Search circles" }),
      actions: await render(OpenInApp, {
        href: "https://circles.mukoko.com/create",
        label: "Create a circle",
        hint: "",
      }),
    },
  );
  return render(
    DiscoverShell,
    {
      homeLabel: "mukoko circles, home",
      nav: [{ label: "All circles", href: "/circles" }],
    },
    {
      brand: "<span>mukoko circles</span>",
      default: hero + featured + browse,
    },
  );
}

describe("a whole Discover page", () => {
  test("has the landmarks, one h1, and named regions", async () => {
    const html = await homePage();
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html.match(/<header\b/g)).toHaveLength(1);
    expect(html.match(/<main id="main"/g)).toHaveLength(1);
    expect(html.match(/<footer\b/g)).toHaveLength(1);
    expect(html).toContain('role="search"');
    expect(html).toContain('aria-labelledby="featured-title"');
    expect(html).toContain('aria-labelledby="browse-title"');
    expect(html.match(/data-slot="discover-card"/g)).toHaveLength(3);
    expect(html).toContain('rel="next"');
  });

  test("is CSP-safe: no inline style, no script, no island", async () => {
    expectCspSafe(await homePage());
  });

  test("every heading level steps down from the h1", async () => {
    const html = await homePage();
    const levels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
    for (const [i, l] of levels.entries()) {
      if (i > 0)
        expect(
          l - (levels[i - 1] ?? 1),
          `h${levels[i - 1]} → h${l}`,
        ).toBeLessThanOrEqual(1);
    }
  });
});

describe("server-filled shells", () => {
  // circles.mukoko.com builds each shell once with {{placeholders}} and its
  // Rust Worker fills them. The components must leave every placeholder
  // intact and need no logic in the template.
  const fill = (html: string, vars: Record<string, string>) =>
    html.replace(
      /\{\{\{?\s*([a-z_]+)\s*\}?\}\}/g,
      (_, k: string) => vars[k] ?? "",
    );

  test("a card fragment keeps its placeholders and hides what fills empty", async () => {
    const tpl = await render(DiscoverCard, {
      variant: "circle",
      href: "{{href}}",
      title: "{{name}}",
      initial: "{{initial}}",
      badge: "{{type_label}}",
      badgeTone: "{{type_tone}}",
      summary: "{{summary}}",
      meta: ["{{members}}", "{{categories}}"],
    });
    for (const k of [
      "href",
      "name",
      "initial",
      "type_label",
      "type_tone",
      "summary",
      "members",
      "categories",
    ])
      expect(tpl, k).toContain(`{{${k}}}`);
    const html = fill(tpl, {
      href: "/c/runners",
      name: "Runners",
      initial: "R",
      type_label: "Public",
      type_tone: "brand",
      summary: "",
      members: "12 members",
      categories: "",
    });
    expect(html).toContain('href="/c/runners"');
    expect(html).toContain('data-tone="brand"');
    // The empty summary and categories are still there, and hide by CSS.
    expect(html).toMatch(/<p class="[^"]*empty:hidden[^"]*"><\/p>/);
    expect(html).toMatch(/<li class="empty:hidden"><\/li>/);
  });

  test("a result grid and load more switch on state, with no template logic", async () => {
    const tpl = await render(
      ResultGrid,
      { label: "Circles", state: "{{results_state}}", summary: "{{results}}" },
      {
        default: "{{{cards}}}",
        empty: "<p>No circles here yet.</p>",
        more: await render(LoadMore, {
          href: "{{next_href}}",
          state: "{{more_state}}",
          label: "More circles",
        }),
      },
    );
    const empty = fill(tpl, {
      results_state: "empty",
      results: "No circles",
      cards: "",
      next_href: "",
      more_state: "end",
    });
    expect(empty).toContain('data-state="empty"');
    expect(empty).toMatch(/data-when="empty"/);
    const ok = fill(tpl, {
      results_state: "ok",
      results: "2 circles",
      cards: "<li>a</li><li>b</li>",
      next_href: "/circles?cursor=x",
      more_state: "more",
    });
    expect(ok).toContain('href="/circles?cursor=x"');
    expect(ok).toContain('data-state="more"');
  });

  test("a chip's current state can come from the server", async () => {
    const tpl = await render(CategoryChip, {
      href: "{{href}}",
      label: "{{name}}",
      count: "{{count}}",
      current: "{{current}}",
    });
    expect(
      fill(tpl, {
        href: "/categories/running",
        name: "Running",
        count: "3",
        current: "page",
      }),
    ).toContain('aria-current="page"');
    expect(
      fill(tpl, {
        href: "/categories/music",
        name: "Music",
        count: "",
        current: "false",
      }),
    ).toContain('aria-current="false"');
  });
});

describe("DiscoverCard variants share one anatomy", () => {
  test.each([
    [
      "article",
      {
        image: "https://img.example/a.jpg",
        eyebrow: "The Herald",
        datetime: "2026-10-04",
        dateLabel: "Today",
      },
    ],
    [
      "event",
      {
        image: "https://img.example/e.jpg",
        datetime: "2026-10-24T18:00",
        dateLabel: "Sat 24 Oct",
        place: "Harare",
      },
    ],
    ["circle", { initial: "H", meta: ["12 members"] }],
    [
      "place",
      { figure: "24°", figureLabel: "Sunny", eyebrow: "Harare Province" },
    ],
  ] as const)(
    "%s: one heading, one primary link, no style",
    async (variant, extra) => {
      const html = await render(DiscoverCard, {
        variant,
        href: "/x",
        title: "Title",
        ...extra,
      });
      expect(html).toContain(`data-variant="${variant}"`);
      expect(html.match(/\sdata-card-link[\s>]/g)).toHaveLength(1);
      expect(html.match(/<h3\b/g)).toHaveLength(1);
      expectCspSafe(html);
    },
  );

  test("article and event put the image on top; circle and place beside the title", async () => {
    const top = await render(DiscoverCard, {
      variant: "article",
      href: "/x",
      title: "T",
      image: "/a.jpg",
    });
    expect(top).toMatch(/<article[^>]*>\s*<img[^>]*aspect-video/);
    const side = await render(DiscoverCard, {
      variant: "circle",
      href: "/x",
      title: "T",
      image: "/a.jpg",
    });
    expect(side).toMatch(/<img[^>]*size-12/);
  });
});

describe("DiscoverMeta", () => {
  test("escapes < in JSON-LD so a value can never close the element", async () => {
    const html = await render(DiscoverMeta, {
      title: "T",
      description: "D",
      canonical: "https://x.example/",
      siteName: "S",
      jsonLd: { name: "</script><script>alert(1)</script>" },
    });
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).toContain("\\u003c/script>");
    expectCspSafe(html);
  });
});

describe("CSP-safe upstream fixes", () => {
  test("MineralStrip colours its segments without inline styles", async () => {
    const html = await render(MineralStrip);
    expect(html.match(/data-mineral="/g)).toHaveLength(7);
    expectCspSafe(html);
  });

  test("FilterBar can leave the search field out", async () => {
    const html = await render(FilterBar, {
      search: false,
      selects: [
        {
          name: "type",
          label: "Type",
          options: [{ value: "public", label: "Public" }],
        },
      ],
      values: { type: "" },
      clearHref: "/circles",
    });
    expect(html).not.toContain('type="search"');
    expect(html).toContain('name="type"');
    // An empty value is not an active filter.
    expect(html).not.toContain(">Clear<");
  });
});
