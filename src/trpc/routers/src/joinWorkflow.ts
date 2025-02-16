import { z } from "zod";
import { baseProcedure } from "@/trpc/init";
import { createWalletClient, encodeFunctionData, getAddress, http } from "viem";
import RegistryArtifacts from "../../../../contracts/artifacts/MedusaRegistry.json";
import { bscTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export const joinWorkflow = baseProcedure
  .input(
    z.object({
      workflowId: z.number(),
      walletId: z.string(),
      deviceAddress: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // 4. Register to Medusa Registry
      const registryData = encodeFunctionData({
        abi: RegistryArtifacts.abi,
        functionName: "registerDevice",
        args: [
          input.workflowId,
          input.walletId,
          getAddress(input.deviceAddress),
        ],
      });

      // WARNING: ONLY ADMIN CAN REGISTER DEVICE TO JOIN WORKFLOW
      const account = privateKeyToAccount(
        (`0x` + process.env.ADMIN_PRIVATE_KEY!) as `0x${string}`
      );

      const walletClient = createWalletClient({
        account,
        chain: bscTestnet,
        transport: http(),
      });

      const txnObject = {
        to: process.env.REGISTRY_CONTRACT as `0x${string}`,
        data: registryData,
      };
      const txn = await walletClient.sendTransaction(txnObject);

      return {
        status: "workflow_joined",
        registryTxHash: txn,
      };
    } catch (error: any) {
      console.error("Workflow joining failed:", error);
      throw new Error(`Failed to join workflow: ${error.message}`);
    }
  });
