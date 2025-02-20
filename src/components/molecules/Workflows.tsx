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
} from "lucide-react";
import { Card, CardContent } from "@/components/atoms/card";
import { Button, Spinner } from "../atoms";
import {
  formatAddress,
  formatTimeAgo,
  formatTokenAmount,
} from "@/utils/helpers";
import NoiseDialog from "./DialogModals/NoiseDialog";
import { TemperatureDialog } from "./DialogModals/TemperatureDialog";
import { createPublicClient, Hex, http } from "viem";
import { bscTestnet } from "viem/chains";
import RegistryArtifacts from "../../../contracts/artifacts/MedusaRegistry.json";
import { getDeviceExecutionInfo } from "@/utils/contractHelpers";

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
    deviceWalletIds: string[];
    schemaId: string;
    creator: string;
    executionInterval: number;
  };
  handleJoinWorkflow: (id: number) => void;
  isPending: boolean;
  isListView?: boolean;
}

const DeviceCard = ({
  deviceId,
  deviceWalletId,
  workflowId,
  schemaId,
  registryContract,
  registryAbi,
  executionInterval,
}: {
  deviceId: string;
  workflowId: number;
  schemaId: string;
  registryContract: string;
  registryAbi: any[];
  deviceWalletId: string;
  executionInterval?: number;
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
              {deviceData.executions} executions
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className={`bg-white min-w-[130px] ${
              hasExecutions(deviceData.executions)
                ? "text-gray-700 hover:bg-red-50 hover:text-red-600"
                : "text-gray-400 cursor-not-allowed"
            }`}
            disabled={!hasExecutions(deviceData.executions)}
          >
            <Calculator className="h-3 w-3 mr-1" />
            Rewards
          </Button>
        </div>

        {/* Estimated SIRN Rewards */}
        <div className="text-sm text-gray-600 flex items-center justify-between">
          <span
            className={deviceData.isActive ? "text-green-500" : "text-gray-400"}
          >
            {deviceData.isActive ? "Active" : "Inactive"}
          </span>
          <span className="text-red-600 font-medium">
            {hasExecutions(deviceData.executions)
              ? `Last active: ${formatTimeAgo(deviceData.lastExecuted)}`
              : "No rewards yet"}
          </span>
        </div>

        {schemaId === "m-schema-002" ? (
          <NoiseDialog
            open={open}
            onOpenChange={setOpen}
            deviceId={deviceWalletId}
            workflowId={workflowId.toString()}
            executionInterval={workflowExecutionInterval}
            lastExecuted={deviceData.lastExecuted}
          />
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

const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  handleJoinWorkflow,
  isPending,
  isListView = true,
}) => {
  const [showDevices, setShowDevices] = useState(workflow.isContributor);

  console.log(workflow);

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
              {/* <span>{workflow.totalExecutions}</span> */}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className={`p-4 ${isListView ? "md:flex-1" : ""}`}>
          {workflow.isContributor ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <PlusCircle
                    className="cursor-pointer"
                    onClick={() => handleJoinWorkflow(workflow.id)}
                  />
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
