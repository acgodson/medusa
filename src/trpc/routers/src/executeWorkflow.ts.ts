import {
  MedusaBridge,
  NoiseData,
  WorkflowType,
} from "@/lib/medusa/bridge/core";
import { baseProcedure } from "@/trpc/init";

import { bscTestnet } from "viem/chains";
import { z } from "zod";

export const executeWorkflow = baseProcedure
  .input(
    z.object({
      deviceId: z.string(),
      workflowId: z.string(),
      workflowType: z.enum([WorkflowType.TEMPERATURE, WorkflowType.NOISE]),
      data: z.union([
        // Temperature data structure
        z
          .object({
            temperature: z.number(),
            humidity: z.number(),
            timestamp: z.number(),
          })
          .optional(),
        // Noise data structure
        z
          .record(
            z.object({
              noise: z.number(),
              minNoise: z.number(),
              maxNoise: z.number(),
              samples: z.number(),
              accuracy: z.number(),
              timestamp: z.number(),
              spikes: z.number().optional().default(0),
            })
          )
          .optional(),
      ]),
      metadata: z.object({
        startTime: z.number(),
        endTime: z.number(),
        deviceInfo: z
          .object({
            manufacturer: z.string().optional(),
            model: z.string().optional(),
          })
          .optional(),
        totalSamples: z.number(),
      }),
      historicalData: z
        .array(
          z.object({
            temperature: z.number(),
            humidity: z.number(),
            timestamp: z.number(),
          })
        )
        .optional(),
    })
  )
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
        workflowType: input.workflowType,
      });

      console.log(
        `Starting ${input.workflowType} workflow execution with input:`,
        {
          deviceId: input.deviceId,
          workflowId: input.workflowId,
          workflowType: input.workflowType,
          dataPointsCount:
            input.workflowType === WorkflowType.NOISE
              ? Object.keys(input.data || {}).length
              : 1,
        }
      );

      // Execute the appropriate workflow based on type
      const result = await bridge.executeWorkflow({
        deviceId: input.deviceId,
        workflowId: input.workflowId,
        data: {
          metadata: input.metadata,
          deviceId: input.deviceId,
          data: input.data,
        } as NoiseData,
        historicalData: input.historicalData,
        contractAddress: process.env.REGISTRY_CONTRACT!,
      });

      return {
        success: true,
        result,
      };
    } catch (error: any) {
      console.error(`${input.workflowType} workflow execution failed:`, error);
      throw new Error(
        `Failed to execute ${input.workflowType} workflow: ${error.message}`
      );
    }
  });
