import { NoiseConfig, StoredData } from "@/types/noise";
import { useDecibelMeter } from "./useDecibelMeter";
import { useGPSTracking } from "./useGPSTracking";
import { useCallback, useEffect, useRef, useState } from "react";

export const useNoiseTracking = (config: NoiseConfig) => {
  const {
    currentReading,
    error: audioError,
    isRecording,
    captureAudio,
    stopRecording,
    calculateDecibels,
  } = useDecibelMeter({
    minDecibels: config.minDecibels,
    maxDecibels: config.maxDecibels,
    samplingInterval: config.samplingInterval,
  });

  const {
    locationData,
    currentPosition,
    error: gpsError,
    isTracking,
    startTracking: startGPS,
    stopTracking: stopGPS,
    addNoiseSample,
  } = useGPSTracking({
    minDistance: config.minDistance,
    maxSamplesPerPoint: config.maxSamplesPerPoint,
    batteryOptimization: config.batteryOptimization,
    spikeThreshold: config.spikeThreshold,
  });

  const [systemError, setSystemError] = useState<string | null>(null);
  const lastNoiseRef = useRef<number>(0);
  const isActiveRef = useRef(false);

  // Handle noise measurement updates
  useEffect(() => {
    if (!isRecording || !isTracking) return;

    const measurementInterval = setInterval(() => {
      const db = calculateDecibels();
      if (db !== null) {
        lastNoiseRef.current = db;
        addNoiseSample(db);
      }
    }, config.samplingInterval);

    return () => clearInterval(measurementInterval);
  }, [
    isRecording,
    isTracking,
    calculateDecibels,
    addNoiseSample,
    config.samplingInterval,
  ]);

  // Consolidated start function
  const startTracking = async () => {
    try {
      if (isActiveRef.current) return;
      isActiveRef.current = true;

      await captureAudio();
      startGPS();
      setSystemError(null);
    } catch (err) {
      setSystemError(
        err instanceof Error ? err.message : "Failed to start tracking"
      );
      isActiveRef.current = false;
      stopRecording();
      stopGPS();
    }
  };

  // Consolidated stop function
  const stopTracking = useCallback(() => {
    stopRecording();
    stopGPS();
    isActiveRef.current = false;
  }, [stopRecording, stopGPS]);

  // Error monitoring
  useEffect(() => {
    if (audioError || gpsError) {
      setSystemError(audioError || gpsError);
      if (isActiveRef.current) {
        stopTracking();
      }
    }
  }, [audioError, gpsError, stopTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isActiveRef.current) {
        stopTracking();
      }
    };
  }, [stopTracking]);

  useEffect(() => {
    if (!isTracking && isRecording) {
      stopRecording();
    }
  }, [isTracking, isRecording, stopRecording]);

  const startGPSWithRetry = useCallback(
    async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          await startGPS();
          return true;
        } catch (err) {
          if (i === retries - 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      return false;
    },
    [startGPS]
  );

  const persistData = useCallback(() => {
    const data: StoredData = {
      timestamp: Date.now(),
      locationData,
    };
    localStorage.setItem("noise-tracking-data", JSON.stringify(data));
  }, [locationData]);

  return {
    isTracking: isRecording && isTracking,
    currentNoise: currentReading,
    currentPosition,
    locationData,
    error: systemError,
    startTracking,
    stopTracking,
    startGPSWithRetry,
    persistData,
  };
};
