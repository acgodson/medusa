import { z } from "zod";
import { createTool, LLM } from "@covalenthq/ai-agent-sdk";
import {
  conditionsSchema,
  contextSchema,
  policySchema,
  ProcessingInputSchema,
} from "../../types";
import { ToolFactory } from "./utils/ToolFactory";
import { StatsCalculator } from "./utils/StatsCalculator";
import { MessageBuilder } from "./utils/MessageBuilder";

type ProcessingConfig = {
  llm: LLM;
};

// LLM Handler
class LLMHandler {
  private llm: LLM;
  private analysisTool: ReturnType<typeof ToolFactory.createAnalysisTool>;

  constructor(llm: LLM) {
    this.llm = llm;
    this.analysisTool = ToolFactory.createAnalysisTool();
  }

  async handleToolCalls(messages: any[], schema: any, toolCallResults: any[]) {
    const updatedMessages = [
      ...messages,
      {
        role: "assistant",
        content: `Tool response: ${toolCallResults.join(", ")}`,
      },
      {
        role: "user",
        content:
          "Based on the sensor data analysis above, please provide your final analysis. Do not make any more tool calls - instead provide a direct response that matches the required schema.",
      },
    ];

    return this.llm.generate(updatedMessages, schema, {});
  }

  async processLLMResponse(aiResult: any, messages: any[], schema: any) {
    if (aiResult.type === "tool_call") {
      const toolResults = await Promise.all(
        aiResult.value.map(async (call: any) => {
          if (
            call.type === "function" &&
            call.function.name === "analyze-sensor-data"
          ) {
            const toolResponse = await this.analysisTool.execute(
              call.function.parsed_arguments
            );
            const finalResult = await this.handleToolCalls(messages, schema, [
              toolResponse,
            ]);
            return finalResult;
          }
          throw new Error(`Unsupported function call: ${call.function.name}`);
        })
      );
      return toolResults[toolResults.length - 1];
    }
    return aiResult;
  }
}

export const createProcessingTool = (config: ProcessingConfig) => {
  const llmHandler = new LLMHandler(config.llm);

  return createTool({
    id: "data-processor",
    description:
      "AI-powered tool for analyzing sensor readings and determining responses",
    schema: z
      .object({
        operation: z.enum(["inferPolicy", "checkConditions"]),
        data: ProcessingInputSchema,
        context: contextSchema,
      })
      .strict(),

    execute: async (params: any) => {
      try {
        const latestData = params.data.latestData;
        const historicalData = params.data.historicalData || [];
        const allData = [latestData, ...historicalData];

        // Validate we have enough data points
        if (allData.length === 0) {
          throw new Error("No sensor data available for analysis");
        }

        const tempStats = StatsCalculator.calculate(
          allData.map((d) => d.temperature)
        );
        const humidityStats = StatsCalculator.calculate(
          allData.map((d) => d.humidity)
        );

        const tools = {
          "analyze-sensor-data": ToolFactory.createAnalysisTool(),
        };

        if (params.operation === "inferPolicy") {
          const messages = MessageBuilder.createPolicyAnalysisMessage(
            latestData,
            historicalData,
            tempStats,
            humidityStats,
            params.context.guidelines
          );

          let aiResult = await config.llm.generate(
            messages as any,
            { analysis: policySchema },
            tools
          );

          aiResult = await llmHandler.processLLMResponse(aiResult, messages, {
            analysis: policySchema,
          });

          if (!("type" in aiResult) || aiResult.type !== "analysis") {
            throw new Error(
              `Invalid analysis result: ${JSON.stringify(aiResult)}`
            );
          }

          return JSON.stringify({
            operation: "inferPolicy",
            ...aiResult.value,
            statistics: { temperature: tempStats, humidity: humidityStats },
            confidence: StatsCalculator.calculateConfidence(allData.length),
            processingTimestamp: new Date().toISOString(),
          });
        } else if (params.operation === "checkConditions") {
          const messages = MessageBuilder.createConditionsAnalysisMessage(
            latestData,
            historicalData,
            params.context.alertCriteria
          );

          let aiResult = await config.llm.generate(
            messages as any,
            { conditions: conditionsSchema },
            tools
          );

          aiResult = await llmHandler.processLLMResponse(aiResult, messages, {
            conditions: conditionsSchema,
          });

          if (!("type" in aiResult) || aiResult.type !== "conditions") {
            throw new Error(
              `Invalid conditions result: ${JSON.stringify(aiResult)}`
            );
          }

          return JSON.stringify({
            operation: "checkConditions",
            ...aiResult.value,
            statistics: { temperature: tempStats, humidity: humidityStats },
            analysisTimestamp: new Date().toISOString(),
          });
        }

        throw new Error(`Unsupported operation: ${params.operation}`);
      } catch (error) {
        console.error("Processing error:", error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error(`Processing failed: ${error}`);
      }
    },
  });
};
