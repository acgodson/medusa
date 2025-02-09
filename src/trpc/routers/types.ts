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
  workflowId: z.number(),
});

export const DataCollectionInput = z.object({
  deviceId: z.string(),
  workflowId: z.number(),
  data: z.object({
    temperature: z.number(),
    humidity: z.number(),
    timestamp: z.number(),
  }),
});

export const DeviceRegistrationInput = z.object({
  workflowId: z.number(),
});

export const WorkFlowCreationIput = z.object({
  schemaID: z.string(),
});
