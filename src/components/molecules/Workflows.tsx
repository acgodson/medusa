import React, { useState } from "react";
import {
  ExternalLink,
  GitBranch,
  Users,
  Workflow,
  Eye,
  Play,
  Wallet,
} from "lucide-react";
import { Card, CardHeader, CardContent, Button, Spinner } from "../atoms";

const Workflows = ({
  workflow,
  handleJoinWorkflow,
  isPending,
  isListView = false,
}: {
  workflow: any;
  handleJoinWorkflow: any;
  isPending: boolean;
  isListView?: boolean;
}) => {
  const [showDevices, setShowDevices] = useState(false);
  const [gatewayUrl, setGatewayUrl] = useState(
    "https://default-gateway.medusa.network"
  );

  return (
    <>
      <Card
        key={workflow.id}
        className={`group relative overflow-hidden bg-white/80 backdrop-blur-sm border border-[#E6B24B]/50 hover:border-[#E6B24B]/80 transition-all duration-300 ${
          isListView ? "flex flex-col md:flex-row md:items-center md:gap-4" : ""
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <CardHeader
          className={`flex flex-row items-start justify-between space-y-0 pb-2 ${
            isListView ? "flex-1" : ""
          }`}
        >
          <div className="space-y-1">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              {workflow.name}
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </h3>
            <p className="text-sm text-gray-500">{workflow.description}</p>
          </div>
        </CardHeader>

        <CardContent className={isListView ? "flex-1" : ""}>
          <div className="space-y-4 relative">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#E6B24B]" />
                <span>{workflow.contributors} contributors</span>
              </div>
              <div className="text-gray-500">
                {workflow.totalExecutions} executions
              </div>
            </div>

            {!showDevices ? (
              <>
                <div className="p-3 bg-gray-50/50 rounded-lg space-y-2">
                  <div className="text-xs text-gray-500">Details:</div>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center space-x-1">
                      <Workflow className="h-4 w-4 text-[#5555]" /> Schema:{" "}
                      {workflow.schema}
                    </div>
                    <div>Creator: {workflow.creator}</div>
                  </div>
                </div>
                {workflow.isContributor && (
                  <p
                    className="text-xs flex justify-end text-blue-500 hover:text-blue-700 cursor-pointer hover:underline"
                    onClick={() => setShowDevices(true)}
                  >
                    You have <b className="px-1">{workflow.deviceIds.length}</b>{" "}
                    registered device(s)
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Registered Devices</h4>
                  <button
                    className="text-xs text-gray-500 hover:text-gray-700"
                    onClick={() => setShowDevices(false)}
                  >
                    Back to Details
                  </button>
                </div>
                {workflow.deviceIds.map((deviceId: string, index: number) => (
                  <div key={index} className="p-3 bg-gray-50/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {deviceId}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            title="Fund Device"
                          >
                            <Wallet className="h-3 w-3 text-[#E6B24B]" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">0.0 ETH</p>
                      </div>
                      <div className="flex gap-2">
                        {isListView ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                            >
                              <span className="mr-1">0</span> Executions
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Submit Record
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Results
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline">
                              0
                            </Button>
                            <Button size="sm" variant="outline">
                              <Play className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!showDevices && (
              <Button
                variant="outline"
                className="w-full hover:bg-[#E6B24B]/10"
                onClick={() => handleJoinWorkflow(workflow.id)}
              >
                {isPending ? <Spinner /> : "Join Workflow"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default Workflows;
