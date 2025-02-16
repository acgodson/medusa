"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/config/env";

const AccordionContext = React.createContext<{
  activeItems: Set<string>;
  setActiveItems: (items: Set<string>) => void;
  type: "single" | "multiple";
}>({
  activeItems: new Set(),
  setActiveItems: () => {},
  type: "single",
});

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple";
  collapsible?: boolean;
  defaultValue?: string;
  className?: string;
  children?: React.ReactNode;
}

export const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      type = "single",
      collapsible = true,
      defaultValue,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [activeItems, setActiveItems] = React.useState<Set<string>>(
      defaultValue ? new Set([defaultValue]) : new Set()
    );

    return (
      <AccordionContext.Provider value={{ activeItems, setActiveItems, type }}>
        <div ref={ref} className={cn("space-y-1", className)} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    );
  }
);
Accordion.displayName = "Accordion";

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const AccordionItemContext = React.createContext<{ value: string }>({
  value: "",
});

export const AccordionItem = React.forwardRef<
  HTMLDivElement,
  AccordionItemProps
>(({ value, className, children, ...props }, ref) => {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div
        ref={ref}
        className={cn("border rounded-lg border-gray-200", className)}
        {...props}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
});
AccordionItem.displayName = "AccordionItem";

interface AccordionTriggerProps
  extends React.HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  AccordionTriggerProps
>(({ className, children, ...props }, ref) => {
  const { activeItems, setActiveItems, type } =
    React.useContext(AccordionContext);
  const { value } = React.useContext(AccordionItemContext);

  const isOpen = activeItems.has(value);

  const handleClick = () => {
    const newActiveItems = new Set(activeItems);

    if (isOpen) {
      newActiveItems.delete(value);
    } else {
      if (type === "single") {
        newActiveItems.clear();
      }
      newActiveItems.add(value);
    }

    setActiveItems(newActiveItems);
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-left text-gray-900 hover:bg-gray-50 focus:outline-none focus-visible:ring focus-visible:ring-gray-500 focus-visible:ring-opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-4 w-4 text-gray-500 transition-transform duration-200",
          isOpen && "transform rotate-180"
        )}
      />
    </button>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const AccordionContent = React.forwardRef<
  HTMLDivElement,
  AccordionContentProps
>(({ className, children, ...props }, ref) => {
  const { activeItems } = React.useContext(AccordionContext);
  const { value } = React.useContext(AccordionItemContext);

  const isOpen = activeItems.has(value);

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden transition-all duration-200 ease-in-out",
        isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0",
        className
      )}
      {...props}
    >
      <div className="px-4 py-3">{children}</div>
    </div>
  );
});
AccordionContent.displayName = "AccordionContent";

export { AccordionContext, AccordionItemContext };
