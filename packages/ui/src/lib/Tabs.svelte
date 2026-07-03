<script lang="ts">
  import type { Snippet } from "svelte";
  import { cx } from "./cx.js";

  export interface TabItem {
    value: string;
    label: string;
    disabled?: boolean;
  }

  interface Props {
    items: TabItem[];
    /** Active tab value (bindable). Defaults to the first item. */
    value?: string;
    /** Base id used to link tabs to panels; auto-generated if omitted. */
    idBase?: string;
    class?: string;
    /** Panel content. Receives the active value so you can switch on it. */
    children?: Snippet<[string]>;
    [key: string]: unknown;
  }

  let {
    items,
    value = $bindable(),
    idBase = `tabs-${Math.random().toString(36).slice(2, 8)}`,
    class: className = "",
    children,
    ...rest
  }: Props = $props();

  // Default to the first non-disabled item.
  $effect(() => {
    if (value === undefined && items.length) {
      value = (items.find((i) => !i.disabled) ?? items[0]).value;
    }
  });

  function select(v: string) {
    value = v;
  }

  function onKeydown(e: KeyboardEvent) {
    const enabled = items.filter((i) => !i.disabled);
    if (!enabled.length) return;
    const curr = enabled.findIndex((i) => i.value === value);
    let next = curr;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (curr + 1) % enabled.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (curr - 1 + enabled.length) % enabled.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = enabled.length - 1;
    else return;
    e.preventDefault();
    select(enabled[next].value);
    const el = document.getElementById(`${idBase}-tab-${enabled[next].value}`);
    el?.focus();
  }
</script>

<div class={cx("w-full", className)} data-slot="tabs" {...rest}>
  <div
    role="tablist"
    class="inline-flex items-center gap-1 rounded-full bg-muted p-1"
  >
    {#each items as item (item.value)}
      {@const selected = item.value === value}
      <button
        type="button"
        role="tab"
        id={`${idBase}-tab-${item.value}`}
        aria-selected={selected}
        aria-controls={`${idBase}-panel-${item.value}`}
        tabindex={selected ? 0 : -1}
        disabled={item.disabled}
        onclick={() => select(item.value)}
        onkeydown={onKeydown}
        class={cx(
          "inline-flex min-h-12 items-center justify-center rounded-full px-4 py-2 text-body-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed",
          selected
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {item.label}
      </button>
    {/each}
  </div>

  {#if value !== undefined}
    <div
      role="tabpanel"
      id={`${idBase}-panel-${value}`}
      aria-labelledby={`${idBase}-tab-${value}`}
      tabindex={0}
      class="mt-4 focus-visible:outline-none"
    >
      {@render children?.(value)}
    </div>
  {/if}
</div>
