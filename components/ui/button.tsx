"use client";

import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "outline" | "ghost" | "destructive" | "signal";
  size?: "sm" | "md" | "lg" | "icon";
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded font-mono text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-cyan disabled:pointer-events-none disabled:opacity-50",
          {
            default: "bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30 border border-accent-cyan/30",
            primary: "bg-navy-100 text-navy-950 hover:bg-white border border-navy-100 hover:border-white",
            outline: "border border-navy-600 text-navy-200 hover:bg-navy-800 hover:text-navy-100",
            ghost: "text-navy-300 hover:bg-navy-800 hover:text-navy-100",
            destructive: "bg-accent-rose/20 text-accent-rose hover:bg-accent-rose/30 border border-accent-rose/30",
            signal: "bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 border border-accent-cyan/20",
          }[variant],
          {
            sm: "h-8 px-3 text-xs",
            md: "h-9 px-4",
            lg: "h-11 px-6 text-base",
            icon: "h-9 w-9",
          }[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
export { Button, type ButtonProps };
