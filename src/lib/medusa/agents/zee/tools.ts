import { z } from "zod";
import { createTool } from "@covalenthq/ai-agent-sdk";
import { DataSchema } from "./types";
import { Hex, PrivyClient } from "@privy-io/server-auth";
import { PinataSDK } from "pinata-web3";
import { WalletBridge } from "../../wallets/server";
import lighthouse from "@lighthouse-web3/sdk";

export const WalletSchema = z.object({
  operation: z.enum(["getAddress", "getWalletId", "sign"]),
  message: z.string(),
});

export interface PrivyWalletConfig {
  appId: string;
  appSecret: string;
  chainType?: string | any;
}

// tools.ts
export const createPrivyWalletTool = (privy: PrivyClient) =>
  createTool({
    id: "privy-wallet",
    description:
      "REQUIRED: Use this tool first to sign any sensor data before storage. Takes a message and returns a signature.",
    schema: WalletSchema,
    execute: async (params) => {
      console.log("Privy tool executing with params:", params);
      try {
        // If wallet isn't provided, try to get or create one
        const activeWallet = await getOrCreateWallet(privy);
        console.log("Active wallet:", activeWallet);

        switch (params.operation) {
          case "sign":
            if (!params.message)
              throw new Error("Message required for signing");

            console.log("Signing message:", params.message);
            const signResult = await privy.walletApi.ethereum.signMessage({
              walletId: activeWallet.id,
              message: params.message,
            });
            console.log("Sign result:", signResult);

            const response = JSON.stringify({
              signature: signResult.signature,
              walletId: activeWallet.id,
            });
            console.log("Returning response:", response);
            return response;

          case "getAddress":
            return JSON.stringify({ address: activeWallet.address });

          case "getWalletId":
            return JSON.stringify({ walletId: activeWallet.id });

          default:
            throw new Error("Unsupported wallet operation");
        }
      } catch (error: any) {
        console.error("Privy tool error:", error);
        throw new Error(`Wallet operation failed: ${error.message}`);
      }
    },
  });

async function getOrCreateWallet(privy: PrivyClient) {
  const wallets = await privy.walletApi.getWallets({
    chainType: "ethereum",
  });
  return (
    wallets.data[0] || (await privy.walletApi.create({ chainType: "ethereum" }))
  );
}

export const createDataStorageTool = () =>
  createTool({
    id: "store-sensor-data",
    description: "Store sensor data on BNB Greenfield",
    schema: DataSchema,
    execute: async (params) => {
      try {
        // The signing will be handled by the privy-wallet tool
        const result = {
          success: true,
          data: params.data,
          timestamp: Date.now(),
        };

        return JSON.stringify(result);
      } catch (error: any) {
        throw new Error(`Failed to store data: ${error.message}`);
      }
    },
  });

// this is sample, we could replace this with the goldrush tool
export const createBalanceTool = () =>
  createTool({
    id: "get-wallet-balance",
    description: "Get wallet balance information",
    schema: z.object({
      address: z.string(),
    }),
    execute: async (params) => {
      // Implementation
      return "Balance information";
    },
  });

// Smart Wallet Tool
export const createSmartWalletTool = (walletBridge: WalletBridge) =>
  createTool({
    id: "smart-wallet",
    description: "Create and manage Coinbase Smart Wallet for broadcasting",
    schema: z.object({
      operation: z.enum(["create", "broadcast"]),
      walletId: z.string(),
      txData: z
        .object({
          contractAddress: z.string(),
          data: z.string(),
        })
        .optional(),
    }),
    execute: async (params) => {
      try {
        if (params.operation === "create") {
          const smartAccount = await walletBridge.createSmartAccount(
            params.walletId
          );
          return JSON.stringify({
            accountAddress: smartAccount.address,
            walletId: params.walletId,
          });
        }

        if (!params.txData) {
          throw new Error("Transaction data required for broadcast");
        }

        const txHash = await walletBridge.executeOperation(
          params.walletId,
          params.txData.contractAddress as Hex,
          params.txData.data as Hex
        );

        return JSON.stringify({
          success: true,
          transactionHash: txHash,
        });
      } catch (error: any) {
        throw new Error(`Smart wallet operation failed: ${error.message}`);
      }
    },
  });

export const createStorageTool = (
  lighthouseApiKey: string,
  pinata: PinataSDK
) =>
  createTool({
    id: "storage-tool",
    description:
      "Store and manage data on IPFS via Pinata and IPNS via Lighthouse",
    schema: z.object({
      operation: z.enum([
        "upload",
        "generateKey",
        "publishRecord",
        "getAllKeys",
      ]),
      data: z.string().optional(),
      ipnsName: z.string().optional(),
      cid: z.string().optional(),
    }),

    execute: async (params) => {
      try {
        switch (params.operation) {
          case "generateKey":
            const keyResponse = await lighthouse.generateKey(lighthouseApiKey);
            console.log("Generated key response:", keyResponse);
            return JSON.stringify(keyResponse);

          case "publishRecord":
            if (!params.cid || !params.ipnsName) {
              console.error("Missing required params:", { params });
              throw new Error("CID and IPNS name are required for publishing");
            }

            console.log("Attempting to publish with params:", {
              cid: params.cid,
              ipnsName: params.ipnsName,
              apiKeyLength: lighthouseApiKey?.length,
            });

            // Try using the REST API directly since SDK is timing out
            const pubResponse = await fetch(
              `https://api.lighthouse.storage/api/ipns/publish_record?cid=${params.cid}&keyName=${params.ipnsName}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${lighthouseApiKey}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (!pubResponse.ok) {
              const errorText = await pubResponse.text();
              console.error("Publish response error:", {
                status: pubResponse.status,
                statusText: pubResponse.statusText,
                error: errorText,
              });
              throw new Error(
                `Failed to publish: ${pubResponse.status} ${pubResponse.statusText}`
              );
            }

            const publishData = await pubResponse.json();
            console.log("Publish response:", publishData);

            return JSON.stringify({
              success: true,
              data: publishData,
            });

          case "getAllKeys":
            const keysResponse = await lighthouse.getAllKeys(lighthouseApiKey);
            console.log("Get all keys response:", keysResponse);
            return JSON.stringify(keysResponse);

          default:
            return JSON.stringify({ error: "Invalid operation" });
        }
      } catch (error: any) {
        console.error("Storage tool error:", error);
        return JSON.stringify({
          error: error.message,
          details: error.toString(),
        });
      }
    },
  });
