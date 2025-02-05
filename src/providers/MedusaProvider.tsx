"use client";

import { createContext, useContext, ReactNode } from "react";
import { MedusaBridge } from "@/lib/medusa/bridge/core";

interface MedusaContextType {
  createWallet: () => Promise<void>;
  getWallets: () => Promise<any[]>;
  // Add more actions as needed
}

const MedusaContext = createContext<MedusaContextType | null>(null);

export function MedusaProvider({ children }: { children: ReactNode }) {
  const contextValue: MedusaContextType = {
    createWallet: async () => {
      const res = await fetch("/api/medusa/wallets", {
        method: "POST",
        body: JSON.stringify({ chainType: "ethereum" }),
      });
      return res.json();
    },
    getWallets: async () => {
      const res = await fetch("/api/medusa/wallets");
      const data = await res.json();
      return data.data;
    },
  };

  return (
    <MedusaContext.Provider value={contextValue}>
      {children}
    </MedusaContext.Provider>
  );
}

export const useMedusa = () => {
  const context = useContext(MedusaContext);
  if (!context) throw new Error("Must be used within MedusaProvider");
  return context;
};
