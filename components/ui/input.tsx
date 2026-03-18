import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded border border-navy-600 bg-navy-800 px-3 py-1 text-[16px] md:text-sm text-navy-100 font-mono placeholder:text-navy-500 focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
