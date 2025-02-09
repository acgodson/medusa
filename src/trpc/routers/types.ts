import { z } from "zod";

export const DataCollectionInput = z.object({
  deviceId: z.string(),
  workflowId: z.string(),
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
