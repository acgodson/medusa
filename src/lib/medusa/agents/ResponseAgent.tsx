import { ZeeBaseAgent } from "./zee/base";
import { WalletBridge } from "../wallets/server";
import { PrivyWalletConfig } from "./zee/tools/privyWalletTool";
import { createProcessingTool, createSmartWalletTool } from "./zee";

//  types for analysis results
// interface AnalysisResult {
//   deviceId: string;
//   timestamp: number;
//   thresholds: {
//     temperature?: {
//       exceeded: boolean;
//       value: number;
//       threshold: number;
//     };
//     humidity?: {
//       exceeded: boolean;
//       value: number;
//       threshold: number;
//     };
//   };
//   recommendations?: string[];
//   alerts?: string[];
// }

// Updated Response Agent
export class ResponseAgent extends ZeeBaseAgent {
  constructor(config: {
    openAiKey: string;
    privyConfig: PrivyWalletConfig;
    rpcUrl: string;
  }) {
    const walletBridge = new WalletBridge(
      config.privyConfig.appId,
      config.privyConfig.appSecret,
      config.rpcUrl
    );

    const CreateSmartWalletTool = createSmartWalletTool(walletBridge);
    const CreateProcessingTool = createProcessingTool();

    super({
      name: "Response Agent",
      description: "Policy inference engine for sensor data",
      instructions: [
        "1. Use data-processor tool to analyze incoming data",
        "2. Determine appropriate policies and actions based on your inference",
        "3. Handle any alerts or actions suggested by the processor",
        "4. Update state contract when significant changes are detected",
      ],
      tools: {
        "smart-wallet": CreateSmartWalletTool,
        "data-processor": CreateProcessingTool,
      },
      openAiKey: config.openAiKey,
    });
  }

  async execute(params: {
    deviceId: string;
    data: any;
    storageConfirmation: {
      cid: string;
      ipnsName: string;
    };
  }) {
    try {
      console.log("Starting inference for device:", params.deviceId);

      // Let AI infer policy
      const policyResult = await this.zeeAgent.tools?.[
        "data-processor"
      ].execute({
        operation: "inferPolicy",
        data: {
          deviceId: params.deviceId,
          ...params.data,
          timestamp: Date.now(),
        },
      });

      // Check conditions using AI
      const conditionsResult = await this.zeeAgent.tools?.[
        "data-processor"
      ].execute({
        operation: "checkConditions",
        data: {
          deviceId: params.deviceId,
          ...params.data,
          timestamp: Date.now(),
        },
      });

      const policy = JSON.parse(policyResult);
      const conditions = JSON.parse(conditionsResult);

      // Construct inference result
      const inference = {
        deviceId: params.deviceId,
        timestamp: Date.now(),
        ...policy,
        ...conditions,
        storageRef: {
          cid: params.storageConfirmation.cid,
          ipnsName: params.storageConfirmation.ipnsName,
        },
      };

      // Update state if needed
      if (conditions.suggestedActions?.length > 0) {
        await this.zeeAgent.tools?.["smart-wallet"].execute({
          operation: "broadcast",
          walletId: "response-agent",
          txData: {
            contractAddress: process.env.STATE_CONTRACT_ADDRESS!,
            data: JSON.stringify(inference),
          },
        });
      }

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
