import { AgentKit, customActionProvider } from "@coinbase/agentkit";
import { EvmWalletProvider, WalletProvider } from "@coinbase/agentkit";
import { z } from "zod";

// Sign Message Action
export const signMessageAction = customActionProvider<EvmWalletProvider>({
  name: "sign_message",
  description:
    "Sign arbitrary messages using EIP-191 Signed Message Standard hashing",
  schema: z.object({
    message: z.string().describe("The message to sign"),
  }),
  invoke: async (walletProvider, args: { message: string }) => {
    const { message } = args;
    const signature = await walletProvider.signMessage(message);
    return `The payload signature ${signature}`;
  },
});


// Transfer ETH Action
export const transferEthAction = customActionProvider<EvmWalletProvider>({
  name: "transfer_eth",
  description: "Transfer ETH to a specified address",
  schema: z.object({
    to: z.string().describe("Recipient address"),
    amount: z.string().describe("Amount of ETH to transfer"),
  }),
  invoke: async (walletProvider, args: { to: `0x${string}`; amount: string }) => {
    const { to, amount } = args;
    const tx = await walletProvider.sendTransaction({
      to,
      value: amount as any,
    });
    return `Transaction sent: ${tx}`;
  },
});

