import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import AppShell from "../src/AppShell.astro";
import EmptyState from "../src/EmptyState.astro";
import NativeSelect from "../src/NativeSelect.astro";
import PageHeader from "../src/PageHeader.astro";
import SafeAreaFrame from "../src/SafeAreaFrame.astro";
import SegmentedControl from "../src/SegmentedControl.astro";
import Toaster from "../src/Toaster.astro";
import { safeAreaBands } from "../src/safe-area";

const render = async (
  c: Parameters<AstroContainer["renderToString"]>[0],
  props: Record<string, unknown> = {},
  extra: Record<string, unknown> = {},
) => (await AstroContainer.create()).renderToString(c, { props, ...extra });

describe("safeAreaBands", () => {
  it("matches the registry's geometry (React and Rust assert the same numbers)", () => {
    expect(safeAreaBands(1080, 1920, [250, 64, 340, 64], 56)).toEqual({
      width: 32,
      height: 56,
      top: 13.02,
      right: 5.93,
      bottom: 17.71,
      left: 5.93,
    });
    expect(safeAreaBands(32, 4, [0, 0, 0, 0], 56)).toMatchObject({
      width: 56,
      height: 7,
    });
  });
});

describe("SafeAreaFrame", () => {
  it("is decorative and draws only the bands a preset has", async () => {
    const html = await render(SafeAreaFrame, {
      width: 1280,
      height: 720,
      safe: [0, 0, 72, 0],
    });
    expect(html).toContain('data-slot="safe-area-frame"');
    expect(html).toContain('aria-hidden="true"');
    expect(html.match(/data-band=/g)).toHaveLength(1);
    expect(html).toContain('data-band="bottom"');
  });
});

describe("SegmentedControl", () => {
  it("is a radio group with one checked segment", async () => {
    const html = await render(SegmentedControl, {
      name: "mode",
      legend: "Mode",
      value: "dark",
      options: [
        ["light", "Light"],
        ["dark", "Dark"],
      ],
    });
    expect(html).toContain("<fieldset");
    expect(html).toContain("<legend");
    expect(html.match(/type="radio"/g)).toHaveLength(2);
    // The attribute, not the peer-checked: utility classes.
    expect(html.match(/\schecked(?=[\s>])/g)).toHaveLength(1);
    expect(html).toMatch(/value="dark"[^>]*checked/);
    expect(html).toContain("min-h-12");
  });
});

describe("PageHeader", () => {
  it("renders the heading level asked for and the actions slot", async () => {
    const html = await render(
      PageHeader,
      { title: "Studio", eyebrow: "Create", as: "h2" },
      { slots: { actions: "<a href='/x'>Go</a>" } },
    );
    expect(html).toMatch(/<h2[^>]*>Studio<\/h2>/);
    expect(html).toContain("Create");
    expect(html).toContain("href='/x'");
  });
});

describe("EmptyState, NativeSelect, Toaster", () => {
  it("empty state has its title and body", async () => {
    const html = await render(EmptyState, {
      title: "Nothing yet",
      body: "Renders appear here.",
    });
    expect(html).toContain("Nothing yet");
    expect(html).toContain("Renders appear here.");
  });
  it("native select marks the chosen option and hides its chevron", async () => {
    const html = await render(NativeSelect, {
      id: "theme",
      value: "b",
      options: [
        ["a", "A"],
        ["b", "B"],
      ],
    });
    expect(html).toMatch(/<option value="b" selected/);
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  });
  it("toaster is a polite live region", async () => {
    const html = await render(Toaster);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("window.toast");
  });
});

describe("AppShell", () => {
  it("marks the current page, keeps the drawer controllable, and has a skip link", async () => {
    const html = await render(
      AppShell,
      {
        appName: "nyuchi",
        tagline: "tools",
        sections: [
          {
            label: "Create",
            items: [
              { name: "Studio", href: "/studio", icon: "image" },
              { name: "Presets", href: "/presets", icon: "grid" },
            ],
          },
        ],
      },
      { request: new Request("https://tools.example/studio") },
    );
    expect(html).toContain('href="#main"');
    expect(html).toMatch(/href="\/studio"[^>]*aria-current="page"/);
    expect(html).not.toMatch(/href="\/presets"[^>]*aria-current/);
    expect(html).toContain('aria-controls="app-shell-sidebar"');
    expect(html).toContain('id="main"');
  });
});
