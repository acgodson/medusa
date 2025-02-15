import { cn } from "@/lib/config/env";
import * as React from "react";


const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-20 w-full rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm",
        "placeholder:text-gray-500 focus:border-[#E6B24B] focus:outline-none focus:ring-2",
        "focus:ring-[#E6B24B]/20 disabled:cursor-not-allowed disabled:opacity-50",
        "shadow-sm backdrop-blur-xl transition-all duration-200",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export { Textarea };