// Rendering tests for the app patterns. Each component is rendered on the
// server through Astro's container API with NO framework renderer
// registered, so a component that reached for React (or any island) would
// fail to render here. The HTML is checked for the semantics the component
// promises: landmarks, labels, ARIA wiring, and no client JavaScript.
import { readFileSync, readdirSync } from "node:fs";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import AccountMenu from "./AccountMenu.astro";
import BrandMark from "./BrandMark.astro";
import CommandPalette from "./CommandPalette.astro";
import EmptyState from "./EmptyState.astro";
import InfoTip from "./InfoTip.astro";
import QuickSearch from "./QuickSearch.astro";
import StatTiles from "./StatTiles.astro";
import Toolbar from "./Toolbar.astro";
import ToolbarMenu from "./ToolbarMenu.astro";
import TopBarAction from "./TopBarAction.astro";
import WorkspaceSwitcher from "./WorkspaceSwitcher.astro";
import Alert from "./Alert.astro";
import Badge from "./Badge.astro";
import BarChart from "./BarChart.astro";
import Button from "./Button.astro";
import AppShell from "./AppShell.astro";
import DataTable from "./DataTable.astro";
import DetailPanel from "./DetailPanel.astro";
import FilterBar from "./FilterBar.astro";
import FormField from "./FormField.astro";
import FormLayout from "./FormLayout.astro";
import PageHeader from "./PageHeader.astro";
import Pagination from "./Pagination.astro";
import SideNav from "./SideNav.astro";
import StateMessage from "./StateMessage.astro";
import StatTile from "./StatTile.astro";
import Toast from "./Toast.astro";

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

type Component = Parameters<AstroContainer["renderToString"]>[0];

async function render(
  component: Component,
  props: Record<string, unknown> = {},
  options: { slots?: Record<string, string>; request?: Request } = {},
): Promise<string> {
  const html = await container.renderToString(component, { props, ...options });
  // Dev builds tag every element with its source location; drop the tags so
  // the assertions read like the HTML an app ships.
  return html.replace(/ data-astro-source-(?:file|loc)="[^"]*"/g, "");
}

/** No component may ship a script or an island. */
function expectNoClientJs(html: string): void {
  expect(html).not.toMatch(/<script/i);
  expect(html).not.toMatch(/<astro-island/i);
}

describe("PageHeader", () => {
  test("renders one h1, the description and breadcrumbs", async () => {
    const html = await render(PageHeader, {
      title: "People",
      description: "Everyone in your family.",
      crumbs: [{ label: "Dashboard", href: "/dashboard" }, { label: "People" }],
    });
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("Everyone in your family.");
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toMatch(/<span aria-current="page">People<\/span>/);
    expectNoClientJs(html);
  });

  test("omits the breadcrumb landmark when there are no crumbs", async () => {
    const html = await render(PageHeader, { title: "People" });
    expect(html).not.toContain("Breadcrumb");
  });
});

