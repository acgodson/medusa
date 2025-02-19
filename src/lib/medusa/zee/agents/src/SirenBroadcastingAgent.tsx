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
        "When you receive Greenfield storage references for a device:",
        "1. IMPORTANT: You MUST use the server-wallet tool to sign and send the transaction",
        "2. Use the server-wallet tool to submit execution transaction to BSC",
        "3. DO NOT skip the tool call or suggest alternatives",
        "4. Return the transaction hash and confirmation status",
        "4. Process must complete within 20 seconds maximum",
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
    // Set max retries and initialize counter
    const MAX_RETRIES = 3;
    let retries = 0;
    let lastError: Error | null = null;

    while (retries < MAX_RETRIES) {
      try {
        const data = encodeFunctionData({
          abi: RegistryArtifacts.abi,
          functionName: "submitRecord",
          args: [params.walletId, BigInt(params.workflowId)],
        });

        // Create broadcast state with explicit instructions
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

        // If no tool calls found, try fallback direct execution
        if (!broadcastToolCall?.tool_calls) {
          console.warn(
            `[Retry ${
              retries + 1
            }] No broadcast tool calls found, trying fallback execution`
          );

          // Direct tool execution as fallback
          const bscTool = this.zeeAgent.tools?.["server-wallet"];
          if (!bscTool) {
            throw new Error("Server wallet broadcast tool not available");
          }

          const fallbackResult = await bscTool.execute({
            operation: "signTxn",
            walletId: params.walletId,
            txData: {
              contractAddress: this.contractAddress || params.contractAddress,
              data,
            },
          });

          const parsedFallbackResult = JSON.parse(fallbackResult);
          return {
            success: true,
            transactionHash:
              parsedFallbackResult.transactionHash ||
              parsedFallbackResult.tansaction,
            blockNumber: parsedFallbackResult.blockNumber,
          };
        }

        const broadcastCall = broadcastToolCall.tool_calls.find(
          (call: any) => call.function.name === "server-wallet"
        );

        if (!broadcastCall) {
          // Increment retry counter and try again
          retries++;
          lastError = new Error("Broadcast tool call not found");
          console.warn(
            `[Retry ${retries}/${MAX_RETRIES}] Broadcast tool call not found`
          );
          continue;
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
          transactionHash:
            parsedResult.transactionHash || parsedResult.tansaction, // Handle typo in your code
          blockNumber: parsedResult.blockNumber,
        };
      } catch (error) {
        retries++;
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(
          `Broadcasting attempt ${retries}/${MAX_RETRIES} failed:`,
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
      error: lastError?.message || "Broadcasting failed after multiple retries",
    };
  }
}
