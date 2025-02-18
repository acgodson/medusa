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
  Wind,
  Signal,
  MapPin,
  Pause,
  Play,
  XIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/atoms/alert";
import { useNoiseTracking } from "@/hooks/siren-noise/useNoiseTracker";

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [permissionState, setPermissionState] = useState<
    "prompt" | "granted" | "denied"
  >("prompt");
  const [debugInfo, setDebugInfo] = useState("");
  const [showStats, setShowStats] = useState(false);

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
    setDebugInfo("Checking permissions...");
    try {
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) return;

      setDebugInfo("Starting tracking...");
      await startTracking();
      setDebugInfo(""); // Clear debug info on success
      setShowStats(false); // Hide stats when starting new session
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
    setShowStats(true); // Show stats when stopping
  }, [stopTracking]);

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

  useEffect(() => {
    if (!isTracking) {
      console.log("location data", locationData);
    }
  }, [locationData, isTracking]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} persistent={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex justify-between items-center">
          <DialogTitle>Noise Measurement</DialogTitle>

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
          <div className="text-gray-600">
            {isPaused
              ? "Recording paused - please change your location"
              : isTracking
              ? "Recording noise levels..."
              : "Ready to start recording"}
          </div>

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
              className={`absolute inset-0 rounded-full border-4 ${
                isPaused ? "border-amber-300" : "border-gray-200"
              }`}
            />

            <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
              {isPaused ? (
                <div className="text-center">
                  <Pause className="w-12 h-12 text-amber-500 mx-auto" />
                  <span className="text-sm text-gray-500 block mt-2">
                    Stationary for{" "}
                    {formatStationaryTime(stationaryInfo.timeAtCurrentLocation)}
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
                    "Device has been stationary too long. Please move to a new location."}
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
            ) : (
              <Button
                onClick={isTracking ? handleStop : handleStart}
                className={`w-full ${
                  isTracking
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white`}
                disabled={permissionState === "denied"}
              >
                {isTracking ? "Stop Recording" : "Start Recording"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NoiseDialog;
