<script lang="ts">
  import { cx } from "./cx.js";

  interface Props {
    value?: string;
    rows?: number;
    invalid?: boolean;
    disabled?: boolean;
    class?: string;
    [key: string]: unknown;
  }

  let {
    value = $bindable(""),
    rows = 4,
    invalid = false,
    disabled = false,
    class: className = "",
    ...rest
  }: Props = $props();

  const cls = $derived(
    cx(
      "w-full min-h-24 px-4 py-3 rounded-lg bg-input text-foreground border border-border placeholder:text-muted-foreground transition-colors duration-200 resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed",
      invalid && "border-destructive ring-destructive",
      className,
    ),
  );
</script>

<textarea
  bind:value
  {rows}
  {disabled}
  class={cls}
  aria-invalid={invalid || undefined}
  data-slot="textarea"
  {...rest}
></textarea>
