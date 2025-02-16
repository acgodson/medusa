import { cn } from "@/config/env";
import * as React from "react";


interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, indicatorClassName, ...props }, ref) => {
    // Ensure value is between 0 and max
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-gray-100",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full w-full flex-1 bg-gradient-to-r from-[#E6B24B] to-[#B88A2D] transition-all duration-300 ease-in-out",
            indicatorClassName
          )}
          style={{
            transform: `translateX(-${100 - percentage}%)`,
          }}
        />
      </div>
    );
  }
);

Progress.displayName = "Progress";

export { Progress };