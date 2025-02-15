import {
  CollectionAgent,
  BroadcastingAgent,
  ResponseAgent,
} from "../zee/agents";
import { ServerWallet } from "../wallets/server-wallet";
import { PrivyWalletConfig } from "../zee/tools/src/privyWalletTool";
import { ModelConfig, ZeeWorkflow } from "@covalenthq/ai-agent-sdk";

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
  private model: ModelConfig;
  private serverWallet: ServerWallet;
  private agents: Map<string, any> = new Map();
  private workflow: ZeeWorkflow;

  private constructor(
    private config: {
      walletId: string;
      rpcUrl: string;
      chainId: string;
      greenfieldRpcUrl: string;
      greenfieldChainId: string;
      adminAddress: string;
      adminPrivateKey: string;
      privyConfig: PrivyWalletConfig;
      contractAddress: `0x${string}`;
      llmAPIKey: string;
    }
  ) {
    this.serverWallet = new ServerWallet(
      config.privyConfig.appId,
      config.privyConfig.appSecret,
      config.rpcUrl
    );

    this.model = {
      provider: "OPEN_AI",
      name: "gpt-4o-mini",
      apiKey: config.llmAPIKey,
    };

    this.initializeAgents();

    this.workflow = new ZeeWorkflow({
      description: "Medusa data processing and analysis workflow",
      output: "Process and analyze sensor data with storage confirmation",
      agents: {
        collector: this.agents.get("dataCollection"),
        // broadcaster: this.agents.get("broadcasting"),
        // analyzer: this.agents.get("response"),
      },
    });
  }

  private initializeAgents() {
    this.agents.set(
      "dataCollection",
      new CollectionAgent({
        model: this.model,
        walletId: this.config.walletId,
        rpcUrl: this.config.rpcUrl,
        chainId: this.config.chainId,
        greenfieldChainId: this.config.greenfieldChainId,
        greenfieldRpcUrl: this.config.greenfieldRpcUrl,
        adminAddress: this.config.adminAddress,
        adminPrivateKey: this.config.adminPrivateKey,
        serverWallet: this.serverWallet,
      })
    );

    this.agents.set(
      "broadcasting",
      new BroadcastingAgent({
        model: this.model,
        walletId: this.config.walletId,
        rpcUrl: this.config.rpcUrl,
        chainId: this.config.chainId,
        contractAddress: this.config.contractAddress,
        adminAddress: this.config.adminAddress,
        adminPrivateKey: this.config.adminPrivateKey,
        serverWallet: this.serverWallet,
      })
    );

    this.agents.set(
      "response",
      new ResponseAgent({
        model: this.model,
        rpcUrl: this.config.rpcUrl,
        chainId: this.config.chainId,
        greenfieldChainId: this.config.greenfieldChainId,
        greenfieldRpcUrl: this.config.greenfieldRpcUrl,
        walletId: this.config.walletId,
        adminAddress: this.config.adminAddress,
        adminPrivateKey: this.config.adminPrivateKey,
        serverWallet: this.serverWallet,
      })
    );
  }

  static async connect(config: {
    workflowId: string;
    walletId: string;
    rpcUrl: string;
    chainId: string;
    greenfieldRpcUrl: string;
    greenfieldChainId: string;
    adminAddress: string;
    adminPrivateKey: string;
    llmAPIKey: string;
    contractAddress: `0x${string}`;
    privyConfig: PrivyWalletConfig;
  }) {
    if (!MedusaBridge.instance) {
      MedusaBridge.instance = new MedusaBridge(config);
    }
    return MedusaBridge.instance;
  }

  async executeWorkflow(params: {
    deviceId: string;
    workflowId: string;
    historicalData?: Array<{
      temperature: number;
      humidity: number;
      timestamp: number;
    }>;
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
              walletId: params.deviceId,
              workflowId: params.workflowId,
              contractAddress: params.contractAddress,
              data: params.data,
            }),
          },
        ],
        status: "idle",
        children: [],
      };

      console.log("Starting data collection...");
      const collectionResult = await this.agents.get("dataCollection").execute({
        walletId: params.deviceId,
        workflowId: params.workflowId,
        contractAddress: params.contractAddress,
        data: params.data,
      });

      console.log(collectionResult);
      if (!collectionResult.success) {
        throw new Error("Data collection failed");
      }

      console.log("Starting data broadcasting...");

      // const broadcastResult = await this.agents.get("broadcasting").execute({
      //   cid: collectionResult.storageResult.cid,
      //   walletId: params.deviceId,
      //   ipnsName: collectionResult.storageResult.ipnsName,
      //   workflowId: params.workflowId,
      //   contractAddress: params.contractAddress,
      // });

      // if (!broadcastResult.success) {
      //   throw new Error("Broadcasting failed");
      // }

      // console.log("Starting data analysis...");
      const analysisResult = await this.agents.get("response").execute({
        deviceId: params.deviceId,
        data: params.data,
        historicalData: params.historicalData,
        workflowId: params.workflowId,
        storageConfirmation: {
          bucketName: collectionResult.bucketName,
          objectName: collectionResult.objectName,
        },
      });

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
        children: [],
      };

      // const broadcastState: MedusaWorkflowState = {
      //   agent: "broadcaster",
      //   status: "finished",
      //   messages: [
      //     {
      //       role: "function",
      //       name: "data_broadcast",
      //       content: JSON.stringify(broadcastResult),
      //     },
      //   ],
      //   children: [],
      // };

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
        children: [],
      };

      const workflowState: MedusaWorkflowState = {
        ...initialState,
        status: "finished",
        messages: [...initialState.messages],
        children: [collectionState, analysisState],
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
          // broadcast: broadcastResult,
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
}

export type { MedusaWorkflowState };
