import React, { useState } from "react";
import {
  ExternalLink,
  Users,
  Workflow,
  Calculator,
  Play,
  ChevronDown,
  ChevronUp,
  ActivitySquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/atoms/card";
import { Button, Spinner } from "../atoms";
import { formatAddress, formatTokenAmount } from "@/utils/helpers";
import NoiseDialog from "./DialogModals/NoiseDialog";
import { TemperatureDialog } from "./DialogModals/TemperatureDialog";

interface DeviceData {
  id: string;
  executions: number;
  sirnBalance: number;
}

interface WorkflowCardProps {
  workflow: {
    id: number;
    title: string;
    bucketName?: string;
    description: string;
    contributorCount: number;
    totalExecutions: number;
    isContributor: boolean;
    deviceIds: string[];
    schemaId: string;
    creator: string;
  };
  handleJoinWorkflow: (id: number) => void;
  isPending: boolean;
  isListView?: boolean;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  handleJoinWorkflow,
  isPending,
  isListView = false,
}) => {
  const [showDevices, setShowDevices] = useState(workflow.isContributor);
  const [open, setOpen] = useState(false);
  const hasExecutions = (executions: number) => executions > 0;

  console.log(workflow.schemaId);
  //check smart contract for executions

  const DeviceCard: React.FC<{ deviceId: string }> = ({ deviceId }) => {
    // TODO: replace with actual device data
    const mockDeviceData: DeviceData = {
      id: deviceId,
      executions: Math.floor(Math.random() * 10),
      sirnBalance: 0,
    };
    return (
      <>
        <div className="bg-gray-50 rounded-lg p-3 space-y-3 transition-all hover:bg-gray-100">
          {/* Device ID and Submit Record */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 truncate max-w-[240px] sm:max-w-[400px]">
              {formatAddress(deviceId)}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 min-w-[130px]"
              onClick={() => setOpen(true)}
            >
              <ActivitySquare className="h-3 w-3 mr-1" />
              Submit Record
            </Button>
          </div>

          {/* Executions and Rewards Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="h-3 w-3 text-red-600" />
              <span className="text-sm text-gray-600">
                {mockDeviceData.executions} executions
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className={`bg-white min-w-[130px] ${
                hasExecutions(mockDeviceData.executions)
                  ? "text-gray-700 hover:bg-red-50 hover:text-red-600"
                  : "text-gray-400 cursor-not-allowed"
              }`}
              disabled={!hasExecutions(mockDeviceData.executions)}
            >
              <Calculator className="h-3 w-3 mr-1" />
              Rewards
            </Button>
          </div>

          {/* Estimated SIRN Rewards */}
          <div className="text-sm text-gray-600 flex items-center justify-end">
            <span className="text-red-600 font-medium">
              {hasExecutions(mockDeviceData.executions)
                ? "Estimated: "
                : "No rewards yet"}
            </span>
          </div>

          {workflow.schemaId == "m-schema-002" ? (
            <NoiseDialog open={open} onOpenChange={setOpen} />
          ) : (
            <TemperatureDialog
              open={open}
              onOpenChange={setOpen}
              deviceId={deviceId}
            />
          )}
        </div>
      </>
    );
  };

  return (
    <Card className="overflow-hidden bg-white hover:shadow-md transition-shadow duration-200">
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
                {workflow.title ?? workflow.bucketName}
                <ExternalLink className="h-4 w-4 text-red-600 cursor-pointer hover:text-red-700" />
              </h3>
              <p className="text-sm text-gray-600">
                {workflow.description ?? "Basic weather monitoring"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-red-600" />
              <span>{workflow.contributorCount}</span>
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

              {showDevices && (
                <div className="space-y-3">
                  {workflow.deviceIds?.map((deviceId: string) => (
                    <DeviceCard key={deviceId} deviceId={deviceId} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-red-600" />
                    <span>
                      Schema: {workflow.schemaId ?? "temp-humid-basic"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-red-600" />
                    <span>Creator: {formatAddress(workflow.creator)}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
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
