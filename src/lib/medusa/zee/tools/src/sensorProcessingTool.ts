import { z } from "zod";
import { createTool } from "@covalenthq/ai-agent-sdk";

export const createProcessingTool = () =>
  createTool({
    id: "data-processor",
    description: "Tool for analyzing sensor readings and determining responses",
    schema: z
      .object({
        operation: z.enum(["inferPolicy", "checkConditions"]),
        data: z.object({
          deviceId: z.string(),
          gatewayUrl: z.string(),
          timestamp: z.number(),
        }),
        context: z
          .object({
            task: z.string(),
            guidelines: z.array(z.string()),
            alertCriteria: z.array(z.string()),
          })
          .strict(),
      })
      .strict(),
    //@ts-ignore
    execute: async (params) => {
      try {
        console.log("Processing with params:", params);
        console.log("Fetching data from:", params.data.gatewayUrl);

        const response = await fetch(params.data.gatewayUrl);
        if (!response.ok) {
          throw new Error(
            `IPNS fetch failed: ${response.status} ${response.statusText}`
          );
        }

        // Mock data for fallback testing in case IPNS is not accessible
        // const mockData = {
        //   temperature: 32,
        //   humidity: 75,
        //   timestamp: Date.now(),
        // };
        // const sensorData = await response.json().catch(() => mockData);
        const sensorData = await response.json();
        console.log("Retrieved/Mock data:", sensorData);

        const result = {
          timestamp: Date.now(),
          deviceId: params.data.deviceId,
        };

        if (params.operation === "inferPolicy") {
          return {
            operation: "inferPolicy",
            usagePolicy: "Processed",
            retention: {
              duration: 30,
              reason: "Standard processing policy",
            },
            processingNotes: [
              `Data quality: Good`,
              `Temperature: ${sensorData.temperature}°C`,
              `Humidity: ${sensorData.humidity}%`,
              `Processing timestamp: ${new Date().toISOString()}`,
            ],
            confidence: 0.95,
          };
        } else {
          return {
            operation: "checkConditions",
            alerts: [
              sensorData.temperature > 30 ? "High temperature detected" : null,
              sensorData.humidity > 70 ? "High humidity detected" : null,
            ].filter(Boolean),
            conditions: {
              temperature: {
                value: sensorData.temperature,
                status: sensorData.temperature > 30 ? "warning" : "normal",
              },
              humidity: {
                value: sensorData.humidity,
                status: sensorData.humidity > 70 ? "warning" : "normal",
              },
            },
            suggestedActions: [
              "monitor_conditions",
              sensorData.temperature > 30 ? "reduce_temperature" : null,
              sensorData.humidity > 70 ? "reduce_humidity" : null,
            ].filter(Boolean),
            confidence: 0.9,
            analysisTimestamp: new Date().toISOString(),
          };
        }
      } catch (error: any) {
        console.error("Processing error:", error);
        throw error;
      }
    },
  });
