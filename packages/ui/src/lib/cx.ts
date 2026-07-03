/**
 * cx — dependency-free className joiner.
 * Filters out falsy values and joins the rest with a single space.
 * Used internally by @nyuchi/ui components to compose token classes.
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
