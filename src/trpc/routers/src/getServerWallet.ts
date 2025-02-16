import { z } from "zod";
import { baseProcedure } from "@/trpc/init";
import { PrivyClient } from "@privy-io/server-auth";

export const getServerWallet = baseProcedure
  .input(
    z.object({
      walletId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const privy = new PrivyClient(
      process.env.PRIVY_APP_ID!,
      process.env.PRIVY_APP_SECRET!
    );

    const data = await privy.walletApi.getWallet({
      id: input.walletId,
    });

    return data;
  });
