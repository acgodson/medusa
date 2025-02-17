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
  const [currentNoise, setCurrentNoise] = useState<number>(0); // Add explicit state for current noise
  const isActiveRef = useRef(false);

  // Handle noise measurement updates
  useEffect(() => {
    if (!isRecording || !isTracking) return;

    const measurementInterval = setInterval(async () => {
      const db = await calculateDecibels();
      if (db !== null) {
        setCurrentNoise(db); // Update the current noise state
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

  // Update currentNoise when currentReading changes
  useEffect(() => {
    if (currentReading) {
      setCurrentNoise(currentReading);
    }
  }, [currentReading]);

  // Consolidated start function
  const startTracking = async () => {
    try {
      if (isActiveRef.current) return;
      isActiveRef.current = true;

      await captureAudio();
      await startGPS();
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

  const stopTracking = useCallback(() => {
    stopRecording();
    stopGPS();
    setCurrentNoise(0); // Reset noise when stopping
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

  return {
    isTracking: isRecording && isTracking,
    currentNoise, // Return the explicit noise state
    currentPosition,
    locationData,
    error: systemError,
    startTracking,
    stopTracking,
  };
};
