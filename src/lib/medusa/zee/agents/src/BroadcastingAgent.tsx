import { createPublicClient, encodeFunctionData, http } from "viem";
import { ZeeBaseAgent } from "../base";
import RegistryArtifacts from "../../../../../../contracts/artifacts/MedusaRegistry.json";
import { createPrivyWalletTool } from "../../tools/src/privyWalletTool";
import { ServerWallet } from "../../../wallets/server-wallet";
import { bscTestnet } from "viem/chains";
import { ModelConfig } from "@covalenthq/ai-agent-sdk";

type BroadcastingConfig = {
  model: ModelConfig;
  rpcUrl: string;
  chainId: string;
  walletId: string;
  adminAddress: string;
  adminPrivateKey: string;
  serverWallet: ServerWallet;
  contractAddress: `0x${string}`;
};

type BroadCastingAgentResponse = {
  success: boolean;
  transactionHash?: string;
  registrationTxHash?: string;
  error?: string;
};

type ContractFunction = {
  functionName: string;
  args: any[];
};

export class BroadcastingAgent extends ZeeBaseAgent {
  public contractAddress: `0x${string}`;

  constructor(config: BroadcastingConfig) {
    const serverWalletTool = createPrivyWalletTool(
      config.serverWallet,
      config.walletId
    );

    super({
      name: "Storage Broadcaster Agent",
      model: config.model,
      description: "Agent for state broadcasting",
      instructions: ["1. Broadcast state updates using server wallet"],
      tools: {
        "server-wallet": serverWalletTool,
      },
    });

    this.contractAddress = config.contractAddress;
  }

  private async getWallet() {
    const address = await this.zeeAgent.tools?.["server-wallet"].execute(
      "getAddress"
    );
    const id = await this.zeeAgent.tools?.["server-wallet"].execute(
      "getWalletId"
    );
    return { address, id };
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

  private async readContract(contractFunction: ContractFunction) {
    const publicClient = createPublicClient({
      chain: bscTestnet,
      transport: http(),
    });

    const workflow: any = await publicClient.readContract({
      address: this.contractAddress as `0x${string}`,
      abi: RegistryArtifacts.abi,
      functionName: contractFunction.functionName,
      args: contractFunction.args,
    });
    return workflow;
  }

  private async registerDevice(walletId: string, workflowId: string) {
    return this.transactionBuilder(
      walletId,
      {
        functionName: "registerDevice",
        args: [BigInt(workflowId), walletId],
      },
      "Device registration"
    );
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
    workflowId: string;
    objectName: string;
  }): Promise<BroadCastingAgentResponse> {
    try {
      if (!params.workflowId || !params.objectName || !this.contractAddress) {
        throw new Error("Missing required parameters");
      }

      console.log("Workflow operations for object:", params.objectName);

      const activeWallet = await this.getWallet();
      console.log("Active wallet:", activeWallet);

      if (!activeWallet) {
        throw new Error("Unable to fetch server wallet");
      }

      const workflow: any = await this.readContract({
        functionName: "workflows",
        args: [BigInt(params.workflowId)],
      });

      console.log("Workflow status:", workflow);

      if (!workflow || !workflow[3]) {
        throw new Error("Workflow is not active");
      }

      const isRegistered = await this.readContract({
        functionName: "isDeviceRegistered",
        args: [activeWallet.id],
      });

      console.log("Device registration status:", isRegistered);

      let registrationTxHash;
      let submissionTxHash;

      if (!isRegistered) {
        console.log("Device not registered, registering now...");
        registrationTxHash = await this.registerDevice(
          activeWallet.id,
          params.workflowId
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      submissionTxHash = await this.submitRecord(
        activeWallet.id,
        params.workflowId
      );

      return {
        success: true,
        transactionHash: submissionTxHash,
        registrationTxHash,
      };
    } catch (error) {
      console.error("Broadcasting operation failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
