import { ReactNode, useEffect, useState } from "react";
import { MedusaBridge } from "@/lib/medusa/bridge/core";
import { MedusaContext } from "@/lib/medusa/context";

export function MedusaProvider({ children }: { children: ReactNode }) {
  const [bridge, setBridge] = useState<MedusaBridge | null>(null);

  useEffect(() => {
    const initBridge = async () => {
      const bridge = new MedusaBridge({
        covalentApiKey: process.env.NEXT_PUBLIC_COVALENT_API_KEY!,
        privyApiKey: process.env.NEXT_PUBLIC_PRIVY_API_KEY!,
        agentKitConfig: {
          network: "base",
          rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL,
        },
      });
      setBridge(bridge);
    };
    initBridge();
  }, []);

  if (!bridge) return <div>Loading Medusa...</div>;
  return (
    <MedusaContext.Provider value={bridge}>{children}</MedusaContext.Provider>
  );
}
