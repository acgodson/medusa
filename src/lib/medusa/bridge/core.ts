import {
  CollectionAgent,
  BroadcastingAgent,
  ResponseAgent,
} from "../zee/agents";
import { ServerWallet } from "../wallets/server-wallet";
import { PrivyWalletConfig } from "../zee/tools/src/privyWalletTool";
import { ZeeWorkflow } from "@covalenthq/ai-agent-sdk";

interface MedusaWorkflowState {
  agent: string;
  messages:
    | Array<{
        role: string;
        name: string;
        content: string;
      }>
    | any[];
  status: "idle" | "running" | "paused" | "failed" | "finished";
  children: MedusaWorkflowState[];
}

export class MedusaBridge {
  private static instance: MedusaBridge;
  private agents: Map<string, any> = new Map();
  private serverWallet: ServerWallet;
  private workflow: ZeeWorkflow;

  private constructor(
    private config: {
      openAiKey: string;
      privyConfig: PrivyWalletConfig;
      rpcUrl: string;
      lighthouseApiKey: string;
      contractAddress: `0x${string}`;
      walletId: string;
    }
  ) {
    this.serverWallet = new ServerWallet(
      config.privyConfig.appId,
      config.privyConfig.appSecret,
      config.rpcUrl
    );

    this.initializeAgents();

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
    this.agents.set(
      "dataCollection",
      new CollectionAgent({
        openAiKey: this.config.openAiKey,
        privyConfig: this.config.privyConfig,
        lighthouseApiKey: this.config.lighthouseApiKey,
        walletId: this.config.walletId,
      })
    );

    this.agents.set(
      "broadcasting",
      new BroadcastingAgent({
        openAiKey: this.config.openAiKey,
        privyConfig: this.config.privyConfig,
        lighthouseApiKey: this.config.lighthouseApiKey,
        rpcUrl: this.config.rpcUrl,
        contractAddress: this.config.contractAddress,
      })
    );

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
    contractAddress: `0x${string}`;
    walletId: string;
    workflowId: number;
  }) {
    if (!MedusaBridge.instance) {
      MedusaBridge.instance = new MedusaBridge(config);
    }
    return MedusaBridge.instance;
  }

  async executeWorkflow(params: {
    deviceId: string;
    workflowId: number;
    data: {
      temperature: number;
      humidity: number;
      timestamp: number;
    };
    contractAddress: string;
  }) {
    try {
      const initialState: MedusaWorkflowState = {
        agent: "collector",
        messages: [
          {
            role: "function",
            name: "workflow_init",
            content: JSON.stringify({
              deviceId: params.deviceId,
              workflowId: params.workflowId,
              contractAddress: params.contractAddress,
              data: params.data,
            }),
          },
        ],
        status: "idle",
        children: [], // Always initialize children as empty array
      };

      console.log("Starting data collection...");
      const collectionResult = await this.agents.get("dataCollection").execute({
        deviceId: params.deviceId,
        workflowId: params.workflowId,
        contractAddress: params.contractAddress,
        data: params.data,
      });

      if (!collectionResult.success) {
        throw new Error("Data collection failed");
      }

      console.log("Starting data broadcasting...");
      const broadcastResult = await this.agents.get("broadcasting").execute({
        cid: collectionResult.storageResult.cid,
        walletId: params.deviceId,
        ipnsName: collectionResult.storageResult.ipnsName,
        workflowId: params.workflowId,
        contractAddress: params.contractAddress,
      });

      if (!broadcastResult.success) {
        throw new Error("Broadcasting failed");
      }

      console.log("Starting data analysis...");
      const analysisResult = await this.agents.get("response").execute({
        deviceId: params.deviceId,
        data: params.data,
        storageConfirmation: {
          cid: collectionResult.storageResult.cid,
          ipnsId: broadcastResult.ipnsGatewayUrl.split("/ipns/")[1],
        },
      });

      // Create child states for each agent execution
      const collectionState: MedusaWorkflowState = {
        agent: "collector",
        status: "finished",
        messages: [
          {
            role: "function",
            name: "data_collection",
            content: JSON.stringify(collectionResult),
          },
        ],
        children: [], // Always include empty children array
      };

      const broadcastState: MedusaWorkflowState = {
        agent: "broadcaster",
        status: "finished",
        messages: [
          {
            role: "function",
            name: "data_broadcast",
            content: JSON.stringify(broadcastResult),
          },
        ],
        children: [], // Always include empty children array
      };

      const analysisState: MedusaWorkflowState = {
        agent: "analyzer",
        status: "finished",
        messages: [
          {
            role: "function",
            name: "data_analysis",
            content: JSON.stringify(analysisResult),
          },
        ],
        children: [], // Always include empty children array
      };

      // Create the final workflow state
      const workflowState: MedusaWorkflowState = {
        ...initialState,
        status: "finished",
        messages: [...initialState.messages],
        children: [collectionState, broadcastState, analysisState],
      };

      console.log("Executing complete workflow...");
      const workflowResult = await ZeeWorkflow.run(
        this.workflow,
        workflowState as any
      );

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
        return this.serverWallet.executeOperation(
          params.walletId,
          params.contractAddress,
          params.data
        );

      default:
        throw new Error(`Unknown agent system: ${system}`);
    }
  }
}

export type { MedusaWorkflowState };
