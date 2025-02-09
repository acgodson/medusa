import { PrivyClient } from "@privy-io/server-auth";
import { encodeFunctionData } from "viem";
import { createIPNSTool, createServerWalletTool } from "../../tools/";
import { ZeeBaseAgent } from "../base";
import RegistryArtifacts from "../../../../../../contracts/artifacts/MedusaRegistry.json";
import { PrivyWalletConfig } from "../../tools/src/privyWalletTool";
import { ServerWallet } from "../../../wallets/server-wallet";

export class BroadcastingAgent extends ZeeBaseAgent {
  private privyServerWallet: ServerWallet;
  public contractAddress: `0x${string}`;
  constructor(config: {
    openAiKey: string;
    privyConfig: PrivyWalletConfig;
    lighthouseApiKey: string;
    rpcUrl: string;
    contractAddress: `0x${string}`;
  }) {
    const serverWallet = new ServerWallet(
      config.privyConfig.appId,
      config.privyConfig.appSecret,
      config.rpcUrl
    );

    const CreateIPNSTool = createIPNSTool(config.lighthouseApiKey);
    const CreateSmartWalletTool = createServerWalletTool(serverWallet);

    super({
      name: "Storage Broadcaster Agent",
      description: "Agent for IPNS management and state broadcasting",
      instructions: [
        "1. Manage IPNS records via Lighthouse",
        "2. Broadcast state updates using smart wallet",
      ],
      tools: {
        "smart-wallet": CreateSmartWalletTool,
        storage: CreateIPNSTool,
      },
      openAiKey: config.openAiKey,
    });

    this.privyServerWallet = serverWallet;
    this.contractAddress = config.contractAddress;
  }

  private async handleIpnsOperations(cid: string, ipnsName: string) {
    try {
      console.log("updating IPNS data:", { cid, ipnsName });

      // Publish to IPNS
      const publishResult = await this.zeeAgent.tools?.["storage"].execute({
        operation: "publishRecord",
        cid,
        ipnsName,
      });

      console.log("Publish result:", publishResult);

      //  Verify publish response
      const publishResponse = JSON.parse(publishResult);
      if (publishResponse.error) {
        throw new Error(`Publish failed: ${publishResponse.error}`);
      }

      if (!publishResponse?.success && !publishResponse?.data) {
        console.error("Invalid publish response:", publishResponse);
        throw new Error("Failed to publish to IPNS: Invalid response");
      }

      return { ipnsName, ipnsId: publishResponse.data.Name };
    } catch (error) {
      console.error("IPNS operation error:", error);
      throw new Error(
        `IPNS operations failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async getWallet(privy: PrivyClient, id: string) {
    const wallets = await privy.walletApi.getWallets({
      chainType: "ethereum",
    });
    return wallets.data.find((wallet) => wallet.id === id);
  }

  private async registerOnChain(walletId: string, workflowId: string) {
    try {
      console.log("Registering metadata on-chain...");

      const data = encodeFunctionData({
        abi: RegistryArtifacts.abi,
        functionName: "submitRecord",
        args: [walletId, workflowId],
      });

      // Execute contract call via smart wallet
      const result = await this.zeeAgent.tools?.["smart-wallet"].execute({
        operation: "broadcast",
        walletId,
        txData: {
          contractAddress: this.contractAddress,
          data,
        },
      });

      const parsedResult = JSON.parse(result);
      if (!parsedResult.success) {
        throw new Error("Contract interaction failed");
      }

      return parsedResult.transactionHash;
    } catch (error) {
      console.error("Contract registration error:", error);
      throw error;
    }
  }

  async execute(params: {
    cid: string;
    walletId: string;
    ipnsName: string;
    workflowId: string;
  }): Promise<{
    success: boolean;
    ipnsGatewayUrl?: string;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      // Validate input
      if (!params.cid || !params.ipnsName) {
        throw new Error("No CID or IPNS provided for operation");
      }

      console.log("Workflow IPNS operations for CID:", params.cid);

      // Handle IPNS operations
      const { ipnsName, ipnsId } = await this.handleIpnsOperations(
        params.cid,
        params.ipnsName
      );

      const activeWallet = await this.getWallet(
        this.privyServerWallet.privy,
        params.walletId
      );
      console.log("Active wallet:", activeWallet);

      if (!activeWallet) {
        throw new Error("Unable to fetch server wallet");
      }

      // Register metadata on-chain
      const txHash = await this.registerOnChain(
        activeWallet.id,
        params.workflowId
      );
      return {
        success: true,
        ipnsGatewayUrl: `https://gateway.lighthouse.storage/ipns/${ipnsId}`,
        transactionHash: txHash,
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
