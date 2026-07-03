<script lang="ts">
  import type { Snippet } from "svelte";
  import { cx } from "./cx.js";

  interface Props {
    /** Add a subtle hover lift. */
    hover?: boolean;
    /** Apply default inner padding (p-6). */
    padded?: boolean;
    class?: string;
    header?: Snippet;
    children?: Snippet;
    footer?: Snippet;
    [key: string]: unknown;
  }

  let {
    hover = false,
    padded = true,
    class: className = "",
    header,
    children,
    footer,
    ...rest
  }: Props = $props();

  const base =
    "bg-card text-card-foreground rounded-lg border border-border";
  const cls = $derived(
    cx(
      base,
      hover && "hover:shadow-sm transition-all duration-200 ease-soft",
      className,
    ),
  );
</script>

<div class={cls} data-slot="card" {...rest}>
  {#if header}
    <div class={cx("border-b border-border", padded && "px-6 py-4")} data-slot="card-header">
      {@render header()}
    </div>
  {/if}
  <div class={cx(padded && "p-6")} data-slot="card-content">
    {@render children?.()}
  </div>
  {#if footer}
    <div class={cx("border-t border-border", padded && "px-6 py-4")} data-slot="card-footer">
      {@render footer()}
    </div>
  {/if}
</div>
