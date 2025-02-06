import { z } from "zod";
import { ZeeBaseAgent } from "./zee/base";
import { DataSchema } from "./zee/types";
import {
  createDataStorageTool,
  createPrivyWalletTool,
  PrivyWalletConfig,
} from "./zee/tools";
import { PrivyClient } from "@privy-io/server-auth";

// Define proper types for our messages and tool responses
interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
    parsed_arguments: Record<string, any>;
  };
}

interface Message {
  role: "user" | "assistant" | "function";
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
}

interface SignatureResponse {
  signature: string;
  walletId: string;
}

interface StorageResponse {
  success: boolean;
  location?: string;
  error?: string;
}

export class DataCollectionAgent extends ZeeBaseAgent {
  constructor(config: { openAiKey: string; privyConfig: PrivyWalletConfig }) {
    const storageTool = createDataStorageTool();
    const privy = new PrivyClient(
      config.privyConfig.appId,
      config.privyConfig.appSecret
    );
    const privyWalletTool = createPrivyWalletTool(privy);

    super({
      name: "Data Collection Agent",
      description: "Agent responsible for collecting and storing sensor data",
      instructions: [
        "When you receive sensor data:",
        "1. ALWAYS use the privy-wallet tool first to sign the data",
        "2. After getting the signature, ALWAYS use the store-sensor-data tool to store the signed data",
        "3. Return the complete operation results",
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

      // Set up explicit tool call request
      signingState.messages = [
        {
          role: "user" as const,
          content: JSON.stringify({
            thought: "Need to sign sensor data using privy-wallet tool",
            action: "privy-wallet",
            action_input: {
              operation: "sign" as const,
              message: dataToSign,
            },
          }),
        },
      ];

      // Execute signing request
      const signResult = await this.zeeAgent.run(signingState);

      // Find tool call in agent response
      const toolCall: any = signResult.messages.find(
        (msg: any) => msg.role === "assistant" && msg.tool_calls
      );

      // Handle signing tool execution
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

      // Add signing result to conversation
      signResult.messages.push({
        role: "function",
        name: "privy-wallet",
        content: result,
      });

      const parsedResult = JSON.parse(result) as SignatureResponse;

      // Create storage state
      const storageState = this.createAgentState(
        {
          data: params.data,
          signature: parsedResult.signature,
        },
        {
          task: "Store signed data",
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
      const storageResult = await storageTool.execute(storageArgs);

      // Add storage result to conversation
      storeResult.messages.push({
        role: "function",
        name: "store-sensor-data",
        content: storageResult,
      });

      return {
        success: true,
        signature: parsedResult.signature,
        storageResult: JSON.parse(storageResult),
        method: "agent_execution",
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
