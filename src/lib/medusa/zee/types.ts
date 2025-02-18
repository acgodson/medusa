import { z } from "zod";
import type {
  createTool,
  ModelConfig,
  Agent as ZeeAgent,
} from "@covalenthq/ai-agent-sdk";

// Common schema definitions
export const DataSchema = z.object({
  deviceId: z.string(),
  data: z.object({
    temperature: z.number(),
    humidity: z.number(),
    timestamp: z.number(),
  }),
});

export const NoiseDataSchema = z.object({
  deviceId: z.string(),
  sessionId: z.string(),
  data: z.record(
    // Key is formatted as "lat|lng" with 5 decimal precision
    z.string().regex(/^-?\d+\.\d{5}\|-?\d+\.\d{5}$/),
    z.object({
      noise: z.number(),
      minNoise: z.number(),
      maxNoise: z.number(),
      samples: z.number(),
      accuracy: z.number(),
      timestamp: z.number(),
      spikes: z.number().default(0),
    })
  ),
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
});

export interface ToolConfig {
  id: string;
  description: string;
  schema: z.ZodType<any>;
}

export interface AgentConfig {
  name: string;
  model: ModelConfig;
  description: string;
  instructions: string[];
  tools: Record<string, ReturnType<typeof createTool>>;
  defaultTask?: string; // Optional default task description
}

export interface AgentStateParams {
  task?: string;
  data: any;
}

export interface BaseAgent {
  initialize(): Promise<boolean>;
  execute(params: any): Promise<any>;
}

export type SensorData = {
  temperature: number;
  humidity: number;
  timestamp: number;
};

export type Stats = {
  min: number;
  max: number;
  average: number;
  variance: number;
};

// Schema Definitions
export const sensorDataSchema = z
  .object({
    temperature: z.number(),
    humidity: z.number(),
    timestamp: z.number(),
  })
  .strict();

export const contextSchema = z
  .object({
    task: z.string(),
    guidelines: z.array(z.string()),
    alertCriteria: z.array(z.string()),
  })
  .strict();

export const policySchema = z
  .object({
    analysis: z
      .object({
        usagePolicy: z.enum(["Processed", "Analyzed", "Monetized"]),
        retention: z
          .object({
            duration: z.number(),
            reason: z.string(),
          })
          .strict(),
        insights: z.array(z.string()),
        recommendations: z.array(z.string()),
      })
      .strict(),
  })
  .strict();

export const conditionsSchema = z
  .object({
    conditions: z
      .object({
        alerts: z.array(z.string()),
        temperatureStatus: z.string(),
        temperatureTrend: z.string(),
        temperatureExplanation: z.string(),
        humidityStatus: z.string(),
        humidityTrend: z.string(),
        humidityExplanation: z.string(),
        suggestedActions: z.array(z.string()),
      })
      .strict(),
  })
  .strict();

export const ProcessingInputSchema = z
  .object({
    deviceId: z.string(),
    latestData: sensorDataSchema,
    workflowId: z.string(),
    timestamp: z.number(),
  })
  .strict();
