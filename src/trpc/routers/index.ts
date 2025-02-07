import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { customAlphabet } from "nanoid";
import { PrivyClient } from "@privy-io/server-auth";
import { DataCollectionAgent } from "@/lib/medusa/agents/dataCollectionAgent";
import { MedusaBridge } from "@/lib/medusa/bridge/core";
import { console } from "inspector";
import { StorageBroadcasterAgent } from "@/lib/medusa/agents/BroadcasterAgent";

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
        });

        //  DataCollectionAgent
        const agent = await bridge.getZeeAgent("dataCollection");

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
        const storageBroadcaster = new StorageBroadcasterAgent({
          openAiKey: process.env.OPENAI_API_KEY!,
          privyConfig: {
            appId: process.env.PRIVY_APP_ID!,
            appSecret: process.env.PRIVY_APP_SECRET!,
          },
          lighthouseApiKey: process.env.LIGHTHOUSE_API_KEY!,
          rpcUrl: process.env.RPC_URL!,
        });

        const result = await storageBroadcaster.execute(input);

        return {
          success: true,
          result,
        };
      } catch (error: any) {
        console.error("Broadcasting failed:", error);
        throw new Error(`Failed to broadcast: ${error.message}`);
      }
    }),

    
  // Optional: Get IPNS records
  getIpnsRecords: baseProcedure.query(async () => {
    try {
      const storageBroadcaster = new StorageBroadcasterAgent({
        openAiKey: process.env.OPENAI_API_KEY!,
        privyConfig: {
          appId: process.env.PRIVY_APP_ID!,
          appSecret: process.env.PRIVY_APP_SECRET!,
        },
        lighthouseApiKey: process.env.LIGHTHOUSE_API_KEY!,
        rpcUrl: process.env.RPC_URL!,
      });
      //@ts-ignore
      const records = await storageBroadcaster.zeeAgent.tools?.[
        "lighthouse-storage"
      ].execute({
        operation: "getAllKeys",
      });

      return JSON.parse(records);
    } catch (error: any) {
      throw new Error(`Failed to get IPNS records: ${error.message}`);
    }
  }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
