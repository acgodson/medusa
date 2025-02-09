export interface WorkflowResult {
  success: boolean;
  result: {
    success: boolean;
    workflow: {
      collection: {
        success: boolean;
        signature: string;
        storageResult: {
          success: boolean;
          data: {
            temperature: number;
            humidity: number;
            timestamp: number;
          };
          cid: string;
          ipnsName: string;
          ipnsId: string;
        };
      };
      broadcast: {
        success: boolean;
        ipnsGatewayUrl: string;
        transactionHash: {
          success: boolean;
          transactionHash: string;
        };
      };
      analysis: {
        success: boolean;
        inference: {
          deviceId: string;
          timestamp: number;
          analysis: {
            policy: {
              operation: string;
              usagePolicy: string;
              retention: {
                duration: number;
                reason: string;
              };
              processingNotes: string[];
              statistics: {
                temperature: {
                  min: number;
                  max: number;
                  average: number;
                  variance: number;
                };
                humidity: {
                  min: number;
                  max: number;
                  average: number;
                  variance: number;
                };
              };
              confidence: number;
            };
            conditions: {
              operation: string;
              alerts: string[];
              conditions: {
                temperature: {
                  current: number;
                  average: number;
                  trend: string;
                  status: string;
                };
                humidity: {
                  current: number;
                  average: number;
                  trend: string;
                  status: string;
                };
              };
              suggestedActions: string[];
              confidence: number;
              analysisTimestamp: string;
            };
            metadata: {
              analysisTime: string;
              dataSource: string;
              latestReading: {
                temperature: number;
                humidity: number;
                timestamp: number;
              };
            };
          };
          storageRef: {
            cid: string;
            ipnsId: string;
          };
        };
      };
      workflowState: any;
    };
  };
}
