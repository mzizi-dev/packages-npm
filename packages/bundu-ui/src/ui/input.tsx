import * as React from "react";

import { cn } from "../lib/utils";

/**
 * Input — native <input> styled to the Nyuchi Design System tokens
 * (shadcn pattern, mapped onto the Five-African-Minerals semantic
 * tokens). Dependency-free and SSR-friendly so it renders as plain HTML
 * inside Astro without a client directive.
 *
 * Forwards every standard input prop (type, name, id, placeholder,
 * required, value, defaultValue, autocomplete, inputmode, …) via
 * `...props`. The `h-12` floor keeps the Ubuntu 48px minimum touch
 * target for outdoor, all-ages use.
 */
export const inputClasses =
  "flex h-12 w-full rounded-lg border border-border bg-background px-4 text-body text-foreground transition-colors placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Astro-style class attribute (merged with `className`). */
  class?: string;
  className?: string;
}

export function Input({ class: astroClass, className, ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      className={cn(inputClasses, astroClass, className)}
      {...props}
    />
  );
}
