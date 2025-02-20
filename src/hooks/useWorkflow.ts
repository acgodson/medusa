import { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createPublicClient, encodeFunctionData, http } from "viem";
import { bscTestnet } from "viem/chains";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "graphql-request";
import { trpc } from "@/trpc/client";
import { WORKFLOWS_QUERY } from "@/lib/graphql/queries";
import { SUBGRAPH_URL } from "../config/constants";
import { WorkflowFormData } from "../types/workflow";
import { useWorkflowProcessor } from "./useWorkflowProcessor";
import RegistryArtifacts from "../../contracts/artifacts/MedusaRegistry.json";
import DeviceNFTArtifacts from "../../contracts/artifacts/DeviceNFT.json";

export const useWorkflow = () => {
  const { ready: isPrivyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const connectedWallet = wallets.find((wallet) => wallet.type === "ethereum");
  const queryClient = useQueryClient();
  const [refreshCounter, setRefreshCounter] = useState(0);

  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http(),
  });

  // Query subgraph data
  const {
    data: subgraphData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const data = await request(SUBGRAPH_URL, WORKFLOWS_QUERY);
      return data;
    },
    enabled: isPrivyReady,
  });

  // Process workflows
  const { workflows, isChecked, refreshWorkflows } = useWorkflowProcessor(
    subgraphData,
    publicClient,
    connectedWallet,
    process.env.NEXT_PUBLIC_REGISTRY_CONTRACT!,
    RegistryArtifacts.abi,
    process.env.NEXT_PUBLIC_DEVICE_NFT_CONTRACT!,
    DeviceNFTArtifacts.abi,
    refreshCounter
  );

  // Create workflow mutation
  const createWorkflow = trpc.createWorkflow.useMutation({
    onSuccess: (data) => console.log("workflow created:", data),
    onError: (error) => console.error("Creation failed:", error),
  });

  const refreshData = async () => {
    setRefreshCounter((prev) => prev + 1);
    await queryClient.invalidateQueries({ queryKey: ["workflows"] });
    await refetch();
    if (refreshWorkflows) {
      refreshWorkflows();
    }
    return true;
  };

  const handleSubmit = async (formData: WorkflowFormData) => {
    try {
      if (!connectedWallet || !walletsReady) {
        throw new Error("No wallets connected");
      }

      if (!formData.title || !formData.description || !formData.schemaId) {
        throw new Error("Invalid inputs");
      }

      const response = await createWorkflow.mutateAsync({
        ...formData,
        creator: connectedWallet.address,
      });

      if (response?.data?.contractAddress) {
        const provider = await connectedWallet.getEthereumProvider();
        const transactionRequest = {
          to: response.data.contractAddress,
          from: connectedWallet.address,
          data: response.data.data,
          value: 0,
        };

        const hash = await provider.request({
          method: "eth_sendTransaction",
          params: [transactionRequest],
        });

        await refreshData();

        return hash;
      }
    } catch (error) {
      console.error("Submission error:", error);
      throw error;
    }
  };

  const togglePause = async (workflowId: string | number) => {
    if (!connectedWallet || !walletsReady) {
      throw new Error("No wallets connected");
    }
    if (!workflowId) {
      throw new Error("No workflowId selected");
    }

    const data = encodeFunctionData({
      abi: RegistryArtifacts.abi,
      functionName: "toggleWorkflowPause",
      args: [BigInt(workflowId)],
    });

    const contractAddress = process.env.NEXT_PUBLIC_REGISTRY_CONTRACT;
    const txData = {
      contractAddress,
      data,
    };

    const provider = await connectedWallet.getEthereumProvider();

    const transactionRequest = {
      to: contractAddress,
      from: connectedWallet.address,
      data: txData.data,
      value: 0,
    };
    const hash = await provider.request({
      method: "eth_sendTransaction",
      params: [transactionRequest],
    });

    setTimeout(() => refreshData(), 2000);

    return hash;
  };

  return {
    address: connectedWallet?.address,
    workflows,
    isLoading,
    createWorkflow,
    togglePause,
    handleSubmit,
    isPending: createWorkflow.isPending,
    refreshData,
  };
};
