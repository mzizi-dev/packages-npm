<script lang="ts">
  import type { Snippet } from "svelte";
  import { cx } from "./cx.js";

  type Variant =
    | "primary"
    | "success"
    | "warning"
    | "info"
    | "accent"
    | "premium"
    | "neutral";

  interface Props {
    variant?: Variant;
    class?: string;
    children?: Snippet;
    [key: string]: unknown;
  }

  let {
    variant = "neutral",
    class: className = "",
    children,
    ...rest
  }: Props = $props();

  const base =
    "inline-flex items-center px-3 py-1 rounded-full text-caption font-medium";

  const variants: Record<Variant, string> = {
    primary: "bg-cobalt-container text-cobalt-on-container",
    success: "bg-malachite-container text-malachite-on-container",
    warning: "bg-gold-container text-gold-on-container",
    info: "bg-cobalt-container text-cobalt-on-container",
    accent: "bg-terracotta-container text-terracotta-on-container",
    premium: "bg-tanzanite-container text-tanzanite-on-container",
    neutral: "bg-muted text-muted-foreground",
  };

  const cls = $derived(cx(base, variants[variant], className));
</script>

<span class={cls} data-slot="badge" data-variant={variant} {...rest}>
  {@render children?.()}
</span>
