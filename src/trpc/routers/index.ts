import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { customAlphabet } from "nanoid";
import { PrivyClient } from "@privy-io/server-auth";
import { DataCollectionAgent } from "@/lib/medusa/agents/dataCollectionAgent";

const generateSlug = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  10
);

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
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
  // Create wallet
  createWallet: baseProcedure.mutation(async () => {
    try {
      const wallet = await privy.walletApi.create({ chainType: "ethereum" });
      return wallet;
    } catch (error) {
      console.error("Error creating wallet:", error);
      throw new Error(`Failed to create wallet`);
    }
  }),

  // Get wallets
  getWallets: baseProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const wallets = await privy.walletApi.getWallets({
          chainType: "ethereum",
          cursor: input.cursor,
          limit: input.limit,
        });
        return wallets;
      } catch (error) {
        console.error("Error fetching wallets:", error);
        throw new Error(`Failed to fetch wallets`);
      }
    }),

  // Collect data
  collectData: baseProcedure
    .input(DataCollectionInput)
    .mutation(async ({ input }) => {
      try {
        const agent = new DataCollectionAgent({
          openAiKey: process.env.OPENAI_API_KEY!,
          privyConfig: {
            appId: process.env.PRIVY_APP_ID!,
            appSecret: process.env.PRIVY_APP_SECRET!,
            chainType: "ethereum",
          },
        });

        await agent.initialize();
        const result = await agent.execute(input);

        // Extract walletId from the messages if available
        let walletId = "";
        try {
          const messages = result.messages;
          const lastMessage = messages[messages.length - 1];
          if (lastMessage.content) {
            const content = lastMessage.content
              ? JSON.parse(lastMessage.content.toString())
              : {};
            walletId = content.walletId || "";
          }
        } catch (e) {
          console.warn("Could not extract walletId from result");
        }

        return {
          success: true,
          result,
          walletId,
        };
      } catch (error: any) {
        console.error("Error collecting data:", error);
        throw new Error(`Failed to collect data: ${error.message}`);
      }
    }),

  // Sign message with wallet
  signMessage: baseProcedure
    .input(
      z.object({
        walletId: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { signature } = await privy.walletApi.ethereum.signMessage({
          walletId: input.walletId,
          message: input.message,
        });
        return { signature };
      } catch (error) {
        console.error("Error signing message:", error);
        throw new Error(`Failed to sign message`);
      }
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
