import React, { useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { useNoiseTracking } from "@/hooks/siren-noise/useNoiseTracker";

const defaultConfig = {
  minDecibels: 0, // Start from true silence
  maxDecibels: 120, // Maximum measurable level
  spikeThreshold: 10,
  minDistance: 10,
  maxSamplesPerPoint: 20,
  samplingInterval: 200, // Faster updates
  batteryOptimization: true,
};

interface NoiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NoiseDialog: React.FC<NoiseDialogProps> = ({ open, onOpenChange }) => {
  const {
    isTracking,
    currentNoise,
    locationData,
    error,
    startTracking,
    stopTracking,
  } = useNoiseTracking(defaultConfig);

  const handleStart = useCallback(async () => {
    try {
      await startTracking();
    } catch (err) {
      console.error("Failed to start tracking:", err);
    }
  }, [startTracking]);

  const handleStop = useCallback(() => {
    stopTracking();
  }, [stopTracking]);

  // Cleanup when dialog closes
  useEffect(() => {
    if (!open && isTracking) {
      stopTracking();
    }
  }, [open, isTracking, stopTracking]);

  // Calculate progress percentage for visualization
  const noiseLevel = currentNoise || 0;
  const progressPercentage = Math.min(
    100,
    Math.max(
      0,
      ((noiseLevel - defaultConfig.minDecibels) /
        (defaultConfig.maxDecibels - defaultConfig.minDecibels)) *
        100
    )
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Noise Measurement</DialogTitle>
        </DialogHeader>
        <div className="text-center text-sm text-gray-600">
          {isTracking
            ? "Recording noise levels..."
            : "Ready to start recording"}
        </div>

        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="relative w-48 h-48">
            {/* Background circle */}
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />

            {/* Progress circle */}
            <div
              className="absolute inset-0 rounded-full border-4 border-blue-500 transition-all duration-300"
              style={{
                clipPath: `polygon(50% 50%, -50% -50%, -50% 150%, 150% 150%, 150% -50%)`,
                transform: `rotate(${progressPercentage * 3.6}deg)`,
              }}
            />

            {/* Center display */}
            <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
              <div className="text-center">
                <span className="text-4xl font-bold">
                  {Math.round(noiseLevel)}
                </span>
                <span className="text-sm text-gray-500 block">dB</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <div className="text-center">
              <div className="text-sm text-gray-500">Locations</div>
              <div className="font-semibold">{locationData.length}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Current dB</div>
              <div className="font-semibold">{Math.round(noiseLevel)}</div>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center w-full">
              {error}
            </div>
          )}

          <Button
            onClick={isTracking ? handleStop : handleStart}
            className={`w-full ${
              isTracking
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white`}
          >
            {isTracking ? "Stop Recording" : "Start Recording"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NoiseDialog;
