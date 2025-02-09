import { PrivyClient } from "@privy-io/server-auth";
import { createPublicClient, encodeFunctionData, http } from "viem";
import { createIPNSTool, createServerWalletTool } from "../../tools/";
import { ZeeBaseAgent } from "../base";
import RegistryArtifacts from "../../../../../../contracts/artifacts/MedusaRegistry.json";
import { PrivyWalletConfig } from "../../tools/src/privyWalletTool";
import { ServerWallet } from "../../../wallets/server-wallet";
import { baseSepolia } from "viem/chains";

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

  // private async registerOnChain(walletId: string, workflowId: string) {
  //   try {

  //     console.log("Registering metadata on-chain...");

  //     const data = encodeFunctionData({
  //       abi: RegistryArtifacts.abi,
  //       functionName: "submitRecord",
  //       args: [walletId, workflowId],
  //     });

  //     // Execute contract call via smart wallet
  //     const result = await this.zeeAgent.tools?.["smart-wallet"].execute({
  //       operation: "broadcast",
  //       walletId,
  //       txData: {
  //         contractAddress: this.contractAddress,
  //         data,
  //       },
  //     });

  //     const parsedResult = JSON.parse(result);
  //     if (!parsedResult.success) {
  //       throw new Error("Contract interaction failed");
  //     }

  //     return parsedResult.transactionHash;
  //   } catch (error) {
  //     console.error("Contract registration error:", error);
  //     throw error;
  //   }
  // }

  private async registerDevice(walletId: string, workflowId: string) {
    try {
      console.log("Registering device...");
      const data = encodeFunctionData({
        abi: RegistryArtifacts.abi,
        functionName: "registerDevice",
        args: [BigInt(workflowId), walletId],
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
        throw new Error("Device registration failed");
      }

      return parsedResult.transactionHash;
    } catch (error) {
      console.error("Device registration error:", error);
      throw error;
    }
  }

  private async submitRecord(walletId: string, workflowId: string) {
    try {
      console.log("Submitting record...");
      const data = encodeFunctionData({
        abi: RegistryArtifacts.abi,
        functionName: "submitRecord",
        args: [walletId, BigInt(workflowId)],
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
        throw new Error("Record submission failed");
      }

      return parsedResult.transactionHash;
    } catch (error) {
      console.error("Record submission error:", error);
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
    registrationTxHash?: string;
    error?: string;
  }> {
    try {
      // First, validate input parameters
      if (
        !params.walletId ||
        !params.workflowId ||
        !this.contractAddress ||
        !params.cid ||
        !params.ipnsName
      ) {
        throw new Error("Missing required parameters");
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

      // Create a public client to read contract state
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
      });

      const workflow: any = await publicClient.readContract({
        address: this.contractAddress as `0x${string}`,
        abi: RegistryArtifacts.abi,
        functionName: "workflows",
        args: [BigInt(params.workflowId)],
      });

      console.log("Workflow status:", workflow);

      if (!workflow || !workflow[3]) {
        // check active status
        throw new Error("Workflow is not active");
      }

      // Check registration status
      const isRegistered = await publicClient.readContract({
        address: this.contractAddress as `0x${string}`,
        abi: RegistryArtifacts.abi,
        functionName: "isDeviceRegistered",
        args: [params.walletId],
      });

      console.log("Device registration status:", isRegistered);

      let registrationTxHash;
      let submissionTxHash;

      // If not registered, register first
      if (!isRegistered) {
        console.log("Device not registered, registering now...");
        registrationTxHash = await this.registerDevice(
          activeWallet.id,
          params.workflowId
        );
        // Wait a bit for the registration to be processed
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      // Now submit the record
      submissionTxHash = await this.submitRecord(
        activeWallet.id,
        params.workflowId
      );

      return {
        success: true,
        ipnsGatewayUrl: `https://gateway.lighthouse.storage/ipns/${ipnsId}`,
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
