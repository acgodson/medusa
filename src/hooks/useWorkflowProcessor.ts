import { useState, useEffect, useCallback } from "react";
import {
  Workflow,
  SubgraphDeviceRegistration,
  WorkflowStatus,
} from "../types/workflow";
import { fetchWorkflowFromContract } from "../utils/contractHelpers";
import { checkDeviceOwnership } from "../utils/deviceOwnership";
import { PublicClient } from "viem";

export const useWorkflowProcessor = (
  subgraphData: any,
  publicClient: PublicClient,
  connectedWallet: any,
  registryAddress: string,
  registryAbi: any,
  nftContractAddress: string,
  nftContractAbi: any,
  refreshTrigger: number = 0
) => {
  const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  const refreshWorkflows = useCallback(() => {
    setWorkflows(null);
    setIsChecked(false);
    setRefreshCount((prev) => prev + 1);
  }, []);

  // Process initial workflow data
  useEffect(() => {
    const processWorkflows = async () => {
      if (!subgraphData?.workflowCreateds) return;

      try {
        const processedWorkflows = await Promise.all(
          subgraphData.workflowCreateds.map(async (event: any) => {
            const workflowId = BigInt(event.internal_id);
            try {
              const workflow = await fetchWorkflowFromContract(
                publicClient,
                registryAddress,
                registryAbi,
                workflowId
              );

              return workflow as Workflow;
            } catch (error) {
              console.error(`Error processing workflow ${workflowId}:`, error);
              return null;
            }
          })
        );

        const filteredWorkflows = processedWorkflows.filter(
          (w): w is Workflow => w !== null
        );
        setWorkflows(filteredWorkflows);
      } catch (error) {
        console.error("Error processing workflows:", error);
      }
    };

    if (subgraphData && !workflows) {
      processWorkflows();
    }
  }, [
    subgraphData,
    publicClient,
    workflows,
    registryAddress,
    registryAbi,
    refreshCount,
    refreshTrigger,
  ]);

  // Update contributor status
  useEffect(() => {
    const updateContributorStatus = async () => {
      if (
        !workflows ||
        !connectedWallet?.address ||
        !subgraphData?.deviceRegistereds
      )
        return;

      try {
        const registeredDevices: any = new Set(
          subgraphData.deviceRegistereds.map(
            (reg: SubgraphDeviceRegistration) => reg.deviceAddress.toLowerCase()
          )
        );

        // console.log("registered devices", registeredDevices);

        const ownershipMap = await checkDeviceOwnership(
          publicClient,
          nftContractAddress,
          nftContractAbi,
          registeredDevices,
          connectedWallet.address
        );

        // console.log("ownership map", ownershipMap);

        const updatedWorkflows = workflows.map((workflow) => {
          const workflowDevices = subgraphData.deviceRegistereds.filter(
            (registration: SubgraphDeviceRegistration) =>
              Number(registration.workflowId).toString() ===
              workflow.id.toString()
          );

          const ownedDevicesInfo = workflowDevices
            .filter(
              (registration: SubgraphDeviceRegistration) =>
                ownershipMap[registration.deviceAddress.toLowerCase()]
            )
            .map((registration: SubgraphDeviceRegistration) => ({
              address: registration.deviceAddress,
              walletId: registration.walletId,
            }));

          return {
            ...workflow,
            isContributor: ownedDevicesInfo.length > 0,
            deviceIds: ownedDevicesInfo.map((device: any) => device.address),
            deviceWalletIds: ownedDevicesInfo.map(
              (device: any) => device.walletId
            ),
          };
        });
        // console.log("ownership info", updatedWorkflows);
        setWorkflows(updatedWorkflows);
        setIsChecked(true);
      } catch (error) {
        console.error("Error updating contributor status:", error);
        setIsChecked(true);
      }
    };

    if (
      workflows &&
      connectedWallet?.address &&
      subgraphData.deviceRegistereds.length > 0 &&
      !isChecked
    ) {
      updateContributorStatus();
    }
  }, [
    workflows,
    connectedWallet?.address,
    subgraphData?.deviceRegistereds,
    isChecked,
    publicClient,
    nftContractAddress,
    nftContractAbi,
    refreshCount,
  ]);

  // Live workflow status tracking effect
  useEffect(() => {
    // Skip if no workflows
    if (!workflows || workflows.length === 0) return;

    // Immediately check workflow statuses
    const checkWorkflowStatuses = async () => {
      try {
        const updatedWorkflows = await Promise.all(
          workflows.map(async (workflow) => {
            // Fetch current paused status
            const [_, isArchived, isPaused] = (await publicClient.readContract({
              address: registryAddress as `0x${string}`,
              abi: registryAbi,
              functionName: "getDetailedWorkflow",
              args: [BigInt(workflow.id)],
            })) as any;

            const status: WorkflowStatus = isArchived
              ? "Archived"
              : isPaused
              ? "Paused"
              : "Active";

            // Only update if status changed
            if (workflow.status !== status) {
              return { ...workflow, status };
            }
            return workflow;
          })
        );
        // Only update state if there are changes
        const hasChanges = updatedWorkflows.some(
          (updated, index) => updated.status !== workflows[index].status
        );

        if (hasChanges) {
          setWorkflows(updatedWorkflows);
        }
      } catch (error) {
        console.error("Error checking workflow statuses:", error);
      }
    };
    // Run status check immediately and then on interval
    checkWorkflowStatuses();
    const statusInterval = setInterval(checkWorkflowStatuses, 10000);
    return () => clearInterval(statusInterval);
  }, [workflows, publicClient, registryAddress, registryAbi]);

  return { workflows, isChecked, refreshWorkflows };
};
