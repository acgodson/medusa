import { z } from "zod";
import { ZeeBaseAgent } from "./zee/base";
import { DataSchema } from "./zee/types";
import {
  createDataStorageTool,
  createPrivyWalletTool,
  PrivyWalletConfig,
} from "./zee/tools";
import { PrivyClient } from "@privy-io/server-auth";

export class DataCollectionAgent extends ZeeBaseAgent {
  constructor(config: { openAiKey: string; privyConfig: PrivyWalletConfig }) {
    const storageTool = createDataStorageTool();
    const privy = new PrivyClient(
      config.privyConfig.appId,
      config.privyConfig.appSecret
    );
    const privyWalletTool = createPrivyWalletTool(privy);

    super({
      name: "Data Collection Agent",
      description: "Agent responsible for collecting and storing sensor data",
      instructions: [
        "Use the privy-wallet tool to sign data",
        "Store signed data using the storage tool",
        "Return success or failure status",
      ],
      openAiKey: config.openAiKey,
      tools: {
        "store-sensor-data": storageTool,
        "privy-wallet": privyWalletTool,
      },
      defaultTask: "Process and store sensor data",
    });
  }

  async execute(params: z.infer<typeof DataSchema>) {
    try {
      DataSchema.parse(params);
      const result = await this.zeeAgent.run(
        this.createAgentState(params, {
          task: "Sign and store sensor readings",
        })
      );
      return result;
    } catch (error: any) {
      throw new Error(`Data collection failed: ${error.message}`);
    }
  }
}
