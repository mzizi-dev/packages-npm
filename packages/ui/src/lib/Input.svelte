<script lang="ts">
  import { cx } from "./cx.js";

  interface Props {
    value?: string | number;
    type?: string;
    invalid?: boolean;
    disabled?: boolean;
    class?: string;
    [key: string]: unknown;
  }

  let {
    value = $bindable(""),
    type = "text",
    invalid = false,
    disabled = false,
    class: className = "",
    ...rest
  }: Props = $props();

  const cls = $derived(
    cx(
      "w-full min-h-12 h-12 px-4 rounded-full bg-input text-foreground border border-border placeholder:text-muted-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed",
      invalid && "border-destructive ring-destructive",
      className,
    ),
  );
</script>

<input
  {type}
  bind:value
  {disabled}
  class={cls}
  aria-invalid={invalid || undefined}
  data-slot="input"
  {...rest}
/>
