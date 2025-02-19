import { createNoiseStorageTool } from "../../tools/src/NoiseStorageTool";
import { ZeeBaseAgent } from "../base";
import { ModelConfig } from "@covalenthq/ai-agent-sdk";

type NoiseCollectionConfig = {
  model: ModelConfig;
  rpcUrl: string;
  chainId: string;
  greenfieldRpcUrl: string;
  greenfieldChainId: string;
  walletId: string;
  adminAddress: string;
  adminPrivateKey: string;
};

type NoiseDataRecord = Record<
  string,
  {
    noise: number;
    minNoise: number;
    maxNoise: number;
    samples: number;
    accuracy: number;
    timestamp: number;
    spikes: number;
  }
>;

type NoiseDataPoint = {
  locationKey: string;
  noise: number;
  minNoise: number;
  maxNoise: number;
  samples: number;
  accuracy: number;
  timestamp: number;
  spikes: number;
};

type NoiseDataArray = NoiseDataPoint[];

export function recordToArray(record: NoiseDataRecord): NoiseDataArray {
  return Object.entries(record).map(([locationKey, data]) => ({
    locationKey,
    ...data,
  }));
}

export function arrayToRecord(array: NoiseDataArray): NoiseDataRecord {
  return array.reduce((acc, item) => {
    const { locationKey, ...data } = item;
    acc[locationKey] = data;
    return acc;
  }, {} as NoiseDataRecord);
}

export class SirenCollectionAgent extends ZeeBaseAgent {
  constructor(config: NoiseCollectionConfig) {
    const storageTool = createNoiseStorageTool(config);

    super({
      name: "Noise Collection Agent",
      model: config.model,
      description:
        "Agent responsible for collecting and storing geotagged noise data",
      instructions: [
        "When you receive noise sensor data:",
        "1. CRITICAL: You MUST use the store-noise-data tool to store this data",
        "3. Use operation='storeData' with the complete data object",
        "4. Do not skip the tool call under any circumstances",
        "6. Return the complete operation results including the object name/id and bucket information",
        "7. Process must complete within 20 seconds maximum",
      ],
      tools: {
        "store-noise-data": storageTool,
      },
      defaultTask: "Process and store geotagged noise data",
    });
  }

  async execute(params: {
    walletId: string;
    workflowId: string;
    contractAddress: string;
    metadata: string;
    data: NoiseDataRecord;
  }): Promise<{
    success: boolean;
    storageResult?: any;
    bucketName?: string;
    objectName?: string;
    error?: string;
    dataPointsCount?: number;
  }> {
    const MAX_RETRIES = 3;
    let retries = 0;
    let lastError: Error | null = null;

    while (retries < MAX_RETRIES) {
      try {
        if (typeof params.workflowId !== "string" || !params.workflowId) {
          throw new Error(`Invalid workflowId: ${params.workflowId}`);
        }

        // Calculate the number of data points in the map
        const dataPointsCount = Object.keys(params.data || {}).length;

        if (!params.data) {
          throw new Error(
            "Invalid noise data structure: missing required fields"
          );
        }

        if (dataPointsCount === 0) {
          throw new Error("No noise data points found in the data map");
        }

        const dataArray = recordToArray(params.data);

        // Create storage state with enhanced instructions
        const storageState = this.createAgentState(
          {
            data: dataArray,
            metadata: params.metadata,
            walletId: params.walletId,
            contractAddress: params.contractAddress,
            workflowId: params.workflowId,
            dataPointsCount: dataPointsCount,
            operation: "storeData" as const,
          },
          {
            task: "Store and upload noise data to Greenfield",
          }
        );

        // Execute storage request
        const storeResult = await this.zeeAgent.run(storageState);

        // Find storage tool call
        const storageToolCall: any = storeResult.messages.find(
          (msg: any) => msg.role === "assistant" && msg.tool_calls
        );

        // If no tool calls found, try fallback direct execution
        if (!storageToolCall?.tool_calls) {
          console.warn(
            `[Retry ${
              retries + 1
            }] No storage tool calls found, trying fallback execution`
          );

          // Attempt direct tool execution as fallback
          const storageTool = this.zeeAgent.tools?.["store-noise-data"];
          if (!storageTool) {
            throw new Error("Storage tool not available");
          }

          const fallbackResult = await storageTool.execute({
            operation: "storeData",
            data: dataArray,
            metadata: params.metadata,
            walletId: params.walletId,
            workflowId: params.workflowId,
            contractAddress: params.contractAddress,
          });

          const parsedFallbackResult = JSON.parse(fallbackResult);
          return {
            success: true,
            storageResult: parsedFallbackResult,
            bucketName: parsedFallbackResult.bucketName,
            objectName: parsedFallbackResult.objectName,
            dataPointsCount: dataPointsCount,
          };
        }

        const storeCall = storageToolCall.tool_calls.find(
          (call: any) => call.function.name === "store-noise-data"
        );

        if (!storeCall) {
          // Increment retry counter and try again
          retries++;
          lastError = new Error("Storage tool call not found");
          console.warn(
            `[Retry ${retries}/${MAX_RETRIES}] Storage tool call not found`
          );
          continue;
        }

        // Execute storage tool
        const storageTool = this.zeeAgent.tools?.["store-noise-data"];
        if (!storageTool) {
          throw new Error("Storage tool not available");
        }

        const storageArgs = JSON.parse(storeCall.function.arguments);

        if (!storageArgs.contractAddress) {
          storageArgs.contractAddress = params.contractAddress;
        }

        // Ensure workflowId is passed through
        if (!storageArgs.workflowId) {
          storageArgs.workflowId = params.workflowId;
        }

        const storageResult = await storageTool.execute(storageArgs);
        const parsedResult = JSON.parse(storageResult);

        return {
          success: true,
          storageResult: parsedResult,
          bucketName: parsedResult.bucketName,
          objectName: parsedResult.objectName,
          dataPointsCount: dataPointsCount,
        };
      } catch (error) {
        retries++;
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(
          `Collection attempt ${retries}/${MAX_RETRIES} failed:`,
          error
        );

        // Wait before retrying (exponential backoff)
        if (retries < MAX_RETRIES) {
          const backoffMs = Math.min(1000 * Math.pow(2, retries), 5000);
          console.log(`Retrying in ${backoffMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    // If we've exhausted retries, return error
    return {
      success: false,
      error: lastError?.message || "Collection failed after multiple retries",
    };
  }
}
