<script lang="ts">
  import type { Snippet } from "svelte";
  import { cx } from "./cx.js";

  type Variant =
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive";
  type Size = "sm" | "md" | "lg";

  interface Props {
    variant?: Variant;
    size?: Size;
    /** Render as an anchor when set. */
    href?: string;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    class?: string;
    children?: Snippet;
    [key: string]: unknown;
  }

  let {
    variant = "primary",
    size = "md",
    href,
    type = "button",
    disabled = false,
    class: className = "",
    children,
    ...rest
  }: Props = $props();

  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-full whitespace-nowrap transition-all duration-200 ease-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

  const variants: Record<Variant, string> = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-foreground text-background hover:opacity-90",
    outline:
      "border border-foreground text-foreground hover:bg-foreground hover:text-background",
    ghost: "text-foreground hover:bg-muted",
    destructive:
      "bg-destructive text-destructive-foreground hover:opacity-90",
  };

  // All sizes keep a >=48px hit area (min-h) per the touch-target floor.
  const sizes: Record<Size, string> = {
    sm: "min-h-12 h-10 px-4 text-body-sm",
    md: "min-h-12 h-12 px-6 text-body",
    lg: "min-h-12 h-14 px-8 text-body-lg",
  };

  const cls = $derived(cx(base, variants[variant], sizes[size], className));
</script>

{#if href}
  <a
    {href}
    class={cls}
    aria-disabled={disabled || undefined}
    tabindex={disabled ? -1 : undefined}
    data-slot="button"
    data-variant={variant}
    data-size={size}
    {...rest}
  >
    {@render children?.()}
  </a>
{:else}
  <button
    {type}
    {disabled}
    class={cls}
    data-slot="button"
    data-variant={variant}
    data-size={size}
    {...rest}
  >
    {@render children?.()}
  </button>
{/if}
