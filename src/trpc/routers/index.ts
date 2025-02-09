import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { customAlphabet } from "nanoid";
import { MedusaBridge } from "@/lib/medusa/bridge/core";
import RegistryArtifacts from "../../../contracts/artifacts/MedusaRegistry.json";
import { encodeFunctionData } from "viem";
import { PrivyClient } from "@privy-io/server-auth";
import lighthouse from "@lighthouse-web3/sdk";
import { RouterHelper } from "./helpers";
import {
  DataCollectionInput,
  WorkFlowCreationIput,
  DeviceRegistrationInput,
} from "./types";

export const appRouter = createTRPCRouter({
  executeWorkflow: baseProcedure
    .input(DataCollectionInput)
    .mutation(async ({ input }) => {
      try {
        const bridge = await MedusaBridge.connect({
          openAiKey: process.env.OPENAI_API_KEY!,
          privyConfig: {
            appId: process.env.PRIVY_APP_ID!,
            appSecret: process.env.PRIVY_APP_SECRET!,
          },
          rpcUrl: process.env.RPC_URL!,
          lighthouseApiKey: process.env.LIGHTHOUSE_API_KEY!,
          adminPrivateKey: process.env.ADMIN_PRIVATE_KEY!,
          contractAddress: process.env.REGISTRY_CONTRACT as `0x${string}`,
          walletId: input.deviceId,
          workflowId: input.workflowId,
        });

        console.log("Starting workflow execution with input:", {
          ...input,
          workflowId: input.workflowId,
        });

        const result = await bridge.executeWorkflow({
          deviceId: input.deviceId,
          workflowId: input.workflowId,
          data: input.data,
          contractAddress: process.env.REGISTRY_CONTRACT!,
        });

        return {
          success: true,
          result,
        };
      } catch (error: any) {
        console.error("Workflow execution failed:", error);
        throw new Error(`Failed to execute workflow: ${error.message}`);
      }
    }),

  createWorkflow: baseProcedure
    .input(WorkFlowCreationIput)
    .mutation(async ({ input }) => {
      try {
        const schema = {
          title: "",
          description: "",
          //TODO, other members and context of the schema filled up from frontend
          items: [],
        };
        const dataToUpload = JSON.stringify({
          ...schema,
          timestamp: Date.now(),
        }); // Upload to Lighthouse
        console.log("Attempting upload to Lighthouse...");
        const uploadResponse = await lighthouse.uploadText(
          dataToUpload,
          process.env.LIGHTHOUSE_API_KEY!,
          undefined
        );
        if (!uploadResponse?.data?.Hash) {
          console.error("Invalid upload response:", uploadResponse);
          throw new Error("Upload failed: No hash returned from Lighthouse");
        }
        const cid = uploadResponse.data.Hash;

        const ipnsHelper = new RouterHelper(process.env.LIGHTHOUSE_API_KEY!);

        const result = await ipnsHelper.handleIpnsOperations(cid);
        console.log(result);

        const data = encodeFunctionData({
          abi: RegistryArtifacts.abi,
          functionName: "createWorkflow",
          args: [result.ipnsName, result.ipnsId],
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
        console.error("Device registration failed:", error);
        throw new Error(`Failed to register device: ${error.message}`);
      }
    }),

  registerDevice: baseProcedure
    .input(DeviceRegistrationInput)
    .mutation(async ({ input }) => {
      /* Sets Policy and Creates Server Wallet for Device */
      try {
        const privy = new PrivyClient(
          process.env.PRIVY_APP_ID!,
          process.env.PRIVY_APP_SECRET!
        );

        const { id: walletId, address } = await privy.walletApi.create({
          chainType: "ethereum",
        });

        const data = encodeFunctionData({
          abi: RegistryArtifacts.abi,
          functionName: "registerDevice",
          args: [input.workflowId, walletId],
        });
        const txData = {
          contractAddress: process.env.REGISTRY_CONTRACT,
          data,
        };

        return {
          walletId: walletId,
          address: address,
          data: txData,
          contractAddress: process.env.REGISTRY_CONTRACT,
        };
      } catch (error: any) {
        console.error("Device registration failed:", error);
        throw new Error(`Failed to register device: ${error.message}`);
      }
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
