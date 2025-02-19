import {
  CollectionAgent,
  SirenBroadcastingAgent,
  SirenCollectionAgent as NoiseCollectionAgent,
  ResponseAgent,
  BroadcastingAgent,
} from "../zee/agents";
import { ServerWallet } from "../wallets/server-smart-wallet";
import { PrivyWalletConfig } from "../zee/tools/src/privyWalletTool";
import { ModelConfig, ZeeWorkflow } from "@covalenthq/ai-agent-sdk";
import { metadata } from "@/app/layout";

// Workflow type enum
export enum WorkflowType {
  TEMPERATURE = "temperature",
  NOISE = "noise",
}

// Base data interface with shared properties
interface BaseData {
  timestamp: number;
}

// Temperature data interface
interface TemperatureData extends BaseData {
  temperature: number;
  humidity: number;
}

interface NoiseData {
  deviceId: string;
  data: Record<
    string,
    {
      noise: number;
      minNoise: number;
      maxNoise: number;
      samples: number;
      accuracy: number;
      timestamp: number;
      spikes: number;
    }
  >;
  metadata: {
    startTime: number;
    endTime: number;
    deviceInfo?: {
      manufacturer?: string;
      model?: string;
    };
    totalSamples: number;
  };
}

// Unified workflow state interface
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
  private workflows: Map<WorkflowType, ZeeWorkflow> = new Map();
  private workflowType: WorkflowType;

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
      workflowType: WorkflowType;
    }
  ) {
    this.workflowType = config.workflowType;

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
    this.initializeWorkflows();
  }

  private initializeAgents() {
    // Temperature workflow agents
    this.agents.set(
      "temperatureCollection",
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
      "temperatureBroadcasting",
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
      "temperatureResponse",
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

    // Noise workflow agents - Only collection and broadcasting
    this.agents.set(
      "noiseCollection",
      new NoiseCollectionAgent({
        model: this.model,
        walletId: this.config.walletId,
        rpcUrl: this.config.rpcUrl,
        chainId: this.config.chainId,
        greenfieldChainId: this.config.greenfieldChainId,
        greenfieldRpcUrl: this.config.greenfieldRpcUrl,
        adminAddress: this.config.adminAddress,
        adminPrivateKey: this.config.adminPrivateKey,
      })
    );

    this.agents.set(
      "noiseBroadcasting",
      new SirenBroadcastingAgent({
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
  }

  private initializeWorkflows() {
    // Temperature workflow
    this.workflows.set(
      WorkflowType.TEMPERATURE,
      new ZeeWorkflow({
        description: "Temperature data processing and analysis workflow",
        output:
          "Process and analyze temperature/humidity data with storage confirmation",
        agents: {
          collector: this.agents.get("temperatureCollection"),
          broadcaster: this.agents.get("temperatureBroadcasting"),
          analyzer: this.agents.get("temperatureResponse"),
        },
      })
    );

    // Noise workflow
    this.workflows.set(
      WorkflowType.NOISE,
      new ZeeWorkflow({
        description: "Noise data collection and storage workflow",
        output:
          "Collect and store geotagged noise data with blockchain verification",
        agents: {
          collector: this.agents.get("noiseCollection"),
          broadcaster: this.agents.get("noiseBroadcasting"),
        },
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
    workflowType: WorkflowType;
  }) {
    if (!MedusaBridge.instance) {
      MedusaBridge.instance = new MedusaBridge(config);
    }

    return MedusaBridge.instance;
  }

  async executeWorkflow(params: {
    deviceId: string;
    workflowId: string;
    data: TemperatureData | NoiseData;
    historicalData?: Array<TemperatureData>;
    contractAddress: string;
  }) {
    const startTime = Date.now();

    try {
      if (!params.data) {
        throw new Error("No data points provided");
      }

      if (Array.isArray(params.data) && params.data.length === 0) {
        throw new Error("No data points provided");
      }

      const isTemperatureData = (data: any): data is TemperatureData =>
        "temperature" in data && "humidity" in data;

      const isNoiseData = (data: any): data is NoiseData =>
        data &&
        data.data &&
        data.metadata &&
        Object.values(data.data).some(
          (val) => val && typeof val === "object" && "noise" in val
        );
      // Validate data matches workflow type
      if (
        this.workflowType === WorkflowType.NOISE &&
        !isNoiseData(params.data)
      ) {
        throw new Error(
          "Noise workflow requires noise data with lat, lng and noise values"
        );
      }

      if (
        this.workflowType === WorkflowType.TEMPERATURE &&
        !isTemperatureData(params.data)
      ) {
        throw new Error(
          "Temperature workflow requires temperature and humidity data"
        );
      }
      // Get the appropriate workflow
      const workflow = this.workflows.get(this.workflowType);
      if (!workflow) {
        throw new Error(`Workflow type ${this.workflowType} not configured`);
      }

      // Initialize workflow state
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
              data: (params.data as NoiseData).data,
            }),
          },
        ],
        status: "idle",
        children: [],
      };

      // Execute appropriate agents based on workflow type
      let collectionResult, broadcastResult, analysisResult;
      let workflowStates = [];

      if (this.workflowType === WorkflowType.TEMPERATURE) {
        // Temperature workflow - Execute all three agents
        console.log(
          `[${
            Date.now() - startTime
          }ms] Starting temperature data collection...`
        );
        collectionResult = await this.agents
          .get("temperatureCollection")
          .execute({
            walletId: params.deviceId,
            workflowId: params.workflowId,
            contractAddress: params.contractAddress,
            data: params.data as TemperatureData,
          });

        if (!collectionResult.success) {
          throw new Error("Temperature data collection failed");
        }
        console.log(`[${Date.now() - startTime}ms] Collection complete`);

        console.log(
          `[${
            Date.now() - startTime
          }ms] Starting temperature data broadcasting...`
        );
        broadcastResult = await this.agents
          .get("temperatureBroadcasting")
          .execute({
            cid: collectionResult.storageResult.cid,
            walletId: params.deviceId,
            ipnsName: collectionResult.storageResult.ipnsName,
            workflowId: params.workflowId,
            contractAddress: params.contractAddress,
          });

        if (!broadcastResult.success) {
          throw new Error("Temperature data broadcasting failed");
        }
        console.log(`[${Date.now() - startTime}ms] Broadcasting complete`);

        console.log(
          `[${Date.now() - startTime}ms] Starting temperature data analysis...`
        );
        analysisResult = await this.agents.get("temperatureResponse").execute({
          deviceId: params.deviceId,
          data: params.data as TemperatureData,
          historicalData: params.historicalData as TemperatureData[],
          workflowId: params.workflowId,
          storageConfirmation: {
            bucketName: collectionResult.bucketName,
            objectName: collectionResult.objectName,
          },
        });
        console.log(`[${Date.now() - startTime}ms] Analysis complete`);

        // Create workflow states for temperature workflow
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
          children: [],
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
          children: [],
        };

        workflowStates = [collectionState, broadcastState, analysisState];
      } else if (this.workflowType === WorkflowType.NOISE) {
        // Noise workflow - Execute only collection and broadcasting
        console.log(
          `[${Date.now() - startTime}ms] Starting noise data collection...`
        );

        collectionResult = await this.agents.get("noiseCollection").execute({
          walletId: params.deviceId,
          workflowId: params.workflowId,
          contractAddress: params.contractAddress,
          metadata: (params.data as NoiseData).data,
          data: (params.data as NoiseData).data,
        });

        console.log(collectionResult);

        if (!collectionResult.success) {
          throw new Error("Noise data collection failed");
        }
        console.log(`[${Date.now() - startTime}ms] Collection complete`);

        console.log(
          `[${Date.now() - startTime}ms] Starting noise data broadcasting...`
        );

        broadcastResult = await this.agents.get("noiseBroadcasting").execute({
          walletId: params.deviceId,
          workflowId: params.workflowId,
          bucketName: collectionResult.bucketName,
          objectName: collectionResult.objectName,
        });

        if (!broadcastResult.success) {
          throw new Error("Noise data broadcasting failed");
        }
        console.log(`[${Date.now() - startTime}ms] Broadcasting complete`);

        // Create workflow states for noise workflow (collection and broadcasting only)
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
          children: [],
        };

        workflowStates = [collectionState, broadcastState];
      } else {
        throw new Error(`Unsupported workflow type: ${this.workflowType}`);
      }

      // Combine all states
      const workflowState: MedusaWorkflowState = {
        ...initialState,
        status: "finished",
        messages: [...initialState.messages],
        children: workflowStates,
      };

      // Execute complete workflow
      console.log(
        `[${Date.now() - startTime}ms] Executing complete workflow...`
      );
      const workflowResult = await ZeeWorkflow.run(
        workflow,
        workflowState as any
      );

      const executionTime = Date.now() - startTime;
      console.log(`[${executionTime}ms] Workflow execution complete`);

      // Return results based on workflow type
      if (this.workflowType === WorkflowType.TEMPERATURE) {
        return {
          success: true,
          executionTimeMs: executionTime,
          workflowType: this.workflowType,
          workflow: {
            collection: collectionResult,
            broadcast: broadcastResult,
            analysis: analysisResult,
            workflowState: workflowResult,
          },
        };
      } else {
        // For noise workflow, return only collection and broadcast results
        return {
          success: true,
          executionTimeMs: executionTime,
          workflowType: this.workflowType,
          workflow: {
            collection: collectionResult,
            broadcast: broadcastResult,
            workflowState: workflowResult,
          },
        };
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`[${executionTime}ms] Workflow execution failed:`, error);
      return {
        success: false,
        workflowType: this.workflowType,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        executionTimeMs: executionTime,
      };
    }
  }
}

export type { MedusaWorkflowState, TemperatureData, NoiseData };
