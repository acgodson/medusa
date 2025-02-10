import { createTool } from "@covalenthq/ai-agent-sdk";
import { DataSchema } from "../../types";
import { createPublicClient, http } from "viem";
import RegistryArtifacts from "../../../../../../contracts/artifacts/MedusaRegistry.json";
import { baseSepolia } from "viem/chains";

export const createDataStorageTool = (lighthouseApiKey: string) =>
  createTool({
    id: "store-sensor-data",
    description: "Store sensor data and upload to IPFS via Lighthouse API",
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

        // Retrieving ipnsName from smart contract
        console.log("Starting retrieval from Lighthouse...");
        const ipnsId = workflow[1];
        const ipnsName = workflow[0];

        const ipnsUrl = `https://gateway.lighthouse.storage/ipns/${ipnsId}`;
        console.log("Fetching from IPNS URL:", ipnsUrl);

        try {
          const response = await fetch(ipnsUrl);

          let newData;
          if (!response.ok) {
            // If this is the first time, create initial metadata structure
            console.log(
              "Initial IPNS fetch failed, creating new metadata structure"
            );
            newData = {
              items: [
                {
                  ...params.data,
                  timestamp: Date.now(),
                  count: 1,
                },
              ],
            };
          } else {
            // If response is OK, proceed with updating existing data
            const metadata = await response.json();
            console.log("Retrieved metadata:", metadata);

            newData = {
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
          }

          // Prepare form data for the API request
          const formData = new FormData();
          const blob = new Blob([JSON.stringify(newData)], {
            type: "application/json",
          });
          formData.append("file", blob);

          // Upload to Lighthouse API
          console.log("Starting upload to Lighthouse API...");
          const uploadResponse = await fetch(
            "https://node.lighthouse.storage/api/v0/add",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lighthouseApiKey}`,
              },
              body: formData,
            }
          );

          if (!uploadResponse.ok) {
            throw new Error(
              `Upload failed with status: ${uploadResponse.status}`
            );
          }

          const uploadResult = await uploadResponse.json();
          console.log("Lighthouse upload response:", uploadResult);

          if (!uploadResult?.Hash) {
            throw new Error("Upload failed: No hash returned");
          }

          return JSON.stringify({
            success: true,
            data: params.data,
            cid: uploadResult.Hash,
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
