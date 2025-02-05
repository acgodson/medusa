import { Agent as ZeeAgent } from "@covalenthq/ai-agent-sdk";
import { AgentKit, CdpWalletProvider } from "@coinbase/agentkit";
import { signMessageAction, transferEthAction } from "../agents/cdp/base";

export class MedusaBridge {
  constructor(
    private config: {
      zeeConfig: {
        openAiKey: string;
      };
      cdpConfig: {
        apiKeyName: string;
        apiKeyPrivateKey: string;
        networkId: string;
      };
    }
  ) {}

  async initializeZeeAgent(params: {
    name: string;
    description: string;
    instructions: string[];
    tools?: any[];
  }) {
    return new ZeeAgent({
      name: params.name,
      model: {
        provider: "OPEN_AI",
        name: "gpt-4o-mini",
        apiKey: this.config.zeeConfig.openAiKey,
      },
      description: params.description,
      instructions: params.instructions,
      tools: params.tools as any,
    });
  }

  async initializeCdpAgent() {
    const walletProvider = await CdpWalletProvider.configureWithWallet({
      apiKeyName: this.config.cdpConfig.apiKeyName,
      apiKeyPrivateKey: this.config.cdpConfig.apiKeyPrivateKey,
      networkId: this.config.cdpConfig.networkId,
    });

    return AgentKit.from({
      walletProvider,
      actionProviders: [
        signMessageAction,
        transferEthAction,
      ],
    });
  }
}
