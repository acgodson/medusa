// Response Types for Workflow Results
export interface WorkflowResponse {
  result: {
    data: {
      success: boolean;
      result: {
        success: boolean;
        workflow: {
          collection: CollectionResult;
          broadcast: BroadcastResult;
          analysis: AnalysisResult;
          workflowState: WorkflowState;
        };
      };
    };
  };
}


// Collection Types
interface CollectionResult {
  success: boolean;
  signature: string;
  storageResult: {
    success: boolean;
    data: SensorData;
    cid: string;
    ipnsName: string;
    ipnsId: string;
  };
}

interface SensorData {
  temperature: number;
  humidity: number;
  timestamp: number;
}

// Broadcast Types
interface BroadcastResult {
  success: boolean;
  ipnsGatewayUrl: string;
  transactionHash: {
    success: boolean;
    transactionHash: string;
  };
}

// Analysis Types
interface AnalysisResult {
  success: boolean;
  inference: {
    deviceId: string;
    timestamp: number;
    analysis: {
      policy: PolicyAnalysis;
      conditions: ConditionsAnalysis;
      metadata: AnalysisMetadata;
    };
    storageRef: {
      cid: string;
      ipnsId: string;
    };
  };
}

interface PolicyAnalysis {
  operation: 'inferPolicy';
  analysis: {
    usagePolicy: 'Processed' | 'Analyzed' | 'Monetized';
    retention: {
      duration: number;
      reason: string;
    };
    insights: string[];
    recommendations: string[];
  };
  statistics: EnvironmentalStats;
  confidence: number;
  processingTimestamp: string;
}

interface ConditionsAnalysis {
  operation: 'checkConditions';
  conditions: {
    alerts: string[];
    temperatureStatus: 'normal' | 'warning' | 'critical';
    temperatureTrend: 'stable' | 'increasing' | 'decreasing';
    temperatureExplanation: string;
    humidityStatus: 'normal' | 'warning' | 'critical';
    humidityTrend: 'stable' | 'increasing' | 'decreasing';
    humidityExplanation: string;
    suggestedActions: string[];
  };
  statistics: EnvironmentalStats;
  analysisTimestamp: string;
}

interface EnvironmentalStats {
  temperature: Stats;
  humidity: Stats;
}

interface Stats {
  min: number;
  max: number;
  average: number;
  variance: number;
}

interface AnalysisMetadata {
  analysisTime: string;
  dataSource: string;
  latestReading: SensorData;
}

// Workflow State Types
interface WorkflowState {
  agent: string;
  messages: WorkflowMessage[];
  status: 'finished' | 'pending' | 'failed';
  children: WorkflowStateChild[];
}

interface WorkflowMessage {
  role: string;
  name: string;
  content: string;
}

interface WorkflowStateChild {
  agent: string;
  status: 'finished' | 'pending' | 'failed';
  messages: WorkflowMessage[];
  children: WorkflowStateChild[];
}

// Optional: Helper type for component props
export interface WorkflowResultsProps {
  open: boolean;
  onClose: () => void;
  result: WorkflowResponse;
}