<script lang="ts">
  /**
   * Breadcrumb — visual nav + BreadcrumbList JSON-LD.
   *
   * Renders a `<nav aria-label="Breadcrumb">` with an ordered list of
   * links, and emits a `BreadcrumbList` JSON-LD block (via <svelte:head>)
   * so Google shows breadcrumb rich snippets in SERPs. Both halves come
   * from the same `items` array — the visible UI and the structured data
   * stay in sync by construction.
   *
   * Convention: the final item is the current page. If its `url` is
   * omitted it renders as plain text with `aria-current="page"` instead
   * of an anchor. The component renders nothing with fewer than two items.
   *
   * SvelteKit note: pass `origin` (e.g. `$page.url.origin` or a domain
   * constant) so the JSON-LD item URLs are absolute at SSR time — Google
   * requires absolute URLs. When omitted, it falls back to the runtime
   * origin, which works client-side but not during SSR.
   */
  import type { Snippet } from "svelte";
  import type { BreadcrumbItem } from "./breadcrumbs.js";
  import { cx } from "./cx.js";

  interface Props {
    items: BreadcrumbItem[];
    /** Fully-qualified origin used to expand site-relative `url`s into
     * absolute URLs in the JSON-LD payload. */
    origin?: string;
    class?: string;
    /** Optional custom separator between crumbs. Defaults to "/". */
    separator?: Snippet;
    [key: string]: unknown;
  }

  let {
    items,
    origin,
    class: className = "",
    separator,
    ...rest
  }: Props = $props();

  const shouldRender = $derived(items.length >= 2);

  function runtimeOrigin(): string {
    if (origin) return origin;
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }

  function runtimePath(): string {
    if (typeof window !== "undefined") return window.location.pathname;
    return "";
  }

  function toAbsolute(url: string): string {
    if (/^https?:\/\//i.test(url)) return url;
    const base = runtimeOrigin().replace(/\/$/, "");
    const path = url.startsWith("/") ? url : `/${url}`;
    return `${base}${path}`;
  }

  const jsonLd = $derived(
    shouldRender
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            // Schema.org requires an absolute URL on every item including
            // the last; fall back to the current page path when an item
            // has no explicit href.
            item: toAbsolute(item.url ?? runtimePath()),
          })),
        }
      : null,
  );
</script>

<svelte:head>
  {#if shouldRender}
    {@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
  {/if}
</svelte:head>

{#if shouldRender}
  <nav
    aria-label="Breadcrumb"
    class={cx("text-body-sm text-muted-foreground", className)}
    {...rest}
  >
    <ol class="flex flex-wrap items-center gap-2">
      {#each items as item, index (index)}
        {@const isLast = index === items.length - 1}
        <li class={cx(isLast && "text-foreground truncate")}>
          {#if isLast || !item.url}
            <span aria-current={isLast ? "page" : undefined}>{item.name}</span>
          {:else}
            <a href={item.url} class="hover:text-foreground transition-colors"
              >{item.name}</a
            >
          {/if}
        </li>
        {#if !isLast}
          <li aria-hidden="true">
            {#if separator}{@render separator()}{:else}/{/if}
          </li>
        {/if}
      {/each}
    </ol>
  </nav>
{/if}
