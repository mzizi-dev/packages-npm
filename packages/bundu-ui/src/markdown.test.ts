// MarkdownRenderer.astro and its parser (`@bundu/ui/markdown-parse`), both synced from the
// registry, rendered through Astro's container API. The contract (`ui/markdown-renderer`, in
// app/contracts.test.ts) checks its states; these pin the parser fixes in
// markdown-renderer 1.2.1 (mzizi-registry#517), found in review of @bundu/ui 0.6.0, through
// the code this package ships.
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vite-plus/test";

import MarkdownRenderer from "./MarkdownRenderer.astro";
import { markdownBlocks, type MarkdownSource } from "./markdown-parse";

/** The rendered markup with every attribute removed, so a test reads only the structure. */
const render = async (content: string, from: MarkdownSource) => {
  const html = await (
    await AstroContainer.create()
  ).renderToString(MarkdownRenderer, {
    props: { content, from },
  });
  return html
    .replace(/<!--[^]*?-->/g, "")
    .replace(/<([a-z][a-z0-9]*)\b[^>]*>/g, "<$1>");
};

describe("MarkdownRenderer: rich text", () => {
  it("closes a self-closing <svg/> in a paragraph, keeping the text after it", async () => {
    const html = await render("<p>before <svg/> after</p><p>next</p>", "html");
    expect(html).toBe("<div><p>before after</p><p>next</p></div>");
  });

  it("nests a list placed directly in a <ul> under the item before it", async () => {
    // How Google Docs and Word paste a nested list: between the <li>s, not inside one.
    const html = await render(
      "<ul><li>a</li><ul><li>nested</li></ul><li>b</li></ul>",
      "html",
    );
    expect(html).toBe(
      "<div><ul><li>a<ul><li>nested</li></ul></li><li>b</li></ul></div>",
    );
  });

  it("keeps a <br> inside <pre> as a line break", async () => {
    const html = await render("<pre><code>line1<br>line2</code></pre>", "html");
    expect(html).toBe("<div><pre><code>line1\nline2</code></pre></div>");
    expect(
      markdownBlocks("<pre><code><br>x</code></pre>", { from: "html" }),
    ).toEqual([{ kind: "code", lang: "", v: "\nx" }]);
  });
});

describe("MarkdownRenderer: Markdown", () => {
  it("keeps a numbered line inside a paragraph as text unless it is numbered 1", async () => {
    expect(await render("Text\n1984. was a year", "markdown")).toBe(
      "<div><p>Text<br>1984. was a year</p></div>",
    );
    // After a blank line, it is a list.
    expect(await render("Text\n\n1984. was a year", "markdown")).toContain(
      "<ol>",
    );
    // Numbered 1, it interrupts the paragraph.
    expect(await render("Text\n1. one", "markdown")).toBe(
      "<div><p>Text</p><ol><li>one</li></ol></div>",
    );
  });
});