describe("DataTable", () => {
  const columns = [
    { key: "name", label: "Name" },
    { key: "role", label: "Role" },
    { key: "count", label: "Members", align: "end" },
  ];

  test("is a real table with a caption and scoped headers", async () => {
    const html = await render(DataTable, {
      caption: "People, 2 in all",
      columns,
      rows: [
        {
          name: { text: "Tendai", href: "/people/1" },
          role: { text: "Guardian", badge: "outline" },
          count: 3,
        },
        { name: "Rudo", role: null, count: 0 },
      ],
      rowKey: "name",
    });
    expect(html).toContain("<table");
    expect(html).toMatch(
      /<caption class="sr-only">People, 2 in all<\/caption>/,
    );
    expect(html.match(/scope="col"/g)).toHaveLength(3);
    expect(html.match(/scope="row"/g)).toHaveLength(2);
    expect(html).toContain('href="/people/1"');
    expect(html).toContain("Guardian");
    expect(html).toContain('data-row="Rudo"');
    // An empty cell says so to a screen reader instead of reading a dash.
    expect(html).toContain('<span class="sr-only">none</span>');
    expectNoClientJs(html);
  });

  test("escapes cell text, so a row cannot inject markup", async () => {
    const html = await render(DataTable, {
      caption: "People",
      columns,
      rows: [{ name: "<img src=x onerror=alert(1)>", role: "x", count: 1 }],
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  test("labels each cell with its column for the phone card view", async () => {
    const html = await render(DataTable, {
      caption: "People",
      columns,
      rows: [{ name: "Tendai", role: "Guardian", count: 3 }],
    });
    expect(html).toMatch(/md:hidden" aria-hidden="true">\s*Role\s*<\/span>/);
    expect(html).toContain("md:table-header-group");
  });

  test("marks the current row", async () => {
    const html = await render(DataTable, {
      caption: "People",
      columns,
      rows: [
        {
          name: { text: "Tendai", href: "?id=1", current: true },
          role: "Guardian",
          count: 3,
        },
      ],
    });
    expect(html).toMatch(/<tr[^>]*aria-current="true"/);
  });
});

describe("FilterBar", () => {
  test("is a labelled GET search form that keeps its state", async () => {
    const html = await render(FilterBar, {
      searchLabel: "Search people",
      q: "moyo",
      selects: [
        {
          name: "role",
          label: "Role",
          options: [
            { value: "guardian", label: "Guardian" },
            { value: "child", label: "Child" },
          ],
        },
      ],
      values: { role: "child" },
      keep: { id: "7" },
      clearHref: "/people",
    });
    expect(html).toMatch(/<form method="get" role="search"/);
    expect(html).toMatch(/<label for="filter-q"[^>]*>Search people<\/label>/);
    expect(html).toMatch(/id="filter-q" name="q" type="search" value="moyo"/);
    expect(html).toMatch(/<label for="filter-role"/);
    expect(html).toMatch(/<option value="child" selected/);
    expect(html).toMatch(/<input type="hidden" name="id" value="7">/);
    expect(html).toContain('href="/people"');
    expect(html).toContain("Clear");
    expectNoClientJs(html);
  });

  test("hides Clear when nothing is filtered", async () => {
    const html = await render(FilterBar, {
      searchLabel: "Search",
      q: "",
      clearHref: "/people",
    });
    expect(html).not.toContain("Clear");
  });
});

describe("Pagination", () => {
  const url = new URL("https://example.test/people?q=moyo&page=3");

  test("summarises the range and links every nearby page", async () => {
    const html = await render(Pagination, {
      url,
      page: 3,
      pageCount: 10,
      total: 240,
      from: 51,
      to: 75,
      noun: "people",
    });
    expect(html).toContain("Showing 51–75 of 240 people");
    expect(html).toContain('aria-label="Pagination"');
    expect(html).toMatch(/aria-current="page" aria-label="Page 3"/);
    expect(html).toContain('href="/people?q=moyo&amp;page=2" rel="prev"');
    expect(html).toContain('href="/people?q=moyo&amp;page=4" rel="next"');
    // 1 2 3 4 … 10
    expect(html.match(/aria-label="Page \d+"/g)).toEqual([
      'aria-label="Page 1"',
      'aria-label="Page 2"',
      'aria-label="Page 3"',
      'aria-label="Page 4"',
      'aria-label="Page 10"',
    ]);
    expect(html.match(/…/g)).toHaveLength(1);
    expectNoClientJs(html);
  });

  test("elides the pages far from the current one on both sides", async () => {
    const html = await render(Pagination, {
      url,
      page: 5,
      pageCount: 10,
      total: 240,
      from: 101,
      to: 125,
    });
    // 1 … 4 5 6 … 10
    expect(
      html.match(/aria-label="Page (\d+)"/g)?.map((m) => m.replace(/\D/g, "")),
    ).toEqual(["1", "4", "5", "6", "10"]);
    expect(html.match(/…/g)).toHaveLength(2);
  });

  test("shows no navigation when one page is enough", async () => {
    const html = await render(Pagination, {
      url,
      page: 1,
      pageCount: 1,
      total: 4,
      from: 1,
      to: 4,
    });
    expect(html).toContain("Showing 1–4 of 4 results");
    expect(html).not.toContain("<nav");
  });

  test("says when there is nothing", async () => {
    const html = await render(Pagination, {
      url,
      page: 1,
      pageCount: 1,
      total: 0,
      from: 0,
      to: 0,
      noun: "people",
    });
    expect(html).toContain("No people");
  });

  test("disables Previous on the first page", async () => {
    const html = await render(Pagination, {
      url,
      page: 1,
      pageCount: 3,
      total: 60,
      from: 1,
      to: 25,
    });
    expect(html).toMatch(/aria-disabled="true">\s*Previous/);
    expect(html).not.toContain('rel="prev"');
  });
});

describe("DetailPanel", () => {
  test("is a labelled section with a description list", async () => {
    const html = await render(DetailPanel, {
      title: "Tendai Moyo",
      id: "person",
      items: [
        { label: "Email", value: "tendai@example.com" },
        { label: "Phone", value: null },
        { label: "ID", value: "p_123", mono: true },
      ],
      record: { id: "p_123" },
    });
    expect(html).toMatch(/<section aria-labelledby="person-title" id="person"/);
    expect(html).toMatch(/<h2 id="person-title"/);
    expect(html.match(/<dt/g)).toHaveLength(3);
    expect(html).toContain("Not set");
    expect(html).toContain("Full record");
    expect(html).toContain("&quot;id&quot;: &quot;p_123&quot;");
    expectNoClientJs(html);
  });

  test("takes an h3 and no record", async () => {
    const html = await render(DetailPanel, {
      title: "Details",
      level: 3,
      items: [],
    });
    expect(html).toMatch(/<h3 id="detail-title"/);
    expect(html).not.toContain("Full record");
  });
});

describe("FormField", () => {
  test("wires the label, hint and error to the input", async () => {
    const html = await render(FormField, {
      name: "email",
      label: "Email",
      type: "email",
      value: "tendai@example",
      hint: "We send receipts here.",
      error: "Enter a full email address.",
      required: true,
    });
    expect(html).toMatch(/<label[^>]*for="field-email"/);
    expect(html).toContain("(required)");
    expect(html).toMatch(/id="field-email"/);
    expect(html).toMatch(
      /aria-describedby="field-email-hint field-email-error"/,
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toMatch(/<p id="field-email-hint"/);
    expect(html).toMatch(/<p id="field-email-error"/);
    expectNoClientJs(html);
  });

  test("is not marked invalid without an error", async () => {
    const html = await render(FormField, { name: "name", label: "Name" });
    expect(html).not.toContain("aria-invalid");
    expect(html).not.toContain("aria-describedby");
  });
});

describe("FormLayout", () => {
  test("is a titled POST form with a form-level alert", async () => {
    const html = await render(
      FormLayout,
      {
        title: "Your details",
        action: "/people/1",
        error: "The API refused the change.",
      },
      { slots: { default: "<p>fields</p>", actions: "<button>Save</button>" } },
    );
    expect(html).toMatch(/<section aria-labelledby="form-title"/);
    expect(html).toMatch(/<h2 id="form-title"/);
    expect(html).toMatch(/<form method="post" action="\/people\/1"/);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Not saved");
    expect(html).toContain("<p>fields</p>");
    expect(html).toContain("<button>Save</button>");
    expectNoClientJs(html);
  });
});

describe("StateMessage", () => {
  test("loading is a polite status with an accessible name", async () => {
    const html = await render(StateMessage, { kind: "loading", rows: 2 });
    expect(html).toMatch(/role="status" aria-live="polite"/);
    expect(html).toContain('<span class="sr-only">Loading</span>');
  });

  test("empty uses the fixed wording unless given a title", async () => {
    expect(await render(StateMessage, { kind: "empty" })).toContain(
      "Nothing here yet",
    );
    expect(
      await render(StateMessage, { kind: "empty", title: "No people yet" }),
    ).toContain("No people yet");
  });

  test("error, unconfigured and unavailable are alerts", async () => {
    for (const [kind, title] of [
      ["error", "Something went wrong"],
      ["unconfigured", "Not configured"],
      ["unavailable", "Temporarily unavailable"],
    ]) {
      const html = await render(StateMessage, { kind, message: "Try again." });
      expect(html).toContain('role="alert"');
      expect(html).toContain(title);
      expect(html).toContain(`data-state="${kind}"`);
      expectNoClientJs(html);
    }
  });
});

describe("Toast", () => {
  test("keeps an empty live region when there is nothing to say", async () => {
    const html = await render(Toast, { flash: null });
    expect(html).toMatch(/aria-live="polite" role="status"/);
    expect(html).not.toContain('data-slot="toast"');
  });

  test("shows the message until dismissed, with no script", async () => {
    const html = await render(Toast, {
      flash: { tone: "success", text: "Saved." },
      dismissLabel: "Close",
    });
    expect(html).toContain('data-tone="success"');
    expect(html).toContain("Saved.");
    expect(html).toMatch(
      /<label for="toast-dismiss"[^>]*>\s*Close\s*<\/label>/,
    );
    expectNoClientJs(html);
  });
});

describe("SideNav", () => {
  const items = [
    {
      href: "/dashboard/family",
      label: "Family",
      summary: "Everyone in your family",
    },
    { href: "/dashboard/identity", label: "Identity" },
  ];

  test("marks the section the page is in", async () => {
    const html = await render(
      SideNav,
      { items },
      { request: new Request("https://example.test/dashboard/family/7") },
    );
    expect(html).toContain('aria-label="Sections"');
    expect(html).toMatch(/href="\/dashboard\/family" aria-current="page"/);
    expect(html).not.toMatch(/href="\/dashboard\/identity" aria-current/);
    expect(html).toContain("Everyone in your family");
  });

  test("does not treat a shared prefix as the same section", async () => {
    const html = await render(
      SideNav,
      { items },
      { request: new Request("https://example.test/dashboard/family-tree") },
    );
    expect(html).not.toContain('aria-current="page"');
  });

  test("an explicit current wins", async () => {
    const html = await render(SideNav, {
      items,
      current: "/dashboard/identity",
      label: "Console",
    });
    expect(html).toContain('aria-label="Console"');
    expect(html).toMatch(/href="\/dashboard\/identity" aria-current="page"/);
  });
});

describe("SideNav, grouped (0.4)", () => {
  const groups = [
    { items: [{ href: "/dashboard", label: "Overview", icon: "home" }] },
    {
      label: "Identity & people",
      items: [
        {
          href: "/dashboard/identity",
          label: "Identity",
          icon: "user",
          description: "Your own person record",
        },
        {
          href: "/dashboard/family",
          label: "Family",
          icon: "users",
          badge: "New",
        },
      ],
    },
    {
      label: "Developer",
      items: [
        {
          href: "/dashboard/developer",
          label: "Developer",
          icon: "terminal",
          description: "Build on the Nyuchi API",
          children: [
            {
              href: "/dashboard/developer/keys",
              label: "API keys",
              description: "Mint and revoke keys",
            },
            { href: "/dashboard/developer/mcp", label: "MCP" },
          ],
        },
      ],
    },
  ];

  test("quiet group labels name their lists; items show the label only", async () => {
    const html = await render(
      SideNav,
      { groups, idPrefix: "n" },
      { request: new Request("https://x.test/dashboard/identity") },
    );
    expect(html).toMatch(
      /<p id="n-group-1" data-slot="nav-group-label"[^>]*>\s*Identity &amp; people/,
    );
    expect(html).toMatch(/<ul role="list" aria-labelledby="n-group-1"/);
    // The description is a tooltip and the link's accessible description,
    // not text inside the link.
    expect(html).toMatch(
      /<span role="tooltip" id="n-tip-2"[^>]*>[\s\S]*?<span id="n-tip-2-d">Your own person record<\/span>/,
    );
    expect(html).toMatch(
      /<a href="\/dashboard\/identity" aria-current="page" aria-describedby="n-tip-2-d"/,
    );
    const link = html.slice(
      html.indexOf('<a href="/dashboard/identity"'),
      html.indexOf("</a>", html.indexOf('<a href="/dashboard/identity"')),
    );
    expect(link).not.toContain("Your own person record");
    expect(html).toMatch(/data-icon="user"/);
    expect(html).toMatch(/>\s*New\s*<\/span>/);
    expectNoClientJs(html);
  });

  test("the longest matching href is current, so the overview is not current everywhere", async () => {
    const html = await render(
      SideNav,
      { groups },
      { request: new Request("https://x.test/dashboard/family") },
    );
    expect(html).toMatch(/href="\/dashboard\/family" aria-current="page"/);
    expect(html).not.toMatch(/href="\/dashboard" aria-current/);
  });

  test("nested items sit under a disclosure that is open when a child is current", async () => {
    const closed = await render(
      SideNav,
      { groups },
      { request: new Request("https://x.test/dashboard/identity") },
    );
    expect(closed).toMatch(/<details data-slot="nav-branch">/);
    const open = await render(
      SideNav,
      { groups },
      { request: new Request("https://x.test/dashboard/developer/keys/3") },
    );
    expect(open).toMatch(/<details data-slot="nav-branch" open>/);
    expect(open).toMatch(
      /href="\/dashboard\/developer\/keys" aria-current="page"/,
    );
    expect(open).toContain('data-icon="chevron-right"');
    // The parent is a page too, so it is listed first, as "Overview".
    expect(open).toMatch(
      /data-slot="nav-children"[\s\S]*?href="\/dashboard\/developer"[^>]*>\s*<span[^>]*>Overview</,
    );
    // The collapsed rail's single link to the group.
    expect(open).toMatch(
      /<a href="\/dashboard\/developer" data-slot="nav-rail-link"/,
    );
  });

  test("every item has a tooltip carrying its label, for the collapsed rail", async () => {
    const html = await render(SideNav, { groups });
    expect(html.match(/data-tip-label/g)?.length).toBe(4);
    // An item with no description has a tooltip only for the rail.
    expect(html).toMatch(/data-slot="nav-tip" data-empty/);
  });
});

describe("BrandMark", () => {
  test("is the official mark pair, named once, with the wordmark when asked", async () => {
    const mark = await render(BrandMark, { size: 20 });
    expect(mark.match(/<img /g)).toHaveLength(2);
    expect(mark).toMatch(/nyuchi-mark-light\.png/);
    expect(mark).toMatch(/nyuchi-mark-dark\.png/);
    expect(mark).toMatch(/alt="nyuchi"/);
    expect(mark).toContain('width="20"');
    const lockup = await render(BrandMark, {
      wordmark: true,
      suffix: "console",
    });
    expect(lockup).not.toContain('alt="nyuchi"');
    expect(lockup).toMatch(/data-slot="brand-wordmark"[^>]*>\s*nyuchi/);
    expect(lockup).toContain("console");
    expectNoClientJs(lockup);
  });
});

describe("WorkspaceSwitcher", () => {
  test("is a plain link home when there is nothing to switch to", async () => {
    const html = await render(
      WorkspaceSwitcher,
      { name: "Nyuchi Africa", href: "/dashboard" },
      { slots: { mark: "<b>mark</b>" } },
    );
    expect(html).toMatch(
      /<a href="\/dashboard"[^>]*data-slot="workspace-switcher"/,
    );
    expect(html).not.toContain("<details");
    expect(html).not.toContain("chevrons-up-down");
    expect(html).toContain("Nyuchi Africa");
  });

  test("is a disclosure listing workspaces, the current one marked", async () => {
    const html = await render(
      WorkspaceSwitcher,
      {
        name: "Nyuchi Africa",
        label: "Switch organisation",
        workspaces: [
          { name: "Nyuchi Africa", href: "/w/1", current: true },
          { name: "Mukoko", href: "/w/2" },
        ],
        links: [{ label: "Console home", href: "/dashboard" }],
      },
      { slots: { mark: "<b>mark</b>" } },
    );
    expect(html).toContain("<details");
    expect(html).toMatch(/aria-label="Switch organisation: Nyuchi Africa"/);
    expect(html).toMatch(/href="\/w\/1"[^>]*aria-current="true"/);
    expect(html).not.toMatch(/href="\/w\/2"[^>]*aria-current/);
    expect(html).toContain("Console home");
    expectNoClientJs(html);
  });
});

describe("QuickSearch and CommandPalette", () => {
  const groups = [
    { items: [{ href: "/dashboard", label: "Overview", icon: "home" }] },
    {
      label: "Content",
      items: [
        {
          href: "/dashboard/news",
          label: "News",
          description: "Articles and sources",
        },
      ],
    },
  ];

  test("the button opens the palette with no script and advertises the shortcut", async () => {
    const html = await render(QuickSearch, { target: "cmdk" });
    expect(html).toMatch(
      /<button type="button" popovertarget="cmdk" aria-label="Quick search" aria-keyshortcuts="Meta\+K Control\+K"/,
    );
    expect(html).toMatch(/<kbd data-qs-kbd aria-hidden="true"/);
  });

  test("the palette lists every item as a link, grouped, with a labelled search box", async () => {
    const html = await render(CommandPalette, {
      groups,
      id: "cmdk",
      action: "/dashboard/search",
    });
    expect(html).toMatch(
      /<div id="cmdk" popover role="dialog" aria-label="Search" data-slot="command-palette"/,
    );
    expect(html).toMatch(
      /<form method="get" action="\/dashboard\/search" role="search"/,
    );
    expect(html).toMatch(/<label for="cmdk-q" class="sr-only">/);
    expect(html).toMatch(/<input id="cmdk-q" name="q" type="search"/);
    expect(html).toMatch(/aria-label="Go to"/);
    expect(html).toMatch(/aria-label="Content"/);
    expect(html).toMatch(/data-search="News Articles and sources Content"/);
    expect(html).toContain('href="/dashboard/news"');
    expect(html).toMatch(/data-cmdk-status class="sr-only" aria-live="polite"/);
  });

  test("without an action the box is not a form", async () => {
    const html = await render(CommandPalette, { groups });
    expect(html).not.toContain("<form");
  });
});

describe("TopBarAction", () => {
  test("a link with an icon keeps its label as the accessible name on phones", async () => {
    const html = await render(TopBarAction, {
      label: "Ask Nyuchi AI",
      icon: "sparkles",
      href: "/dashboard/nyuchi-ai",
    });
    expect(html).toMatch(/<a href="\/dashboard\/nyuchi-ai"/);
    expect(html).toMatch(/class="sr-only sm:not-sr-only">Ask Nyuchi AI</);
  });

  test("external links say they open a new tab", async () => {
    const html = await render(TopBarAction, {
      label: "Support",
      href: "mailto:support@example.com",
      external: true,
    });
    expect(html).toContain('rel="noopener"');
    expect(html).toContain("(opens in a new tab)");
  });
});

describe("Toolbar and ToolbarMenu", () => {
  test("a GET search with a label, carried parameters and a filter group", async () => {
    const html = await render(
      Toolbar,
      { label: "Search agents", value: "kudu", keep: { range: "7d" }, id: "t" },
      { slots: { filters: "<span>Last 7 days</span>" } },
    );
    expect(html).toMatch(/<form method="get" role="search"/);
    expect(html).toMatch(
      /<label for="t-q" class="sr-only">Search agents<\/label>/,
    );
    expect(html).toMatch(
      /<input id="t-q" name="q" type="search" value="kudu" placeholder="Search agents"/,
    );
    expect(html).toMatch(/<input type="hidden" name="range" value="7d">/);
    expect(html).toContain('data-slot="toolbar-filters"');
    expectNoClientJs(html);
  });

  test("the menu shows the current choice and lists links", async () => {
    const html = await render(ToolbarMenu, {
      label: "Date range",
      icon: "calendar",
      choices: [
        { label: "Last 24 hours", href: "?range=1d" },
        { label: "Last 7 days", href: "?range=7d", current: true },
      ],
    });
    expect(html).toMatch(
      /<span class="sr-only">Date range: <\/span>\s*<span>Last 7 days<\/span>/,
    );
    expect(html).toMatch(/href="\?range=7d" aria-current="true"/);
    expect(html).not.toMatch(/href="\?range=1d" aria-current/);
  });
});

describe("StatTiles, StatTile and InfoTip", () => {
  test("one bordered description list of tiles", async () => {
    const html = await render(
      StatTiles,
      { label: "Activity", columns: 4 },
      {
        slots: {
          default: "<div data-slot='stat-tile'><dt>A</dt><dd>1</dd></div>",
        },
      },
    );
    expect(html).toMatch(
      /<dl aria-label="Activity" class="[^"]*lg:grid-cols-4/,
    );
    expect(html).toContain("*:border-l");
  });

  test("a tile's info icon is a focusable button described by its tooltip", async () => {
    const html = await render(StatTile, {
      label: "Sessions",
      value: 0,
      info: "Signed-in sessions in the range",
    });
    expect(html).toMatch(
      /<button type="button" aria-label="About Sessions" aria-describedby="stat-sessions-info"/,
    );
    expect(html).toMatch(
      /<span role="tooltip" id="stat-sessions-info"[^>]*>\s*Signed-in sessions in the range/,
    );
    // Zero is a value, not "Not available".
    expect(html).toMatch(/tabular-nums">\s*0\s*</);
  });

  test("InfoTip alone", async () => {
    const html = await render(InfoTip, {
      text: "Why",
      about: "Runs",
      id: "i1",
    });
    expect(html).toContain('aria-describedby="i1"');
    expectNoClientJs(html);
  });
});

describe("EmptyState", () => {
  test("a bordered card with a heading, help and actions", async () => {
    const html = await render(
      EmptyState,
      {
        title: "No agent activity yet",
        message: "Agents appear here after their first request.",
        level: 3,
      },
      { slots: { default: "<a href='/new'>Build your first agent</a>" } },
    );
    expect(html).toMatch(/<h3 class="[^"]*">No agent activity yet<\/h3>/);
    expect(html).toContain("Agents appear here");
    expect(html).toContain("Build your first agent");
    expect(html).toContain("border-border");
    expect(html).not.toContain("border-dashed");
  });

  test("has no empty action row without actions", async () => {
    const html = await render(EmptyState, { title: "Nothing" });
    expect(html).not.toContain("mt-3 flex");
  });
});

describe("PageHeader (0.4)", () => {
  test("a compact title with a docs pill and one line of description", async () => {
    const html = await render(PageHeader, {
      title: "Agent tracing",
      description: "Review traced activity.",
      docsHref: "https://docs.example/agents",
    });
    expect(html).toMatch(/<h1 class="text-h5[^"]*">Agent tracing<\/h1>/);
    expect(html).toMatch(
      /<a href="https:\/\/docs.example\/agents"[^>]*data-slot="docs-pill">\s*View docs\s*<span class="sr-only"> for Agent tracing<\/span>/,
    );
    expect(html).toContain("Review traced activity.");
    expect(html).not.toMatch(/[" ]border-b[" ]/);
  });
});

describe("AccountMenu", () => {
  test("is a disclosure with initials, the account and a sign-out POST", async () => {
    const html = await render(
      AccountMenu,
      {
        name: "Tendai Moyo",
        email: "tendai@example.com",
        signOutAction: "/auth/logout",
      },
      { slots: { default: "<a href='/preferences'>Appearance</a>" } },
    );
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).toMatch(/aria-hidden="true"[^>]*>TM<\/span>/);
    expect(html).toContain("Account menu for Tendai Moyo");
    expect(html).toContain("tendai@example.com");
    expect(html).toContain("Appearance");
    expect(html).toMatch(/<form method="post" action="\/auth\/logout"/);
    expect(html).toContain("Sign out");
    expectNoClientJs(html);
  });

  test("leaves sign-out to the app when no action is given", async () => {
    const html = await render(AccountMenu, { email: "rudo@example.com" });
    expect(html).not.toContain("<form");
    expect(html).toContain("Account menu for rudo@example.com");
  });
});

describe("AppShell", () => {
  const slots = {
    brand: "<a href='/'>Brand</a>",
    workspace: "<a href='/'>Workspace</a>",
    search: "<button type='button'>Search</button>",
    account: "<span>account</span>",
    actions: "<a href='/ai'>Ask AI</a>",
    nav: "<nav aria-label='Sections'>links</nav>",
    default: "<h1>Page</h1>",
    footer: "Footer text",
  };

  test("is full width: one sidebar holding the nav once, one main, no page container", async () => {
    const html = await render(AppShell, { navLabel: "Menu" }, { slots });
    expect(
      html.match(
        /<nav aria-label='Sections'>links<\/nav>|<nav aria-label="Sections">links<\/nav>/g,
      ),
    ).toHaveLength(1);
    expect(html.match(/<main/g)).toHaveLength(1);
    expect(html).toContain('id="main"');
    expect(html).toContain("<header");
    expect(html).toContain("Footer text");
    expect(html).not.toMatch(/max-w-\[96rem\]|mx-auto/);
  });

  test("the sidebar is a popover drawer on phones, opened and closed by buttons", async () => {
    const html = await render(
      AppShell,
      { navLabel: "Menu", id: "c" },
      { slots },
    );
    expect(html).toMatch(
      /<aside id="c-sidebar" popover aria-label="Sidebar" data-slot="app-sidebar"/,
    );
    expect(html).toMatch(
      /<button type="button" popovertarget="c-sidebar"[^>]*aria-label="Open menu"/,
    );
    expect(html).toMatch(
      /popovertarget="c-sidebar" popovertargetaction="hide"[^>]*aria-label="Close menu"/,
    );
  });

  test("collapse is a labelled checkbox, set from the server and persisted to a named cookie", async () => {
    const open = await render(
      AppShell,
      { id: "c", persist: "pref_sidebar" },
      { slots },
    );
    expect(open).toMatch(
      /<input type="checkbox" id="c-collapse" data-shell-collapse(?! checked)/,
    );
    expect(open).toMatch(
      /<label for="c-collapse"[^>]*>[\s\S]*Collapse navigation/,
    );
    expect(open).toContain('data-persist="pref_sidebar"');
    const shut = await render(
      AppShell,
      { id: "c", collapsed: true },
      { slots },
    );
    expect(shut).toMatch(/id="c-collapse" data-shell-collapse checked/);
  });

  test("an accent sets the brand fill for primary actions from the mineral's tokens", async () => {
    const html = await render(AppShell, { accent: "gold" }, { slots });
    // By data-accent and the shell's stylesheet, never an inline style.
    expect(html).toContain('data-accent="gold"');
    expect(html).not.toMatch(/\sstyle=/);
    const plain = await render(AppShell, {}, { slots });
    expect(plain).not.toContain("data-accent");
  });

  test("renders footer links and leaves the footer out when there is none", async () => {
    const withLinks = await render(
      AppShell,
      { footerLinks: [{ label: "Status", href: "https://status.example" }] },
      { slots: { default: "<h1>Page</h1>" } },
    );
    expect(withLinks).toMatch(
      /<footer[\s\S]*href="https:\/\/status.example"[^>]*>\s*Status/,
    );
    const bare = await render(
      AppShell,
      {},
      { slots: { default: "<h1>Page</h1>" } },
    );
    expect(bare).not.toContain("<footer");
  });
});

describe("pure Astro", () => {
  const dir = new URL(".", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".astro"));
  const SCRIPTED = ["AppShell.astro", "CommandPalette.astro"];

  test("every app component is here and imports no framework", () => {
    expect(files.length).toBeGreaterThanOrEqual(31);
    for (const file of files) {
      const source = readFileSync(new URL(file, dir), "utf8");
      expect(source, file).not.toMatch(
        /from\s+["'](react|react-dom|preact|svelte|vue|solid-js)/,
      );
      expect(source, file).not.toMatch(
        /from\s+["'][^"']+\.(tsx|jsx|svelte|vue)["']/,
      );
      expect(source, file).not.toMatch(/client:(load|idle|visible|media|only)/);
      // Only the shell (collapse persistence, Escape for tooltips) and the
      // command palette (the shortcut, live filtering) carry a script, and
      // both work without it.
      if (!SCRIPTED.includes(file)) expect(source, file).not.toMatch(/<script/);
    }
  });

  test("the two scripts are progressive enhancement over working HTML", () => {
    for (const file of SCRIPTED) {
      const source = readFileSync(new URL(file, dir), "utf8");
      expect(source.match(/<script>/g), file).toHaveLength(1);
      expect(source, file).not.toMatch(/innerHTML|eval\(|fetch\(/);
    }
  });
});

describe("primitives", () => {
  test("Badge follows the registry badge contract", async () => {
    const html = await render(
      Badge,
      { variant: "destructive" },
      { slots: { default: "Revoked" } },
    );
    expect(html).toMatch(/data-slot="badge" data-variant="destructive"/);
    expect(html).toContain("text-destructive");
    expect(html).toContain("Revoked");
    const plain = await render(Badge, {}, { slots: { default: "New" } });
    expect(plain).toContain('data-variant="default"');
    expect(plain).toContain("bg-primary text-primary-foreground");
  });

  test("Button is a link with href and a button without", async () => {
    expect(
      await render(Button, { href: "/x" }, { slots: { default: "Go" } }),
    ).toMatch(/<a href="\/x"[^>]*data-slot="button"/);
    const html = await render(
      Button,
      { type: "submit", variant: "secondary" },
      { slots: { default: "Save" } },
    );
    expect(html).toMatch(/<button type="submit"/);
    // App density: 36px with a fine pointer, 48px on touch.
    expect(html).toContain("h-9");
    expect(html).toContain("pointer-coarse:h-12");
  });

  test("Button has destructive variants on the destructive tokens only", async () => {
    const solid = await render(
      Button,
      {
        type: "submit",
        variant: "destructive",
        name: "intent",
        value: "delete",
      },
      { slots: { default: "Delete my account" } },
    );
    expect(solid).toMatch(
      /<button type="submit"[^>]*name="intent"[^>]*value="delete"/,
    );
    expect(solid).toContain("bg-destructive text-destructive-foreground");
    expect(solid).toContain("focus-visible:ring-ring");
    expect(solid).not.toContain("bg-primary");
    expect(solid).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    const outline = await render(
      Button,
      { href: "/keys/1/revoke", variant: "destructive-outline", size: "sm" },
      { slots: { default: "Revoke key" } },
    );
    expect(outline).toMatch(/<a href="\/keys\/1\/revoke"/);
    expect(outline).toContain("border-destructive");
    expect(outline).toContain("text-destructive");
    expect(outline).toContain(
      "hover:bg-destructive hover:text-destructive-foreground",
    );
    const disabled = await render(
      Button,
      { variant: "destructive", disabled: true },
      { slots: { default: "Delete" } },
    );
    expect(disabled).toMatch(/<button[^>]*disabled/);
    expect(disabled).toContain("disabled:opacity-50");
  });

  test("Alert announces itself", async () => {
    const html = await render(
      Alert,
      { variant: "warning", title: "Heads up" },
      { slots: { default: "Body" } },
    );
    expect(html).toMatch(/role="alert" data-slot="alert"/);
    expect(html).toMatch(/data-slot="alert-title"[^>]*>Heads up/);
    expect(html).toContain("Body");
  });
});

describe("StatTile", () => {
  test("writes the trend in words and formats the number", async () => {
    const html = await render(StatTile, {
      label: "Sign-ups",
      value: 12345,
      trend: 12,
      versus: "the previous 30 days",
    });
    expect(html).toContain("<dt");
    expect(html).toContain("12,345");
    expect(html).toContain("Up 12% on the previous 30 days");
    // The visible badge is short and never wraps.
    expect(html).toMatch(/whitespace-nowrap[^"]*">\s*\+12%\s*</);
    expect(html).toContain("bg-malachite-container");
  });

  test("a missing value is not zero", async () => {
    const html = await render(StatTile, { label: "Revenue", value: null });
    expect(html).toContain("Not available");
  });

  test("a fall that is good news gets the good tone", async () => {
    const html = await render(StatTile, {
      label: "Errors",
      value: 3,
      trend: -4.5,
      upIsGood: false,
    });
    expect(html).toContain("Down 4.5%");
    expect(html).toContain("bg-malachite-container");
  });
});

describe("BarChart", () => {
  const data = [
    { label: "Mon", value: 4, long: "Monday 5 October" },
    { label: "Tue", value: 0 },
    { label: "Wed", value: 8 },
  ];

  test("is a labelled figure with the figures in a real table", async () => {
    const html = await render(BarChart, {
      title: "Submissions",
      caption: "Last 3 days",
      data,
      id: "subs",
    });
    expect(html).toMatch(/<figure[^>]*aria-labelledby="subs-title"/);
    expect(html).toMatch(/<h3 id="subs-title"/);
    // Bars are hidden from screen readers; the table carries the numbers.
    expect(html).toMatch(/<div aria-hidden="true">/);
    expect(html).toContain("Show the figures");
    expect(html).toContain("Monday 5 October");
    expect(html).toMatch(/Total<\/th>\s*<td[^>]*>12<\/td>/);
    // The tallest bar fills the plot, as SVG geometry: no inline style.
    expect(html).toMatch(/<rect x="0" y="0" width="10" height="100"/);
    expect(html).not.toMatch(/\sstyle=/);
    expectNoClientJs(html);
  });

  test("says so when there is nothing to chart", async () => {
    const html = await render(BarChart, {
      title: "Submissions",
      caption: "Today",
      data: [{ label: "Mon", value: 0 }],
    });
    expect(html).toContain("Nothing to chart in this range.");
  });

  test("rows layout writes each value beside its bar", async () => {
    const html = await render(BarChart, {
      title: "By country",
      caption: "All time",
      data,
      layout: "rows",
    });
    expect(html).toMatch(/<ul class="grid gap-3" aria-hidden="true">/);
  });
});

// The Nyuchi console's deltas (app/form-field 1.1.0, app/form-layout 1.1.0,
// app/bar-chart 1.1.0, app/data-table 1.1.0).

describe("FormField controls", () => {
  test("a textarea is wired like an input, at app density", async () => {
    const html = await render(FormField, {
      name: "bio",
      label: "About",
      as: "textarea",
      value: "Teacher <b>and</b> parent.",
      rows: 4,
      hint: "A sentence or two.",
      error: "Too long.",
      required: true,
      maxlength: 200,
    });
    expect(html).toMatch(/<textarea[^>]*data-slot="textarea"/);
    expect(html).toMatch(/<textarea[^>]*id="field-bio"/);
    expect(html).toMatch(/<textarea[^>]*name="bio"/);
    expect(html).toMatch(/<textarea[^>]*rows="4"/);
    expect(html).toMatch(/<textarea[^>]*required/);
    expect(html).toMatch(/<textarea[^>]*maxlength="200"/);
    expect(html).toMatch(/aria-describedby="field-bio-hint field-bio-error"/);
    expect(html).toContain('aria-invalid="true"');
    // Not a 36px strip: a floor, and the height from rows.
    expect(html).toContain("min-h-20");
    expect(html).not.toMatch(/<textarea[^>]*\bh-9\b/);
    // The value is text, escaped.
    expect(html).toContain("Teacher &lt;b&gt;and&lt;/b&gt; parent.");
    expect(html).not.toContain("<input");
    expectNoClientJs(html);
  });

  test("a read-only textarea sits on a muted fill", async () => {
    const html = await render(FormField, {
      name: "bio",
      label: "About",
      as: "textarea",
      readonly: true,
    });
    expect(html).toMatch(/<textarea[^>]*readonly/);
    expect(html).toMatch(/<textarea[^>]*class="[^"]*bg-muted/);
  });

  test("a select with an empty first option, selected with no value", async () => {
    const html = await render(FormField, {
      name: "kind",
      label: "Type",
      as: "select",
      emptyOption: "Choose a type",
      options: [
        { value: "article", label: "Article" },
        { value: "event", label: "Event" },
      ],
      required: true,
      hint: "What you are adding.",
    });
    expect(html).toMatch(/<select[^>]*data-slot="select"/);
    expect(html).toMatch(/<select[^>]*id="field-kind"/);
    expect(html).toMatch(/<select[^>]*required/);
    expect(html).toMatch(/<select[^>]*h-9/);
    expect(html).toMatch(/aria-describedby="field-kind-hint"/);
    expect(html).toMatch(/<option value="" selected>Choose a type<\/option>/);
    expect(html.match(/<option/g)).toHaveLength(3);
    expect(html).not.toMatch(/<select[^>]*\sdisabled[\s>]/);
  });

  test("a read-only select is disabled with its value selected", async () => {
    const html = await render(FormField, {
      name: "kind",
      label: "Type",
      as: "select",
      value: "event",
      readonly: true,
      options: [
        { value: "article", label: "Article" },
        { value: "event", label: "Event" },
      ],
    });
    expect(html).toMatch(/<select[^>]*\sdisabled[\s>]/);
    expect(html).toMatch(/<option value="event" selected>Event<\/option>/);
    expect(html).toMatch(/<option value="article">Article<\/option>/);
    expect(html).not.toContain('<option value=""');
  });

  test("a file input takes types and several files, and never a value", async () => {
    const html = await render(FormField, {
      name: "photos",
      label: "Photos",
      type: "file",
      value: "ignored.jpg",
      accept: "image/*",
      multiple: true,
      wide: true,
    });
    expect(html).toMatch(/<input[^>]*type="file"/);
    expect(html).toMatch(/<input[^>]*accept="image\/\*"/);
    expect(html).toMatch(/<input[^>]*multiple/);
    expect(html).not.toContain("ignored.jpg");
    expect(html).not.toMatch(/<input[^>]*\svalue=/);
    expect(html).toContain("file:rounded-full");
    // `wide` spans both of FormLayout's columns.
    expect(html).toMatch(/data-slot="form-field"/);
    expect(html).toContain("@xl:col-span-2");
  });

  test("a number input carries its bounds and keyboard", async () => {
    const html = await render(FormField, {
      name: "seats",
      label: "Seats",
      type: "number",
      value: "12",
      min: 1,
      max: 500,
      step: 1,
      inputmode: "numeric",
    });
    expect(html).toMatch(/<input[^>]*type="number"/);
    expect(html).toMatch(/<input[^>]*min="1"/);
    expect(html).toMatch(/<input[^>]*max="500"/);
    expect(html).toMatch(/<input[^>]*step="1"/);
    expect(html).toMatch(/<input[^>]*inputmode="numeric"/);
    expect(html).toMatch(/<input[^>]*value="12"/);
    expect(html).not.toContain("@xl:col-span-2");
  });

  test("a date input", async () => {
    const html = await render(FormField, {
      name: "starts",
      label: "Starts",
      type: "date",
      value: "2026-10-05",
      min: "2026-01-01",
    });
    expect(html).toMatch(/<input[^>]*type="date"/);
    expect(html).toMatch(/<input[^>]*min="2026-01-01"/);
    expect(html).toMatch(/<input[^>]*value="2026-10-05"/);
  });
});

describe("FormLayout enctype", () => {
  test("a form with a file field posts multipart", async () => {
    const html = await render(
      FormLayout,
      { title: "Photos", enctype: "multipart/form-data" },
      { slots: { default: "<p>fields</p>" } },
    );
    expect(html).toMatch(/<form[^>]*enctype="multipart\/form-data"/);
  });

  test("no enctype unless asked for", async () => {
    const html = await render(FormLayout, { title: "Profile" });
    expect(html).not.toContain("enctype");
  });
});

describe("BarChart axis labels", () => {
  const points = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ label: `D${i + 1}`, value: i + 1 }));
  /** The axis labels, with whether each shows on a phone and from sm up. */
  async function axis(n: number) {
    const html = await render(BarChart, {
      title: "Sign-ups",
      caption: `Last ${n} days`,
      data: points(n),
    });
    const row = /data-axis[^>]*>([\s\S]*?)<div class="h-6"/.exec(html)?.[1];
    expect(row, "the axis row").toBeDefined();
    return [...(row ?? "").matchAll(/<span class="([^"]*)">([^<]*)<\/span>/g)]
      .map((m) => ({ classes: (m[1] ?? "").split(/\s+/), label: m[2] ?? "" }))
      .map(({ classes, label }) => ({
        label,
        phone: !classes.includes("hidden"),
        wide: !classes.includes("sm:hidden"),
      }));
  }
  const shown = (
    labels: Awaited<ReturnType<typeof axis>>,
    on: "phone" | "wide",
  ) => labels.filter((l) => l[on]).map((l) => l.label);

  test("twelve points: six labels from sm up, first / middle / last on a phone", async () => {
    const labels = await axis(12);
    expect(shown(labels, "wide")).toEqual([
      "D1",
      "D3",
      "D5",
      "D7",
      "D9",
      "D12",
    ]);
    expect(shown(labels, "phone")).toEqual(["D1", "D7", "D12"]);
  });

  test("never a label crowding the last", async () => {
    for (const n of [7, 12, 13, 30]) {
      const labels = await axis(n);
      const wide = shown(labels, "wide");
      expect(wide.length, `${n} points`).toBeLessThanOrEqual(6);
      expect(wide[0]).toBe("D1");
      expect(wide.at(-1)).toBe(`D${n}`);
      expect(wide.at(-2)).not.toBe(`D${n - 1}`);
      expect(shown(labels, "phone").length, `${n} points`).toBe(3);
    }
  });

  test("the middle label shows on a phone only from five points", async () => {
    expect(shown(await axis(4), "phone")).toEqual(["D1", "D4"]);
    expect(shown(await axis(5), "phone")).toEqual(["D1", "D3", "D5"]);
  });

  test("a few points all show from sm up", async () => {
    expect(shown(await axis(3), "wide")).toEqual(["D1", "D2", "D3"]);
  });
});

describe("DataTable status pills", () => {
  const columns = [
    { key: "name", label: "Source" },
    { key: "state", label: "State" },
  ];

  test("a cell's tone is a status pill in a fixed status colour", async () => {
    const html = await render(DataTable, {
      caption: "Sources",
      columns,
      rows: [
        { name: "Herald", state: { text: "Active", tone: "success" } },
        { name: "Chronicle", state: { text: "Paused", tone: "warning" } },
        { name: "Gazette", state: { text: "Draft", tone: "neutral" } },
        { name: "Mirror", state: { text: "New", tone: "info" } },
        { name: "Post", state: { text: "Featured", tone: "accent" } },
        { name: "Times", state: { text: "Partner", tone: "premium" } },
      ],
    });
    expect(html.match(/data-slot="status"/g)).toHaveLength(6);
    expect(html).toMatch(
      /data-slot="status" data-tone="success" class="[^"]*bg-malachite-container text-malachite-on-container[^"]*">\s*Active/,
    );
    expect(html).toMatch(/data-tone="warning" class="[^"]*bg-gold-container/);
    expect(html).toMatch(
      /data-tone="neutral" class="[^"]*bg-muted text-muted-foreground/,
    );
    expect(html).toMatch(/data-tone="info" class="[^"]*bg-cobalt-container/);
    expect(html).toMatch(
      /data-tone="accent" class="[^"]*bg-terracotta-container/,
    );
    expect(html).toMatch(
      /data-tone="premium" class="[^"]*bg-tanzanite-container/,
    );
    expectNoClientJs(html);
  });

  test("tone wins over badge, and the text stays escaped", async () => {
    const html = await render(DataTable, {
      caption: "Sources",
      columns,
      rows: [
        {
          name: "Gazette",
          state: { text: "<b>Draft</b>", tone: "neutral", badge: "outline" },
        },
      ],
    });
    expect(html).toContain('data-slot="status"');
    expect(html).not.toContain('data-slot="badge"');
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;Draft&lt;/b&gt;");
  });

  test("badge keeps the registry badge variants", async () => {
    const html = await render(DataTable, {
      caption: "Sources",
      columns,
      rows: [{ name: "Herald", state: { text: "Guest", badge: "outline" } }],
    });
    expect(html).toMatch(
      /data-slot="badge"[^>]*data-variant="outline"|data-variant="outline"[^>]*data-slot="badge"/,
    );
    expect(html).not.toContain('data-slot="status"');
  });
});
