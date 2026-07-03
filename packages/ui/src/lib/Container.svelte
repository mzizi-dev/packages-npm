<script lang="ts">
  import type { Snippet } from "svelte";
  import { cx } from "./cx.js";

  type Width = "custom" | "narrow" | "prose";

  interface Props {
    /** custom = max-w-7xl grid; narrow = editorial column; prose = reading width. */
    width?: Width;
    /** Element to render as. */
    as?: string;
    class?: string;
    children?: Snippet;
    [key: string]: unknown;
  }

  let {
    width = "custom",
    as = "div",
    class: className = "",
    children,
    ...rest
  }: Props = $props();

  const widths: Record<Width, string> = {
    custom: "max-w-7xl mx-auto px-6 sm:px-8 lg:px-10",
    narrow: "max-w-narrow mx-auto px-6 sm:px-8",
    prose: "max-w-3xl mx-auto px-6 sm:px-8",
  };

  const cls = $derived(cx(widths[width], className));
</script>

<svelte:element this={as} class={cls} data-slot="container" {...rest}>
  {@render children?.()}
</svelte:element>
