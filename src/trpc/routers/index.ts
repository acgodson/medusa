import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { customAlphabet } from "nanoid";
import { MedusaBridge } from "@/lib/medusa/bridge/core";
import { console } from "inspector";
import { BroadcastingAgent } from "@/lib/medusa/agents/BroadcastingAgent";
import { ResponseAgent } from "@/lib/medusa/agents/ResponseAgent";

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

        const result = await broadcaster.execute({
          cid: "bafkreifrdlh6qnbv5iphiycwxifcsaniujv57v4xvfhkxbgyguzke5ylpa",
          ipnsName: undefined,
          //collectionResult.storageResult.cid,
          // ipnsName: "bb0f2b2f341f4deabf8cf34decc3df01", //existingIpnsName, // optional
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

  analyze: baseProcedure
    .input(
      z.object({
        deviceId: z.string(),
        data: z.object({
          temperature: z.number(),
          humidity: z.number(),
          timestamp: z.number(),
        }),
        storageConfirmation: z.object({
          cid: z.string(),
          ipnsName: z.string(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const responseAgent = new ResponseAgent({
          openAiKey: process.env.OPENAI_API_KEY!,
          privyConfig: {
            appId: process.env.PRIVY_APP_ID!,
            appSecret: process.env.PRIVY_APP_SECRET!,
          },
          rpcUrl: process.env.RPC_URL!,
        });

        const TEST_IPNS_ID =
          "k51qzi5uqu5dhkh74rjmge7wspk8p59vvqv9ls2sgzmgqo3w4izm1btp9qf5k5";

        // Test data for the response agent
        const result = await responseAgent.execute({
          deviceId: input.deviceId,
          data: input.data,
          storageConfirmation: {
            ...input.storageConfirmation,
            ipnsId: TEST_IPNS_ID,
          },
        });

        return {
          success: true,
          result,
        };
      } catch (error: any) {
        console.error("Analysis failed:", error);
        throw new Error(`Failed to analyze data: ${error.message}`);
      }
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
