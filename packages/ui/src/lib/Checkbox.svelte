<script lang="ts">
  import { cx } from "./cx.js";

  interface Props {
    checked?: boolean;
    disabled?: boolean;
    id?: string;
    class?: string;
    [key: string]: unknown;
  }

  let {
    checked = $bindable(false),
    disabled = false,
    id,
    class: className = "",
    ...rest
  }: Props = $props();

  // 48px hit target via padding on the label wrapper; the visible box is 20px.
  const boxCls = $derived(
    cx(
      "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-colors duration-150",
      checked
        ? "bg-primary border-primary text-primary-foreground"
        : "bg-input border-border",
      disabled && "opacity-50",
    ),
  );
</script>

<label
  class={cx(
    "inline-flex min-h-12 items-center gap-2 select-none",
    disabled ? "cursor-not-allowed" : "cursor-pointer",
    className,
  )}
  data-slot="checkbox"
>
  <input
    {id}
    type="checkbox"
    bind:checked
    {disabled}
    class="sr-only peer"
    {...rest}
  />
  <span
    class={cx(
      boxCls,
      "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
    )}
    aria-hidden="true"
  >
    {#if checked}
      <svg
        class="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    {/if}
  </span>
</label>
