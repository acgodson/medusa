import { useCallback, useEffect, useRef, useState } from "react";
import { useDecibelMeter } from "./useDecibelMeter";
import { useGPSTracking } from "./useGPSTracking";

interface SimpleNoiseConfig extends NoiseConfig {
  // Basic settings only
  minDecibels: number;
  maxDecibels: number;
  samplingInterval: number;
  // Optional device metadata
  deviceInfo?: {
    manufacturer: string;
    model: string;
    sensitivity?: number;
  };
}
interface DeviceInfo {
  manufacturer?: string;
  model?: string;
  sensitivity?: number;
}

interface NoiseSampleMetadata {
  deviceInfo?: DeviceInfo;
  timestamp: string;
  rawReading: number;
}

interface NoiseConfig {
  minDecibels: number;
  maxDecibels: number;
  samplingInterval: number;
  deviceInfo?: DeviceInfo;
}

export const useNoiseTracking = (config: SimpleNoiseConfig) => {
  const [systemError, setSystemError] = useState<string | null>(null);
  const [currentNoise, setCurrentNoise] = useState<number>(0);
  const [measurementQuality, setMeasurementQuality] = useState<number>(1.0);
  const isActiveRef = useRef(false);

  // NEW STATE - for tracking system status
  const [systemStatus, setSystemStatus] = useState({
    audioInitialized: false,
    gpsInitialized: false,
    measurementActive: false,
    errorDetails: null as string | null,
  });

  const {
    currentReading,
    error: audioError,
    isRecording,
    captureAudio,
    stopRecording,
    initStatus, // NEW - track detailed audio initialization status
  } = useDecibelMeter({
    minDecibels: config.minDecibels || 30,
    maxDecibels: config.maxDecibels || 120,
    samplingInterval: config.samplingInterval || 500,
  });

  const {
    locationData,
    currentPosition,
    error: gpsError,
    isTracking: isGPSTracking,
    startTracking: startGPS,
    stopTracking: stopGPS,
    addNoiseSample,
    hasValidFix,
    getPositionConfidence,
  } = useGPSTracking({
    minDistance: 10,
    maxSamplesPerPoint: 20,
    batteryOptimization: true,
    spikeThreshold: 10,
    useSensorFusion: false,
    accuracyThreshold: 30,
  });

  const startTracking = async () => {
    try {
      if (isActiveRef.current) {
        console.warn("Tracking already active");
        return;
      }

      isActiveRef.current = true;
      setSystemError(null);
      setSystemStatus((prev) => ({ ...prev, errorDetails: null }));

      // Start audio capture
      console.log("🎤 Initializing audio capture...");
      await captureAudio();

      console.log("✅ Audio capture initialized");
      setSystemStatus((prev) => ({ ...prev, audioInitialized: true }));

      // Start GPS tracking
      console.log("🌍 Initializing GPS tracking...");
      await startGPS();
      console.log("✅ GPS tracking initialized");
      setSystemStatus((prev) => ({ ...prev, gpsInitialized: true }));

      console.log("🚀 Tracking system started successfully");
      setSystemStatus((prev) => ({ ...prev, measurementActive: true }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start tracking";
      console.error("❌ System startup failed:", errorMessage);
      setSystemError(errorMessage);
      setSystemStatus((prev) => ({
        ...prev,
        errorDetails: errorMessage,
        audioInitialized: isRecording,
        gpsInitialized: isGPSTracking,
        measurementActive: false,
      }));
      isActiveRef.current = false;

      stopRecording();
      stopGPS();
      throw err;
    }
  };

  const stopTracking = useCallback(() => {
    console.log("Stopping tracking system");
    stopRecording();
    stopGPS();
    setCurrentNoise(0);
    setMeasurementQuality(1.0);
    isActiveRef.current = false;
    setSystemStatus({
      audioInitialized: false,
      gpsInitialized: false,
      measurementActive: false,
      errorDetails: null,
    });
  }, [stopRecording, stopGPS]);

  // Measurement cycle
  useEffect(() => {
    if (!isRecording || !isGPSTracking) {
      console.warn("⚠️ Not recording or not GPS tracking", {
        isRecording,
        isGPSTracking,
      });

      // Update system status
      setSystemStatus((prev) => ({
        ...prev,
        audioInitialized: isRecording,
        gpsInitialized: isGPSTracking,
        measurementActive: isRecording && isGPSTracking,
      }));

      return;
    }

    const measurementInterval = setInterval(() => {
      // ENHANCED LOGGING - Full diagnostic info in each cycle
      console.log("📊 Measurement details:", {
        currentReading,
        positionQuality: getPositionConfidence(),
        isRecording,
        isGPSTracking,
        hasPosition: !!currentPosition,
        currentNoiseState: currentNoise,
        audioInitStatus: initStatus,
      });

      if (currentReading !== null && currentReading !== undefined) {
        console.log("🔄 Processing current reading:", currentReading);

        // NEW - Log warning if the reading is exactly zero
        if (currentReading === 0) {
          console.warn(
            "⚠️ Received a zero reading - this may indicate a microphone issue"
          );
        }

        setCurrentNoise(currentReading);

        const positionQuality = getPositionConfidence();
        console.log("measurement quality", positionQuality);
        setMeasurementQuality(positionQuality);

        // NEW - Log detailed metadata
        const sampleMetadata = {
          deviceInfo: config.deviceInfo,
          timestamp: new Date().toISOString(),
          rawReading: currentReading,
          audioState: initStatus,
          gpsActive: isGPSTracking,
          positionQuality,
        };
        console.log("📝 Sample metadata:", sampleMetadata);

        const sampleWithMetadata: NoiseSampleMetadata = {
          deviceInfo: config.deviceInfo,
          timestamp: new Date().toISOString(),
          rawReading: currentReading,
        };
        addNoiseSample(currentReading, sampleWithMetadata);

        if (currentReading > 0 && positionQuality === 0) {
          console.warn(
            "⚠️ Getting noise readings but position quality is zero"
          );
        }
      } else {
        console.warn("⚠️ No current reading available - check microphone");

        if (isRecording) {
          console.log(
            "🔍 Audio is recording but no reading - detailed status:",
            initStatus
          );
        }
      }
    }, config.samplingInterval);

    return () => clearInterval(measurementInterval);
  }, [
    isRecording,
    isGPSTracking,
    currentReading,
    config.samplingInterval,
    addNoiseSample,
    getPositionConfidence,
    config.deviceInfo,
    currentNoise,
    currentPosition,
    initStatus,
  ]);

  // Error handling
  useEffect(() => {
    if (audioError || gpsError) {
      const error = audioError || gpsError;
      setSystemError(error);
      setSystemStatus((prev) => ({ ...prev, errorDetails: error }));

      if (isActiveRef.current) {
        stopTracking();
      }
    }
  }, [audioError, gpsError, stopTracking]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (isActiveRef.current) {
        stopTracking();
      }
    };
  }, [stopTracking]);

  return {
    isTracking: isRecording && isGPSTracking,
    currentNoise: currentReading,
    locationData,
    error: systemError,
    measurementQuality,
    hasValidFix,
    systemStatus,
    startTracking,
    stopTracking,
  };
};
