<script lang="ts">
  import type { Snippet } from "svelte";
  import { cx } from "./cx.js";

  type Variant = "info" | "success" | "warning" | "error";

  interface Props {
    variant?: Variant;
    title?: string;
    class?: string;
    children?: Snippet;
    [key: string]: unknown;
  }

  let {
    variant = "info",
    title,
    class: className = "",
    children,
    ...rest
  }: Props = $props();

  const variants: Record<Variant, string> = {
    info: "bg-cobalt-container text-cobalt-on-container border-cobalt",
    success: "bg-malachite-container text-malachite-on-container border-malachite",
    warning: "bg-gold-container text-gold-on-container border-gold",
    error: "bg-destructive-container text-destructive border-destructive",
  };

  const cls = $derived(
    cx("rounded-lg border-l-4 px-4 py-3", variants[variant], className),
  );
</script>

<div class={cls} role="alert" data-slot="alert" data-variant={variant} {...rest}>
  {#if title}
    <p class="font-semibold text-body-sm">{title}</p>
  {/if}
  {#if children}
    <div class={cx("text-body-sm", title && "mt-1")}>
      {@render children()}
    </div>
  {/if}
</div>
