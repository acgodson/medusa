import { CollectionAgent } from "../agents/CollectionAgent";
import { PrivyWalletConfig } from "../agents/zee/tools";
import { WalletBridge } from "../wallets/server";

// interface MedusaState {
//   dataCollectionStatus: "idle" | "collecting" | "processing" | "complete";
//   analyticsStatus: "idle" | "analyzing" | "complete";
//   lastProcessedData: any;
//   alerts: Array<{ threshold: number; value: number; timestamp: number }>;
// }

export class MedusaBridge {
  private static instance: MedusaBridge;
  private agents: Map<string, any> = new Map();
  private walletBridge: WalletBridge;

  private constructor(
    private config: {
      openAiKey: string;
      privyConfig: PrivyWalletConfig;
      rpcUrl: string;
      lighthouseApiKey: string;
    }
  ) {
    this.walletBridge = new WalletBridge(
      config.privyConfig.appId,
      config.privyConfig.appSecret,
      config.rpcUrl
    );
  }

  getPrivyClient() {
    return this.walletBridge.privy;
  }

  static async connect(config?: {
    openAiKey: string;
    privyConfig: PrivyWalletConfig;
    rpcUrl: string;
    lighthouseApiKey: string;
  }) {
    if (!MedusaBridge.instance && config) {
      MedusaBridge.instance = new MedusaBridge(config);
    }
    return MedusaBridge.instance;
  }

  async getZeeAgent(type: string) {
    if (!this.agents.has(type)) {
      switch (type) {
        case "dataCollection":
          this.agents.set(
            type,
            new CollectionAgent({
              openAiKey: this.config.openAiKey,
              privyConfig: this.config.privyConfig,
              lighthouseApiKey: this.config.lighthouseApiKey,
            })
          );
          break;
        default:
          throw new Error(`Unknown Zee agent type: ${type}`);
      }
    }
    return this.agents.get(type);
  }

  async executeOperation(operation: string, params: any) {
    const [system, agentType, action] = operation.split(".");

    switch (system) {
      case "zee":
        const zeeAgent = await this.getZeeAgent(agentType);
        return zeeAgent.execute({
          ...params,
        });

      case "cdp":
        return this.walletBridge.executeOperation(
          params.walletId,
          params.contractAddress,
          params.data
        );

      default:
        throw new Error(`Unknown agent system: ${system}`);
    }
  }
}

// // Add workflow management
// async executeWorkflow(workflowType: string, params: any) {
//   const workflow = await this.getWorkflow(workflowType);
//   const result = await workflow.execute(params);

//   // Trigger analytics if needed
//   if (this.shouldTriggerAnalytics(result)) {
//     await this.triggerAnalytics(result);
//   }

//   // Update state contract
//   await this.updateState(result);

//   return result;
// }

// private async updateState(result: any) {
//   const stateUpdate = await this.walletBridge.executeOperation(
//     "cdp.stateContract.update",
//     {
//       data: result,
//       contractAddress: this.config.stateContractAddress,
//     }
//   );
//   return stateUpdate;
// }
