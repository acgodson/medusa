"use client";

import { TRPCProvider } from "@/trpc/client";
import { MedusaProvider } from "./MedusaProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TRPCProvider>
        <MedusaProvider>{children}</MedusaProvider>
      </TRPCProvider>
    </>
  );
}
