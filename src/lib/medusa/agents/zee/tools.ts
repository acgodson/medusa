import { z } from "zod";
import { createTool } from "@covalenthq/ai-agent-sdk";
import { DataSchema } from "./types";
import { PrivyClient } from "@privy-io/server-auth";

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
    description: "Manages wallet operations for agent identity and signatures",
    schema: WalletSchema,
    execute: async (params) => {
      try {
        // If wallet isn't provided, try to get or create one
        const activeWallet = await getOrCreateWallet(privy);

        switch (params.operation) {
          case "sign":
            if (!params.message)
              throw new Error("Message required for signing");
            const { signature } = await privy.walletApi.ethereum.signMessage({
              walletId: activeWallet.id,
              message: params.message,
            });
            return JSON.stringify({ signature, walletId: activeWallet.id });

          case "getAddress":
            return JSON.stringify({ address: activeWallet.address });

          case "getWalletId":
            return JSON.stringify({ walletId: activeWallet.id });

          default:
            throw new Error("Unsupported wallet operation");
        }
      } catch (error: any) {
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
