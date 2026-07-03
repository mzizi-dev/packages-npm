<script lang="ts">
  import type { Snippet } from "svelte";
  import { cx } from "./cx.js";

  export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
  }

  interface Props {
    value?: string;
    /** Options to render. Alternatively pass <option> children. */
    options?: SelectOption[];
    placeholder?: string;
    invalid?: boolean;
    disabled?: boolean;
    class?: string;
    children?: Snippet;
    [key: string]: unknown;
  }

  let {
    value = $bindable(""),
    options,
    placeholder,
    invalid = false,
    disabled = false,
    class: className = "",
    children,
    ...rest
  }: Props = $props();

  const cls = $derived(
    cx(
      "w-full min-h-12 h-12 pl-4 pr-10 rounded-full bg-input text-foreground border border-border appearance-none bg-no-repeat transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed",
      invalid && "border-destructive ring-destructive",
      className,
    ),
  );
</script>

<div class="relative inline-flex w-full items-center" data-slot="select">
  <select
    bind:value
    {disabled}
    class={cls}
    aria-invalid={invalid || undefined}
    {...rest}
  >
    {#if placeholder}
      <option value="" disabled hidden>{placeholder}</option>
    {/if}
    {#if options}
      {#each options as opt (opt.value)}
        <option value={opt.value} disabled={opt.disabled}>{opt.label}</option>
      {/each}
    {:else}
      {@render children?.()}
    {/if}
  </select>
  <svg
    class="pointer-events-none absolute right-4 h-4 w-4 text-muted-foreground"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
</div>
