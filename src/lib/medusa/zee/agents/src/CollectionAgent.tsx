import { ZeeBaseAgent } from "../base";
import { createStorageTool, createPrivyWalletTool } from "../../tools";
import { ServerWallet } from "@/lib/medusa/wallets/server-wallet";
import { ModelConfig } from "@covalenthq/ai-agent-sdk";

type CollectionConfig = {
  model: ModelConfig;
  rpcUrl: string;
  chainId: string;
  greenfieldRpcUrl: string;
  greenfieldChainId: string;
  walletId: string;
  adminAddress: string;
  adminPrivateKey: string;
  serverWallet: ServerWallet;
};

interface SignatureResponse {
  signature: string;
  walletId: string;
}

export class CollectionAgent extends ZeeBaseAgent {
  constructor(config: CollectionConfig) {
    const serverWalletTool = createPrivyWalletTool(
      config.serverWallet,
      config.walletId
    );

    const storageTool = createStorageTool(config);

    super({
      name: "Data Collection Agent",
      model: config.model,
      description: "Agent responsible for collecting and storing sensor data",
      instructions: [
        "When you receive sensor data:",
        "1. ALWAYS use the server-wallet tool first to sign the data",
        "2. After getting the signature, ALWAYS use the store-sensor-data tool to store and upload the signed data",
        "3. Return the complete operation results including the object name/id",
      ],
      tools: {
        "store-sensor-data": storageTool,
        "server-wallet": serverWalletTool,
      },
      defaultTask: "Process and store sensor data",
    });
  }

  async execute(params: {
    walletId: string;
    workflowId: string;
    contractAddress: string;
    data: {
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
      //  data for signing
      const dataToSign = JSON.stringify({
        ...params.data,
      });

      // Create signing state
      const signingState = this.createAgentState(
        {
          message: dataToSign,
          operation: "sign" as const,
          data: params.data,
        },
        {
          task: "Use server-wallet tool to sign this sensor data",
        }
      );

      // Execute signing request
      const signResult = await this.zeeAgent.run(signingState);

      // Find signing tool call
      const toolCall: any = signResult.messages.find(
        (msg: any) => msg.role === "assistant" && msg.tool_calls
      );

      if (!toolCall?.tool_calls) {
        //TODO: Have a fallback that retries  until a tool call is found at this point
        throw new Error("No tool calls found in agent response");
      }

      const signCall = toolCall.tool_calls.find(
        (call: any) => call.function.name === "server-wallet"
      );
      if (!signCall) {
        throw new Error("server wallet tool call not found");
      }

      // Execute privy wallet tool
      const walletTool = this.zeeAgent.tools?.["server-wallet"];
      if (!walletTool) {
        throw new Error("Privy wallet tool not available");
      }

      const args = JSON.parse(signCall.function.arguments);
      const result = await walletTool.execute(args);
      const parsedResult = JSON.parse(result) as SignatureResponse;

      if (typeof params.workflowId !== "string" || !params.workflowId) {
        throw new Error(`Invalid workflowId: ${params.workflowId}`);
      }

      // Create storage state with signed data
      const storageState = this.createAgentState(
        {
          data: {
            walletId: params.walletId,
            ...params.data,
          },
          signature: parsedResult.signature,
          contractAddress: params.contractAddress,
          workflowId: params.workflowId,
          operation: "storeData" as const,
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
        // signature: parsedResult.signature,
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
function StorageConfig() {
  throw new Error("Function not implemented.");
}
