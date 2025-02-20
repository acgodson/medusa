import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Alert, AlertTitle, AlertDescription, Spinner } from "../../atoms";
import { trpc } from "@/trpc/client";
import { usePrivy } from "@privy-io/react-auth";
import { WorkflowResultsDrawer } from "../ResultSection";
import { WorkflowResultsProps } from "@/lib/medusa/bridge/types";
import { XIcon } from "lucide-react";

interface TemperatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
}

export function TemperatureDialog({
  open,
  onOpenChange,
  deviceId,
}: TemperatureDialogProps) {
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

    // // Basic validation
    // if (!temperature || !humidity) {
    //   setError("Please fill in all fields");
    //   return;
    // }

    // const tempValue = parseFloat(temperature);
    // const humidityValue = parseFloat(humidity);

    // if (isNaN(tempValue) || isNaN(humidityValue)) {
    //   setError("Please enter valid numbers");
    //   return;
    // }

    // try {
    //   await executeWorkflow.mutateAsync({
    //     deviceId,
    //     data: {
    //       temperature: tempValue,
    //       humidity: humidityValue,
    //       timestamp: Date.now(),
    //     },
    //     workflowId: parseInt(workflowId),
    //   });
    // } catch (err: any) {
    //   setError(err.message || "Failed to submit record");
    // }
  };

  const handleFetch = async () => {};

  const handleCloseResults = () => {
    setShowResults(false);
    setWorkflowResult(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} persistent={true}>
        <DialogContent className="">
          <DialogHeader className="flex justify-between items-center">
            <DialogTitle className="flex items-center">
              <img
                src="/tip-icon.png"
                alt="siren-icon"
                height={30}
                width={30}
                className="mr-2"
              />
              Temperature
            </DialogTitle>
            <XIcon cursor={"pointer"} onClick={() => onOpenChange(false)} />
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
                  placeholder="temperature"
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
                  placeholder="humidity"
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
                disabled={true}
                className="flex-1 bg-gradient-to-r from-[#D82B3C] to-[#17101C] text-white hover:from-[#17101C] hover:to-[#D82B3C]"
              >
                {executeWorkflow.isPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Processing Workflow...
                  </div>
                ) : (
                  "Fetch Record"
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
