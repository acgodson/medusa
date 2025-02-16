import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";
import { useQuery } from "@tanstack/react-query";
import { request } from "graphql-request";
import { trpc } from "@/trpc/client";
import { WORKFLOWS_QUERY } from "@/lib/graphql/queries";
import { SUBGRAPH_URL } from '../config/constants';
import { WorkflowFormData } from '../types/workflow';
import { useWorkflowProcessor } from './useWorkflowProcessor';
import RegistryArtifacts from "../../contracts/artifacts/MedusaRegistry.json";
import DeviceNFTArtifacts from "../../contracts/artifacts/DeviceNFT.json";

export const useWorkflow = () => {
  const { ready: isPrivyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const connectedWallet = wallets.find((wallet) => wallet.type === "ethereum");

  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http(),
  });

  // Query subgraph data
  const { data: subgraphData, isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const data = await request(SUBGRAPH_URL, WORKFLOWS_QUERY);
      return data;
    },
    enabled: isPrivyReady,
  });

  // Process workflows
  const { workflows, isChecked } = useWorkflowProcessor(
    subgraphData,
    publicClient,
    connectedWallet,
    process.env.NEXT_PUBLIC_REGISTRY_CONTRACT!,
    RegistryArtifacts.abi,
    process.env.NEXT_PUBLIC_DEVICE_NFT_CONTRACT!,
    DeviceNFTArtifacts.abi
  );

  // Create workflow mutation
  const createWorkflow = trpc.createWorkflow.useMutation({
    onSuccess: (data) => console.log("workflow created:", data),
    onError: (error) => console.error("Creation failed:", error),
  });

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

        return hash;
      }
    } catch (error) {
      console.error("Submission error:", error);
      throw error;
    }
  };

  return {
    workflows,
    isLoading,
    createWorkflow,
    handleSubmit,
    isPending: createWorkflow.isPending,
  };

}