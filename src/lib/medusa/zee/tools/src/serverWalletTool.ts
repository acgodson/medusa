import { z } from "zod";
import { createTool } from "@covalenthq/ai-agent-sdk";
import { ServerWallet } from "@/lib/medusa/wallets/server-wallet";
import { Hex } from "@privy-io/server-auth";

export const createServerWalletTool = (serverWallet: ServerWallet) =>
  createTool({
    id: "smart-wallet",
    description: "Create and manage Wallet for broadcasting",
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
    execute: async (params: any) => {
      try {
        if (!params.txData) {
          throw new Error("Transaction data required for broadcast");
        }

        const txHash = await serverWallet.executeOperation(
          params.walletId,
          params.txData.contractAddress as Hex,
          params.txData.data as Hex
        );

        return JSON.stringify({
          success: true,
          transactionHash: txHash,
        });
      } catch (error: any) {
        throw new Error(`Server wallet operation failed: ${error.message}`);
      }
    },
  });
