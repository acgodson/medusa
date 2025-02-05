import { createContext, useContext } from "react";
import { MedusaBridge } from "./bridge/core";

export const MedusaContext = createContext<MedusaBridge | null>(null);
export const useMedusa = () => {
  const context = useContext(MedusaContext);
  if (!context) throw new Error("Must be used within MedusaProvider");
  return context;
};
