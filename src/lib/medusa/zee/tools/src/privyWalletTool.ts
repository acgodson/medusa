import { z } from "zod";
import { createTool } from "@covalenthq/ai-agent-sdk";
import { Hex } from "@privy-io/server-auth";
import { ServerWallet } from "@/lib/medusa/wallets/server-wallet";

export interface PrivyWalletConfig {
  appId: string;
  appSecret: string;
  chainType?: string | any;
}

export const WalletSchema = z.object({
  operation: z.enum(["getAddress", "getWalletId", "sign", "signTxn"]),
  message: z.string(),
});

export const createPrivyWalletTool = (
  serverWallet: ServerWallet,
  walletId: string
) =>
  createTool({
    id: "privy-wallet",
    description:
      "REQUIRED: Use this tool first to sign any sensor data before storage. Takes a message and returns a signature.",
    schema: WalletSchema,
    execute: async (params: any) => {
      console.log("Privy tool executing with params:", params);
      const privy = serverWallet.privy;
      try {
        const activeWallet = await privy.walletApi.getWallet({ id: walletId });
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

            const response = JSON.stringify({
              signature: signResult.signature,
              walletId: activeWallet.id,
            });
            console.log("Returning response:", response);
            return response;

          case "signTxn":
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

          case "getAddress":
            return JSON.stringify(activeWallet.address);

          case "getWalletId":
            return JSON.stringify(activeWallet.id);

          default:
            throw new Error("Unsupported wallet operation");
        }
      } catch (error: any) {
        console.error("Privy tool error:", error);
        throw new Error(`Wallet operation failed: ${error.message}`);
      }
    },
  });
