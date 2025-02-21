import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/* eslint-disable */
import { createClient, http } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { createConfig } from "@privy-io/wagmi";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const privyConfig = {
  loginMethods: ["wallet", "email", "google"],
  defaultChain: bscTestnet,
  supportedChains: [bscTestnet, bsc],
  appearance: {
    theme: "light",
    accentColor: "#676FFF",
    logo: `${process.env.NEXT_PUBLIC_URL!}/black-logo.png`,
  },
  embeddedWallets: {
    createOnLogin: "all-users",
    noPromptOnSignature: false,
  },
  walletConnectCloudProjectId: "957c795c4c86e7c46609c0cd4064fa00",
};

export const supportedChains = [bscTestnet, bsc];

export const wagmiConfig = createConfig({
  //@ts-ignore
  chains: supportedChains,
  client({ chain }: { chain: any }) {
    return createClient({
      chain,
      transport: http(),
    });
  },
});
