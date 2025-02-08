import { createTool } from "@covalenthq/ai-agent-sdk";
import lighthouse from "@lighthouse-web3/sdk";
import { DataSchema } from "../../types";

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

        console.log("Starting data storage process with Lighthouse...");

        // Prepare data for upload
        const dataToUpload = JSON.stringify({
          ...params.data,
          timestamp: Date.now(),
        });

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
          timestamp: Date.now(),
          cid: uploadResponse.data.Hash,
          gateway: `https://gateway.lighthouse.storage/ipfs/${uploadResponse.data.Hash}`,
        });
      } catch (error: any) {
        console.error("Storage tool error:", error);
        throw new Error(`Failed to store data: ${error.message}`);
      }
    },
  });
