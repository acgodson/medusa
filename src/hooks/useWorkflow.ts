import { useState, useEffect } from "react";
import { createPublicClient, getAddress, http } from "viem";
import { baseSepolia } from "viem/chains";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { trpc } from "@/trpc/client";
import RegistryArtifacts from "../../contracts/artifacts/MedusaRegistry.json";

export const useWorkflow = () => {
  const [fetchedWorkflows, setFetchedWorkflows] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { ready: isReady } = usePrivy();
  const { wallets, ready } = useWallets();

  const connectedWallet = wallets.find(
    (wallet) => wallet.walletClientType !== "privy"
  );

  const createWorkflow = trpc.createWorkflow.useMutation({
    onSuccess: (data) => {
      console.log("workflow created:", data);
    },
    onError: (error) => {
      console.error("Registration failed:", error);
    },
  });

  const handleSubmit = async () => {
    if (!connectedWallet || !ready) {
      console.log("no wallet detected");
      return;
    }
    const response = await createWorkflow.mutateAsync({
      schemaID: "",
    });

    if (response && response.data.contractAddress) {
      console.log("c address", response.data.contractAddress);
      console.log("c address", response.data.data);
      const provider = await connectedWallet.getEthereumProvider();
      const transactionRequest = {
        to: getAddress(response.data.contractAddress),
        from: getAddress(connectedWallet.address),
        data: response.data.data,
        value: 0,
      };
      const transactionHash = await provider.request({
        method: "eth_sendTransaction",
        params: [transactionRequest],
      });

      console.log(transactionHash);
    }
  };

  const fetchWorkflows = async () => {
    setIsLoading(true);

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });

    try {
      const workflows = [];
      // Fetch last 5 workflows
      for (let i = 5; i >= 1; i--) {
        try {
          const workflow: any = await publicClient.readContract({
            address: process.env.NEXT_PUBLIC_REGISTRY_CONTRACT as `0x${string}`,
            abi: RegistryArtifacts.abi,
            functionName: "workflows",
            args: [i],
          });

          // Skip if workflow doesn't exist (all values are zero/empty)
          if (!workflow[1] || workflow[1] === "") continue;

          // Fetch metadata from Lighthouse
          const ipnsUrl = `http://gateway.lighthouse.storage/ipns/${workflow[1]}`;
          const response = await fetch(ipnsUrl);
          const metadata = await response.json();

          workflows.push({
            id: i,
            name: metadata.title || `Workflow ${i}`,
            description:
              metadata.description || "Environment monitoring system",
            schema: "temp-humid-basic",
            contributors: Number(workflow[4]),
            totalExecutions: 0,
            creator: workflow[2],
            active: workflow[3],
            timestamp: Number(metadata.timestamp),
            ipnsId: workflow[1],
            ipnsName: workflow[0],
          });
        } catch (error) {
          console.error(`Error fetching workflow ${i}:`, error);
          continue;
        }
      }
      setFetchedWorkflows(workflows);
    } catch (error) {
      console.error("Error fetching workflows:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isReady && !fetchedWorkflows) {
      fetchWorkflows();
    }
  }, [isReady, fetchedWorkflows]);

  return {
    fetchedWorkflows,
    isLoading,
    createWorkflow,
    handleSubmit,
    isPending: createWorkflow.isPending,
  };
};
