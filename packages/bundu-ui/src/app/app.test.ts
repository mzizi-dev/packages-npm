// Rendering tests for the app patterns. Each component is rendered on the
// server through Astro's container API, with the React renderer for the
// primitives, and the HTML is checked for the semantics the component
// promises: landmarks, labels, ARIA wiring, and no client JavaScript.
import reactRenderer from "@astrojs/react/server.js";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import AccountMenu from "./AccountMenu.astro";
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
import Toast from "./Toast.astro";

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
  container.addServerRenderer({ renderer: reactRenderer });
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
  test("places the nav twice (sidebar and disclosure) and one main", async () => {
    const html = await render(
      AppShell,
      { navLabel: "Menu" },
      {
        slots: {
          brand: "<a href='/'>Brand</a>",
          account: "<span>account</span>",
          nav: "<nav aria-label='Sections'>links</nav>",
          default: "<h1>Page</h1>",
          footer: "Footer text",
        },
      },
    );
    expect(
      html.match(
        /<nav aria-label='Sections'>links<\/nav>|<nav aria-label="Sections">links<\/nav>/g,
      ),
    ).toHaveLength(2);
    expect(html).toMatch(/<summary[^>]*>Menu<\/summary>/);
    expect(html.match(/<main/g)).toHaveLength(1);
    expect(html).toContain('id="main"');
    expect(html).toContain("<header");
    expect(html).toContain("Footer text");
    expectNoClientJs(html);
  });

  test("has no nav chrome or footer when those slots are empty", async () => {
    const html = await render(
      AppShell,
      {},
      { slots: { default: "<h1>Page</h1>" } },
    );
    expect(html).not.toContain("mobile-nav");
    expect(html).not.toContain("<aside");
    expect(html).not.toContain("<footer");
  });
});
