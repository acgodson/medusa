import { createTool } from "@covalenthq/ai-agent-sdk";
import { GreenfieldStorage } from "./GreenfieldStorage";
import { z } from "zod";
import { PrivyClient } from "@privy-io/server-auth";
import { arrayToRecord } from "../../agents/src/SirenCollectionAgent";

type StorageConfig = {
  rpcUrl: string;
  chainId: string;
  greenfieldRpcUrl: string;
  greenfieldChainId: string;
  adminAddress: string;
  adminPrivateKey: string;
  privy?: PrivyClient;
};

export const createNoiseStorageTool = (config: StorageConfig) =>
  createTool({
    id: "noise-storage",
    description: "Store geotagged noise data in BNB Greenfield",
    schema: z.object({
      operation: z.string(),
      workflowId: z.string(),
      walletId: z.string(),
      metadata: z.object({
        startTime: z.number(),
        endTime: z.number(),
        deviceInfo: z.object({
          manufacturer: z.string(),
          model: z.string(),
        }),
        totalSamples: z.number(),
      }),
      data: z.array(
        z.object({
          locationKey: z.string(),
          noise: z.number(),
          minNoise: z.number(),
          maxNoise: z.number(),
          samples: z.number(),
          accuracy: z.number(),
          timestamp: z.number(),
          spikes: z.number(),
        })
      ),
    }),
    execute: async (params: any): Promise<string> => {
      try {
        const storage = new GreenfieldStorage(
          config.greenfieldRpcUrl,
          config.greenfieldChainId,
          config.adminAddress,
          config.adminPrivateKey
        );

        const broadcastOptions = undefined;

        if (params.useServerWallet && !config.privy) {
          throw new Error("Privy client required for server wallet operations");
        }

        const bucketName = `workflow-${params.workflowId}`.toLowerCase();

        switch (params.operation) {
          case "storeData": {
            if (!params.data) {
              throw new Error("data to store not found");
            }
            // Modify storage data
            const dataToStore = arrayToRecord(params.data);

            // First, create the object
            const createResult = await storage.createObject(
              bucketName,
              dataToStore,
              broadcastOptions
            );

            const uploadResult = await storage.uploadObject(
              bucketName,
              createResult.objectName,
              dataToStore,
              createResult.txHash
            );

            return JSON.stringify({
              success: true,
              operation: "createAndUploadObject",
              bucketName,
              objectName: createResult.objectName,
              createTxHash: createResult.txHash,
              uploadResult,
              dataPointsCount: Object.keys(dataToStore || {}).length,
            });
          }

          default:
            throw new Error(`Unsupported operation: ${params.operation}`);
        }
      } catch (error: any) {
        console.error("Storage tool error:", error);
        throw new Error(`Operation failed: ${error.message}`);
      }
    },
  });
