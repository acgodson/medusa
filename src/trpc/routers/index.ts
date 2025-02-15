import { z } from "zod";
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
import {
  BiconomySmartAccountV2,
  createPaymaster,
  PaymasterMode,
  SponsorUserOperationDto,
} from "@biconomy/account";

const createWorkflowInput = z.object({
  wid: z.string(), // Will be converted to BigInt
  title: z.string(),
  description: z.string(),
  creator: z.string(), // Address
  schemaId: z.string(),
  registrar: z.string(), // Address
  walletId: z.string(),
  address: z.string(),
});

async function debugSignature(
  workflowId: bigint,
  walletId: string,
  deviceAddress: `0x${string}`,
  nonce: bigint,
  signature: `0x${string}`,
  smartAccountAddress?: string | undefined
) {
  const encodedData = encodeAbiParameters(
    [
      { type: "uint256" },
      { type: "string" },
      { type: "address" },
      { type: "uint256" },
    ],
    [workflowId, walletId, deviceAddress, nonce] as const
  );

  const messageHash = keccak256(encodedData);
  const prefixedHash = hashMessage(messageHash);

  console.log({
    encodedData,
    messageHash,
    prefixedHash,
    signature,
    smartAccountAddress,
  });

  // If we have a smart account address, just return the comparison
  if (smartAccountAddress) {
    return {
      recoveredAddress: "N/A - Smart Account Signature",
      deviceAddress,
      smartAccountAddress,
      matches: true, // Smart account signatures are validated differently
    };
  }

  try {
    // Only try recovering for EOA signatures
    const recoveredAddress = await recoverMessageAddress({
      message: {
        raw: messageHash,
      },
      signature,
    });

    console.log("Recovered signer:", recoveredAddress);
    console.log("Expected signer:", deviceAddress);
    console.log(
      "Addresses match:",
      recoveredAddress.toLowerCase() === deviceAddress.toLowerCase()
    );

    return {
      recoveredAddress,
      deviceAddress,
      matches: recoveredAddress.toLowerCase() === deviceAddress.toLowerCase(),
    };
  } catch (error) {
    console.error("Signature recovery failed:", error);
    throw error;
  }
}

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

  getSig: baseProcedure
    .input(
      z.object({
        workflowId: z.string(),
        walletId: z.string(),
        address: z.string(),
        nonce: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const encodedData = encodeAbiParameters(
        [
          { type: "uint256" },
          { type: "string" },
          { type: "address" },
          { type: "uint256" },
        ],
        [
          BigInt(input.workflowId),
          input.walletId,
          getAddress(input.address),
          BigInt(input.nonce),
        ]
      );

      const messageHash = keccak256(encodedData);
      console.log("Message to sign:", messageHash);

      const sW = new ServerWallet(
        process.env.PRIVY_APP_ID!,
        process.env.PRIVY_APP_SECRET!,
        bscTestnet.rpcUrls.default.http[0]
      );

      const account = await createViemAccount({
        walletId: input.walletId,
        address: input.address as any,
        privy: sW.privy,
      });

      const client = createWalletClient({
        account,
        chain: bscTestnet,
        transport: http(),
      });

      const signature: any = await client.signMessage({ message: messageHash });

      if (!signature) {
        throw new Error("no signature returned");
      }

      const s = await debugSignature(
        BigInt(input.workflowId),
        input.walletId,
        getAddress(input.address),
        BigInt(input.nonce),
        signature
      );

      return {
        messageHash,
        signature,
        encoded: encodedData,
        debug: s,
      };
    }),

  getSmartAccountSig: baseProcedure
    .input(
      z.object({
        workflowId: z.string(),
        walletId: z.string(),
        address: z.string(),
        nonce: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const encodedData = encodeAbiParameters(
          [
            { type: "uint256" },
            { type: "string" },
            { type: "address" },
            { type: "uint256" },
          ],
          [
            BigInt(input.workflowId),
            input.walletId,
            getAddress(input.address),
            BigInt(input.nonce),
          ]
        );

        const messageHash = keccak256(encodedData);
        console.log("Message to sign:", messageHash);

        // Initialize ServerWallet
        const serverWallet = new ServerSmartWallet(
          process.env.PRIVY_APP_ID!,
          process.env.PRIVY_APP_SECRET!,
          bscTestnet.rpcUrls.default.http[0]
        );

        // Create smart account
        const smartAccount: BiconomySmartAccountV2 =
          await serverWallet.createSmartAccount(
            input.walletId,
            getAddress(input.address)
          );

        // Get smart account address
        const smartAccountAddress = await smartAccount.getAccountAddress();
        console.log("Smart Account Address:", smartAccountAddress);

        // Sign the message using the smart account
        const signature = await smartAccount.signMessage(messageHash);
        console.log("Signature:", signature);

        if (!signature) {
          throw new Error("No signature returned from smart account");
        }

        // Debug the signature
        const debug = await debugSignature(
          BigInt(input.workflowId),
          input.walletId,
          getAddress(input.address),
          BigInt(input.nonce),
          signature as `0x${string}`,
          smartAccountAddress
        );

        return {
          messageHash,
          signature,
          encoded: encodedData,
          smartAccountAddress,
          debug,
        };
      } catch (error) {
        console.error("Smart account signature failed:", error);
        throw error;
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
