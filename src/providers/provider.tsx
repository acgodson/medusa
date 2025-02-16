"use client";

import { TRPCProvider } from "@/trpc/client";
import { privyConfig, wagmiConfig } from "@/config/env";
import { WagmiProvider } from "@privy-io/wagmi";
import { MedusaProvider } from "./MedusaProvider";
import { PrivyClientConfig, PrivyProvider } from "@privy-io/react-auth";
import { EthProvider } from "./EthContext";
import GraphProviders from "./GraphProviders";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PrivyProvider
        appId={"cm09c0kux05vl7269wln6qrff"}
        config={privyConfig as PrivyClientConfig}
      >
        <TRPCProvider>
          <WagmiProvider config={wagmiConfig}>
            <GraphProviders>
              <MedusaProvider>
                <EthProvider>{children}</EthProvider>
              </MedusaProvider>
            </GraphProviders>
          </WagmiProvider>
        </TRPCProvider>
      </PrivyProvider>
    </>
  );
}
