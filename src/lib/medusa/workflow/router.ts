import { ZeeWorkflow } from "@covalenthq/ai-agent-sdk";

export const createWorkflow = (agents: any, description: string) => {
  return new ZeeWorkflow({
    description,
    output: "Workflow output description",
    agents,
  });
};
