import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { debounce, throttle } from "lodash";
import {
  GeolocationCoordinate,
  LocationPoint,
  NoiseConfig,
  StoredData,
} from "@/types/noise";

// At the top of the file, add the calculateDistance function
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const useGPSTracking = (
  config: Pick<
    NoiseConfig,
    | "minDistance"
    | "maxSamplesPerPoint"
    | "batteryOptimization"
    | "spikeThreshold"
  >
) => {
  const [locationData, setLocationData] = useState<LocationPoint[]>([]);
  const [currentPosition, setCurrentPosition] =
    useState<GeolocationCoordinate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const samplesRef = useRef<{ noise: number; timestamp: number }[]>([]);
  const lastRecordedPointRef = useRef<LocationPoint | null>(null);

  const clearCurrentWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const processNoiseData = useCallback(() => {
    if (samplesRef.current.length === 0) return null;

    const noises = samplesRef.current.map((s) => s.noise);
    return {
      avg: noises.reduce((a, b) => a + b, 0) / noises.length,
      min: Math.min(...noises),
      max: Math.max(...noises),
      spikes: noises.reduce((count, noise, i) => {
        if (i === 0) return 0;
        return Math.abs(noise - noises[i - 1]) > config.spikeThreshold
          ? count + 1
          : count;
      }, 0),
    };
  }, [config.spikeThreshold]);

  const shouldRecordNewPoint = useCallback(
    (position: GeolocationPosition) => {
      if (!lastRecordedPointRef.current) return true;
      if (samplesRef.current.length >= config.maxSamplesPerPoint) return true;

      const distance = calculateDistance(
        lastRecordedPointRef.current.lat,
        lastRecordedPointRef.current.lng,
        position.coords.latitude,
        position.coords.longitude
      );

      return distance >= config.minDistance;
    },
    [config]
  );

  const debouncedPositionUpdate = useMemo(
    () =>
      debounce((position: GeolocationPosition) => {
        setCurrentPosition(position.coords);
      }, 100),
    []
  );

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    clearCurrentWatch();

    const handlePosition = throttle((position: GeolocationPosition) => {
      debouncedPositionUpdate(position);

      if (shouldRecordNewPoint(position)) {
        const noiseStats = processNoiseData();
        if (noiseStats) {
          const newPoint: LocationPoint = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            noise: noiseStats.avg,
            timestamp: Date.now(),
            accuracy: position.coords.accuracy,
            samples: samplesRef.current.length,
            minNoise: noiseStats.min,
            maxNoise: noiseStats.max,
            spikes: noiseStats.spikes,
          };

          setLocationData((prev) => [...prev, newPoint]);
          lastRecordedPointRef.current = newPoint;
          samplesRef.current = [];
        }
      }
    }, 1000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => setError(`GPS Error: ${err.message}`),
      {
        enableHighAccuracy: !config.batteryOptimization,
        maximumAge: config.batteryOptimization ? 30000 : 0,
        timeout: 27000,
      }
    );

    setIsTracking(true);
    setError(null);
  }, [
    config,
    clearCurrentWatch,
    shouldRecordNewPoint,
    processNoiseData,
    debouncedPositionUpdate,
  ]);

  const stopTracking = useCallback(() => {
    clearCurrentWatch();
    setIsTracking(false);
    samplesRef.current = [];
  }, [clearCurrentWatch]);

  const addNoiseSample = useCallback(
    (noise: number) => {
      if (!isTracking) return;

      samplesRef.current.push({
        noise,
        timestamp: Date.now(),
      });
    },
    [isTracking]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCurrentWatch();
    };
  }, [clearCurrentWatch]);

  useEffect(() => {
    return () => {
      debouncedPositionUpdate.cancel();
    };
  }, [debouncedPositionUpdate]);

  return {
    locationData,
    currentPosition,
    error,
    isTracking,
    startTracking,
    stopTracking,
    addNoiseSample,
  };
};
