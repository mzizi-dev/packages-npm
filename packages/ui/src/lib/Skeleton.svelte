<script lang="ts">
  import { cx } from "./cx.js";

  interface Props {
    class?: string;
    [key: string]: unknown;
  }

  let { class: className = "", ...rest }: Props = $props();

  const cls = $derived(cx("animate-pulse rounded-md bg-muted", className));
</script>

<div class={cls} aria-hidden="true" data-slot="skeleton" {...rest}></div>
