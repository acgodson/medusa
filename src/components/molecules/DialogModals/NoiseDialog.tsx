import React, { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import {
  AlertCircle,
  Signal,
  MapPin,
  Pause,
  Play,
  XIcon,
  Upload,
  Check,
  Clock,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/atoms/alert";
import { useNoiseTracking } from "@/hooks/siren-noise/useNoiseTracker";
import { trpc } from "@/trpc/client";
import DualSoundBarProgress from "../dual-soundbar-progress";
import {
  getCooldownButtonText,
  useExecutionCooldown,
} from "@/hooks/useExecutionCooldown";
import { useWorkflow } from "@/hooks/useWorkflow";

enum WorkflowType {
  TEMPERATURE = "temperature",
  NOISE = "noise",
}

const defaultConfig = {
  // Basic noise settings
  minDecibels: 0,
  maxDecibels: 120,
  samplingInterval: 200,

  // Noise processing
  windDetectionEnabled: true,
  windThreshold: 0.7,
  frequencyWeighting: "A" as "A" | "C" | "Z",
  useKalmanFilter: true,

  // GPS settings
  minDistance: 10,
  maxSamplesPerPoint: 20,
  batteryOptimization: true,
  spikeThreshold: 10,
  accuracyThreshold: 20,

  // Improved stationary detection settings
  stationarySettings: {
    maxTimeAtLocation: 60 * 1000, // 1 minute
    minMovementDistance: 15, // 15 meters
    autoResume: true,
  },

  // Optional device info
  deviceInfo: {
    manufacturer: navigator.userAgent,
    model: navigator.platform,
  },
};

const NoiseDialog = ({
  open,
  onOpenChange,
  deviceId,
  workflowId,
  executionInterval: propExecutionInterval,
  lastExecuted: propLastExecuted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  workflowId: string;
  executionInterval?: number;
  lastExecuted?: number;
}) => {
  const [permissionState, setPermissionState] = useState<
    "prompt" | "granted" | "denied"
  >("prompt");
  const [debugInfo, setDebugInfo] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [executionInterval, setExecutionInterval] = useState<number>(
    propExecutionInterval || 0
  );
  const [lastExecuted, setLastExecuted] = useState<number>(
    propLastExecuted || 0
  );
  const [isLoadingWorkflowData, setIsLoadingWorkflowData] = useState<boolean>(
    !propExecutionInterval
  );

  const [txLinks, setTxLinks] = useState<{
    bscTxHash?: string;
    greenfieldObjectId?: string;
  }>({});

  const cooldown = useExecutionCooldown(executionInterval, lastExecuted);

  const {
    isTracking,
    isPaused,
    currentNoise,
    locationData,
    error,
    measurementQuality,
    stationaryInfo,
    trackingStats,
    startTracking,
    stopTracking,
    resumeTracking,
  } = useNoiseTracking(defaultConfig);
  const { refreshData } = useWorkflow();

  // Connect to tRPC mutation
  const executeWorkflowMutation = trpc.executeWorkflow.useMutation({
    onSuccess: () => {
      setSubmitSuccess(true);
      setIsSubmitting(false);
      setDebugInfo("Workflow executed successfully");
      setLastExecuted(Math.floor(Date.now() / 1000));
      // trigger refresh
      refreshData();
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      setDebugInfo(`Failed to execute workflow: ${error.message}`);
    },
  });

  const requestPermissions = useCallback(async () => {
    try {
      // Expanded permission checks
      const checkPermission = async (permissionName: PermissionName) => {
        try {
          const permission = await navigator.permissions.query({
            name: permissionName,
          });
          console.log(`${permissionName} permission:`, permission.state);
          return permission.state !== "denied";
        } catch (err) {
          console.error(`Error checking ${permissionName} permission:`, err);
          return false;
        }
      };

      const hasMicPermission = await checkPermission(
        "microphone" as PermissionName
      );
      const hasGPSPermission = await checkPermission(
        "geolocation" as PermissionName
      );

      if (!hasMicPermission || !hasGPSPermission) {
        setPermissionState("denied");
        throw new Error("Microphone or location access denied");
      }

      // Actual permission request for microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
      } catch (micErr) {
        console.error("Microphone access error:", micErr);
        setPermissionState("denied");
        throw micErr;
      }

      // GPS permission check
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          (positionError) => {
            console.error("GPS position error:", positionError);
            reject(new Error("GPS permission denied"));
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });

      setPermissionState("granted");
      return true;
    } catch (err) {
      console.error("Permission request failed:", err);
      setPermissionState("denied");
      setDebugInfo(err instanceof Error ? err.message : "Permission error");
      return false;
    }
  }, []);

  const handleStart = useCallback(async () => {
    if (!cooldown.canExecute) {
      setDebugInfo(
        `Please wait ${cooldown.formattedTimeRemaining} before starting a new recording`
      );
      return;
    }
    setDebugInfo("Checking permissions...");
    try {
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) return;

      setDebugInfo("Starting tracking...");
      await startTracking();
      setDebugInfo("");
      setShowStats(false);
      setSubmitSuccess(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? `Tracking error: ${err.message}\n${err.stack}`
          : "Failed to start tracking";
      setDebugInfo(errorMessage);
      console.error("Tracking error:", err);
    }
  }, [requestPermissions, startTracking]);

  // Handle resume
  const handleResume = useCallback(() => {
    resumeTracking();
    setDebugInfo("Tracking resumed");
    setShowStats(false); // Hide stats when resuming
  }, [resumeTracking]);

  const handleStop = useCallback(() => {
    stopTracking();
    setDebugInfo("Tracking stopped");
    setShowStats(true);
  }, [stopTracking]);

  // Format location data for API
  const formatDataForWorkflow = useCallback(() => {
    if (!locationData || locationData.length === 0) {
      return null;
    }

    const formattedData: Record<string, any> = {};
    const startTime = locationData[0].timestamp;
    const endTime = locationData[locationData.length - 1].timestamp;
    let totalSamples = 0;

    // Format data in the expected structure
    locationData.forEach((location) => {
      const key = `${location.lat}|${location.lng}`;
      formattedData[key] = {
        noise: location.noise,
        minNoise: location.minNoise,
        maxNoise: location.maxNoise,
        samples: location.samples,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        spikes: location.spikes || 0,
      };
      totalSamples += location.samples;
    });

    // Get device info from the first location's metadata if available
    const deviceInfo = locationData[0]?.metadata?.deviceInfo || {
      manufacturer: navigator.userAgent,
      model: navigator.platform,
    };

    return {
      deviceId,
      workflowId,
      workflowType: "noise",
      data: formattedData,
      metadata: {
        startTime,
        endTime,
        deviceInfo,
        totalSamples,
      },
    };
  }, [locationData, deviceId, workflowId]);

  // Execute workflow
  const handleExecuteWorkflow = useCallback(async () => {
    const formattedData = formatDataForWorkflow();
    if (!formattedData) {
      setDebugInfo("No location data available to submit");
      return;
    }

    try {
      setIsSubmitting(true);
      setDebugInfo("Executing workflow...");
      console.log(formattedData);
      console.log(deviceId);

      const response: any = await executeWorkflowMutation.mutateAsync({
        deviceId: formattedData.deviceId,
        workflowId: formattedData.workflowId,
        workflowType: WorkflowType.NOISE,
        metadata: {
          totalSamples: formattedData.metadata.totalSamples,
          startTime: formattedData.metadata.startTime,
          endTime: formattedData.metadata.endTime,
          deviceInfo: formattedData.metadata.deviceInfo,
        },
        data: formattedData.data,
      });
      console.log("result after record is submitted", response);
      const transactionHash =
        response.result?.workflow?.broadcast?.transactionHash?.transactionHash;

      const objectName = response.result?.workflow?.collection?.objectName;
      if (transactionHash) {
        setTxLinks({
          bscTxHash: transactionHash,
          greenfieldObjectId: objectName,
        });
      }
    } catch (err) {
      console.error("Failed to execute workflow:", err);
      setDebugInfo(
        err instanceof Error
          ? `Workflow execution error: ${err.message}`
          : "Failed to execute workflow"
      );
      setIsSubmitting(false);
    }
  }, [formatDataForWorkflow, executeWorkflowMutation]);

  // Stop tracking when dialog closes
  useEffect(() => {
    if (!open && (isTracking || isPaused)) {
      handleStop();
    }
  }, [open, isTracking, isPaused, handleStop]);

  // Calculate progress for the circular indicator
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

  const getQualityColor = (quality: number) => {
    if (quality > 0.7) return "text-green-500";
    if (quality > 0.4) return "text-yellow-500";
    return "text-red-500";
  };

  // Format stationary time into minutes and seconds
  const formatStationaryTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  const getAverageNoise = () => {
    if (!trackingStats || trackingStats.totalSamples === 0) return 0;
    return Math.round(trackingStats.averageNoise);
  };

  const getTotalSamples = () => {
    if (!trackingStats) return 0;
    return trackingStats.totalSamples;
  };

  const getLocationCount = () => {
    if (!trackingStats || !trackingStats.samplesByLocation) return 0;
    if (locationData && locationData.length > 0) {
      const uniqueLocations = new Set();

      for (const point of locationData) {
        const locationKey = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
        uniqueLocations.add(locationKey);
      }
      return uniqueLocations.size;
    }
    return Object.keys(trackingStats.samplesByLocation).length;
  };

  // Determine if we can show the submit button (when tracking stopped and we have data)
  const canSubmitWorkflow =
    !isTracking && !isPaused && locationData && locationData.length > 0;

  const CooldownIndicator = () => {
    if (cooldown.canExecute || isTracking || isPaused) return null;

    return (
      <div className="flex items-center justify-center text-amber-600 text-sm py-2 bg-amber-50 rounded-md">
        <Clock className="w-4 h-4 mr-2" />
        <span>Cooldown: {cooldown.formattedTimeRemaining}</span>
        <span className="ml-2 text-xs">
          ({cooldown.cooldownPercentage.toFixed(0)}%)
        </span>
      </div>
    );
  };

  useEffect(() => {
    if (!isTracking) {
      console.log("location data", locationData);
    }
  }, [locationData, isTracking]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} persistent={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex justify-between items-center">
          <DialogTitle className="flex items-center">
            <img
              src="/tip-icon.png"
              alt="siren-icon"
              height={30}
              width={30}
              className="mr-2"
            />
            Noise
          </DialogTitle>

          <XIcon cursor={"pointer"} onClick={() => onOpenChange(false)} />
        </DialogHeader>

        {permissionState === "denied" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Microphone and location access are required. Please enable them in
              your browser settings.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-center text-sm space-y-2">
          <div className="text-gray-600 flex flex-row justify-center items-start space-x-3">
            {isPaused
              ? "Recording paused - please change your location"
              : isTracking
              ? "Recording noise levels..."
              : submitSuccess
              ? "Data successfully submitted!"
              : "Ready to start recording"}

            {submitSuccess && txLinks.bscTxHash && (
              <a
                href={`https://testnet.bscscan.com/tx/${txLinks.bscTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className=" bg-amber-50 hover:bg-amber-100 px-0.5 ml-1 flex flex-row justify-center rounded-md transition-all duration-200 border border-amber-200 shadow-sm"
                title="View on BSC Scan"
              >
                <img src="/bsc-logo.svg" alt="bsc" height={20} width={20} />
              </a>
            )}
          </div>

          {!isTracking && !isPaused && <CooldownIndicator />}

          {(isTracking || isPaused) && (
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <div className={getQualityColor(measurementQuality)}>
                <Signal className="inline-block w-4 h-4 mr-1" />
                {Math.round(measurementQuality * 100)}%
              </div>

              {isPaused ? (
                <div className="text-center">
                  <div className="text-amber-500">
                    <Pause className="inline-block w-4 h-4 mr-1" />
                    Paused
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-sm text-gray-500">Status</div>
                  <div
                    className={`font-semibold ${
                      isPaused
                        ? "text-amber-500"
                        : isTracking
                        ? "text-green-500"
                        : "text-gray-500"
                    }`}
                  >
                    {isPaused ? "Paused" : isTracking ? "Active" : "Ready"}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center space-y-4 py-4">
          {/* Circular Gauge */}
          <div className="relative w-48 h-48">
            <div
              className={`m-2.5 absolute inset-0 rounded-full border-[12px] 
              border-[#a6b4cc]
              }`}
            />

            <div className="p-2.5 mt-[0.3px] left-0 top-0 absolute z-1">
              <img src="/volumebase.svg" alt="base-frame" />
            </div>

            {/* Dual progress bar would fit here */}
            <div className="absolute inset-0 ml-1.5 pt-2 mt-1 pl-1">
              <DualSoundBarProgress currentReading={Math.round(currentNoise)} />
            </div>

            <div
              className={`m-2.5 absolute inset-0 rounded-full border-[12px] ${
                isPaused ? "border-amber-300" : "border-transparent"
              }`}
            />

            <div className="p-2.5 left-0 top-0 absolute z-1">
              <img src="/meter.svg" alt="meter-frame" />
            </div>

            <div className="absolute inset-2 rounded-full bg-transparent flex items-center justify-center">
              {isPaused ? (
                <div className="text-center">
                  <Pause className="w-12 h-12 text-amber-500 mx-auto" />
                  <span className="text-sm text-gray-500 block mt-2">
                    Stationary
                    {/* {formatStationaryTime(stationaryInfo.timeAtCurrentLocation)} */}
                  </span>
                </div>
              ) : isSubmitting ? (
                <div className="text-center">
                  <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto" />
                  <span className="text-sm text-gray-500 block mt-2">
                    Submitting
                  </span>
                </div>
              ) : submitSuccess ? (
                <div className="text-center">
                  <Check className="w-12 h-12 text-green-500 mx-auto" />
                  <span className="text-sm text-gray-500 block mt-2">
                    Workflow executed
                  </span>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-4xl font-bold">
                    {Math.round(currentNoise)}
                  </span>
                  <span className="text-sm text-gray-500 block">dB</span>
                </div>
              )}
            </div>
          </div>

          {/* Pause Message */}
          {isPaused && (
            <Alert className="bg-amber-50 border-amber-200 text-amber-800">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                <AlertDescription className="text-sm">
                  {stationaryInfo.pauseReason ||
                    "Device has stayed near the same location for a while"}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="text-center">
              <div className="text-sm text-gray-500">
                <MapPin className="inline-block w-4 h-4 mr-1" />
              </div>
              <div className="font-semibold">{getLocationCount()}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Average dB</div>
              <div className="font-semibold">{getAverageNoise()}</div>
            </div>
          </div>

          {/* Error Display */}
          {(error || debugInfo) && (
            <div className="flex items-center justify-center text-red-500 text-sm w-full">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error || debugInfo}
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex w-full gap-2">
            {isPaused ? (
              <>
                <Button
                  onClick={handleResume}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Play className="w-4 h-4 mr-2" /> Resume
                </Button>
                <Button
                  onClick={handleStop}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Stop & Reset
                </Button>
              </>
            ) : isTracking ? (
              <Button
                onClick={handleStop}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={permissionState === "denied"}
              >
                Stop Recording
              </Button>
            ) : canSubmitWorkflow ? (
              <>
                {!submitSuccess && (
                  <Button
                    onClick={handleExecuteWorkflow}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={isSubmitting}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Submitting..." : "Submit Data"}
                  </Button>
                )}
                <Button
                  onClick={handleStart}
                  className="flex-1 bg-gradient-to-r from-[#D82B3C] to-[#17101C] text-white hover:from-[#17101C] hover:to-[#D82B3C]"
                  disabled={
                    permissionState === "denied" ||
                    isSubmitting ||
                    !cooldown.canExecute ||
                    isLoadingWorkflowData
                  }
                >
                  {getCooldownButtonText(
                    "New Recording",
                    cooldown,
                    isLoadingWorkflowData
                  )}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleStart}
                className="flex-1 bg-gradient-to-r from-[#D82B3C] to-[#17101C] text-white hover:from-[#17101C] hover:to-[#D82B3C]"
                disabled={
                  permissionState === "denied" ||
                  !cooldown.canExecute ||
                  isLoadingWorkflowData
                }
              >
                {getCooldownButtonText(
                  "Start Recording",
                  cooldown,
                  isLoadingWorkflowData
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NoiseDialog;
