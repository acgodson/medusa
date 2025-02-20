import { useState, useEffect } from "react";
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
  nftContractAbi: any
) => {
  const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
  const [isChecked, setIsChecked] = useState(false);

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
  }, [subgraphData, publicClient, workflows, registryAddress, registryAbi]);

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

        const ownershipMap = await checkDeviceOwnership(
          publicClient,
          nftContractAddress,
          nftContractAbi,
          registeredDevices,
          connectedWallet.address
        );

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
  ]);

  return { workflows, isChecked };
};
