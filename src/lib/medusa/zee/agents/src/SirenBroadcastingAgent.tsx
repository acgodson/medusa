import { ZeeBaseAgent } from "../base";
import { ModelConfig } from "@covalenthq/ai-agent-sdk";
import { ServerWallet } from "@/lib/medusa/wallets/server-smart-wallet";
import RegistryArtifacts from "../../../../../../contracts/artifacts/MedusaRegistry.json";
import { createPrivyWalletTool } from "../../tools";
import { encodeFunctionData } from "viem";

type BroadcastingConfig = {
  model: ModelConfig;
  rpcUrl: string;
  chainId: string;
  contractAddress: `0x${string}`;
  walletId: string;
  adminAddress: string;
  adminPrivateKey: string;
  serverWallet: ServerWallet;
};

type ContractFunction = {
  functionName: string;
  args: any[];
};

export class SirenBroadcastingAgent extends ZeeBaseAgent {
  public contractAddress: `0x${string}`;

  constructor(config: BroadcastingConfig) {
    const serverWalletTool = createPrivyWalletTool(
      config.serverWallet,
      config.walletId
    );

    super({
      name: "BSC Connector",
      model: config.model,
      description:
        "Agent responsible for broadcasting Greenfield device execution to BSC registry contract",
      instructions: [
        "When you receive Greenfield storage references:",
        "1. Retrieve the device contributor information",
        "2. Use the server-wallet tool to submit execution transaction to BSC",
        "3. Return the transaction hash and confirmation status",
        "4. Process must complete within 15 seconds maximum",
      ],
      tools: {
        "server-wallet": serverWalletTool,
      },
      defaultTask: "Broadcast Greenfield execution to BSC blockchain",
    });
    this.contractAddress = config.contractAddress;
  }

  private async transactionBuilder(
    walletId: string,
    contractFunction: ContractFunction,
    operationName: string
  ) {
    try {
      console.log(`Executing ${operationName}...`);
      const data = encodeFunctionData({
        abi: RegistryArtifacts.abi,
        functionName: contractFunction.functionName,
        args: contractFunction.args,
      });

      const result = await this.zeeAgent.tools?.["server-wallet"].execute({
        operation: "signTxn",
        walletId,
        txData: {
          contractAddress: this.contractAddress,
          data,
        },
      });

      const parsedResult = JSON.parse(result);
      if (!parsedResult.success) {
        throw new Error(`${operationName} failed`);
      }

      return parsedResult.transactionHash;
    } catch (error) {
      console.error(`${operationName} error:`, error);
      throw error;
    }
  }

  private async submitRecord(walletId: string, workflowId: string) {
    return this.transactionBuilder(
      walletId,
      {
        functionName: "submitRecord",
        args: [walletId, BigInt(workflowId)],
      },
      "Record submission"
    );
  }

  async execute(params: {
    bucketName: string;
    objectName: string;
    walletId: string;
    workflowId: string;
    contractAddress: string;
  }): Promise<{
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    error?: string;
  }> {
    try {
      const data = encodeFunctionData({
        abi: RegistryArtifacts.abi,
        functionName: "submitRecord",
        args: [params.walletId, BigInt(params.workflowId)],
      });

      // Create broadcast state
      const broadcastState = this.createAgentState(
        { 
          walletId: params.walletId,
          contractAddress: this.contractAddress,
          txData: {
            contractAddress: this.contractAddress,
            data,
          },
          operation: "signTxn" as const,
        },
        {
          task: "Record Submission",
        }
      );

      // Execute broadcast request
      const broadcastResult = await this.zeeAgent.run(broadcastState);

      // Find broadcast tool call
      const broadcastToolCall: any = broadcastResult.messages.find(
        (msg: any) => msg.role === "assistant" && msg.tool_calls
      );

      if (!broadcastToolCall?.tool_calls) {
        throw new Error("No broadcast tool calls found");
      }

      const broadcastCall = broadcastToolCall.tool_calls.find(
        (call: any) => call.function.name === "server-wallet"
      );
      if (!broadcastCall) {
        throw new Error("Broadcast tool call not found");
      }

      // Execute broadcast tool
      const bscTool = this.zeeAgent.tools?.["server-wallet"];
      if (!bscTool) {
        throw new Error("Server wallet broadcast tool not available");
      }

      const broadcastArgs = JSON.parse(broadcastCall.function.arguments);

      // Ensure proper parameters
      if (!broadcastArgs.contractAddress) {
        broadcastArgs.contractAddress = params.contractAddress;
      }
      if (!broadcastArgs.workflowId) {
        broadcastArgs.workflowId = params.workflowId;
      }

      const result = await bscTool.execute(broadcastArgs);
      const parsedResult = JSON.parse(result);

      return {
        success: true,
        transactionHash: parsedResult.transactionHash,
        blockNumber: parsedResult.blockNumber,
      };
    } catch (error) {
      console.error("Broadcasting failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
