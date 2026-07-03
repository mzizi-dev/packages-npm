<script lang="ts">
  import { cx } from "./cx.js";

  interface Props {
    checked?: boolean;
    disabled?: boolean;
    id?: string;
    /** Accessible label when no visible <label> is associated. */
    "aria-label"?: string;
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

  function toggle() {
    if (!disabled) checked = !checked;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  }
</script>

<button
  {id}
  type="button"
  role="switch"
  aria-checked={checked}
  {disabled}
  onclick={toggle}
  onkeydown={onKeydown}
  data-slot="switch"
  class={cx(
    "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
    checked ? "bg-primary" : "bg-muted",
    className,
  )}
  {...rest}
>
  <span
    aria-hidden="true"
    class={cx(
      "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow transition-transform duration-200 ease-soft",
      checked ? "translate-x-5" : "translate-x-0",
    )}
  ></span>
</button>
