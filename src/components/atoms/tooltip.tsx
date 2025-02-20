import React, { useState, useRef, useEffect, ReactNode } from "react";

interface TooltipProps {
  content?: string | ReactNode;
  children: ReactNode;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  delay = 300,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Don't show tooltip if content is empty
  const hasContent = !!content;

  const showTooltip = () => {
    if (!hasContent) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    const updatePosition = () => {
      if (triggerRef.current && tooltipRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();

        // Position above by default
        let top = triggerRect.top - tooltipRect.height - 10;
        const left =
          triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

        // If tooltip would be offscreen at the top, position it below
        if (top < 5) {
          top = triggerRect.bottom + 10;
        }

        setPosition({ top, left });
      }
    };

    if (isVisible) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isVisible]);

  return (
    <div
      className="relative inline-block"
      ref={triggerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}

      {isVisible && hasContent && (
        <div
          ref={tooltipRef}
          className="fixed z-50 animate-fade-in"
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
        >
          <div className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md shadow-sm whitespace-nowrap">
            {content}
            <div className="absolute w-2 h-2 bg-gray-900 rotate-45 -bottom-1 left-1/2 transform -translate-x-1/2"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
