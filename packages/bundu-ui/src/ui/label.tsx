import * as React from "react";

import { cn } from "../lib/utils";

/**
 * Label — native <label> styled to the Nyuchi Design System tokens
 * (shadcn pattern over the Five-African-Minerals tokens).
 * Dependency-free and SSR-friendly. Forwards every standard label prop
 * (htmlFor / for, id, …) via `...props` and renders its children as-is.
 */
export const labelClasses = "text-body-sm font-medium text-foreground";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Astro-style class attribute (merged with `className`). */
  class?: string;
  className?: string;
  /** Astro-style `for` attribute (maps to React `htmlFor`). */
  for?: string;
  children?: React.ReactNode;
}

export function Label({
  class: astroClass,
  className,
  for: astroFor,
  htmlFor,
  children,
  ...props
}: LabelProps) {
  return (
    <label
      data-slot="label"
      htmlFor={htmlFor ?? astroFor}
      className={cn(labelClasses, astroClass, className)}
      {...props}
    >
      {children}
    </label>
  );
}
