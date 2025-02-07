import { ZeeBaseAgent } from "./zee/base";
import {
  createSmartWalletTool,
  createStorageTool,
  PrivyWalletConfig,
} from "./zee/tools";
import { WalletBridge } from "../wallets/server";
import { PinataSDK } from "pinata-web3";
import lighthouse from "@lighthouse-web3/sdk";

export class StorageBroadcasterAgent extends ZeeBaseAgent {
  private pinata: PinataSDK;
  private lighthouseApiKey: string;

  constructor(config: {
    openAiKey: string;
    privyConfig: PrivyWalletConfig;
    lighthouseApiKey: string;
    pinataJwt: string;
    pinataGateway: string;
    rpcUrl: string;
  }) {
    const walletBridge = new WalletBridge(
      config.privyConfig.appId,
      config.privyConfig.appSecret,
      config.rpcUrl
    );

    const pinataSDK = new PinataSDK({
      pinataJwt: config.pinataJwt,
      pinataGateway: config.pinataGateway,
      //   cidVersion: 0
    });

    const CreateSmartWalletTool = createSmartWalletTool(walletBridge);
    const CreateStorageTool = createStorageTool(
      config.lighthouseApiKey,
      pinataSDK
    );

    super({
      name: "Storage Broadcaster Agent",
      description: "Agent for IPFS storage and IPNS management",
      instructions: [
        "1. Upload data to IPFS via Pinata",
        "2. Manage IPNS records via Lighthouse",
        "3. Broadcast state updates using smart wallet",
      ],
      tools: {
        storage: CreateStorageTool,
        "smart-wallet": CreateSmartWalletTool,
      },
      openAiKey: config.openAiKey,
    });

    this.pinata = pinataSDK;
    this.lighthouseApiKey = config.lighthouseApiKey;
  }

  private async uploadToPinata(data: string): Promise<{ Hash: string } | null> {
    try {
      const parsedData = JSON.parse(data);
      const response = await this.pinata.upload
        .json({
          name: `Data Upload ${Date.now()}`,
          description: "IPFS Data Upload",
          content: parsedData,
        })
        .cidVersion(0);

      if (!response?.IpfsHash) {
        throw new Error("Upload failed: No hash returned from Pinata");
      }

      return { Hash: response.IpfsHash };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Pinata upload failed: ${error.message}`);
      }
      throw new Error("Pinata upload failed with unknown error");
    }
  }
  private async uploadWithLighthouse(data: string): Promise<{ Hash: string } | null> {
    try {
      console.log("Starting Lighthouse upload process...");
      
      if (!this.lighthouseApiKey) {
        throw new Error("Lighthouse API key is not configured");
      }
  
      // For debugging purposes
      console.log("Attempting to upload data with length:", data.length, this.lighthouseApiKey);
  
      const uploadResponse = await lighthouse.uploadText(
        data,
        this.lighthouseApiKey,
      );
  
      console.log("Lighthouse upload response:", uploadResponse);
  
      if (!uploadResponse?.data?.Hash) {
        console.error("Invalid upload response:", uploadResponse);
        throw new Error("Upload failed: No hash returned from Lighthouse");
      }
  
      return {
        Hash: uploadResponse.data.Hash
      };
    } catch (error) {
      console.error("Lighthouse upload error:", error);
      if (error instanceof Error) {
        throw new Error(`Lighthouse upload failed: ${error.message}`);
      }
      throw new Error("Lighthouse upload failed with unknown error");
    }
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

      return ipnsName;
    } catch (error) {
      console.error("IPNS operation error:", error);
      throw new Error(
        `IPNS operations failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async execute(params: {
    signedData: string;
    signature: string;
    walletId: string;
    ipnsName?: string;
  }): Promise<{
    success: boolean;
    cid?: string;
    ipnsName?: string;
    ipnsGatewayUrl?: string;
    error?: string;
  }> {
    try {
      // Validate input
      if (!params.signedData) {
        throw new Error("No data provided for upload");
      }

      // Upload to IPFS via Pinata
    //   console.log("Attempting upload with data:", params.signedData);
    //   const uploadResponse = await this.uploadToPinata(params.signedData);

    //   if (!uploadResponse) {
    //     throw new Error("Upload failed: No response from Pinata");
    //   }

        // Upload to IPFS via Lighthouse
        console.log("Attempting upload with Lighthouse...");
        const uploadResponse = await this.uploadWithLighthouse(params.signedData);
    
        if (!uploadResponse) {
          throw new Error("Upload failed: No response from Lighthouse");
        }
    
        const cid = uploadResponse.Hash;
        console.log("Generated CID:", cid);
    

    //   const cid = "bafkreicagyndysvipdubnj572sk5nv5ypwfy445va3aocd2stz4duzenyy" //uploadResponse.Hash;
    //   console.log("cic", cid);

      // Handle IPNS operations through Lighthouse
      const ipnsName = await this.handleIpnsOperations(cid, params.ipnsName);

      return {
        success: true,
        cid,
        ipnsName,
        ipnsGatewayUrl: `https://gateway.lighthouse.storage/ipns/${ipnsName}`,
      };
    } catch (error) {
      console.error("Storage operation failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
