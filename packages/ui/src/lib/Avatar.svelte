<script lang="ts">
  import { cx } from "./cx.js";

  type Size = "sm" | "md" | "lg";

  interface Props {
    src?: string;
    alt?: string;
    /** Fallback initials shown when no src or the image fails. */
    initials?: string;
    size?: Size;
    class?: string;
    [key: string]: unknown;
  }

  let {
    src,
    alt = "",
    initials,
    size = "md",
    class: className = "",
    ...rest
  }: Props = $props();

  let failed = $state(false);

  const sizes: Record<Size, string> = {
    sm: "h-8 w-8 text-body-sm",
    md: "h-10 w-10 text-body",
    lg: "h-12 w-12 text-body-lg",
  };

  const showImg = $derived(!!src && !failed);
</script>

<span
  class={cx(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground font-medium select-none",
    sizes[size],
    className,
  )}
  data-slot="avatar"
  {...rest}
>
  {#if showImg}
    <img
      {src}
      {alt}
      class="h-full w-full object-cover"
      onerror={() => (failed = true)}
    />
  {:else if initials}
    <span aria-hidden={alt ? undefined : "true"}>{initials}</span>
  {:else}
    <svg class="h-1/2 w-1/2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
      />
    </svg>
  {/if}
</span>
