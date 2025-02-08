import { useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEthContext } from "@/providers/EthContext";

export const useAuthenticatedAction = () => {
  const { authenticated } = usePrivy();
  const { handleLogin } = useEthContext();
  const { wallets } = useWallets();
  const connectedWallet = wallets.find((wallet) => wallet.type === "ethereum");

  const withAuth = useCallback(
    async (action: () => Promise<void> | void) => {
      if (!authenticated) {
        try {
          await handleLogin();
          // Only proceed with the action if authentication was successful
          if (authenticated) {
            await action();
          }
        } catch (error) {
          console.error("Authentication failed:", error);
          // Action is cancelled if authentication fails
          return;
        }
      } else {
        // If already authenticated, just execute the action
        await action();
      }
    },
    [authenticated, handleLogin]
  );

  return { withAuth };
};
