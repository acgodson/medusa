export type WorkflowStatus = "Active" | "Paused" | "Archived";

export interface Workflow {
  id: number;
  title: string;
  description: string;
  schemaId: string;
  contributorCount: number;
  totalExecutions: number;
  creator: string;
  status: WorkflowStatus;
  timestamp: number;
  isContributor: boolean;
  deviceIds: string[];
  pages?: number;
  executionInterval?: number;
}

export interface WorkflowFormData {
  title: string;
  description: string;
  executionInterval: number;
  schemaId: string;
}

export interface SubgraphDeviceRegistration {
  deviceAddress: string;
  workflowId: string;
  walletId: string;
}
