import { baseProcedure } from "@/trpc/init";
import { DataCollectionInput } from "../types";
import { MedusaBridge } from "@/lib/medusa/bridge/core";
import { bscTestnet } from "viem/chains";

export const executeWorkflow = baseProcedure
  .input(DataCollectionInput)
  .mutation(async ({ input }) => {
    try {
      const bridge = await MedusaBridge.connect({
        llmAPIKey: process.env.OPENAI_API_KEY!,
        workflowId: input.workflowId,
        walletId: input.deviceId,
        rpcUrl: process.env.RPC_URL!,
        chainId: bscTestnet.id.toString()!,
        adminAddress: process.env.ADMIN_ADDRESS!,
        adminPrivateKey: process.env.ADMIN_PRIVATE_KEY!,
        contractAddress: process.env.REGISTRY_CONTRACT as `0x${string}`,
        privyConfig: {
          appId: process.env.PRIVY_APP_ID!,
          appSecret: process.env.PRIVY_APP_SECRET!,
        },
        greenfieldRpcUrl: process.env.GREENFIELD_RPC_URL!,
        greenfieldChainId: process.env.GREENFIELD_CHAIN_ID!,
      });

      console.log("Starting workflow execution with input:", {
        ...input,
        workflowId: input.workflowId,
      });

      const result = await bridge.executeWorkflow({
        deviceId: input.deviceId,
        workflowId: input.workflowId,
        data: input.data,
        historicalData: input.historicalData,
        contractAddress: process.env.REGISTRY_CONTRACT!,
      });

      return {
        success: true,
        result,
      };
    } catch (error: any) {
      console.error("Workflow execution failed:", error);
      throw new Error(`Failed to execute workflow: ${error.message}`);
    }
  });
