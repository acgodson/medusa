import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";

import { trpc } from "@/trpc/client";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEthContext } from "@/providers/EthContext";
import { Copy, ExternalLink } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "../../atoms";
import { Progress } from "@/components/atoms/progress";

interface JoinWorkflowDialogProps {
  workflowId: number;
  workflowTitle: string;
  open: boolean;
  onClose: () => void;
}

export function JoinWorkflowDialog({
  workflowId,
  workflowTitle,
  open,
  onClose,
}: JoinWorkflowDialogProps) {
  // device creation and ownershiip details
  const [deviceId, setDeviceId] = useState("hs8flg95j30bg4vgjf8aoou6");
  const [deviceAddress, setDeviceAddress] = useState(
    "0xdC97F1f262974C7719e5968A1Cf3eeb128634879"
  );
  const [nftTxHash, setNftTxHash] = useState("");

  // device registration details
  const [registryTxHash, setRegistryTxHash] = useState("");
  const [status, setStatus] = useState<
    "idle" | "creating_device" | "joining_workflow" | "completed"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const { handleLogin, isLoggingIn } = useEthContext();
  const { authenticated, sendTransaction, signTransaction } = usePrivy();
  const { wallets } = useWallets();
  const connectedWallet = wallets.find((wallet) => wallet.type === "ethereum");

  const registerDevice = trpc.registerDevice.useMutation({
    onSuccess: async (data) => {
      setDeviceId(data.walletId);
      setDeviceAddress(data.address);
      setNftTxHash(data.nftTxHash);

      // Automatically proceed to join workflow
      try {
        const result = await joinWorkflow.mutateAsync({
          workflowId,
          walletId: data.walletId,
          deviceAddress: data.address,
        });
        setRegistryTxHash(result.registryTxHash);
        setStatus("completed");
      } catch (err: any) {
        setError(err.message);
        setStatus("idle");
      }
    },
    onError: (error) => {
      setError(error.message);
      setStatus("idle");
    },
  });

  const joinWorkflow = trpc.joinWorkflow.useMutation();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Failed to copy:", err);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!connectedWallet) return;
    setError(null);

    // If we have device details but no registry tx, try joining workflow directly
    if (deviceId && deviceAddress && !registryTxHash) {
      setStatus("joining_workflow");
      try {
        const result = await joinWorkflow.mutateAsync({
          workflowId,
          walletId: deviceId,
          deviceAddress: deviceAddress,
        });
        setRegistryTxHash(result.registryTxHash);
        setStatus("completed");
      } catch (err: any) {
        setError(err.message);
        setStatus("idle");
      }
      return;
    }

    // Otherwise create new device
    setStatus("creating_device");
    try {
      await registerDevice.mutateAsync({
        workflowId,
        owner: connectedWallet.address,
      });
    } catch (err: any) {
      setError(err.message);
      setStatus("idle");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border border-white/50 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white/95 backdrop-blur-xl z-10 pb-4">
          <DialogTitle className="text-xl font-semibold">
            {workflowTitle ? (
              <div className="space-y-1">
                <div>Join Workflow: {workflowTitle}</div>
                <div className="text-sm text-gray-500 font-normal">
                  ID: {workflowId}
                </div>
              </div>
            ) : (
              `Join Workflow #${workflowId}`
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {status !== "idle" && (
            <div className="space-y-4">
              <Progress
                value={
                  status === "creating_device"
                    ? 50
                    : status === "joining_workflow"
                    ? 75
                    : status === "completed"
                    ? 100
                    : 0
                }
              />

              <div className="text-sm">
                {status === "creating_device" && "Creating device wallet..."}
                {status === "joining_workflow" && "Joining workflow..."}
                {status === "completed" && "Successfully joined workflow!"}
              </div>
            </div>
          )}
          {(nftTxHash || registryTxHash) && (
            <Alert className="border-2 border-emerald-500 bg-emerald-100/90 backdrop-blur-sm">
              <AlertTitle className="text-emerald-800 font-semibold">
                Device {registryTxHash ? "Registered" : "Created"} Successfully!
              </AlertTitle>
              <AlertDescription className="text-emerald-700 mt-1">
                <div className="space-y-2">
                  <p>Transaction has been submitted.</p>
                  <a
                    href={`https://testnet.bscscan.com/tx/${nftTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-emerald-900 font-medium hover:underline"
                  >
                    View on explorer
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600 block">
                Device/Sensor ID
              </label>
              <div className="relative">
                <Input
                  value={deviceId}
                  readOnly
                  placeholder="Device identifier would appear here"
                  className="w-full pr-8 font-mono text-sm"
                />
                {deviceId && (
                  <button
                    onClick={() => copyToClipboard(deviceId)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-md"
                  >
                    <Copy className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-600 block">
                Device Wallet
              </label>
              <div className="relative">
                <Input
                  value={deviceAddress}
                  readOnly
                  placeholder="Device wallet address would appear here"
                  className="w-full pr-8 font-mono text-sm"
                />
                {deviceAddress && (
                  <button
                    onClick={() => copyToClipboard(deviceAddress)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-md"
                  >
                    <Copy className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {!authenticated ? (
              <Button
                disabled={authenticated || isLoggingIn}
                onClick={handleLogin}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isLoggingIn ? "Logging in..." : "Connect Wallet"}
              </Button>
            ) : (
              <Button
                onClick={() =>
                  status === "completed" ? onClose : handleSubmit
                }
                disabled={status !== "idle" && status !== "completed"}
                className={`w-full ${
                  deviceId && deviceAddress && !registryTxHash
                    ? "bg-zinc-800 hover:bg-zinc-900"
                    : "bg-emerald-600 hover:bg-emerald-700"
                } text-white`}
              >
                {deviceId && deviceAddress && !registryTxHash
                  ? "Join Workflow"
                  : status === "idle"
                  ? "Create Device"
                  : status === "completed"
                  ? "Finished"
                  : "Processing..."}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
