import React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/config/env";

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
  // Disable body scroll when dialog is open
  React.useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflowY = "scroll";

      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflowY = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/30 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={() => !persistent && onOpenChange(false)}
      />
      <div className="relative bg-white/95 backdrop-blur-md rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] w-full max-w-md mx-4 animate-in fade-in-0 zoom-in-95 border border-white/40">
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
        "relative p-7 text-gray-800",
        "grid gap-5",
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
        "border-b border-gray-100/80 pb-5 mb-5",
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
        "text-xl font-semibold text-gray-800",
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
    <div className={cn("mt-7 flex justify-end space-x-3", className)}>
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
        "absolute right-5 top-5",
        "rounded-full p-2",
        "hover:bg-gray-100/70 transition-colors duration-200",
        "text-gray-400 hover:text-gray-600",
        "flex items-center justify-center",
        className
      )}
    >
      {children || (
        <svg
          className="h-5 w-5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
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
    <button
      type="button"
      className={cn("transition-all duration-200", className)}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export const DialogComponents = {
  Root: Dialog,
  Content: DialogContent,
  Header: DialogHeader,
  Title: DialogTitle,
  Footer: DialogFooter,
  Close: DialogClose,
  Trigger: DialogTrigger,
};
