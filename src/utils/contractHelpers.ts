import { PublicClient } from 'viem';
import { Workflow, WorkflowStatus } from '../types/workflow';

export const fetchWorkflowFromContract = async (
  publicClient: PublicClient,
  registryAddress: string,
  registryAbi: any,
  workflowId: bigint
): Promise<Partial<Workflow>> => {
  const [workflow, isArchived, isPaused] = await publicClient.readContract({
    address: registryAddress as `0x${string}`,
    abi: registryAbi,
    functionName: "getDetailedWorkflow",
    args: [workflowId],
  }) as any;

  const [_, totalPartitions, totalDevices] = await publicClient.readContract({
    address: registryAddress as `0x${string}`,
    abi: registryAbi,
    functionName: "getWorkflowInfo",
    args: [workflowId],
  }) as any;

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
    totalExecutions: 0, // Default value, to be updated with Greenfield data
  };
};