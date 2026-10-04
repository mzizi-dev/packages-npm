// Rendering tests for the root-level Astro components that have no registry
// contract yet (SegmentedControl, NativeSelect, Toaster, SafeAreaFrame) and
// the shared safe-area geometry, through Astro's container API.
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vite-plus/test";

import NativeSelect from "./NativeSelect.astro";
import SafeAreaFrame from "./SafeAreaFrame.astro";
import SegmentedControl from "./SegmentedControl.astro";
import Toaster from "./Toaster.astro";
import { safeAreaBands } from "./safe-area";

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

describe("NativeSelect, Toaster", () => {
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
