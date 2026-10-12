"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const inputVariants = cva(
  "flex w-full rounded-lg border bg-background text-sm text-foreground shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      state: {
        default: "border-input",
        error: "border-destructive text-destructive focus-visible:ring-destructive",
      },
      height: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-10 px-3 py-2",
        lg: "h-12 px-4 text-base",
      },
    },
    defaultVariants: {
      state: "default",
      height: "md",
    },
  }
);

export interface InputProps
  extends Omit<React.ComponentPropsWithoutRef<"input">, "height">,
    VariantProps<typeof inputVariants> {
  error?: string | boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  containerClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, iconLeft, iconRight, height, containerClassName, ...props }, ref) => {
    const inputState = error ? "error" : "default";

    if (iconLeft || iconRight) {
      return (
        <div className={cn("relative flex items-center w-full", containerClassName)}>
          {iconLeft && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none flex items-center">
              {iconLeft}
            </span>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ state: inputState, height, className }),
              iconLeft && "pl-9",
              iconRight && "pr-9"
            )}
            ref={ref}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center">
              {iconRight}
            </span>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(inputVariants({ state: inputState, height, className }), containerClassName)}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
