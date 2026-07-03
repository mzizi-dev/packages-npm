import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

/**
 * Alert — shadcn CVA pattern mapped onto the Five-African-Minerals
 * container tokens. Variants name the semantic role, not the colour.
 * `role="alert"` announces the message to assistive tech.
 */
export const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-body-sm",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border",
        info: "bg-cobalt-container text-cobalt-on-container border-transparent",
        success:
          "bg-malachite-container text-malachite-on-container border-transparent",
        warning:
          "bg-gold-container text-gold-on-container border-transparent",
        destructive: "bg-card text-destructive border-destructive/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  class?: string;
  className?: string;
}

export function Alert({
  variant,
  class: astroClass,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(alertVariants({ variant }), astroClass, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface AlertTitleProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  class?: string;
  className?: string;
}

export function AlertTitle({
  class: astroClass,
  className,
  children,
  ...props
}: AlertTitleProps) {
  return (
    <p
      data-slot="alert-title"
      className={cn("mb-1 font-medium leading-none", astroClass, className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function AlertDescription({
  class: astroClass,
  className,
  children,
  ...props
}: AlertTitleProps) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-body-sm [&_p]:leading-relaxed opacity-90",
        astroClass,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
