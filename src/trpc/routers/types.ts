import { z } from "zod";

export const DataSchema = z.object({
  data: z.object({
    deviceId: z.string(),
    message: z.string().optional(),
    temperature: z.number(),
    humidity: z.number(),
    timestamp: z.number(),
  }),
  signature: z.string().optional(),
  contractAddress: z.string(),
  workflowId: z.string(),
});

export const DataCollectionInput = z.object({
  deviceId: z.string(),
  workflowId: z.string(),
  data: z.object({
    temperature: z.number(),
    humidity: z.number(),
    timestamp: z.number(),
  }),
  historicalData: z.array(
    z.object({
      temperature: z.number(),
      humidity: z.number(),
      timestamp: z.number(),
    })
  ).optional(),
});

export const DeviceRegistrationInput = z.object({
  workflowId: z.string(),
});

export const WorkFlowCreationIput = z.object({
  schemaID: z.string(),
});
