import { PublicClient } from "viem";
import { Workflow, WorkflowStatus } from "../types/workflow";

interface WorkflowExecutionInfo {
  executionInterval: number;
  lastExecuted: number;
}

export const fetchWorkflowFromContract = async (
  publicClient: PublicClient,
  registryAddress: string,
  registryAbi: any,
  workflowId: bigint
): Promise<Partial<Workflow>> => {
  const [workflow, isArchived, isPaused] = (await publicClient.readContract({
    address: registryAddress as `0x${string}`,
    abi: registryAbi,
    functionName: "getDetailedWorkflow",
    args: [workflowId],
  })) as any;

  const [_, totalPartitions, totalDevices] = (await publicClient.readContract({
    address: registryAddress as `0x${string}`,
    abi: registryAbi,
    functionName: "getWorkflowInfo",
    args: [workflowId],
  })) as any;

  const status: WorkflowStatus = isArchived
    ? "Archived"
    : isPaused
    ? "Paused"
    : "Active";

  return {
    id: Number(workflowId),
    title: workflow.title,
    description: workflow.description,
    schemaId: workflow.schemaId,
    contributorCount: Number(workflow.contributorCount),
    creator: workflow.owner,
    status,
    timestamp: Number(workflow.timestamp),
    pages: totalPartitions,
    executionInterval: Number(workflow.executionInterval),
    totalExecutions: 0, 
  };
};


/**
 * Gets execution information for a device in a workflow
 * @param publicClient - Viem public client
 * @param registryAddress - Address of the registry contract
 * @param registryAbi - ABI of the registry contract
 * @param deviceAddress - Address of the device to check
 * @returns Object containing execution count, last execution time, and active status
 */
export const getDeviceExecutionInfo = async (
  publicClient: PublicClient,
  registryAddress: string,
  registryAbi: any,
  deviceAddress: string
): Promise<{
  count: number;
  lastExecuted: number;
  isActive: boolean;
}> => {
  try {
    const [count, lastExecuted, isActive] = (await publicClient.readContract({
      address: registryAddress as `0x${string}`,
      abi: registryAbi,
      functionName: "getDeviceExecution",
      args: [deviceAddress],
    })) as any;

    return {
      count: Number(count),
      lastExecuted: Number(lastExecuted),
      isActive: isActive,
    };
  } catch (error) {
    console.error("Error fetching device execution info:", error);
    return {
      count: 0,
      lastExecuted: 0,
      isActive: false,
    };
  }
};

/**
 * Checks if a device can execute a workflow based on cooldown period
 * @param executionInterval - Minimum time between executions (in seconds)
 * @param lastExecuted - Last execution timestamp (unix seconds)
 * @returns Object with cooldown information
 */
export const checkExecutionCooldown = (
  executionInterval: number,
  lastExecuted: number
): {
  canExecute: boolean;
  cooldownRemaining: number;
  cooldownPercentage: number;
  formattedTimeRemaining: string;
} => {
  // If never executed or no interval, allow execution
  if (!lastExecuted || executionInterval <= 0) {
    return {
      canExecute: true,
      cooldownRemaining: 0,
      cooldownPercentage: 100,
      formattedTimeRemaining: "",
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const nextAllowedTime = lastExecuted + executionInterval;
  const cooldownRemaining = Math.max(0, nextAllowedTime - now);
  
  // Calculate percentage of cooldown that has elapsed
  const cooldownPercentage = Math.min(
    100,
    Math.max(
      0,
      ((executionInterval - cooldownRemaining) / executionInterval) * 100
    )
  );

  return {
    canExecute: cooldownRemaining <= 0,
    cooldownRemaining,
    cooldownPercentage,
    formattedTimeRemaining: formatCooldownTime(cooldownRemaining),
  };
};

/**
 * Formats cooldown time into human-readable string
 * @param seconds Cooldown time in seconds
 * @returns Formatted time string (e.g. "5m 30s")
 */
export const formatCooldownTime = (seconds: number): string => {
  if (seconds <= 0) return "";
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (minutes > 0) {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h`;
      }
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};