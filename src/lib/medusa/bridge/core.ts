import { DataCollectionAgent } from "../agents/dataCollectionAgent";
import { PrivyWalletConfig } from "../agents/zee/tools";
import { WalletBridge } from "../wallets/server";
import { Hex } from "viem";

export class MedusaBridge {
  private static instance: MedusaBridge;
  private agents: Map<string, any> = new Map();
  private walletBridge: WalletBridge;

  private constructor(
    private config: {
      openAiKey: string;
      privyConfig: PrivyWalletConfig;
      rpcUrl: string;
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
            new DataCollectionAgent({
              openAiKey: this.config.openAiKey,
              privyConfig: this.config.privyConfig,
            })
          );
          break;
        default:
          throw new Error(`Unknown Zee agent type: ${type}`);
      }
    }
    return this.agents.get(type);
  }
  // Fix the execute operation params in MedusaBridge:
  async executeOperation(operation: string, params: any) {
    const [system, agentType, action] = operation.split(".");

    switch (system) {
      case "zee":
        const zeeAgent = await this.getZeeAgent(agentType);
        // Add required message field
        return zeeAgent.execute({
          ...params.data,
          message: `Sensor data from device ${params.data.deviceId}`, // Default message
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
