import React, { useEffect, useState } from "react";
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
import { SubmitRecordDialog } from "./submitRecordDialog";
import { Tooltip } from "../atoms/tooltip";
import WalletDialog from "./WalletDialog";
import { createPublicClient, formatEther, http } from "viem";
import { baseSepolia } from "viem/chains";
import { trpc } from "@/trpc/client";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

interface DeviceBalance {
  deviceId: string;
  address: string;
  balance: string;
  isLoading: boolean;
}

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
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [deviceBalances, setDeviceBalances] = useState<DeviceBalance[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const getWallet = trpc.getServerWallet.useMutation();

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleSubmitRecord = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setSubmitDialogOpen(true);
  };

  const handleOpenWallet = (id: string) => {
    setIsWalletOpen(true);
    setSelectedDeviceId(id);
  };

  const fetchDeviceBalances = async () => {
    if (!workflow.deviceIds?.length) return;
    setIsLoadingBalances(true);

    try {
      const wallets = await Promise.all(
        workflow.deviceIds.map((deviceId: string) =>
          getWallet.mutateAsync({ walletId: deviceId })
        )
      );

      const balances = await Promise.all(
        wallets.map((wallet) =>
          publicClient.getBalance({ address: wallet.address })
        )
      );

      setDeviceBalances(
        workflow.deviceIds.map((deviceId: string, index: number) => ({
          deviceId,
          address: wallets[index].address,
          balance: formatEther(balances[index]),
          isLoading: false,
        }))
      );
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  useEffect(() => {
    if (showDevices) {
      fetchDeviceBalances();
    }
  }, [showDevices]);

  const getDeviceBalance = (deviceId: string) => {
    const device = deviceBalances.find((d) => d.deviceId === deviceId);
    if (!device) return { balance: "0", isLoading: true };
    return { balance: device.balance, isLoading: device.isLoading };
  };



const x = () =>{


}




  return (
    <>
      <Card
        key={workflow.id}
        className={`group relative overflow-hidden transition-all duration-300 ${
          isListView ? "flex flex-col md:flex-row md:items-center md:gap-4" : ""
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/30 backdrop-blur-xl"></div>
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#E6B24B]/5 to-transparent 
                      opacity-100 transition-opacity duration-300"
        ></div>
        <div className="absolute inset-0 border border-white/60 rounded-xl shadow-lg"></div>

        {/* Content */}
        <div
          className={`
            relative z-10 p-6 w-full h-full
            ${isListView ? "flex flex-row items-center gap-6" : "flex flex-col"}
         `}
        >
          <div className={`${isListView ? "w-1/3" : ""}`}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-800">
                  {workflow.name}
                  <ExternalLink className="h-4 w-4 text-[#E6B24B]" />
                </h3>
                <p className="text-sm text-gray-600">{workflow.description}</p>
              </div>
            </CardHeader>
          </div>

          <CardContent className={isListView ? "flex" : ""}>
            <div className="space-y-6">
              {!isListView && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#E6B24B]" />
                    <span className="text-gray-700">
                      {workflow.contributors} contributors
                    </span>
                  </div>
                  <div className="text-[#E6B24B]">
                    {workflow.totalExecutions} <Tooltip>executions</Tooltip>
                  </div>
                </div>
              )}

              {!showDevices ? (
                <>
                  <div
                    className="p-4 bg-white/40 backdrop-blur-md rounded-lg border border-white/60 
                               shadow-inner space-y-3"
                  >
                    <div className="text-xs text-gray-500 font-medium">
                      Details:
                    </div>
                    <div className="text-sm space-y-2 text-gray-700">
                      <div className="flex items-center gap-2">
                        <Workflow className="h-4 w-4 text-[#E6B24B]" />
                        <span>Schema: {workflow.schema}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#E6B24B]" />
                        <span>Creator: {formatAddress(workflow.creator)}</span>
                      </div>
                    </div>
                  </div>
                  {workflow.isContributor && (
                    <p
                      className="text-xs flex justify-end text-[#E6B24B] hover:text-[#B88A2D] 
                               cursor-pointer ehover:underline transition-colors duration-200"
                      onClick={() => setShowDevices(true)}
                    >
                      You have{" "}
                      <b className="px-1">{workflow.deviceIds.length}</b>{" "}
                      registered device(s)
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium text-gray-800">
                      Registered Devices
                    </h4>
                    <button
                      className="text-xs text-[#E6B24B] hover:text-[#B88A2D] transition-colors duration-200"
                      onClick={() => setShowDevices(false)}
                    >
                      Back to Details
                    </button>
                  </div>
                  {workflow.deviceIds.map((deviceId: string, index: number) => {
                    const { balance, isLoading } = getDeviceBalance(deviceId);
                    return (
                      <div
                        key={index}
                        className="p-4 bg-white/40 backdrop-blur-md rounded-lg 
                                                border border-white/60 shadow-inner"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center w-full gap-2">
                              <p className="text-sm font-medium truncate text-gray-800">
                                {deviceId}
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-[#E6B24B]/10"
                                title="Fund Device"
                                onClick={() => handleOpenWallet(deviceId)}
                              >
                                <Wallet className="h-3 w-3 text-[#E6B24B]" />
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500">
                              {isLoading ? (
                                <span className="inline-block w-16 h-4 bg-gray-200 animate-pulse rounded" />
                              ) : (
                                `${Number(balance).toFixed(4)} ETH`
                              )}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {isListView ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs font-medium bg-white/80 
                                           border-1.5 border-gray-200 hover:bg-white hover:border-gray-300 
                                           text-gray-700 shadow-sm hover:shadow transition-all duration-200"
                                >
                                  <span className="mr-1">
                                    {index === 2 ? "2" : "0"}
                                  </span>{" "}
                                  Executions
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs font-medium bg-white/80 
                                  border-1.5 border-gray-200 hover:bg-white hover:border-gray-300 
                                  text-gray-700 shadow-sm hover:shadow transition-all duration-200"
                                  onClick={() => handleSubmitRecord(deviceId)}
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Submit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs font-medium bg-white/80 
                                  border-1.5 border-gray-200 hover:bg-white hover:border-gray-300 
                                  text-gray-700 shadow-sm hover:shadow transition-all duration-200"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-white/80 backdrop-blur-sm border-1.5
                                           hover:bg-white hover:border-gray-300 text-gray-700
                                           shadow-sm hover:shadow transition-all duration-200"
                                >
                                  0
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-white/60 backdrop-blur-sm border-white/60 
                                           hover:bg-white/80 text-gray-700"
                                  onClick={() => handleSubmitRecord(deviceId)}
                                >
                                  <Play className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-white/60 backdrop-blur-sm border-white/60 
                                           hover:bg-white/80 text-gray-700"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!showDevices && (
                <Button
                  variant="outline"
                  className="w-full bg-white/60 backdrop-blur-sm border-[#E6B24B]/30 
                           hover:bg-[#E6B24B]/10 text-gray-700 shadow-md hover:shadow-lg 
                           transition-all duration-200"
                  onClick={() => handleJoinWorkflow(workflow.id)}
                >
                  {isPending ? <Spinner /> : "Join Workflow"}
                </Button>
              )}
            </div>
          </CardContent>
        </div>

        <SubmitRecordDialog
          open={submitDialogOpen}
          onClose={() => setSubmitDialogOpen(false)}
          deviceId={selectedDeviceId}
          workflowTitle={workflow.name}
          workflowId={workflow.id}
        />

        <WalletDialog
          open={isWalletOpen}
          onClose={() => setIsWalletOpen(false)}
          walletId={selectedDeviceId}
        />
      </Card>
    </>
  );
};

export default Workflows;
