import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { customAlphabet } from "nanoid";
import { MedusaBridge } from "@/lib/medusa/bridge/core";
import { console } from "inspector";

const generateSlug = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  10
);

// Data collection input schema
const DataCollectionInput = z.object({
  deviceId: z.string(),
  data: z.object({
    temperature: z.number(),
    humidity: z.number(),
    timestamp: z.number(),
  }),
});

export const appRouter = createTRPCRouter({
  executeWorkflow: baseProcedure
    .input(DataCollectionInput)
    .mutation(async ({ input }) => {
      try {
        const bridge = await MedusaBridge.connect({
          openAiKey: process.env.OPENAI_API_KEY!,
          privyConfig: {
            appId: process.env.PRIVY_APP_ID!,
            appSecret: process.env.PRIVY_APP_SECRET!,
          },
          rpcUrl: process.env.RPC_URL!,
          lighthouseApiKey: process.env.LIGHTHOUSE_API_KEY!,
          adminPrivateKey: process.env.ADMIN_PRIVATE_KEY!,
          contractAddress: process.env.REGISTRY_CONTRACT as `0x${string}`,
        });

        const result = await bridge.executeWorkflow({
          deviceId: input.deviceId,
          data: input.data,
        });

        return {
          success: true,
          result,
        };
      } catch (error: any) {
        console.error("Workflow execution failed:", error);
        throw new Error(`Failed to execute workflow: ${error.message}`);
      }
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
