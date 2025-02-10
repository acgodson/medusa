import { useState, useEffect } from "react";
import { createPublicClient, getAddress, http } from "viem";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { trpc } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { request } from "graphql-request";
import RegistryArtifacts from "../../contracts/artifacts/MedusaRegistry.json";
import { WORKFLOWS_QUERY } from "@/lib/graphql/queries";
import { baseSepolia } from "viem/chains";

const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/61092/medusa/version/latest";

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

interface WorkflowData {
  ipnsName: string;
  ipnsId: string;
  creator: `0x${string}`;
  active: boolean;
  contributorCount: bigint;
  timestamp: bigint;
}
// string ipnsName;
// string ipnsId;
// address creator;
// bool active;
// uint256 contributorCount;
// uint256 timestamp;

export const useWorkflow = () => {
  const [fetchedWorkflows, setFetchedWorkflows] = useState<Workflow[] | null>(null);
  const [baseWorkflows, setBaseWorkflows] = useState<Workflow[] | null>(null);
  const { ready: isReady } = usePrivy();
  const { wallets, ready } = useWallets();

  const connectedWallet = wallets.find(
    (wallet) => wallet.walletClientType !== "privy"
  );

  // Use the same query pattern as in your page
  const { data: subgraphData, isLoading }: any = useQuery({
    queryKey: ["data"], // Changed from "workflows" to "data" to match page component
    queryFn: async () => {
      console.log("Fetching from subgraph...");
      const data = await request(SUBGRAPH_URL, WORKFLOWS_QUERY);
      console.log("Subgraph response:", data);
      return data;
    },
    enabled: isReady && !!connectedWallet,
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

  // First effect: Process basic workflow data without contributor status
  useEffect(() => {
    const processBaseWorkflows = async () => {
      if (!subgraphData?.workflowCreateds) {
        console.log("No workflows data found in subgraph response");
        return;
      }

      try {
        const processedWorkflows = await Promise.all(
          subgraphData.workflowCreateds.map(async (workflowEvent: any) => {
            try {
              const workflowId = BigInt(workflowEvent.internal_id);
              const publicClient = createPublicClient({
                chain: baseSepolia,
                transport: http(process.env.NEXT_PUBLIC_RPC_URL),
              });

              const workflowData = (await publicClient.readContract({
                address: process.env
                  .NEXT_PUBLIC_REGISTRY_CONTRACT as `0x${string}`,
                abi: RegistryArtifacts.abi,
                functionName: "workflows",
                args: [workflowId],
              })) as unknown as WorkflowData | any;

              if (!workflowData[1] || workflowData[1] === "") return null;

              const ipnsUrl = `https://gateway.lighthouse.storage/ipns/${workflowData[1]}`;
              const response = await fetch(ipnsUrl);
              const metadata = await response.json();
              const executionCount = metadata.items?.length || 0;

              return {
                id: Number(workflowId),
                name: `Workflow ${workflowId}`,
                description: "Environment monitoring system",
                schema: "temp-humid-basic",
                contributors: Number(workflowData[4]),
                totalExecutions: executionCount,
                creator: workflowData[2],
                active: workflowData[3],
                timestamp: Number(workflowData[5]),
                ipnsId: workflowData[1],
                ipnsName: workflowData[0],
                isContributor: false,
                deviceIds: [],
              };
            } catch (error) {
              console.error(
                `Error processing workflow ${workflowEvent.internal_id}:`,
                error
              );
              return null;
            }
          })
        );

        const filteredWorkflows = processedWorkflows.filter(
          (w): w is Workflow => w !== null
        );
        setBaseWorkflows(filteredWorkflows);
        setFetchedWorkflows(filteredWorkflows); // Set initial state without contributor info
      } catch (error) {
        console.error("Error processing workflows:", error);
      }
    };

    if (subgraphData) {
      processBaseWorkflows();
    }
  }, [subgraphData]);

  // Second effect: Update contributor status when wallet changes
  useEffect(() => {
    const updateContributorStatus = async () => {
      if (!baseWorkflows || !connectedWallet?.address) return;

      const updatedWorkflows = baseWorkflows.map((workflow) => {
        const isContributor = subgraphData.deviceRegistereds.some(
          (registration: any) =>
            registration.workflowId === workflow.id.toString() &&
            registration.userAddress.toLowerCase() ===
              connectedWallet.address.toLowerCase()
        );

        const userDevices = subgraphData.deviceRegistereds
          .filter(
            (registration: any) =>
              registration.workflowId === workflow.id.toString() &&
              registration.userAddress.toLowerCase() ===
                connectedWallet.address.toLowerCase()
          )
          .map((registration: any) => registration.walletId);

        return {
          ...workflow,
          isContributor,
          deviceIds: userDevices,
        };
      });

      setFetchedWorkflows(updatedWorkflows);
    };

    updateContributorStatus();
  }, [baseWorkflows, connectedWallet, subgraphData]);

  return {
    fetchedWorkflows,
    isLoading,
    createWorkflow,
    handleSubmit,
    isPending: createWorkflow.isPending,
  };
};
