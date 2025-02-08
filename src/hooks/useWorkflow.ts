import { useState, useEffect } from "react";
import { createPublicClient, getAddress, http, getContract } from "viem";
import { baseSepolia } from "viem/chains";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { trpc } from "@/trpc/client";
import RegistryArtifacts from "../../contracts/artifacts/MedusaRegistry.json";

interface Workflow {
  id: number;
  name: string;
  description: string;
  schema: string;
  contributors: number;
  totalExecutions: number;
  creator: string;
  active: boolean;
  timestamp: number;
  ipnsId: string;
  ipnsName: string;
  isContributor: boolean;
  deviceIds: string[];
}

export const useWorkflow = () => {
  const [fetchedWorkflows, setFetchedWorkflows] = useState<Workflow[] | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const { ready: isReady } = usePrivy();
  const { wallets, ready } = useWallets();

  const connectedWallet = wallets.find(
    (wallet) => wallet.walletClientType !== "privy"
  );

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  const contract = getContract({
    address: process.env.NEXT_PUBLIC_REGISTRY_CONTRACT as `0x${string}`,
    abi: RegistryArtifacts.abi,
    client: { public: publicClient },
  });

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

    try {
      const workflows: Workflow[] | any = [];
      // Fetch last 5 workflows
      for (let i = 5; i >= 1; i--) {
        try {
          const workflowData: any = await contract.read.workflows([BigInt(i)]);

          // Destructure array values with proper typing
          const [
            ipnsName,
            ipnsId,
            creator,
            active,
            contributorCount,
            timestamp,
          ] = workflowData;

          // Skip if workflow doesn't exist (all values are zero/empty)
          if (!ipnsId || ipnsId === "") continue;

          // Only fetch user devices if wallet is connected
          let userDevices: string[] | any = [];
          if (connectedWallet && connectedWallet.address) {
            // userDevices = await contract.read.userWorkflowDevices([
            //   connectedWallet.address as `0x${string}`,
            //   BigInt(i),
            // ]);
            userDevices = await publicClient.readContract({
              address: getAddress(contract.address),
              abi: contract.abi,
              functionName: "getWorkflowDevices",
              args: [BigInt(i), getAddress(connectedWallet.address)],
            });
          }

          // Fetch metadata from Lighthouse
          const ipnsUrl = `http://gateway.lighthouse.storage/ipns/${ipnsId}`;
          const response = await fetch(ipnsUrl);
          const metadata = await response.json();

          workflows.push({
            id: i,
            name: metadata.title || `Workflow ${i}`,
            description:
              metadata.description || "Environment monitoring system",
            schema: "temp-humid-basic",
            contributors: Number(contributorCount),
            totalExecutions: 0,
            creator: creator,
            active: active,
            timestamp: Number(timestamp),
            ipnsId: ipnsId,
            ipnsName: ipnsName,
            isContributor: userDevices.length > 0,
            deviceIds: userDevices,
          });
        } catch (error) {
          console.error(`Error fetching workflow ${i}:`, error);
          continue;
        }
      }
      console.log(workflows);
      setFetchedWorkflows(workflows);
    } catch (error) {
      console.error("Error fetching workflows:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isReady && !fetchedWorkflows && connectedWallet) {
      fetchWorkflows();
    }
  }, [isReady, fetchedWorkflows, connectedWallet]);

  return {
    fetchedWorkflows,
    isLoading,
    createWorkflow,
    handleSubmit,
    isPending: createWorkflow.isPending,
  };
};
