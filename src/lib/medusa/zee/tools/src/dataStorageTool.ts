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
    execute: async (params: any) => {
      try {
        // Validate the input
        if (!params.data) {
          throw new Error("No data provided for storage");
        }

        if (!params.contractAddress) {
          throw new Error("Contract address is required for storage");
        }

        const publicClient = createPublicClient({
          chain: baseSepolia,
          transport: http(),
        });

        console.log("Contract Address:", params.contractAddress);
        console.log("Workflow ID:", params.workflowId);

        const workflow: any = await publicClient.readContract({
          address: params.contractAddress as `0x${string}`,
          abi: RegistryArtifacts.abi,
          functionName: "workflows",
          args: [BigInt(params.workflowId)],
        });

        if (!workflow) {
          throw new Error("Smart Contract Error");
        }

        // Retreiving ipnsName from smart contract
        console.log("Starting retrieval from Lighthouse...");
        const ipnsId = workflow[1];
        const ipnsName = workflow[0];

        const ipnsUrl = `https://gateway.lighthouse.storage/ipns/${ipnsId}`;
        console.log("Fetching from IPNS URL:", ipnsUrl);

        try {
          const response = await fetch(ipnsUrl);

          if (!response.ok) {
            // If this is the first time, create initial metadata structure
            console.log(
              "Initial IPNS fetch failed, creating new metadata structure"
            );
            const newData = {
              items: [
                {
                  ...params.data,
                  timestamp: Date.now(),
                  count: 1,
                },
              ],
            };

            // Upload to Lighthouse
            console.log("Attempting initial upload to Lighthouse...");
            const uploadResponse = await lighthouse.uploadText(
              JSON.stringify(newData),
              lighthouseApiKey
            );

            console.log("Initial Lighthouse upload response:", uploadResponse);

            if (!uploadResponse?.data?.Hash) {
              throw new Error("Initial upload failed: No hash returned");
            }

            return JSON.stringify({
              success: true,
              data: params.data,
              cid: uploadResponse.data.Hash,
              ipnsName: ipnsName,
              ipnsId: ipnsId,
            });
          }

          // If response is OK, proceed with updating existing data
          const metadata = await response.json();
          console.log("Retrieved metadata:", metadata);

          const newData = {
            ...metadata,
            items: [
              {
                ...params.data,
                timestamp: Date.now(),
                count: metadata.items ? metadata.items.length + 1 : 1,
              },
              ...(metadata.items || []),
            ],
          };

          console.log("Starting storage update process with Lighthouse...");
          const dataToUpload = JSON.stringify(newData);

          const uploadResponse = await lighthouse.uploadText(
            dataToUpload,
            lighthouseApiKey
          );

          console.log("Lighthouse upload response:", uploadResponse);

          if (!uploadResponse?.data?.Hash) {
            throw new Error("Upload failed: No hash returned");
          }

          return JSON.stringify({
            success: true,
            data: params.data,
            cid: uploadResponse.data.Hash,
            ipnsName: ipnsName,
            ipnsId: ipnsId,
          });
        } catch (ipnsError: any) {
          console.error("IPNS fetch/parse error:", ipnsError);
          throw new Error(`IPNS operation failed: ${ipnsError.message}`);
        }
      } catch (error: any) {
        console.error("Storage tool error:", error);
        throw new Error(`Failed to store data: ${error.message}`);
      }
    },
  });
