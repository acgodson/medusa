import { z } from "zod";
import type { createTool, Agent as ZeeAgent } from "@covalenthq/ai-agent-sdk";

// Common schema definitions
export const DataSchema = z.object({
  deviceId: z.string(),
  data: z.object({
    temperature: z.number(),
    humidity: z.number(),
    timestamp: z.number(),
  }),
});

export interface ToolConfig {
  id: string;
  description: string;
  schema: z.ZodType<any>;
}

export interface AgentConfig {
  name: string;
  description: string;
  instructions: string[];
  openAiKey: string;
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

