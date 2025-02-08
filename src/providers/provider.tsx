"use client";

import { TRPCProvider } from "@/trpc/client";
import { privyConfig, wagmiConfig } from "@/lib/config/env";
import { WagmiProvider } from "@privy-io/wagmi";
import { MedusaProvider } from "./MedusaProvider";
import { PrivyClientConfig, PrivyProvider } from "@privy-io/react-auth";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TRPCProvider>
        <PrivyProvider
          appId={"cm09c0kux05vl7269wln6qrff"}
          config={privyConfig as PrivyClientConfig}
        >
          <WagmiProvider config={wagmiConfig}>
            <MedusaProvider>{children}</MedusaProvider>
          </WagmiProvider>
        </PrivyProvider>
      </TRPCProvider>
    </>
  );
}
