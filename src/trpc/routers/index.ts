import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { MedusaBridge } from "@/lib/medusa/bridge/core";
import RegistryArtifacts from "../../../contracts/artifacts/MedusaRegistry.json";
import { encodeFunctionData } from "viem";
import { PrivyClient } from "@privy-io/server-auth";
import {
  DataCollectionInput,
  WorkFlowCreationIput,
  DeviceRegistrationInput,
} from "./types";
import { LighthouseAPI } from "./helpers";

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
        const lighthouse = new LighthouseAPI(process.env.LIGHTHOUSE_API_KEY!);

        const schema = {
          title: "",
          description: "",
          items: [],
        };

        const dataToUpload = JSON.stringify({
          ...schema,
          timestamp: Date.now(),
        });

        console.log("Attempting upload to Lighthouse...");
        const uploadResponse = await lighthouse.uploadText(dataToUpload);

        if (!uploadResponse?.Hash) {
          console.error("Invalid upload response:", uploadResponse);
          throw new Error("Upload failed: No hash returned from Lighthouse");
        }

        const cid = uploadResponse.Hash;
        console.log("Upload successful, CID:", cid);

        const result = await lighthouse.handleIpnsOperations(cid);
        console.log("IPNS operations result:", result);

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
        console.error("Workflow creation failed:", error);
        throw new Error(`Failed to create workflow: ${error.message}`);
      }
    }),

  registerDevice: baseProcedure
    .input(DeviceRegistrationInput)
    .mutation(async ({ input }) => {
      try {
        const response = await fetch("https://api.privy.io/v1/wallets", {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${process.env.PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`
            ).toString("base64")}`,
            "privy-app-id": process.env.PRIVY_APP_ID!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chain_type: "ethereum",
            policy_ids: [process.env.PRIVY_POLICY_ID],
          }),
        });

        const walletData = await response.json();
        const walletId = walletData.id;
        const address = walletData.address;

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

  getServerWallet: baseProcedure
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
    }),
});

export type AppRouter = typeof appRouter;
