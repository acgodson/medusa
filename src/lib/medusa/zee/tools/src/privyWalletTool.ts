import { z } from "zod";
import { createTool } from "@covalenthq/ai-agent-sdk";
import { PrivyClient } from "@privy-io/server-auth";

export interface PrivyWalletConfig {
  appId: string;
  appSecret: string;
  chainType?: string | any;
}

export const WalletSchema = z.object({
  operation: z.enum(["getAddress", "getWalletId", "sign"]),
  message: z.string(),
});

// This is basically just get, stopped creating after testing would soon delete
async function getOrCreateWallet(privy: PrivyClient, id: string) {
  const wallets = await privy.walletApi.getWallets({
    chainType: "ethereum",
  });
  return wallets.data.find((wallet) => wallet.id === id);
}

export const createPrivyWalletTool = (privy: PrivyClient, walletId: string) =>
  createTool({
    id: "privy-wallet",
    description:
      "REQUIRED: Use this tool first to sign any sensor data before storage. Takes a message and returns a signature.",
    schema: WalletSchema,
    execute: async (params) => {
      console.log("Privy tool executing with params:", params);
      try {
        // If wallet isn't provided, try to get or create one
        const activeWallet = await getOrCreateWallet(privy, walletId);
        console.log("Active wallet:", activeWallet);

        if (!activeWallet) {
          throw new Error("Unable to fetch server wallet");
        }

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
