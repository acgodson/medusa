import { z } from "zod";
import { createTool } from "@covalenthq/ai-agent-sdk";
import { WalletBridge } from "@/lib/medusa/wallets/broadcast-server";
import { Hex } from "@privy-io/server-auth";

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
          const smartAccount = await walletBridge.createSmartAccount();
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
