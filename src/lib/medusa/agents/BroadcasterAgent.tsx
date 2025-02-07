import { ZeeBaseAgent } from "./zee/base";
import {
  createSmartWalletTool,
  createStorageTool,
  PrivyWalletConfig,
} from "./zee/tools";
import { WalletBridge } from "../wallets/server";

export class StorageBroadcasterAgent extends ZeeBaseAgent {
  constructor(config: {
    openAiKey: string;
    privyConfig: PrivyWalletConfig;
    lighthouseApiKey: string;
    rpcUrl: string;
  }) {
    const walletBridge = new WalletBridge(
      config.privyConfig.appId,
      config.privyConfig.appSecret,
      config.rpcUrl
    );

    const CreateSmartWalletTool = createSmartWalletTool(walletBridge);
    const CreateStorageTool = createStorageTool(config.lighthouseApiKey);

    super({
      name: "Storage Broadcaster Agent",
      description: "Agent for IPFS storage and IPNS management",
      instructions: [
        "1. Upload data to IPFS via Lighthouse",
        "2. Manage IPNS records for mutable data",
        "3. Broadcast state updates using smart wallet",
      ],
      tools: {
        "lighthouse-storage": CreateStorageTool,
        "smart-wallet": CreateSmartWalletTool,
      },
      openAiKey: config.openAiKey,
    });
  }

  async execute(params: {
    signedData: string;
    signature: string;
    walletId: string;
    ipnsName?: string;
  }) {
    try {
      // Upload to IPFS
      const uploadResult = await this.zeeAgent.tools?.[
        "lighthouse-storage"
      ].execute({
        operation: "upload",
        data: params.signedData.toString(),
      });
      const x = JSON.parse(uploadResult).data;
      console.log(uploadResult);

      // Handle IPNS
      //   let ipnsName = params.ipnsName;
      //   if (!ipnsName) {
      //     const keyResult = await this.zeeAgent.tools?.[
      //       "lighthouse-storage"
      //     ].execute({
      //       operation: "generateKey",
      //     });
      //     ipnsName = JSON.parse(keyResult).data.ipnsName;
      //   }

      //   // Publish to IPNS
      //   await this.zeeAgent.tools?.["lighthouse-storage"].execute({
      //     operation: "publishRecord",
      //     cid,
      //     ipnsName,
      //   });

      return {
        success: true,
        // cid,
        // ipnsName,
        // ipnsGatewayUrl: `https://gateway.lighthouse.storage/ipns/${ipnsName}`,
      };
    } catch (error: any) {
      console.error("Storage operation failed:", error);
      return { success: false, error: error.message };
    }
  }
}
