import React, { useEffect, useState } from "react";
import {
  ExternalLink,
  Users,
  Workflow,
  Calculator,
  Play,
  ChevronDown,
  ChevronUp,
  ActivitySquare,
  PlusCircle,
  PauseCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/atoms/card";
import { Button, Spinner } from "../atoms";
import { formatAddress, formatTimeAgo } from "@/utils/helpers";
import NoiseDialog from "./DialogModals/NoiseDialog";
import { TemperatureDialog } from "./DialogModals/TemperatureDialog";
import { createPublicClient, Hex, http } from "viem";
import { bscTestnet } from "viem/chains";
import RegistryArtifacts from "../../../contracts/artifacts/MedusaRegistry.json";
import { getDeviceExecutionInfo } from "@/utils/contractHelpers";
import { useWorkflow } from "@/hooks/useWorkflow";
import { Tooltip } from "@/components/atoms/tooltip";

interface WorkflowCardProps {
  workflow: {
    id: number;
    title: string;
    status: any;
    bucketName?: string;
    description: string;
    contributorCount: number;
    totalExecutions: number;
    isContributor: boolean;
    deviceIds: string[];
    deviceWalletIds: string[];
    schemaId: string;
    creator: string;
    executionInterval: number;

  };
  handleJoinWorkflow: (id: number) => void;
  isPending: boolean;
  isListView?: boolean;
  showLink?: boolean;
}

const DeviceCard = ({
  deviceId,
  deviceWalletId,
  workflowId,
  schemaId,
  registryContract,
  registryAbi,
  executionInterval,
  isPaused,
}: {
  deviceId: string;
  workflowId: number;
  schemaId: string;
  registryContract: string;
  registryAbi: any[];
  deviceWalletId: string;
  executionInterval?: number;
  isPaused: boolean;
}) => {
  const [deviceData, setDeviceData] = useState({
    id: deviceId,
    executions: 0,
    lastExecuted: 0,
    isActive: false,
    loading: true,
  });
  const [open, setOpen] = useState(false);
  const [workflowExecutionInterval, setWorkflowExecutionInterval] =
    useState<number>(executionInterval || 0);

  useEffect(() => {
    const fetchDeviceExecutionData = async () => {
      try {
        const publicClient = createPublicClient({
          chain: bscTestnet,
          transport: http(),
        });

        const result: any = await getDeviceExecutionInfo(
          publicClient,
          registryContract as Hex,
          registryAbi,
          deviceId
        );
        // If execution interval wasn't passed from parent, fetch it now
        if (!executionInterval) {
          try {
            const [workflowData] = (await publicClient.readContract({
              address: registryContract as Hex,
              abi: registryAbi,
              functionName: "getDetailedWorkflow",
              args: [workflowId],
            })) as any;
            setWorkflowExecutionInterval(
              Number(workflowData.executionInterval)
            );
          } catch (error) {
            console.error("Error fetching workflow execution interval:", error);
          }
        }

        setDeviceData({
          id: deviceWalletId,
          executions: result.count,
          lastExecuted: result.lastExecuted,
          isActive: result.isActive,
          loading: false,
        });
      } catch (error) {
        console.error("Error fetching device execution data:", error);
        setDeviceData((prev) => ({
          ...prev,
          loading: false,
        }));
      }
    };

    if (deviceId) {
      fetchDeviceExecutionData();
    }
  }, [deviceId, registryContract, registryAbi, executionInterval]);

  const hasExecutions = (executions: any) => executions > 0;

  if (deviceData.loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 space-y-3 transition-all">
        <div className="animate-pulse flex flex-col space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`bg-gray-50 rounded-lg p-3 space-y-3 transition-all hover:bg-gray-100 ${
          isPaused ? "opacity-75" : ""
        }`}
      >
        {/* Device ID and Submit Record */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900 truncate max-w-[240px] sm:max-w-[400px]">
            {formatAddress(deviceId)}
          </span>
          <Tooltip content={isPaused ? "Workflow is paused" : ""}>
            <Button
              size="sm"
              variant="outline"
              className={`bg-white text-gray-700 ${
                isPaused
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "hover:bg-red-50 hover:text-red-600"
              } min-w-[130px]`}
              onClick={() => !isPaused && setOpen(true)}
              disabled={isPaused}
            >
              <ActivitySquare className="h-3 w-3 mr-1" />
              Submit Record
            </Button>
          </Tooltip>
        </div>

        {/* Executions and Rewards Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="h-3 w-3 text-red-600" />
            <span className="text-sm text-gray-600">
              {deviceData.executions} executions
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className={`bg-white min-w-[130px] ${
              hasExecutions(deviceData.executions) && !isPaused
                ? "text-gray-700 hover:bg-red-50 hover:text-red-600"
                : "text-gray-400 cursor-not-allowed"
            }`}
            disabled={!hasExecutions(deviceData.executions) || isPaused}
          >
            <Calculator className="h-3 w-3 mr-1" />
            Rewards
          </Button>
        </div>

        {/* Estimated SIRN Rewards */}
        <div className="text-sm text-gray-600 flex items-center justify-between">
          <span
            className={`${
              isPaused
                ? "text-gray-400"
                : deviceData.isActive
                ? "text-green-500"
                : "text-gray-400"
            }`}
          >
            {isPaused ? "Paused" : deviceData.isActive ? "Active" : "Inactive"}
          </span>
          <span className="text-red-600 text-xs font-medium">
            {hasExecutions(deviceData.executions)
              ? `Last active: ${formatTimeAgo(deviceData.lastExecuted)}`
              : "No rewards yet"}
          </span>
        </div>

        {schemaId === "m-schema-002" ? (
          <NoiseDialog
            open={open && !isPaused}
            onOpenChange={setOpen}
            deviceId={deviceWalletId}
            workflowId={workflowId.toString()}
            executionInterval={workflowExecutionInterval}
            lastExecuted={deviceData.lastExecuted}
          />
        ) : (
          <TemperatureDialog
            open={open && !isPaused}
            onOpenChange={setOpen}
            deviceId={deviceId}
          />
        )}
      </div>
    </>
  );
};

const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  handleJoinWorkflow,
  isPending,
  isListView = true,
  showLink = true,
}) => {
  const [showDevices, setShowDevices] = useState(workflow.isContributor);
  const { togglePause, address } = useWorkflow();
  const isPaused = workflow.status === "Paused";
  const isArchived = workflow.status === "Archived";

  const getOverlayStyles = () => {
    if (isPaused) {
      return "after:absolute after:inset-0 after:bg-gray-200 after:bg-opacity-30 after:z-10 relative";
    }
    if (isArchived) {
      return "after:absolute after:inset-0 after:bg-gray-300 after:bg-opacity-40 after:z-10 relative";
    }
    return "";
  };

  return (
    <Card
      className={`overflow-hidden bg-white hover:shadow-md transition-shadow duration-200 ${getOverlayStyles()}`}
    >
      {(isPaused || isArchived) && (
        <div className="absolute top-2 right-2 z-20 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 shadow-sm">
          {isPaused && (
            <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded flex items-center">
              <PauseCircle size={12} className="mr-1" />
              Paused
            </div>
          )}
          {isArchived && (
            <div className="bg-gray-100 text-gray-800 px-2 py-1 rounded flex items-center">
              <PauseCircle size={12} className="mr-1" />
              Archived
            </div>
          )}
        </div>
      )}

      <CardContent
        className={`p-0 ${isListView ? "md:flex md:items-start" : ""}`}
      >
        {/* Header Section */}
        <div
          className={`
            border-b border-gray-100 bg-gradient-to-r from-red-50 to-white
            p-4 ${isListView ? "md:w-1/3 md:border-b-0 md:border-r" : ""}
            ${isPaused ? "opacity-80" : ""}
          `}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                {workflow.title ?? workflow.bucketName}
                {showLink && (
                  <a
                    href={`/workflow/${workflow.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${
                      workflow.title ?? workflow.bucketName
                    } in new tab`}
                  >
                    <ExternalLink className="h-4 w-4 text-red-600 cursor-pointer hover:text-red-700" />
                  </a>
                )}
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
              <Tooltip
                content={
                  address && workflow.creator === address
                    ? "Toggle workflow pause state"
                    : ""
                }
              >
                <button
                  className={`${
                    address && workflow.creator === address
                      ? "cursor-pointer hover:opacity-70"
                      : "cursor-default"
                  }`}
                  onClick={
                    address && workflow.creator === address
                      ? () => togglePause(workflow.id)
                      : undefined
                  }
                >
                  {isPaused ? (
                    <PauseCircle className="h-4 w-4 text-yellow-600" />
                  ) : (
                    <Play className="h-4 w-4 text-red-600" />
                  )}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className={`p-4 ${isListView ? "md:flex-1" : ""}`}>
          {workflow.isContributor ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Tooltip
                    content={
                      isPaused
                        ? "Cannot add agents while workflow is paused"
                        : "Add new agent"
                    }
                  >
                    <div>
                      <PlusCircle
                        className={`${
                          isPaused
                            ? "text-gray-400"
                            : "text-gray-700 cursor-pointer hover:text-red-600"
                        }`}
                        onClick={
                          !isPaused
                            ? () => handleJoinWorkflow(workflow.id)
                            : undefined
                        }
                      />
                    </div>
                  </Tooltip>
                  <h4 className="text-sm font-medium text-gray-900">
                    My Agents ({workflow.deviceIds?.length ?? 0})
                  </h4>
                </div>

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
                  {workflow.deviceIds?.map(
                    (deviceId: string, index: number) => (
                      <DeviceCard
                        key={deviceId}
                        deviceId={deviceId}
                        deviceWalletId={workflow.deviceWalletIds[index]}
                        workflowId={workflow.id}
                        schemaId={workflow.schemaId}
                        registryContract={
                          process.env.NEXT_PUBLIC_REGISTRY_CONTRACT!
                        }
                        registryAbi={RegistryArtifacts.abi}
                        executionInterval={workflow.executionInterval}
                        isPaused={isPaused}
                      />
                    )
                  )}
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

              <Tooltip content={isPaused ? "Cannot join paused workflow" : ""}>
                <Button
                  variant="outline"
                  className={`w-full ${
                    !isPaused
                      ? "bg-zinc-800 text-white hover:bg-zinc-900 hover:text-white"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                  onClick={
                    !isPaused
                      ? () => handleJoinWorkflow(workflow.id)
                      : undefined
                  }
                  disabled={isPaused || isPending}
                >
                  {isPending ? (
                    <Spinner />
                  ) : isPaused ? (
                    "Workflow Paused"
                  ) : (
                    "Join Workflow"
                  )}
                </Button>
              </Tooltip>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowCard;
