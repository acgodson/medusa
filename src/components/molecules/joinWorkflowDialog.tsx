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
import { Alert, AlertTitle, AlertDescription } from "../atoms";
import { getAddress, parseEther } from "viem";

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
  const [deviceId, setDeviceId] = useState("");
  const [deviceAddress, setDeviceAddress] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [fundingHash, setFundingHash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFunding, setIsFunding] = useState(false);
  const { handleLogin, isLoggingIn } = useEthContext();
  const { authenticated, sendTransaction, signTransaction } = usePrivy();
  const { wallets } = useWallets();
  const connectedWallet = wallets.find((wallet) => wallet.type === "ethereum");

  const registerDevice = trpc.registerDevice.useMutation({
    onSuccess: (data) => {
      console.log("Device registered:", data);
    },
    onError: (error) => {
      console.error("Registration failed:", error);
      setError(error.message);
    },
  });

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
    setError(null); // Reset error state

    try {
      const response = await registerDevice.mutateAsync({
        workflowId,
      });

      if (response) {
        const provider = await connectedWallet.getEthereumProvider();
        const transactionRequest = {
          to: getAddress(response.data.contractAddress!),
          from: getAddress(connectedWallet.address),
          data: response.data.data,
          value: 0,
        };

        const hash = await provider.request({
          method: "eth_sendTransaction",
          params: [transactionRequest],
        });

        setDeviceAddress(response.address);
        setDeviceId(response.walletId);
        setTransactionHash(hash);
      }
    } catch (err: any) {
      setError(err.message || "Failed to register device");
    }
  };

  const handleFundDevice = async () => {
    if (!connectedWallet || !deviceAddress) return;
    setError(null);

    try {
      setIsFunding(true);
      const provider = await connectedWallet.getEthereumProvider();
      const transactionRequest = {
        to: getAddress(deviceAddress),
        from: getAddress(connectedWallet.address),
        value: parseEther("0.02"), // Sending 0.01 ETH, adjust as needed
      };

      const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [transactionRequest],
      });

      setFundingHash(hash);
      setIsFunding(false);
    } catch (err: any) {
      setError(err.message || "Failed to fund device");
      setIsFunding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border border-white/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {workflowTitle ? (
              <>
                Join Workflow: {workflowTitle}
                <div className="text-sm text-gray-500 font-normal mt-1">
                  ID: {workflowId}
                </div>
              </>
            ) : (
              `Join Workflow #${workflowId}`
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {error && (
            <Alert className="border-2 border-red-500 bg-red-100/90 backdrop-blur-sm">
              <AlertTitle className="text-red-800 font-semibold text-base">
                Error
              </AlertTitle>
              <AlertDescription className="text-red-700 mt-1">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {transactionHash ||
            (fundingHash && (
              <Alert className="border-2 border-emerald-500 bg-emerald-100/90 backdrop-blur-sm">
                <AlertTitle className="text-emerald-800 font-semibold text-base">
                  Device Registration Successful!
                </AlertTitle>
                <AlertDescription className="text-emerald-700 mt-1">
                  Transaction has been submitted.{" "}
                  <a
                    href={`https://sepolia.basescan.org/tx/${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-emerald-900 font-medium hover:underline"
                  >
                    View on Basescan
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </AlertDescription>
              </Alert>
            ))}

          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Device/Sensor ID
            </label>
            <Input
              value={deviceId}
              readOnly={true}
              placeholder="Device identifier would appear here"
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Device Wallet
            </label>
            {deviceAddress && (
              <button
                onClick={() => copyToClipboard(deviceAddress)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-md"
              >
                <Copy className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </div>

          <div className="pt-4 space-y-2">
            {!authenticated ? (
              <Button
                disabled={authenticated || isLoggingIn}
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-[#E6B24B] to-[#B88A2D]"
              >
                {isLoggingIn ? "Logging in" : "Connect Wallet"}
              </Button>
            ) : transactionHash ? (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  Fund this device to cover future transaction fees when
                  submitting records.
                </p>
                <Button
                  onClick={handleFundDevice}
                  disabled={isFunding}
                  className="w-full bg-black text-white hover:bg-black/80"
                >
                  {isFunding ? "Processing..." : "Fund Device"}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={registerDevice.isPending}
                className="w-full bg-black text-white hover:bg-black/80"
              >
                {registerDevice.isPending
                  ? "Registering..."
                  : "Register Device"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
