<script lang="ts">
  import type { Snippet } from "svelte";
  import { cx } from "./cx.js";

  interface Props {
    /** The id of the control this label is bound to. */
    for?: string;
    /** Show a required marker. */
    required?: boolean;
    class?: string;
    children?: Snippet;
    [key: string]: unknown;
  }

  let {
    for: forId,
    required = false,
    class: className = "",
    children,
    ...rest
  }: Props = $props();

  const cls = $derived(
    cx(
      "inline-flex items-center gap-1 text-body-sm font-medium text-foreground select-none",
      className,
    ),
  );
</script>

<label for={forId} class={cls} data-slot="label" {...rest}>
  {@render children?.()}
  {#if required}
    <span class="text-destructive" aria-hidden="true">*</span>
  {/if}
</label>
