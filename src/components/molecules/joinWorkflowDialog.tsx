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
  const { handleLogin, isLoggingIn } = useEthContext();
  const { authenticated, sendTransaction, signTransaction } = usePrivy();
  const { wallets } = useWallets();
  const connectedWallet = wallets.find((wallet) => wallet.type === "ethereum");

  const registerDevice = trpc.registerDevice.useMutation({
    onSuccess: (data) => {
      console.log("Device registered:", data);
      onClose();
    },
    onError: (error) => {
      console.error("Registration failed:", error);
    },
  });

  const handleSubmit = async () => {
    if (!deviceId) return;
    if (!connectedWallet) return;

    const response: any = registerDevice.mutate({
      workflowId,
    });

    if (response) {
      const provider = await connectedWallet.getEthereumProvider();

      const transactionRequest = {
        to: response.contractAddress,
        data: response.data,
        value: 0,
      };
      const transactionHash = await provider.request({
        method: "eth_sendTransaction",
        params: [transactionRequest],
      });

      console.log(transactionHash);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border border-white/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Join Workflow: {workflowTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Device/Sensor ID
            </label>
            <Input
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="Enter device identifier"
              className="w-full"
            />
          </div>

          <div className="pt-4 space-y-2">
            <Button
              disabled={authenticated || isLoggingIn}
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-[#E6B24B] to-[#B88A2D]"
            >
              {isLoggingIn ? "Logging in" : " Connect Wallet"}
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={!deviceId || registerDevice.isPending}
              className="w-full bg-black text-white hover:bg-black/80"
            >
              {registerDevice.isPending ? "Registering..." : "Register Device"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
