import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Alert, AlertTitle, AlertDescription, Spinner } from "../atoms";
import { trpc } from "@/trpc/client";
import { usePrivy } from "@privy-io/react-auth";
import { ExternalLink } from "lucide-react";
import { WorkflowResultsDrawer } from "./ResultSection";
import { WorkflowResultsProps } from "@/lib/medusa/bridge/types";

interface SubmitRecordDialogProps {
  open: boolean;
  onClose: () => void;
  deviceId: string;
  workflowTitle: string;
  workflowId: string;
}

export function SubmitRecordDialog({
  open,
  onClose,
  deviceId,
  workflowTitle,
  workflowId,
}: SubmitRecordDialogProps) {
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [workflowResult, setWorkflowResult] =
    useState<WorkflowResultsProps | null>(null);
  const { authenticated } = usePrivy();

  const executeWorkflow = trpc.executeWorkflow.useMutation({
    onSuccess: (data) => {
      console.log("Record submitted:", data);
      setWorkflowResult(data as unknown as WorkflowResultsProps);
      setShowResults(true);
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
      await executeWorkflow.mutateAsync({
        deviceId,
        data: {
          temperature: tempValue,
          humidity: humidityValue,
          timestamp: Date.now(),
        },
        workflowId: parseInt(workflowId),
      });
    } catch (err: any) {
      setError(err.message || "Failed to submit record");
    }
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setWorkflowResult(null);
    onClose();
  };

  return (
    <>
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
                  disabled={executeWorkflow.isPending}
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
                  disabled={executeWorkflow.isPending}
                />
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!authenticated || executeWorkflow.isPending}
                className="w-full bg-black text-white hover:bg-black/80"
              >
                {executeWorkflow.isPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Processing Workflow...
                  </div>
                ) : (
                  "Submit Record"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <WorkflowResultsDrawer
        open={showResults}
        onClose={handleCloseResults}
        result={workflowResult}
      />
    </>
  );
}
