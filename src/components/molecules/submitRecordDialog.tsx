import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Alert, AlertTitle, AlertDescription } from "../atoms";
import { trpc } from "@/trpc/client";
import { usePrivy } from "@privy-io/react-auth";
import { ExternalLink } from "lucide-react";

interface SubmitRecordDialogProps {
  open: boolean;
  onClose: () => void;
  deviceId: string;
  workflowTitle: string;
}

export function SubmitRecordDialog({
  open,
  onClose,
  deviceId,
  workflowTitle,
}: SubmitRecordDialogProps) {
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { authenticated } = usePrivy();

  const executeWorkflow = trpc.executeWorkflow.useMutation({
    onSuccess: (data) => {
      console.log("Record submitted:", data);
      // Handle success - maybe show a success message or close dialog
    },
    onError: (error) => {
      console.error("Submission failed:", error);
      setError(error.message);
    },
  });

  const handleSubmit = async () => {
    setError(null);

    // Basic validation
    if (!temperature || !humidity) {
      setError("Please fill in all fields");
      return;
    }

    const tempValue = parseFloat(temperature);
    const humidityValue = parseFloat(humidity);

    if (isNaN(tempValue) || isNaN(humidityValue)) {
      setError("Please enter valid numbers");
      return;
    }

    try {
      const response = await executeWorkflow.mutateAsync({
        deviceId,
        data: {
          temperature: tempValue,
          humidity: humidityValue,
          timestamp: Date.now(),
        },
      });

      if (response.success) {
        console.log(response);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit record");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border border-white/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Submit Record
            <div className="text-sm text-gray-500 font-normal mt-1">
              {workflowTitle} - Device: {deviceId}
            </div>
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

          {transactionHash && (
            <Alert className="border-2 border-emerald-500 bg-emerald-100/90 backdrop-blur-sm">
              <AlertTitle className="text-emerald-800 font-semibold text-base">
                Record Submitted Successfully!
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
          )}

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                Temperature (°C)
              </label>
              <Input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="Enter temperature"
                className="w-full"
                step="0.1"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                Humidity (%)
              </label>
              <Input
                type="number"
                value={humidity}
                onChange={(e) => setHumidity(e.target.value)}
                placeholder="Enter humidity"
                className="w-full"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!authenticated || executeWorkflow.isPending}
              className="w-full bg-black text-white hover:bg-black/80"
            >
              {executeWorkflow.isPending ? "Submitting..." : "Submit Record"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
