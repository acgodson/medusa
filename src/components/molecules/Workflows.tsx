import React, { useEffect, useState } from "react";
import {
  ExternalLink,
  Users,
  Workflow,
  Eye,
  Play,
  Wallet,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/atoms/card";
import { Button, Spinner } from "../atoms";
import { formatAddress } from "@/utils/helpers";

const WorkflowCard = ({
  workflow,
  handleJoinWorkflow,
  isPending,
  isListView = false,
}: any) => {
  const [showDevices, setShowDevices] = useState(workflow.isContributor);
  const [deviceBalances, setDeviceBalances] = useState([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  return (
    <Card className="overflow-hidden bg-white">
      <CardContent
        className={`p-0 ${isListView ? "md:flex md:items-start" : ""}`}
      >
        {/* Header Section */}
        <div
          className={`
          border-b border-gray-100 bg-gradient-to-r from-red-50 to-white
          p-4 ${isListView ? "md:w-1/3 md:border-b-0 md:border-r" : ""}
        `}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                {workflow.name ?? workflow.bucketName}
                <ExternalLink className="h-4 w-4 text-red-600" />
              </h3>
              <p className="text-sm text-gray-600">
                {workflow.description ?? "Basic weather monitoring"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-red-600" />
              <span>{workflow.contributors}</span>
            </div>
            <div className="flex items-center gap-1">
              <Play className="h-4 w-4 text-red-600" />
              <span>{workflow.totalExecutions}</span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className={`p-4 ${isListView ? "md:flex-1" : ""}`}>
          {workflow.isContributor ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">
                  Registered Devices ({workflow.deviceIds?.length ?? 0})
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDevices(!showDevices)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {showDevices ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {showDevices &&
                workflow.deviceIds?.map((deviceId: string, index: number) => (
                  <div
                    key={deviceId}
                    className="bg-gray-50 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {deviceId}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white text-gray-700 hover:bg-red-50 hover:text-red-600"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white text-gray-700 hover:bg-red-50 hover:text-red-600"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Submit
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-3 w-3" />
                        <span>0.0000 ETH</span>
                      </div>
                      <span>0 executions</span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-red-600" />
                    <span>Schema: {workflow.schema ?? "temp-humid-basic"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-red-600" />
                    <span>Creator: {formatAddress(workflow.owner)}</span>
                  </div>
                </div>
              </div>

              <Button
                variant={"outline"}
                className="w-full bg-zinc-800 text-white hover:bg-zinc-900 hover:text-white"
                onClick={() => handleJoinWorkflow(workflow.id)}
              >
                {isPending ? <Spinner /> : "Join Workflow"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowCard;
