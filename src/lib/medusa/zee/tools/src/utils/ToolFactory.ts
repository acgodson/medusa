import { createTool } from "@covalenthq/ai-agent-sdk";
import { z } from "zod";
import { sensorDataSchema } from "../../../types";

export class ToolFactory {
  static createAnalysisTool() {
    return createTool({
      id: "analyze-sensor-data",
      description:
        "Tool for analyzing sensor data patterns and generating insights",
      schema: z
        .object({
          data: z
            .object({
              temperature: z.number(),
              humidity: z.number(),
              historical: z.array(sensorDataSchema),
            })
            .strict(),
        })
        .strict(),
      execute: async (params: any) => {
        return JSON.stringify(params.data);
      },
    });
  }
}
