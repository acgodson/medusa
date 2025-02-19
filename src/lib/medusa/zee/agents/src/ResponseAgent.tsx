import { ZeeBaseAgent } from "../base";
import { createProcessingTool } from "../../tools";
import { ServerWallet } from "@/lib/medusa/wallets/server-smart-wallet";
import { LLM, ModelConfig } from "@covalenthq/ai-agent-sdk";

type ResponseAgentConfig = {
  model: ModelConfig;
  rpcUrl: string;
  chainId: string;
  greenfieldChainId: string;
  greenfieldRpcUrl: string;
  walletId: string;
  adminAddress: string;
  adminPrivateKey: string;
  serverWallet: ServerWallet;
};

export class ResponseAgent extends ZeeBaseAgent {
  private dataProcessor: ReturnType<typeof createProcessingTool>;

  constructor(config: ResponseAgentConfig) {
    const llm = new LLM(config.model);

    const CreateProcessingTool = createProcessingTool({ llm });

    super({
      model: config.model,
      name: "Response Agent",
      description:
        "Agent for analyzing and inferring policies from sensor data",
      instructions: [
        "When analyzing sensor data:",
        "1. Execute the data-processor tool with inferPolicy operation",
        "2. Execute the data-processor tool with checkConditions operation",
        "3. Combine results into a comprehensive analysis",
      ],
      tools: {
        "data-processor": CreateProcessingTool,
      },
      defaultTask: "Analyze sensor data and infer policies",
    });

    this.dataProcessor = CreateProcessingTool;
  }

  async execute(params: {
    deviceId: string;
    data: {
      temperature: number;
      humidity: number;
      timestamp: number;
    };
    historicalData?: Array<{
      temperature: number;
      humidity: number;
      timestamp: number;
    }>;
    workflowId: string;
    storageConfirmation: {
      bucketName: string;
      objectName: string;
    };
  }) {
    try {
      console.log("Starting inference for device:", params.deviceId);

      const historicalData = params.historicalData || [];

      // Common context for all operations
      const context = {
        task: "Sensor Data Analysis",
        guidelines: [
          "Analyze data quality and completeness",
          "Detect anomalies in sensor readings",
          "Consider historical context",
          "Classify usage as Processed/Analyzed/Monetized",
          "Determine retention period based on data significance",
        ],
        alertCriteria: [
          "Check for readings outside normal ranges",
          "Identify rapid changes or anomalies",
          "Flag data quality issues",
          "Monitor for system health indicators",
        ],
      };

      // Execute policy inference
      console.log("Running policy analysis...");
      const policyAnalysisStr = await this.dataProcessor.execute({
        operation: "inferPolicy",
        data: {
          deviceId: params.deviceId,
          latestData: params.data,
          historicalData,
          workflowId: params.workflowId,
          timestamp: Date.now(),
        },
        context: {
          ...context,
          task: "Policy Inference",
        },
      });

      const policyAnalysis = JSON.parse(policyAnalysisStr);
      console.log("Policy Analysis Result:", policyAnalysis);

      // Execute conditions check
      console.log("Running conditions analysis...");
      const conditionsAnalysisStr = await this.dataProcessor.execute({
        operation: "checkConditions",
        data: {
          deviceId: params.deviceId,
          latestData: params.data,
          historicalData,
          workflowId: params.workflowId,
          timestamp: Date.now(),
        },
        context: {
          ...context,
          task: "Condition Check",
        },
      });

      const conditionsAnalysis = JSON.parse(conditionsAnalysisStr);
      console.log("Conditions Analysis Result:", conditionsAnalysis);

      // Combine results into final inference
      const inference = {
        deviceId: params.deviceId,
        timestamp: Date.now(),
        analysis: {
          policy: policyAnalysis,
          conditions: conditionsAnalysis,
          metadata: {
            analysisTime: new Date().toISOString(),
            dataSource: params.workflowId,
            latestReading: params.data,
          },
        },
        storageRef: {
          bucketName: params.storageConfirmation.bucketName,
          objectName: params.storageConfirmation.objectName,
        },
      };

      return {
        success: true,
        inference,
      };
    } catch (error: any) {
      console.error("Response agent execution failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
