import React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/config/env"

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  persistent?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  children,
  persistent = false,
}) => {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/25">
      <div
        className="fixed inset-0"
        onClick={() => !persistent && onOpenChange(false)}
      />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md mx-4 animate-in fade-in-0 zoom-in-95">
        {children}
      </div>
    </div>,
    document.body
  );
};

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogContent: React.FC<DialogContentProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "max-h-[85vh] overflow-y-auto overscroll-contain",
        "relative p-6 text-gray-900",
        "grid gap-4",
        className
      )}
    >
      {children}
    </div>
  );
};

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-row items-center justify-between",
        "border-b pb-4 mb-4",
        className
      )}
    >
      {children}
    </div>
  );
};

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogTitle: React.FC<DialogTitleProps> = ({
  children,
  className,
}) => {
  return (
    <h2
      className={cn(
        "text-xl font-semibold text-gray-900",
        "flex-1 pr-6", // Space for close button
        className
      )}
    >
      {children}
    </h2>
  );
};

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn("mt-6 flex justify-end space-x-2", className)}>
      {children}
    </div>
  );
};

interface DialogCloseProps {
  children?: React.ReactNode;
  className?: string;
  onClick: () => void;
}

export const DialogClose: React.FC<DialogCloseProps> = ({
  children,
  className,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute right-4 top-4",
        "rounded-full p-1.5",
        "hover:bg-gray-100 transition-colors",
        "text-gray-500 hover:text-gray-700",
        className
      )}
    >
      {children || (
        <svg
          className="h-5 w-5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      )}
    </button>
  );
};

interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
  onClick?: () => void;
}

export const DialogTrigger: React.FC<DialogTriggerProps> = ({
  children,
  className,
  onClick,
}) => {
  return (
    <button type="button" className={cn("", className)} onClick={onClick}>
      {children}
    </button>
  );
};

// Export all components
export const DialogComponents = {
  Root: Dialog,
  Content: DialogContent,
  Header: DialogHeader,
  Title: DialogTitle,
  Footer: DialogFooter,
  Close: DialogClose,
  Trigger: DialogTrigger,
};
