<script lang="ts">
  import { cx } from "./cx.js";

  interface Props {
    orientation?: "horizontal" | "vertical";
    /** Decorative separators are hidden from assistive tech. */
    decorative?: boolean;
    class?: string;
    [key: string]: unknown;
  }

  let {
    orientation = "horizontal",
    decorative = true,
    class: className = "",
    ...rest
  }: Props = $props();

  const cls = $derived(
    cx(
      "bg-border shrink-0",
      orientation === "horizontal" ? "h-px w-full" : "w-px self-stretch",
      className,
    ),
  );
</script>

<div
  class={cls}
  role={decorative ? "none" : "separator"}
  aria-orientation={decorative ? undefined : orientation}
  data-slot="separator"
  {...rest}
></div>
