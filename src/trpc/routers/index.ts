import { z } from "zod";
import { customAlphabet } from "nanoid";
import { baseProcedure, createTRPCRouter } from "../init";
import { MedusaBridge } from "@/lib/medusa/bridge/core";
import RegistryArtifacts from "../../../contracts/artifacts/MedusaRegistry.json";
import {
  createWalletClient,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  hashMessage,
  http,
  keccak256,
  recoverMessageAddress,
} from "viem";
import { PrivyClient } from "@privy-io/server-auth";
import {
  DataCollectionInput,
  WorkFlowCreationIput,
  DeviceRegistrationInput,
} from "./types";
import { LighthouseAPI } from "./helpers";
import { Client } from "@bnb-chain/greenfield-js-sdk";
import { bscTestnet } from "viem/chains";
import { GreenfieldStorage } from "@/lib/medusa/zee/tools/src/GreenfieldStorage";
import { ServerWallet } from "@/lib/medusa/wallets/server-wallet";
import { ServerWallet as ServerSmartWallet } from "@/lib/medusa/wallets/server-smart-wallet";
import { createViemAccount } from "@privy-io/server-auth/viem";
import { BiconomySmartAccountV2 } from "@biconomy/account";

const generateDigitsSlug = customAlphabet("0123456789", 4);

const createWorkflowInput = z.object({
  title: z.string(),
  description: z.string(),
  creator: z.string(),
  schemaId: z.string(),
  executionInterval: z.number(),
});

export const appRouter = createTRPCRouter({
  executeWorkflow: baseProcedure
    .input(DataCollectionInput)
    .mutation(async ({ input }) => {
      try {
        const bridge = await MedusaBridge.connect({
          llmAPIKey: process.env.OPENAI_API_KEY!,
          workflowId: input.workflowId,
          walletId: input.deviceId,
          rpcUrl: process.env.RPC_URL!,
          chainId: bscTestnet.id.toString()!,
          adminAddress: process.env.ADMIN_ADDRESS!,
          adminPrivateKey: process.env.ADMIN_PRIVATE_KEY!,
          contractAddress: process.env.REGISTRY_CONTRACT as `0x${string}`,
          privyConfig: {
            appId: process.env.PRIVY_APP_ID!,
            appSecret: process.env.PRIVY_APP_SECRET!,
          },
          greenfieldRpcUrl: process.env.GREENFIELD_RPC_URL!,
          greenfieldChainId: process.env.GREENFIELD_CHAIN_ID!,
        });

        console.log("Starting workflow execution with input:", {
          ...input,
          workflowId: input.workflowId,
        });

        const result = await bridge.executeWorkflow({
          deviceId: input.deviceId,
          workflowId: input.workflowId,
          data: input.data,
          historicalData: input.historicalData,
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
    .input(createWorkflowInput)
    .mutation(async ({ input }) => {
      try {
        // Generate a 4-digit workflow ID
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
            // policy_ids: [process.env.PRIVY_POLICY_ID],
          }),
        });

        const walletData = await response.json();
        const walletId = walletData.id;
        const address = walletData.address;

        // const data = encodeFunctionData({
        //   abi: RegistryArtifacts.abi,
        //   functionName: "registerDevice",
        //   args: [input.workflowId, walletId],
        // });

        // const txData = {
        //   contractAddress: process.env.REGISTRY_CONTRACT,
        //   data,
        // };

        return {
          walletId: walletId,
          address: address,
          // data: txData,
          // contractAddress: process.env.REGISTRY_CONTRACT,
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

  greenfield: baseProcedure
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
    }),

  getWorkflow: baseProcedure
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
    }),

  createWorkflowWithSmartAccount: baseProcedure
    .input(createWorkflowInput)
    .mutation(async ({ input }) => {
      try {
        // Initialize ServerWallet
        const serverWallet = new ServerSmartWallet(
          process.env.PRIVY_APP_ID!,
          process.env.PRIVY_APP_SECRET!,
          bscTestnet.rpcUrls.default.http[0]
        );

        // Encode the function data
        const data = encodeFunctionData({
          abi: RegistryArtifacts.abi,
          functionName: "createWorkflow",
          args: [
            {
              wid: BigInt(input.wid),
              title: input.title,
              description: input.description,
              creator: getAddress(input.creator),
              schemaId: input.schemaId,
              registrar: getAddress(input.registrar),
            },
          ],
        });

        const txn = await serverWallet.executeOperation(
          input.walletId,
          input.address as `0x${string}`,
          process.env.REGISTRY_CONTRACT as `0x${string}`,
          data
        );
        return txn;
      } catch (error) {
        console.error("Smart account workflow creation failed:", error);
        throw error;
      }
    }),
});

export type AppRouter = typeof appRouter;
