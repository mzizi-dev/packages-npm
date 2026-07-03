<script lang="ts">
  import type { Snippet } from "svelte";
  import { cx } from "./cx.js";

  type Side = "top" | "bottom" | "left" | "right";

  interface Props {
    /** Tooltip text content. */
    text: string;
    side?: Side;
    class?: string;
    /** The trigger element(s). */
    children?: Snippet;
    [key: string]: unknown;
  }

  let {
    text,
    side = "top",
    class: className = "",
    children,
    ...rest
  }: Props = $props();

  let open = $state(false);
  const id = `tt-${Math.random().toString(36).slice(2, 8)}`;

  const sides: Record<Side, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  function show() {
    open = true;
  }
  function hide() {
    open = false;
  }
  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") hide();
  }
</script>

<span
  class={cx("relative inline-flex", className)}
  data-slot="tooltip"
  onmouseenter={show}
  onmouseleave={hide}
  onfocusin={show}
  onfocusout={hide}
  onkeydown={onKeydown}
  aria-describedby={open ? id : undefined}
  {...rest}
>
  {@render children?.()}
  <span
    {id}
    role="tooltip"
    class={cx(
      "pointer-events-none absolute z-50 w-max max-w-xs rounded-md bg-foreground px-2.5 py-1.5 text-caption font-medium text-background shadow-md transition-opacity duration-150",
      sides[side],
      open ? "opacity-100" : "opacity-0",
    )}
    aria-hidden={!open}
  >
    {text}
  </span>
</span>
