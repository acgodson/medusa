import { createTool } from "@covalenthq/ai-agent-sdk";
import { GreenfieldStorage } from "./GreenfieldStorage";
import { z } from "zod";
import { PrivyClient } from "@privy-io/server-auth";

type StorageConfig = {
  rpcUrl: string;
  chainId: string;
  greenfieldRpcUrl: string;
  greenfieldChainId: string;
  adminAddress: string;
  adminPrivateKey: string;
  privy?: PrivyClient;
};

export const createTemperatureStorageTool = (config: StorageConfig) =>
  createTool({
    id: "greenfield-storage",
    description: "Manage BNB Greenfield storage operations",
    schema: z.object({
      operation: z.string(),
      workflowId: z.string(),
      walletId: z.string(),
      data: z.object({
        temperature: z.number(),
        humidity: z.number(),
        timestamp: z.number(),
      }),
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

        const prepareContent = (data: any): Buffer => {
          if (Buffer.isBuffer(data)) {
            return data;
          } else if (typeof data === "string") {
            return Buffer.from(data, "base64");
          }
          return Buffer.from(JSON.stringify(data));
        };

        // Detect data type - temperature or noise data
        const isNoiseData = (data: any) => {
          // Check for proper noise data structure
          return (
            data &&
            data.data &&
            data.metadata &&
            typeof data.data === "object" &&
            Object.values(data.data).some(
              (point) => point && typeof point === "object" && "noise" in point
            )
          );
        };

        console.log("actual data?", params.data);
        console.log("is noise data?", isNoiseData(params.data));

        switch (params.operation) {
          case "createBucket": {
            // No changes needed here
            if (!params.spAddress) {
              throw new Error("SP address required for bucket creation");
            }

            try {
              await storage.getBucketMetadata(bucketName);
              throw new Error(`Bucket ${bucketName} already exists`);
            } catch (error: any) {
              // Rest of bucket creation logic remains the same
              if (error.message.includes("already exists")) {
                throw error;
              }

              const result = await storage.createWorkflowBucket(
                params.workflowId,
                params.spAddress,
                broadcastOptions
              );

              // Wait for bucket to be fully created (max 4 seconds)
              let retries = 2;
              while (retries > 0) {
                try {
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                  await storage.getBucketMetadata(bucketName);
                  break;
                } catch (error) {
                  retries--;
                  if (retries === 0) {
                    console.log(
                      "Bucket created but metadata not yet available, txHash:",
                      result.txHash
                    );
                    // Instead of throwing error, return success with warning
                    return JSON.stringify({
                      success: true,
                      operation: "createBucket",
                      bucketName: result.bucketName,
                      txHash: result.txHash,
                      warning: "Bucket created but metadata not yet available",
                    });
                  }
                }
              }

              return JSON.stringify({
                success: true,
                operation: "createBucket",
                bucketName: result.bucketName,
                txHash: result.txHash,
              });
            }
          }

          case "storeData": {
            if (!params.data) {
              throw new Error("data to store not found");
            }

            const dataToStore = params.data;

            dataToStore.timestamp = Date.now();

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
            });
          }

          // Other operations remain unchanged
          case "getBucketMetadata": {
            try {
              const metadata = await storage.getBucketMetadata(bucketName);
              return JSON.stringify({
                success: true,
                operation: "getBucketMetadata",
                metadata,
              });
            } catch (error) {
              throw new Error(`Bucket ${bucketName} does not exist`);
            }
          }

          case "listObjects": {
            try {
              const objects = await storage.listObjects(bucketName);
              return JSON.stringify({
                success: true,
                operation: "listObjects",
                objects,
              });
            } catch (error) {
              throw new Error(`Failed to list objects: ${error}`);
            }
          }

          case "getObject": {
            if (!params.objectName) {
              throw new Error("Object name required for getObject operation");
            }

            try {
              const data = await storage.getObject(
                bucketName,
                params.objectName
              );
              return JSON.stringify({
                success: true,
                operation: "getObject",
                data,
              });
            } catch (error) {
              throw new Error(`Failed to get object: ${error}`);
            }
          }

          case "uploadObject": {
            if (!params.data || !params.objectName || !params.txnHash) {
              throw new Error(
                "Data, objectName, and txnHash required for upload operation"
              );
            }
            // Convert data to buffer if it's not already
            const content = prepareContent(params.data);

            const uploadRes = await storage.uploadObject(
              bucketName,
              params.objectName,
              content,
              params.txnHash
            );

            return JSON.stringify({
              success: true,
              operation: "uploadObject",
              result: uploadRes,
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
