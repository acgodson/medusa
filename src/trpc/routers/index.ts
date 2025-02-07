import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { customAlphabet } from "nanoid";
import { MedusaBridge } from "@/lib/medusa/bridge/core";
import { console } from "inspector";
import { BroadcastingAgent } from "@/lib/medusa/agents/BroadcastingAgent";

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

const message = z.string();

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
          lighthouseApiKey: process.env.LIGHTHOUSE_API_KEY!,
        });

        // Execute data collection operation
        const result = await bridge.executeOperation(
          "zee.dataCollection.process",
          {
            deviceId: input.deviceId,
            data: {
              message: `Sensor data from device ${input.deviceId}`,
              ...input.data,
            },
            message: `Sensor data from device ${input.deviceId}`,
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

  broadcast: baseProcedure
    .input(
      z.object({
        signedData: z.string(),
        signature: z.string(),
        walletId: z.string(),
        ipnsName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const broadcaster = new BroadcastingAgent({
          openAiKey: process.env.OPENAI_API_KEY!,
          privyConfig: {
            appId: process.env.PRIVY_APP_ID!,
            appSecret: process.env.PRIVY_APP_SECRET!,
          },
          lighthouseApiKey: process.env.LIGHTHOUSE_API_KEY!,
          rpcUrl: process.env.RPC_URL!,
        });

        // const result = await storageBroadcaster.execute(input);

        const result = await broadcaster.execute({
          cid: "bafkreifiydmerkodzmjldvv4mbfljn3ekrbsd3jovbu3phei5j5awrwzem", //collectionResult.storageResult.cid,
          ipnsName: "bb0f2b2f341f4deabf8cf34decc3df01", //existingIpnsName, // optional
        });

        return {
          success: true,
          result,
        };
      } catch (error: any) {
        console.error("Broadcasting failed:", error);
        throw new Error(`Failed to broadcast: ${error.message}`);
      }
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
