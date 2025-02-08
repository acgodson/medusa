import { ZeeBaseAgent } from "./zee/base";
import { createIPNSTool, createSmartWalletTool } from "./zee";
import { WalletBridge } from "../wallets/broadcast-server";
import { PrivyWalletConfig } from "./zee/tools/privyWalletTool";
import { encodeAbiParameters, encodeFunctionData } from "viem";
import { PrivyClient } from "@privy-io/server-auth";
import RegistryArtifacts from "../../../../contracts/artifacts/MedusaRegistry.json";

export class BroadcastingAgent extends ZeeBaseAgent {
  private privyWalletBridge: WalletBridge;
  public contractAddress: `0x${string}`;
  constructor(config: {
    openAiKey: string;
    privyConfig: PrivyWalletConfig;
    lighthouseApiKey: string;
    rpcUrl: string;
    contractAddress: `0x${string}`;
    adminPrivateKey: string;
  }) {
    const walletBridge = new WalletBridge(
      config.privyConfig.appId,
      config.privyConfig.appSecret,
      config.rpcUrl,
      config.adminPrivateKey
    );

    const CreateIPNSTool = createIPNSTool(config.lighthouseApiKey);
    const CreateSmartWalletTool = createSmartWalletTool(walletBridge);

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

    this.privyWalletBridge = walletBridge;
    this.contractAddress = config.contractAddress;
  }

  private async handleIpnsOperations(cid: string, ipnsName?: string) {
    try {
      // Generate IPNS key if not provided
      if (!ipnsName) {
        console.log("No IPNS name provided, generating new key...");
        const keyResult = await this.zeeAgent.tools?.["storage"].execute({
          operation: "generateKey",
        });

        console.log("Key generation result:", keyResult);

        // Parse and verify the key response
        const parsed = JSON.parse(keyResult);
        if (!parsed?.data?.ipnsName) {
          console.error("Invalid key generation response:", parsed);
          throw new Error("Failed to generate IPNS key: Invalid response");
        }
        ipnsName = parsed.data.ipnsName;
      }

      console.log("Publishing to IPNS with:", { cid, ipnsName });

      // Publish to IPNS
      const publishResult = await this.zeeAgent.tools?.["storage"].execute({
        operation: "publishRecord",
        cid,
        ipnsName,
      });

      console.log("Publish result:", publishResult);

      // Verify publish response
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

  private async getOrCreateWallet(privy: PrivyClient) {
    const wallets = await privy.walletApi.getWallets({
      chainType: "ethereum",
    });
    return (
      wallets.data[0] ||
      (await privy.walletApi.create({ chainType: "ethereum" }))
    );
  }

  private async registerOnChain(
    walletId: string,
    ipnsName: string,
    ipnsId: string
  ) {
    try {
      console.log("Registering metadata on-chain...");

      const data = encodeFunctionData({
        abi: RegistryArtifacts.abi,
        functionName: "createRecord",
        args: [ipnsName, ipnsId],
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

  async execute(params: { cid: string; ipnsName?: string }): Promise<{
    success: boolean;
    cid?: string;
    ipnsName?: string;
    ipnsGatewayUrl?: string;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      // Validate input
      if (!params.cid) {
        throw new Error("No CID provided for IPNS operation");
      }

      console.log("Starting IPNS operations for CID:", params.cid);

      // Handle IPNS operations
      const { ipnsName, ipnsId } = await this.handleIpnsOperations(
        params.cid,
        params.ipnsName
      );

      const activeWallet = await this.getOrCreateWallet(
        this.privyWalletBridge.privy
      );
      console.log("Active wallet:", activeWallet);

      // Register metadata on-chain
      const txHash = await this.registerOnChain(
        activeWallet.id,
        ipnsName as string,
        ipnsId
      );

      return {
        success: true,
        cid: params.cid,
        ipnsName,
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
