import { createTool } from "@covalenthq/ai-agent-sdk";
import lighthouse from "@lighthouse-web3/sdk";
import { DataSchema } from "../../types";
import { createPublicClient, getAddress, http } from "viem";
import RegistryArtifacts from "../../../../../../contracts/artifacts/MedusaRegistry.json";
import { baseSepolia } from "viem/chains";

export const createDataStorageTool = (lighthouseApiKey: string) =>
  createTool({
    id: "store-sensor-data",
    description: "Store sensor data and upload to IPFS via Lighthouse",
    schema: DataSchema,
    execute: async (params) => {
      try {
        // Validate the input
        if (!params.data) {
          throw new Error("No data provided for storage");
        }
        const publicClient = createPublicClient({
          chain: baseSepolia,
          transport: http(
            `https://api.developer.coinbase.com/rpc/v1/base-sepolia/${process.env.NEXT_PUBLIC_COINBASE_RPC}`
          ),
        });

        const workflow: any = await publicClient.readContract({
          address: getAddress(params.contractAddress),
          abi: RegistryArtifacts.abi,
          functionName: "workflows",
          args: [params.id],
        });

        if (!workflow) {
          throw new Error("Smart Contract Error");
        }

        // Retreiving ipnsName from smart contract
        console.log("Starting retrieval from Lighthouse...");
        const ipnsId = workflow[1];
        const ipnsName = workflow[0];

        const ipnsUrl = `http://gateway.lighthouse.storage/ipns/${ipnsId}}`;
        const response = await fetch(ipnsUrl);
        const metadata = await response.json();

        const newData = {
          ...metadata,
          items: [
            {
              ...params.data,
              timestamp: Date.now(),
              count: metadata.items.length + 1,
            },
            ...metadata.items,
          ],
        };

        console.log("Starting storage update process with Lighthouse...");

        // Prepare data for upload
        const dataToUpload = JSON.stringify(newData);

        // Upload to Lighthouse
        console.log("Attempting upload to Lighthouse...");
        const uploadResponse = await lighthouse.uploadText(
          dataToUpload,
          lighthouseApiKey,
          undefined // Progress callback can be added here if needed
        );

        console.log("Lighthouse upload response:", uploadResponse);

        if (!uploadResponse?.data?.Hash) {
          console.error("Invalid upload response:", uploadResponse);
          throw new Error("Upload failed: No hash returned from Lighthouse");
        }

        return JSON.stringify({
          success: true,
          data: params.data,
          cid: uploadResponse.data.Hash,
          ipnsName: ipnsName,
          ipnsId: ipnsId,
        });
      } catch (error: any) {
        console.error("Storage tool error:", error);
        throw new Error(`Failed to store data: ${error.message}`);
      }
    },
  });
