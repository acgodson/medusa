import { useState, useEffect } from "react";
import { checkExecutionCooldown } from "../utils/contractHelpers";

export const useExecutionCooldown = (
  executionInterval: number,
  lastExecuted: number
) => {
  const [cooldown, setCooldown] = useState(() =>
    checkExecutionCooldown(executionInterval, lastExecuted)
  );

  useEffect(() => {
    // Update initial state when props change
    setCooldown(checkExecutionCooldown(executionInterval, lastExecuted));

    // Only set up timer if we're in cooldown period
    if (lastExecuted && lastExecuted + executionInterval > Date.now() / 1000) {
      const timer = setInterval(() => {
        const updated = checkExecutionCooldown(executionInterval, lastExecuted);
        setCooldown(updated);

        // Clear interval when cooldown completes
        if (updated.canExecute) {
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [executionInterval, lastExecuted]);

  return cooldown;
};

/**
 * Gets the appropriate button text based on cooldown state
 */
export const getCooldownButtonText = (
  baseText: string,
  cooldown: ReturnType<typeof useExecutionCooldown>,
  isLoading: boolean = false
): string => {
  if (isLoading) {
    return "Loading...";
  }

  if (!cooldown.canExecute) {
    return `${baseText} in ${cooldown.formattedTimeRemaining}`;
  }

  return baseText;
};
