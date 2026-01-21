import * as React from "react";

import { cn } from "@/app/lib/keeper-archive/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex px-4 w-full h-12 text-sm bg-brand-primary-1 rounded-lg border border-brand-secondary-2 shadow-sm text-brand-secondary-1 transition-colors placeholder:text-brand-secondary-0 focus:border-brand-accent-1 focus:ring-2 focus:ring-brand-accent-1 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
