import { Agent as ZeeAgent } from "@covalenthq/ai-agent-sdk";
import type { AgentConfig, BaseAgent, AgentStateParams } from "../types";

export abstract class ZeeBaseAgent implements BaseAgent {
  protected zeeAgent: ZeeAgent;
  protected agentName: string;
  protected defaultTask: string;

  constructor(config: AgentConfig) {
    this.agentName = config.name;
    this.defaultTask = config.defaultTask || "Process data";

    this.zeeAgent = new ZeeAgent({
      name: config.name,
      model: {
        provider: "OPEN_AI",
        name: "gpt-4o-mini",
        apiKey: config.openAiKey,
      },
      description: config.description,
      instructions: config.instructions,
      tools: config.tools,
    });
  }

  protected recreateAgent(config: Partial<AgentConfig>) {
    this.zeeAgent = new ZeeAgent({
      name: this.agentName,
      model: {
        provider: "OPEN_AI",
        name: "gpt-4o-mini",
        apiKey: config.openAiKey,
      },
      description: config.description || this.zeeAgent.description,
      instructions: config.instructions || this.zeeAgent.instructions,
      tools: config.tools || this.zeeAgent.tools,
    });
  }

  async initialize(): Promise<boolean> {
    return true;
  }

  abstract execute(params: any): Promise<any>;

  protected createAgentState(
    params: any,
    stateParams?: Partial<AgentStateParams>
  ) {
    const message: any = {
      role: "user",
      content: JSON.stringify({
        task: stateParams?.task || this.defaultTask,
        data: params,
      }),
    };

    return {
      messages: [message],
      agent: this.agentName,
      status: "running" as const,
      children: [],
    };
  }
}
