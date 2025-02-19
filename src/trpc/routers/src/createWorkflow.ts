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

      let bodyContent = JSON.stringify({
        operation: "createBucket",
        workflowId: wid,
      });

      let response = await fetch(
        `${process.env.HOST_URL}/api/trpc/greenfield`,
        {
          method: "POST",
          body: bodyContent,
          headers: { "Content-Type": "application/json" },
        }
      );

      let greenfieldData = await response.json();

      if (!greenfieldData) {
        throw new Error("Unable to create greenfield bucket for workflow");
      }

      console.log(greenfieldData);

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
        bucketTxn: greenfieldData.txHash,
        contractAddress: process.env.REGISTRY_CONTRACT,
      };
    } catch (error: any) {
      console.error("Workflow creation failed:", error);
      throw new Error(`Failed to create workflow: ${error.message}`);
    }
  });
