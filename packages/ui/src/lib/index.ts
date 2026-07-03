/**
 * @nyuchi/ui — Svelte 5 / SvelteKit component library for the Nyuchi
 * Design System, on the seven African-mineral tokens.
 *
 * Nyuchi's implementation of the Mzizi architecture (mzizi.dev).
 * Pair these components with the shipped styles/globals.css (+ a brand
 * overlay) and, for Tailwind consumers, tailwind-preset.mjs.
 */

// Components
export { default as Alert } from "./Alert.svelte";
export { default as Avatar } from "./Avatar.svelte";
export { default as Badge } from "./Badge.svelte";
export { default as Breadcrumb } from "./Breadcrumb.svelte";
export { default as Button } from "./Button.svelte";
export { default as Card } from "./Card.svelte";
export { default as Checkbox } from "./Checkbox.svelte";
export { default as Container } from "./Container.svelte";
export { default as Input } from "./Input.svelte";
export { default as Label } from "./Label.svelte";
export { default as Select } from "./Select.svelte";
export { default as Separator } from "./Separator.svelte";
export { default as Skeleton } from "./Skeleton.svelte";
export { default as SocialIcon } from "./SocialIcon.svelte";
export { default as Switch } from "./Switch.svelte";
export { default as Tabs } from "./Tabs.svelte";
export { default as Textarea } from "./Textarea.svelte";
export { default as Tooltip } from "./Tooltip.svelte";

// Types re-exported from components
export type { SelectOption } from "./Select.svelte";
export type { TabItem } from "./Tabs.svelte";

// Breadcrumb helper + types
export {
  deriveBreadcrumbs,
  type BreadcrumbItem,
  type BreadcrumbLabelMap,
} from "./breadcrumbs.js";

// Utilities
export { cx } from "./cx.js";
