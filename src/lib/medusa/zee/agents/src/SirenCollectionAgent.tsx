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
        "1. Validate the data structure (ensure deviceId, data map, and metadata are present)",
        "2. IMPORTANT: When using the store-noise-data tool, preserve the EXACT structure of the input data",
        "3. Always include both 'data' and 'metadata' properties in their original structure",
        "4. Never transform noise data to any other format",
        "5. Use the store-noise-data tool with operation='storeData' and pass the complete noise data object",
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
    try {
      if (typeof params.workflowId !== "string" || !params.workflowId) {
        throw new Error(`Invalid workflowId: ${params.workflowId}`);
      }

      // Calculate the number of data points in the map
      const dataPointsCount = Object.keys(params.data || {}).length;

      if (!params.data || !params.data) {
        throw new Error(
          "Invalid noise data structure: missing required fields"
        );
      }

      if (dataPointsCount === 0) {
        throw new Error("No noise data points found in the data map");
      }

      console.log(params.data);

      const dataArray = recordToArray(params.data);

      // Create storage state with data
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

      if (!storageToolCall?.tool_calls) {
        throw new Error("No storage tool calls found");
      }

      const storeCall = storageToolCall.tool_calls.find(
        (call: any) => call.function.name === "store-noise-data"
      );
      if (!storeCall) {
        throw new Error("Storage tool call not found");
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
      console.error("Noise data collection failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
