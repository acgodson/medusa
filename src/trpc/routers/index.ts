import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { customAlphabet } from "nanoid";
import { PrivyClient } from "@privy-io/server-auth";
import { DataCollectionAgent } from "@/lib/medusa/agents/dataCollectionAgent";
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
  collectData: baseProcedure
    .input(DataCollectionInput)
    .mutation(async ({ input }) => {
      console.log(input);
      try {
        const bridge = await MedusaBridge.connect({
          openAiKey: process.env.OPENAI_API_KEY!,
          privyConfig: {
            appId: process.env.PRIVY_APP_ID!,
            appSecret: process.env.PRIVY_APP_SECRET!,
          },
          rpcUrl: process.env.RPC_URL!,
        });

        //  DataCollectionAgent
        // const agent = await bridge.getZeeAgent("dataCollection");

        // Execute data collection operation
        const result = await bridge.executeOperation(
          "zee.dataCollection.process",
          {
            data: input,
            message: "",
          }
        );

        return {
          success: true,
          result,
        };
      } catch (error: any) {
        console.error("Error collecting data:", error);
        throw new Error(`Failed to collect data: ${error.message}`);
      }
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
