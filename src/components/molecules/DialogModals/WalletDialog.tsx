import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Copy, ExternalLink } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/atoms";
import { getAddress, parseEther } from "viem";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { trpc } from "@/trpc/client";
import { useAuthenticatedAction } from "@/hooks/useAuth";

interface WalletDialogProps {
  open: boolean;
  onClose: () => void;
  walletId: string;
}

export function WalletDialog({ open, onClose, walletId }: WalletDialogProps) {
  const [deviceAddress, setDeviceAddress] = useState("");
  const [fundingHash, setFundingHash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFunding, setIsFunding] = useState(false);
  const { withAuth } = useAuthenticatedAction();

  const { wallets } = useWallets();
  const connectedWallet = wallets.find(
    (wallet) => wallet.walletClientType !== "privy"
  );

  const getWallet = trpc.getServerWallet.useMutation({
    onSuccess: (data) => {
      setDeviceAddress(data.address);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  useEffect(() => {
    if (open && walletId) {
      getWallet.mutate({ walletId });
    }
  }, [open, walletId]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Failed to copy:", err);
      return false;
    }
  };

  const handleFundDevice = async () => {
    if (!connectedWallet) return;
    setError(null);

    try {
      setIsFunding(true);
      const provider = await connectedWallet.getEthereumProvider();
      const transactionRequest = {
        to: getAddress(deviceAddress),
        from: getAddress(connectedWallet.address),
        value: parseEther("0.02"),
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

  const handleSubmit = () => {
    withAuth(handleFundDevice);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border border-white/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Fund Device Wallet
            <br />
            <p className="text-xs">{walletId}</p>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {error && (
            <Alert className="border-2 border-red-500 bg-red-100/90">
              <AlertTitle className="text-red-800 font-semibold">
                Error
              </AlertTitle>
              <AlertDescription className="text-red-700 mt-1 break-words">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {fundingHash && (
            <Alert className="border-2 border-emerald-500 bg-emerald-100/90">
              <AlertTitle className="text-emerald-800 font-semibold">
                Funding Successful!
              </AlertTitle>
              <AlertDescription className="text-emerald-700 mt-1">
                <div className="space-y-2">
                  <p>Transaction has been submitted.</p>
                  <a
                    href={`https://sepolia.basescan.org/tx/${fundingHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-emerald-900 font-medium hover:underline"
                  >
                    View on Basescan
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm text-gray-600">
              Device Wallet Address
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-50 p-2 rounded-md font-mono text-sm truncate">
                {deviceAddress || "Loading..."}
              </div>
              {deviceAddress && (
                <button
                  onClick={() => copyToClipboard(deviceAddress)}
                  className="p-2 hover:bg-gray-100 rounded-md"
                >
                  <Copy className="h-4 w-4 text-gray-500" />
                </button>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSubmit}
              disabled={isFunding || !deviceAddress}
              className="w-full bg-black text-white hover:bg-black/80"
            >
              {isFunding ? "Processing..." : "Fund Device (0.02 ETH)"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WalletDialog;
