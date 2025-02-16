import { z } from "zod";
import { baseProcedure } from "@/trpc/init";
import { PrivyClient } from "@privy-io/server-auth";
import { GreenfieldStorage } from "@/lib/medusa/zee/tools/src/GreenfieldStorage";
import { Client } from "@bnb-chain/greenfield-js-sdk";

export const greenfield = baseProcedure
  .input(
    z.object({
      operation: z.enum([
        "createBucket",
        "storeData",
        "getBucketMetadata",
        "listObjects",
        "getObject",
        "uploadObject",
      ]),
      workflowId: z.string(),
      data: z.any().optional(),
      useServerWallet: z.boolean().optional(),
      walletId: z.string().optional(),
      objectName: z.string().optional(),
    })
  )
  .mutation(async ({ input }: any) => {
    try {
      const privy = new PrivyClient(
        process.env.PRIVY_APP_ID!,
        process.env.PRIVY_APP_SECRET!
      );

      const storage = new GreenfieldStorage(
        process.env.GREENFIELD_RPC_URL!,
        process.env.GREENFIELD_CHAIN_ID!,
        process.env.ADMIN_ADDRESS!,
        process.env.ADMIN_PRIVATE_KEY!
      );

      let spAddress;
      if (input.operation === "createBucket") {
        const client = Client.create(
          process.env.GREENFIELD_RPC_URL!,
          process.env.GREENFIELD_CHAIN_ID!
        );

        const spList = await client.sp.getStorageProviders();
        const primarySp = spList[0];

        if (!primarySp?.operatorAddress) {
          throw new Error("No storage provider found");
        }
        spAddress = primarySp.operatorAddress;
      }

      const result = await storage.createWorkflowBucket(
        input.workflowId,
        spAddress as string
      );

      return {
        success: true,
        result: result,
      };
    } catch (error: any) {
      console.error("Greenfield storage operation failed:", error);
      throw new Error(`Operation failed: ${error.message}`);
    }
  });
