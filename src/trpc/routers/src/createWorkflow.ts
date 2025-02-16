import { baseProcedure } from "@/trpc/init";
import { createWorkflowInput } from "../types";
import { customAlphabet } from "nanoid";
import { encodeFunctionData } from "viem";
import RegistryArtifacts from "../../../../contracts/artifacts/MedusaRegistry.json";

const generateDigitsSlug = customAlphabet("0123456789", 4);

export const createWorkflow = baseProcedure
  .input(createWorkflowInput)
  .mutation(async ({ input }) => {
    try {
      const wid = generateDigitsSlug();
      console.log("Generated Workflow ID:", wid.toString());

      const workflowInput = [
        wid,
        input.title,
        input.description,
        input.schemaId,
        BigInt(input.executionInterval),
      ];

      const data = encodeFunctionData({
        abi: RegistryArtifacts.abi,
        functionName: "createWorkflow",
        args: [workflowInput],
      });

      const txData = {
        contractAddress: process.env.REGISTRY_CONTRACT,
        data,
      };

      return {
        data: txData,
        contractAddress: process.env.REGISTRY_CONTRACT,
      };
    } catch (error: any) {
      console.error("Workflow creation failed:", error);
      throw new Error(`Failed to create workflow: ${error.message}`);
    }
  });
