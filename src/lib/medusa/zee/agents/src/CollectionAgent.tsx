import { PrivyClient } from "@privy-io/server-auth";
import { ZeeBaseAgent } from "../base";
import { createDataStorageTool, createPrivyWalletTool } from "../../tools";
import { PrivyWalletConfig } from "../../tools/src/privyWalletTool";

// interface ToolCall {
//   id: string;
//   type: "function";
//   function: {
//     name: string;
//     arguments: string;
//     parsed_arguments: Record<string, any>;
//   };
// }

interface SignatureResponse {
  signature: string;
  walletId: string;
}

export class CollectionAgent extends ZeeBaseAgent {
  constructor(config: {
    openAiKey: string;
    lighthouseApiKey: string;
    walletId: string;
    privyConfig: PrivyWalletConfig;
  }) {
    // since already have a wallet id, our work here would first be to pass the  updated id

    const storageTool = createDataStorageTool(config.lighthouseApiKey);

    const privy = new PrivyClient(
      config.privyConfig.appId,
      config.privyConfig.appSecret
    );
    const privyWalletTool = createPrivyWalletTool(privy, config.walletId);

    super({
      name: "Data Collection Agent",
      description: "Agent responsible for collecting and storing sensor data",
      instructions: [
        "When you receive sensor data:",
        "1. ALWAYS use the privy-wallet tool first to sign the data",
        "2. After getting the signature, ALWAYS use the store-sensor-data tool to store and upload the signed data",
        "3. Return the complete operation results including the IPFS CID",
      ],
      openAiKey: config.openAiKey,
      tools: {
        "store-sensor-data": storageTool,
        "privy-wallet": privyWalletTool,
      },
      defaultTask: "Process and store sensor data",
    });
  }

  async execute(params: {
    deviceId: string;
    data: {
      message: string;
      temperature: number;
      humidity: number;
      timestamp: number;
    };
    contractAddress: string;
    workflowId: number; //workflow
  }): Promise<{
    success: boolean;
    signature?: string;
    storageResult?: any;
    error?: string;
    method?: string;
  }> {
    try {
      // Format data for signing
      const dataToSign = JSON.stringify({
        deviceId: params.deviceId,
        data: params.data,
        timestamp: Date.now(),
      });

      // Create signing state
      const signingState = this.createAgentState(
        {
          message: dataToSign,
          operation: "sign" as const,
        },
        {
          task: "Use privy-wallet tool to sign this sensor data",
        }
      );

      // Execute signing request
      const signResult = await this.zeeAgent.run(signingState);

      // Find signing tool call
      const toolCall: any = signResult.messages.find(
        (msg: any) => msg.role === "assistant" && msg.tool_calls
      );

      if (!toolCall?.tool_calls) {
        throw new Error("No tool calls found in agent response");
      }

      const signCall = toolCall.tool_calls.find(
        (call: any) => call.function.name === "privy-wallet"
      );
      if (!signCall) {
        throw new Error("Privy wallet tool call not found");
      }

      // Execute privy wallet tool
      const privyTool = this.zeeAgent.tools?.["privy-wallet"];
      if (!privyTool) {
        throw new Error("Privy wallet tool not available");
      }

      const args = JSON.parse(signCall.function.arguments);
      const result = await privyTool.execute(args);
      const parsedResult = JSON.parse(result) as SignatureResponse;

      if (typeof params.workflowId !== "number" || isNaN(params.workflowId)) {
        throw new Error(`Invalid workflowId: ${params.workflowId}`);
      }

      // Create storage state with signed data
      const storageState = this.createAgentState(
        {
          data: {
            deviceId: params.deviceId,
            ...params.data,
          },
          signature: parsedResult.signature,
          contractAddress: params.contractAddress,
          workflowId: params.workflowId,
        },
        {
          task: "Store and upload signed data",
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
        (call: any) => call.function.name === "store-sensor-data"
      );
      if (!storeCall) {
        throw new Error("Storage tool call not found");
      }

      // Execute storage tool
      const storageTool = this.zeeAgent.tools?.["store-sensor-data"];
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

      return {
        success: true,
        signature: parsedResult.signature,
        storageResult: JSON.parse(storageResult),
      };
    } catch (error) {
      console.error("Data collection failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
