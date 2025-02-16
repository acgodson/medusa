import { z } from "zod";
import { baseProcedure } from "@/trpc/init";
import { GreenfieldStorage } from "@/lib/medusa/zee/tools/src/GreenfieldStorage";

export const getWorkflow = baseProcedure
  .input(
    z.object({
      workflowId: z.string(),
    })
  )
  .query(async ({ input }) => {
    try {
      // First get workflow metadata from Greenfield
      const storage = new GreenfieldStorage(
        process.env.GREENFIELD_RPC_URL!,
        process.env.GREENFIELD_CHAIN_ID!,
        process.env.ADMIN_ADDRESS!,
        process.env.ADMIN_PRIVATE_KEY!
      );

      const bucketName = `workflow-${input.workflowId}`.toLowerCase();
      // Get bucket metadata
      const bucketInfo = await storage.getBucketMetadata(bucketName);
      // Get list of executions
      const executions = await storage.listObjects(bucketName);

      return {
        success: true,
        workflow: {
          id: input.workflowId,
          bucketInfo,
          executions,
        },
      };
    } catch (error: any) {
      console.error("Failed to fetch workflow:", error);
      throw new Error(`Failed to fetch workflow: ${error.message}`);
    }
  });
