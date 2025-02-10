//@ts-nocheck
import { z } from "zod";
import { createTool, LLM } from "@covalenthq/ai-agent-sdk";

export const createProcessingTool = () => {
  // Initialize LLM
  const llm = new LLM({
    provider: "OPEN_AI",
    name: "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Define analysis tools for the LLM with strict schemas
  const analysisTool = createTool({
    id: "analyze-sensor-data",
    description: "Tool for analyzing sensor data patterns and generating insights",
    schema: z.object({
      data: z.object({
        temperature: z.number(),
        humidity: z.number(),
        historical: z.array(
          z.object({
            temperature: z.number(),
            humidity: z.number(),
            timestamp: z.number(),
          }).strict()
        ),
      }).strict(),
    }).strict(),
    execute: async (params) => {
      return JSON.stringify(params.data);
    },
  });

  return createTool({
    id: "data-processor",
    description: "AI-powered tool for analyzing sensor readings and determining responses",
    schema: z.object({
      operation: z.enum(["inferPolicy", "checkConditions"]),
      data: z.object({
        deviceId: z.string(),
        latestData: z.object({
          temperature: z.number(),
          humidity: z.number(),
          timestamp: z.number(),
        }).strict(),
        gatewayUrl: z.string(),
        timestamp: z.number(),
      }).strict(),
      context: z.object({
        task: z.string(),
        guidelines: z.array(z.string()),
        alertCriteria: z.array(z.string()),
      }).strict(),
    }).strict(),

    execute: async (params) => {
      try {
        // Fetch historical data
        const response = await fetch(params.data.gatewayUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch IPNS data: ${response.statusText}`);
        }

        const ipnsData = await response.json();
        const historicalData = ipnsData.items || [];
        const latestData = params.data.latestData;
        const allData = [latestData, ...historicalData];

        // Validate we have enough data points
        if (allData.length === 0) {
          throw new Error('No sensor data available for analysis');
        }

        // Base stats for context
        const tempStats = calculateStats(allData.map((d) => d.temperature));
        const humidityStats = calculateStats(allData.map((d) => d.humidity));

        // Define tools for LLM
        const tools = {
          "analyze-sensor-data": analysisTool,
        };

        let aiResult;
        
        if (params.operation === "inferPolicy") {
          const messages = [
            {
              role: "system",
              content: "You are an intelligent sensor analysis system that provides detailed insights and policy recommendations based on environmental data.",
            },
            {
              role: "user",
              content: `Analyze this sensor data and provide policy recommendations:
                Current Reading: Temperature ${latestData.temperature}°C, Humidity ${latestData.humidity}%
                Historical Context: ${JSON.stringify(historicalData.slice(0, 5))}
                Statistical Summary: 
                - Temperature: Range ${tempStats.min}°C to ${tempStats.max}°C, Avg ${tempStats.average.toFixed(1)}°C
                - Humidity: Range ${humidityStats.min}% to ${humidityStats.max}%, Avg ${humidityStats.average.toFixed(1)}%
                Guidelines: ${params.context.guidelines.join(", ")}
                
                Provide a detailed analysis including:
                1. Usage policy (Processed/Analyzed/Monetized)
                2. Retention period and justification
                3. Key insights from the data
                4. Recommendations for action`,
            },
          ];

          const policySchema = z.object({
            analysis: z.object({
              usagePolicy: z.enum(["Processed", "Analyzed", "Monetized"]),
              retention: z.object({
                duration: z.number(),
                reason: z.string(),
              }).strict(),
              insights: z.array(z.string()),
              recommendations: z.array(z.string()),
            }).strict(),
          }).strict();

          aiResult = await llm.generate(
            messages,
            { analysis: policySchema },
            tools
          );

          // Handle tool call responses
          if (aiResult.type === "tool_call") {
            // Process all tool calls
            const toolResults = await Promise.all(
              aiResult.value.map(async (call) => {
                if (call.type === "function" && call.function.name === "analyze-sensor-data") {
                  // Execute the tool and get the result
                  const toolResponse = await analysisTool.execute(call.function.parsed_arguments);
                  
                  // Add the tool response and explicit instruction for final analysis
                  const updatedMessages = [
                    ...messages,
                    {
                      role: "assistant",
                      content: `Tool response: ${toolResponse}`,
                    },
                    {
                      role: "user",
                      content: `Based on the sensor data analysis above, please provide your final analysis and policy recommendations. 
                      Do not make any more tool calls - instead provide a direct analysis response that matches the required schema with:
                      1. Usage policy (Processed/Analyzed/Monetized)
                      2. Retention period and justification
                      3. Key insights from the data
                      4. Recommendations for action`,
                    },
                  ];
                  
                  // Generate final analysis with tool results
                  const finalResult = await llm.generate(
                    updatedMessages,
                    { analysis: policySchema },
                    {} // Remove tools to prevent further tool calls
                  );
                  
                  if (finalResult.type !== "analysis") {
                    throw new Error(`Expected analysis result, got: ${JSON.stringify(finalResult)}`);
                  }
                  
                  return finalResult;
                }
                throw new Error(`Unsupported function call: ${call.function.name}`);
              })
            );
            
            // Use the last result as our final analysis
            aiResult = toolResults[toolResults.length - 1];
          }

          if (!("type" in aiResult) || aiResult.type !== "analysis") {
            throw new Error(`Invalid analysis result: ${JSON.stringify(aiResult)}`);
          }

          return JSON.stringify({
            operation: "inferPolicy",
            ...aiResult.value,
            statistics: {
              temperature: tempStats,
              humidity: humidityStats,
            },
            confidence: calculateConfidence(allData.length),
            processingTimestamp: new Date().toISOString(),
          });

        } else if (params.operation === "checkConditions") {
          const messages = [
            {
              role: "system",
              content: "You are an intelligent condition monitoring system that analyzes sensor data for anomalies and provides actionable insights.",
            },
            {
              role: "user",
              content: `Analyze these sensor readings for conditions and anomalies:
                Current Reading: Temperature ${latestData.temperature}°C, Humidity ${latestData.humidity}%
                Historical Context: ${JSON.stringify(historicalData.slice(0, 5))}
                Alert Criteria: ${params.context.alertCriteria.join(", ")}
                
                Provide a detailed analysis including:
                1. Any alerts or anomalies that need attention
                2. For temperature:
                   - Current status (normal/warning/critical)
                   - Trend (stable/increasing/decreasing)
                   - Brief explanation
                3. For humidity:
                   - Current status (normal/warning/critical)
                   - Trend (stable/increasing/decreasing)
                   - Brief explanation
                4. Suggested actions to maintain or improve conditions`,
            },
          ];

          const conditionsSchema = z.object({
            conditions: z.object({
              alerts: z.array(z.string()),
              temperatureStatus: z.string(),
              temperatureTrend: z.string(),
              temperatureExplanation: z.string(),
              humidityStatus: z.string(),
              humidityTrend: z.string(),
              humidityExplanation: z.string(),
              suggestedActions: z.array(z.string()),
            }).strict(),
          }).strict();

          aiResult = await llm.generate(
            messages,
            { conditions: conditionsSchema },
            tools
          );

          // Handle tool call responses
          if (aiResult.type === "tool_call") {
            // Process all tool calls
            const toolResults = await Promise.all(
              aiResult.value.map(async (call) => {
                if (call.type === "function" && call.function.name === "analyze-sensor-data") {
                  // Execute the tool and get the result
                  const toolResponse = await analysisTool.execute(call.function.parsed_arguments);
                  
                  // Add the tool response and explicit instruction for final conditions
                  const updatedMessages = [
                    ...messages,
                    {
                      role: "assistant",
                      content: `Tool response: ${toolResponse}`,
                    },
                    {
                      role: "user",
                      content: `Based on the sensor data analysis above, please provide your final conditions assessment. 
                      Do not make any more tool calls - instead provide a direct conditions response that matches the required schema with:
                      1. Any alerts or anomalies that need attention
                      2. Temperature status, trend, and explanation
                      3. Humidity status, trend, and explanation
                      4. Suggested actions to maintain or improve conditions`,
                    },
                  ];
                  
                  // Generate final conditions with tool results
                  const finalResult = await llm.generate(
                    updatedMessages,
                    { conditions: conditionsSchema },
                    {} // Remove tools to prevent further tool calls
                  );
                  
                  if (finalResult.type !== "conditions") {
                    throw new Error(`Expected conditions result, got: ${JSON.stringify(finalResult)}`);
                  }
                  
                  return finalResult;
                }
                throw new Error(`Unsupported function call: ${call.function.name}`);
              })
            );
            
            // Use the last result as our final analysis
            aiResult = toolResults[toolResults.length - 1];
          }

          if (!("type" in aiResult) || aiResult.type !== "conditions") {
            throw new Error(`Invalid conditions result: ${JSON.stringify(aiResult)}`);
          }

          return JSON.stringify({
            operation: "checkConditions",
            ...aiResult.value,
            statistics: {
              temperature: tempStats,
              humidity: humidityStats,
            },
            analysisTimestamp: new Date().toISOString(),
          });

        } else {
          throw new Error(`Unsupported operation: ${params.operation}`);
        }

      } catch (error) {
        console.error("Processing error:", error);
        // Rethrow with more context if it's not already an Error object
        if (error instanceof Error) {
          throw error;
        }
        throw new Error(`Processing failed: ${error}`);
      }
    },
  });
};

// Helper functions
function calculateStats(values: number[]) {
  if (values.length === 0) {
    throw new Error('Cannot calculate stats for empty dataset');
  }
  
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

function calculateConfidence(dataPoints: number): number {
  const baseConfidence = 0.7;
  const dataConfidence = Math.min(dataPoints / 100, 0.2);
  return Math.min(baseConfidence + dataConfidence, 0.95);
}