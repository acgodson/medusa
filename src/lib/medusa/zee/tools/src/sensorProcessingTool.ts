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
          latestData: z.object({
            temperature: z.number(),
            humidity: z.number(),
            timestamp: z.number(),
          }),
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
    execute: async (params) => {
      try {
        console.log("Processing with params:", params);
        console.log("Fetching data from:", params.data.gatewayUrl);

        // Fetch historical data from IPNS
        const response = await fetch(params.data.gatewayUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch IPNS data: ${response.statusText}`);
        }

        const ipnsData = await response.json();
        const historicalData = ipnsData.items || [];
        const latestData = params.data.latestData;

        // Combine latest and historical data for analysis
        const allData = [latestData, ...historicalData];

        // Calculate statistics
        const tempStats = calculateStats(allData.map((d) => d.temperature));
        const humidityStats = calculateStats(allData.map((d) => d.humidity));

        let result;
        if (params.operation === "inferPolicy") {
          result = {
            operation: "inferPolicy",
            usagePolicy: "Processed",
            retention: {
              duration: 30,
              reason: "Standard processing policy",
            },
            processingNotes: [
              `Data quality: Good`,
              `Current Temperature: ${latestData.temperature}°C`,
              `Current Humidity: ${latestData.humidity}%`,
              `Average Temperature: ${tempStats.average.toFixed(1)}°C`,
              `Average Humidity: ${humidityStats.average.toFixed(1)}%`,
              `Temperature Range: ${tempStats.min}°C - ${tempStats.max}°C`,
              `Humidity Range: ${humidityStats.min}% - ${humidityStats.max}%`,
              `Data Points Analyzed: ${allData.length}`,
              `Processing timestamp: ${new Date().toISOString()}`,
            ],
            statistics: {
              temperature: tempStats,
              humidity: humidityStats,
            },
            confidence: 0.95,
          };
        } else {
          // Analyze trends
          const tempTrend = analyzeTrend(allData.map((d) => d.temperature));
          const humidityTrend = analyzeTrend(allData.map((d) => d.humidity));

          result = {
            operation: "checkConditions",
            alerts: [
              latestData.temperature > 30 ? "High temperature detected" : null,
              latestData.humidity > 70 ? "High humidity detected" : null,
              tempTrend.rapid ? "Rapid temperature change detected" : null,
              humidityTrend.rapid ? "Rapid humidity change detected" : null,
            ].filter(Boolean),
            conditions: {
              temperature: {
                current: latestData.temperature,
                average: tempStats.average,
                trend: tempTrend.direction,
                status: getStatus(latestData.temperature, 20, 30),
              },
              humidity: {
                current: latestData.humidity,
                average: humidityStats.average,
                trend: humidityTrend.direction,
                status: getStatus(latestData.humidity, 30, 70),
              },
            },
            suggestedActions: generateActions(
              latestData,
              tempTrend,
              humidityTrend
            ),
            confidence: 0.9,
            analysisTimestamp: new Date().toISOString(),
          };
        }

        // Return the result as a JSON string
        return JSON.stringify(result);
      } catch (error: any) {
        console.error("Processing error:", error);
        throw error;
      }
    },
  });

function calculateStats(values: number[]) {
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    average: sum / values.length,
    variance:
      values.reduce(
        (acc, val) => acc + Math.pow(val - sum / values.length, 2),
        0
      ) / values.length,
  };
}

function analyzeTrend(values: number[]) {
  if (values.length < 2) return { direction: "stable", rapid: false };

  const changes = values.slice(0, -1).map((val, i) => values[i + 1] - val);
  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
  const rapid = Math.abs(avgChange) > 2;

  return {
    direction:
      avgChange > 0.1
        ? "increasing"
        : avgChange < -0.1
        ? "decreasing"
        : "stable",
    rapid,
  };
}

function getStatus(value: number, lowThreshold: number, highThreshold: number) {
  if (value > highThreshold) return "warning_high";
  if (value < lowThreshold) return "warning_low";
  return "normal";
}

function generateActions(current: any, tempTrend: any, humidityTrend: any) {
  const actions = ["monitor_conditions"];

  if (current.temperature > 30 || tempTrend.rapid)
    actions.push("adjust_temperature");
  if (current.humidity > 70 || humidityTrend.rapid)
    actions.push("adjust_humidity");
  if (tempTrend.rapid || humidityTrend.rapid)
    actions.push("increase_monitoring_frequency");

  return actions;
}
