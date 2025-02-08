import {
  CollectionAgent,
  BroadcastingAgent,
  ResponseAgent,
} from "../zee/agents";
import { WalletBridge } from "../wallets/broadcast-server";
import { PrivyWalletConfig } from "../zee/tools/src/privyWalletTool";
import { ZeeWorkflow } from "@covalenthq/ai-agent-sdk";

interface MedusaWorkflowState {
  dataCollectionStatus: "idle" | "collecting" | "processing" | "complete";
  broadcastStatus: "idle" | "broadcasting" | "complete";
  analyticsStatus: "idle" | "analyzing" | "complete";
  collectionResult?: any;
  broadcastResult?: any;
  analysisResult?: any;
}

export class MedusaBridge {
  private static instance: MedusaBridge;
  private agents: Map<string, any> = new Map();
  private walletBridge: WalletBridge;
  private workflow: ZeeWorkflow;

  private constructor(
    private config: {
      openAiKey: string;
      privyConfig: PrivyWalletConfig;
      rpcUrl: string;
      lighthouseApiKey: string;
      adminPrivateKey: string;
      contractAddress: `0x${string}`;
    }
  ) {
    this.walletBridge = new WalletBridge(
      config.privyConfig.appId,
      config.privyConfig.appSecret,
      config.rpcUrl,
      config.adminPrivateKey
    );

    // Initialize all agents
    this.initializeAgents();

    // Create workflow
    this.workflow = new ZeeWorkflow({
      description: "Medusa data processing and analysis workflow",
      output: "Process and analyze sensor data with storage confirmation",
      agents: {
        collector: this.agents.get("dataCollection"),
        broadcaster: this.agents.get("broadcasting"),
        analyzer: this.agents.get("response"),
      },
    });
  }

  private initializeAgents() {
    // Data Collection Agent
    this.agents.set(
      "dataCollection",
      new CollectionAgent({
        openAiKey: this.config.openAiKey,
        privyConfig: this.config.privyConfig,
        lighthouseApiKey: this.config.lighthouseApiKey,
      })
    );

    // Broadcasting Agent
    this.agents.set(
      "broadcasting",
      new BroadcastingAgent({
        openAiKey: this.config.openAiKey,
        privyConfig: this.config.privyConfig,
        lighthouseApiKey: this.config.lighthouseApiKey,
        rpcUrl: this.config.rpcUrl,
        contractAddress: this.config.contractAddress,
        adminPrivateKey: this.config.adminPrivateKey,
      })
    );

    // Response Agent
    this.agents.set(
      "response",
      new ResponseAgent({
        openAiKey: this.config.openAiKey,
        privyConfig: this.config.privyConfig,
        rpcUrl: this.config.rpcUrl,
      })
    );
  }

  static async connect(config: {
    openAiKey: string;
    privyConfig: PrivyWalletConfig;
    rpcUrl: string;
    lighthouseApiKey: string;
    adminPrivateKey: string;
    contractAddress: `0x${string}`;
  }) {
    if (!MedusaBridge.instance) {
      MedusaBridge.instance = new MedusaBridge(config);
    }
    return MedusaBridge.instance;
  }

  async executeWorkflow(params: {
    deviceId: string;
    data: {
      temperature: number;
      humidity: number;
      timestamp: number;
    };
  }) {
    try {
      // Create initial workflow state
      const initialState = {
        agent: "collector",
        messages: [
          {
            role: "function" as const,
            name: "default",
            content: JSON.stringify({
              deviceId: params.deviceId,
              data: {
                message: `Sensor data from device ${params.deviceId}`,
                ...params.data,
              },
            }),
          },
        ],
        status: "idle" as const,
        children: [],
      };

      // Execute Collection
      const collectionResult = await this.agents.get("dataCollection").execute({
        deviceId: params.deviceId,
        data: {
          message: `Sensor data from device ${params.deviceId}`,
          ...params.data,
        },
      });

      if (!collectionResult.success) {
        throw new Error("Data collection failed");
      }

      // Execute Broadcasting with collection results
      const broadcastResult = await this.agents.get("broadcasting").execute({
        cid: collectionResult.storageResult.cid,
      });

      if (!broadcastResult.success) {
        throw new Error("Broadcasting failed");
      }

      // Execute Analysis with all previous results
      const analysisResult = await this.agents.get("response").execute({
        deviceId: params.deviceId,
        data: params.data,
        storageConfirmation: {
          cid: collectionResult.storageResult.cid,
          ipnsId: broadcastResult.ipnsGatewayUrl.split("/ipns/")[1],
        },
      });

      // Execute workflow with all context
      const workflowResult = await ZeeWorkflow.run(this.workflow, {
        ...initialState,
        messages: [
          {
            role: "function" as const,
            name: "collector",
            content: JSON.stringify(collectionResult),
          },
          {
            role: "function" as const,
            name: "broadcaster",
            content: JSON.stringify(broadcastResult),
          },
          {
            role: "function" as const,
            name: "analyzer",
            content: JSON.stringify(analysisResult),
          },
        ],
      });

      // Return combined results
      return {
        success: true,
        workflow: {
          collection: collectionResult,
          broadcast: broadcastResult,
          analysis: analysisResult,
          workflowState: workflowResult,
        },
      };
    } catch (error) {
      console.error("Workflow execution failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Legacy support for individual operations
  async executeOperation(operation: string, params: any) {
    const [system, agentType, action] = operation.split(".");

    switch (system) {
      case "zee":
        const agent = this.agents.get(agentType);
        if (!agent) {
          throw new Error(`Unknown agent type: ${agentType}`);
        }
        return agent.execute(params);

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
