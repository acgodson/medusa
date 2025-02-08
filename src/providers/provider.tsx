"use client";

import { TRPCProvider } from "@/trpc/client";
import { privyConfig, wagmiConfig } from "@/lib/config/env";
import { WagmiProvider } from "@privy-io/wagmi";
import { MedusaProvider } from "./MedusaProvider";
import { PrivyClientConfig, PrivyProvider } from "@privy-io/react-auth";
import { EthProvider } from "./EthContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PrivyProvider
        appId={"cm6rro6rj00a39ffmyokmg9x4"}
        config={privyConfig as PrivyClientConfig}
      >
        <TRPCProvider>
          <WagmiProvider config={wagmiConfig}>
            <MedusaProvider>
              <EthProvider>{children}</EthProvider>
            </MedusaProvider>
          </WagmiProvider>
        </TRPCProvider>{" "}
      </PrivyProvider>
    </>
  );
}
