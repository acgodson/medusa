import { ZeeBaseAgent } from "../base";
import { createProcessingTool } from "../../tools";
import { PrivyWalletConfig } from "../../tools/src/privyWalletTool";

export class ResponseAgent extends ZeeBaseAgent {
  private dataProcessor: ReturnType<typeof createProcessingTool>;

  constructor(config: {
    openAiKey: string;
    privyConfig: PrivyWalletConfig;
    rpcUrl: string;
  }) {
    const CreateProcessingTool = createProcessingTool();
    super({
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
      openAiKey: config.openAiKey,
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
    storageConfirmation: {
      cid: string;
      ipnsId: string;
    };
  }) {
    try {
      console.log("Starting inference for device:", params.deviceId);

      const gatewayUrl = `https://gateway.lighthouse.storage/ipns/${params.storageConfirmation.ipnsId}`;

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
          gatewayUrl,
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
          gatewayUrl,
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
            dataSource: gatewayUrl,
            latestReading: params.data,
          },
        },
        storageRef: {
          cid: params.storageConfirmation.cid,
          ipnsId: params.storageConfirmation.ipnsId,
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
