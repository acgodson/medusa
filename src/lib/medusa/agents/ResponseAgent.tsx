import { ZeeBaseAgent } from "./zee/base";
import { PrivyWalletConfig } from "./zee/tools/privyWalletTool";
import { createProcessingTool, createSmartWalletTool } from "./zee";



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
      description: "Agent for analyzing and inferring policies from sensor data",
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

    // Store the tool instance for direct execution
    this.dataProcessor = CreateProcessingTool;
  }

  async execute(params: {
    deviceId: string;
    data: any;
    storageConfirmation: {
      cid: string;
      ipnsId: string;
    };
  }) {
    try {
      console.log("Starting inference for device:", params.deviceId);
      const gatewayUrl = `https://gateway.lighthouse.storage/ipns/${params.storageConfirmation.ipnsId}`;

      // Execute policy inference directly
      console.log("Running policy analysis...");
      const policyAnalysis = await this.dataProcessor.execute({
        operation: "inferPolicy",
        data: {
          deviceId: params.deviceId,
          gatewayUrl,
          timestamp: Date.now(),
        },
        context: {
          task: "Policy Inference",
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
        },
      });

      console.log("Policy Analysis Result:", JSON.stringify(policyAnalysis, null, 2));

      // Execute conditions check directly
      console.log("Running conditions analysis...");
      const conditionsAnalysis = await this.dataProcessor.execute({
        operation: "checkConditions",
        data: {
          deviceId: params.deviceId,
          gatewayUrl,
          timestamp: Date.now(),
        },
        context: {
          task: "Condition Check",
          alertCriteria: [
            "Check for readings outside normal ranges",
            "Identify rapid changes or anomalies",
            "Flag data quality issues",
            "Monitor for system health indicators",
          ],
          guidelines: [
            "Analyze data quality and completeness",
            "Detect anomalies in sensor readings",
            "Consider historical context",
            "Classify usage as Processed/Analyzed/Monetized",
            "Determine retention period based on data significance",
          ],
        },
      });

      console.log("Conditions Analysis Result:", JSON.stringify(conditionsAnalysis, null, 2));

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
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}