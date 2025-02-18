import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { debounce, throttle } from "lodash";
import KalmanFilter from "kalmanjs";

// Types
export enum GeolocationErrorType {
  PERMISSION_DENIED = 1,
  POSITION_UNAVAILABLE = 2,
  TIMEOUT = 3,
  UNKNOWN_ERROR = 4,
}

interface LocationMap {
  [locationKey: string]: LocationPoint;
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

interface LocationPoint {
  lat: number;
  lng: number;
  noise: number;
  timestamp: number;
  accuracy: number;
  samples: number;
  minNoise: number;
  maxNoise: number;
  spikes: number;
  metadata?: NoiseSampleMetadata;
  locationKey?: string; // Optional key for identification
}

interface GPSConfig {
  minDistance: number;
  maxSamplesPerPoint: number;
  batteryOptimization: boolean;
  spikeThreshold: number;
  useSensorFusion: boolean;
  accuracyThreshold: number;
  timeout?: number;
  maximumAge?: number;
}

interface GPSTrackingState {
  locationData: LocationPoint[];
  currentPosition: GeolocationCoordinates | null;
  error: string | null;
  isTracking: boolean;
  hasValidFix: boolean;
  errorType?: GeolocationErrorType;
}

export const useGPSTracking = (
  config: GPSConfig
): GPSTrackingState & {
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  addNoiseSample: (noise: number, metadata?: NoiseSampleMetadata) => boolean;
  getPositionConfidence: () => number;
  getDistanceFromLastPoint: (coords: GeolocationCoordinates) => number;
  getAllSamples: () => Array<{
    noise: number;
    timestamp: number;
    metadata?: NoiseSampleMetadata;
  }>;
} => {
  // Merge default config with provided config
  const mergedConfig: GPSConfig = {
    timeout: 27000,
    maximumAge: 0,
    ...config,
  };

  // Internal map-based state
  const [locationMap, setLocationMap] = useState<LocationMap>({});
  const [locationKeys, setLocationKeys] = useState<string[]>([]);
  const [locationData, setLocationData] = useState<LocationPoint[]>([]);
  const processedLocationKeysRef = useRef(new Set<string>());

  // Synchronize locationData whenever locationMap changes
  useEffect(() => {
    const newLocationData = locationKeys.map((key) => ({
      ...locationMap[key],
      locationKey: key, // Include the key for reference
    }));
    setLocationData(newLocationData);
  }, [locationMap, locationKeys]);

  const [currentPosition, setCurrentPosition] =
    useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<GeolocationErrorType>();
  const [isTracking, setIsTracking] = useState(false);

  // Refs
  const watchIdRef = useRef<number | null>(null);
  const samplesRef = useRef<
    { noise: number; metadata?: NoiseSampleMetadata; timestamp: number }[]
  >([]);
  const lastRecordedPointRef = useRef<LocationPoint | null>(null);
  const allSamplesRef = useRef<
    { noise: number; timestamp: number; metadata?: NoiseSampleMetadata }[]
  >([]);

  // Single Kalman filter for position (more efficient than multiple)
  const positionFilter = useRef(
    new KalmanFilter({
      R: 0.1, // Measurement noise
      Q: 0.1, // Process noise
      A: 1, // State transition
      B: 0, // Control
      C: 1, // Measurement
    })
  );

  // Utility function to calculate distance between two points
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
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
  };

  // Get distance from last known point
  const getDistanceFromLastPoint = useCallback(
    (coords: GeolocationCoordinates | null): number => {
      if (!coords) return 0;

      try {
        // First try using the last recorded point for consistency
        if (lastRecordedPointRef.current) {
          return calculateDistance(
            lastRecordedPointRef.current.lat,
            lastRecordedPointRef.current.lng,
            coords.latitude,
            coords.longitude
          );
        }

        // Fallback to current position if no recorded point exists
        if (currentPosition) {
          return calculateDistance(
            currentPosition.latitude,
            currentPosition.longitude,
            coords.latitude,
            coords.longitude
          );
        }

        // If neither exists, return 0 (no movement)
        return 0;
      } catch (err) {
        console.error("Error calculating distance from last point:", err);
        return 0;
      }
    },
    [currentPosition]
  );

  const getPositionConfidence = useCallback((): number => {
    if (!currentPosition) return 0;

    try {
      if (mergedConfig.accuracyThreshold === 0) {
        // Map accuracy to confidence (1.0 = perfect, 0.0 = unusable)
        // Typical GPS accuracy: phone (3-20m), consumer GPS (2-10m)
        // We'll consider anything under 20m as good quality
        const accuracy = currentPosition.accuracy || 100;
        if (accuracy < 20) return 0.9; // Excellent accuracy
        if (accuracy < 50) return 0.7; // Good accuracy
        if (accuracy < 100) return 0.5; // Average accuracy
        if (accuracy < 500) return 0.3; // Poor accuracy
        if (accuracy < 1000) return 0.1; // Very poor accuracy
        return 0.05; // At least give some confidence for any reading
      }
      const accuracyScore = Math.max(
        0,
        1 - (currentPosition.accuracy || 100) / mergedConfig.accuracyThreshold
      );
      return Math.max(0.05, accuracyScore);
    } catch (err) {
      console.error("Error calculating position confidence:", err);
      return 0;
    }
  }, [currentPosition, mergedConfig.accuracyThreshold]);

  // Get all collected samples (for statistics)
  const getAllSamples = useCallback(() => {
    return [...allSamplesRef.current];
  }, []);

  // Process noise data from samples with improved averaging
  const processNoiseData = useCallback(() => {
    if (samplesRef.current.length === 0) return null;

    const noises = samplesRef.current.map((s) => s.noise);
    const latestMetadata =
      samplesRef.current[samplesRef.current.length - 1].metadata;

    // Trim outliers before calculating stats (more resilient to spikes)
    const sortedNoises = [...noises].sort((a, b) => a - b);
    const trimStart = Math.floor(sortedNoises.length * 0.1); // Remove bottom 10%
    const trimEnd = Math.ceil(sortedNoises.length * 0.9); // Remove top 10%
    const trimmedNoises = sortedNoises.slice(trimStart, trimEnd);

    // Calculate trimmed average if possible, otherwise use regular average
    const avg =
      trimmedNoises.length > 0
        ? trimmedNoises.reduce((a, b) => a + b, 0) / trimmedNoises.length
        : noises.reduce((a, b) => a + b, 0) / noises.length;

    return {
      avg: avg,
      min: Math.min(...noises),
      max: Math.max(...noises),
      spikes: noises.reduce((count, noise, i) => {
        if (i === 0) return 0;
        return Math.abs(noise - noises[i - 1]) > mergedConfig.spikeThreshold
          ? count + 1
          : count;
      }, 0),
      metadata: latestMetadata,
      samplesCount: noises.length,
    };
  }, [mergedConfig.spikeThreshold]);

  // Improved shouldRecordNewPoint with stricter criteria
  const shouldRecordNewPoint = useCallback(
    (position: GeolocationPosition) => {
      // Always record first point
      if (!lastRecordedPointRef.current) {
        console.log("📍 Recording first point");
        return true;
      }

      // Calculate distance between current position and last recorded point
      const distance = calculateDistance(
        lastRecordedPointRef.current.lat,
        lastRecordedPointRef.current.lng,
        position.coords.latitude,
        position.coords.longitude
      );

      // Primary condition: significant movement
      const movedEnough = distance >= mergedConfig.minDistance;

      if (movedEnough) {
        console.log(
          `📏 Moved ${distance.toFixed(2)}m, which exceeds minimum distance (${
            mergedConfig.minDistance
          }m), recording new point`
        );
        return true;
      }

      // Secondary condition: max samples reached for the current point
      // Only create new point if we've collected enough data at this location
      if (samplesRef.current.length >= mergedConfig.maxSamplesPerPoint) {
        const hasEnoughSamples =
          lastRecordedPointRef.current.samples >=
          mergedConfig.maxSamplesPerPoint / 2;

        if (hasEnoughSamples) {
          console.log(
            `📊 Max samples per point (${mergedConfig.maxSamplesPerPoint}) reached with sufficient data, recording new point`
          );
          return true;
        } else {
          console.log(
            `📊 Max samples reached but insufficient data collected (${lastRecordedPointRef.current.samples}), continuing to update current point`
          );
        }
      }

      // Otherwise, keep updating existing point
      return false;
    },
    [mergedConfig.maxSamplesPerPoint, mergedConfig.minDistance]
  );

  // Enhance position with Kalman filtering
  const enhancePosition = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = position.coords;
    const accuracyFactor = Math.min(accuracy / 10, 1);
    positionFilter.current = new KalmanFilter({
      R: 0.1 * (1 + accuracyFactor),
      Q: 0.1,
      A: 1,
      B: 0,
      C: 1,
    });
    const filteredLat = positionFilter.current.filter(latitude);
    const filteredLng = positionFilter.current.filter(longitude);
    return {
      ...position.coords,
      latitude: filteredLat,
      longitude: filteredLng,
      accuracy: accuracy,
    };
  }, []);

  const debouncedPositionUpdate = useMemo(
    () =>
      debounce((position: GeolocationPosition) => {
        const enhancedCoords = enhancePosition(position);
        setCurrentPosition(enhancedCoords);
      }, 100),
    [enhancePosition]
  );

  const addNoiseSample = useCallback(
    (noise: number, metadata?: NoiseSampleMetadata): boolean => {
      if (!isTracking) return false;
      try {
        // Validate noise value
        if (isNaN(noise) || !isFinite(noise)) {
          console.warn("⚠️ Invalid noise value detected:", noise);
          return false;
        }
        const timestamp = Date.now();
        const sampleWithMeta = {
          noise,
          metadata,
          timestamp,
        };
        allSamplesRef.current.push(sampleWithMeta);

        if (samplesRef.current.length >= mergedConfig.maxSamplesPerPoint) {
          console.log(
            `📊 Max samples (${mergedConfig.maxSamplesPerPoint}) reached for current location. Oldest sample removed.`
          );
          samplesRef.current = samplesRef.current.slice(1);
        }

        samplesRef.current.push(sampleWithMeta);

        if (allSamplesRef.current.length % 10 === 0) {
          console.log(
            `📈 Total samples collected: ${allSamplesRef.current.length}, Current location samples: ${samplesRef.current.length}`
          );
        }

        return true;
      } catch (error) {
        console.error("❌ Error adding noise sample:", error);
        return false;
      }
    },
    [isTracking, mergedConfig.maxSamplesPerPoint]
  );

  // Start tracking GPS location with map-based storage
  const startTracking = useCallback(async (): Promise<void> => {
    console.log("🌍 Starting GPS tracking with config:", mergedConfig);
    return new Promise((resolve, reject) => {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        const error = "Geolocation not supported by this browser";
        setError(error);
        setErrorType(GeolocationErrorType.UNKNOWN_ERROR);
        reject(new Error(error));
        return;
      }

      // Clear previous tracking
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      // Reset all state and refs
      samplesRef.current = [];
      allSamplesRef.current = [];
      lastRecordedPointRef.current = null;
      setLocationMap({});
      setLocationKeys([]);
      processedLocationKeysRef.current = new Set<string>();

      const handlePosition = throttle((position: GeolocationPosition) => {
        debouncedPositionUpdate(position);

        const noiseStats = processNoiseData();
        if (!noiseStats) {
          console.warn("⚠️ No noise data available for position update");
          return;
        }

        const enhancedCoords = enhancePosition(position);

        // Generate a stable location key for comparison
        const locationKey = `${enhancedCoords.latitude.toFixed(
          5
        )},${enhancedCoords.longitude.toFixed(5)}`;

        // Check our reference set instead of the React state
        const locationExists =
          processedLocationKeysRef.current.has(locationKey);

        if (!locationExists) {
          // First time seeing this location - create a new point
          const newPoint: LocationPoint = {
            lat: enhancedCoords.latitude,
            lng: enhancedCoords.longitude,
            noise: noiseStats.avg,
            timestamp: Date.now(),
            accuracy: enhancedCoords.accuracy,
            samples: noiseStats.samplesCount,
            minNoise: noiseStats.min,
            maxNoise: noiseStats.max,
            spikes: noiseStats.spikes,
            metadata: noiseStats.metadata,
          };

          // Add to our tracking reference
          processedLocationKeysRef.current.add(locationKey);

          // Update state
          setLocationData((prev) => {
            console.log(
              `Creating new point: ${locationKey}, current points: ${prev.length}`
            );
            return [...prev, newPoint];
          });

          lastRecordedPointRef.current = newPoint;
        } else {
          // Location exists - update it
          setLocationData((prev) => {
            // Find the existing point with the same coordinates
            const existingPointIndex = prev.findIndex(
              (point) =>
                `${point.lat.toFixed(5)},${point.lng.toFixed(5)}` ===
                locationKey
            );

            if (existingPointIndex === -1) {
              console.warn(
                `⚠️ Reference tracking inconsistency: key ${locationKey} marked as existing but not found in state`
              );
              return prev; // Safety fallback
            }

            // Create updated version of the point
            const updatedPoint: LocationPoint = {
              ...prev[existingPointIndex],
              noise: noiseStats.avg,
              timestamp: Date.now(),
              samples:
                prev[existingPointIndex].samples + noiseStats.samplesCount,
              minNoise: Math.min(
                prev[existingPointIndex].minNoise,
                noiseStats.min
              ),
              maxNoise: Math.max(
                prev[existingPointIndex].maxNoise,
                noiseStats.max
              ),
              spikes: prev[existingPointIndex].spikes + noiseStats.spikes,
              metadata: noiseStats.metadata,
            };

            lastRecordedPointRef.current = updatedPoint;

            console.log(
              `Updating point at index ${existingPointIndex}: ${locationKey}`
            );

            // Create a new array with the updated point
            const newData = [...prev];
            newData[existingPointIndex] = updatedPoint;
            return newData;
          });
        }

        // Clear samples after processing
        samplesRef.current = [];
      }, 1000);

      // Start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          handlePosition(position);
          if (!isTracking) {
            setIsTracking(true);
            setError(null);
            setErrorType(undefined);
            resolve();
          }
        },
        (err) => {
          let errorMsg = `GPS Error: ${err.message}`;
          let errorType: GeolocationErrorType;

          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMsg = "Location permission denied";
              errorType = GeolocationErrorType.PERMISSION_DENIED;
              break;
            case err.POSITION_UNAVAILABLE:
              errorMsg = "Location position unavailable";
              errorType = GeolocationErrorType.POSITION_UNAVAILABLE;
              break;
            case err.TIMEOUT:
              errorMsg = "Location request timed out";
              errorType = GeolocationErrorType.TIMEOUT;
              break;
            default:
              errorMsg = "Unknown location error";
              errorType = GeolocationErrorType.UNKNOWN_ERROR;
          }

          setError(errorMsg);
          setErrorType(errorType);
          reject(new Error(errorMsg));
        },
        {
          enableHighAccuracy: !mergedConfig.batteryOptimization,
          maximumAge: mergedConfig.maximumAge,
          timeout: mergedConfig.timeout,
        }
      );
    });
  }, [
    mergedConfig,
    shouldRecordNewPoint,
    processNoiseData,
    enhancePosition,
    debouncedPositionUpdate,
    isTracking,
    locationKeys,
  ]);

  // Stop tracking GPS location with improved logging
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Print statistics before resetting
    console.log("📊 GPS Tracking Statistics on Stop:");
    console.log(`- Total location points recorded: ${locationKeys.length}`);
    console.log(`- Total samples collected: ${allSamplesRef.current.length}`);
    console.log(`- Samples in current buffer: ${samplesRef.current.length}`);

    if (lastRecordedPointRef.current) {
      console.log(
        `- Last recorded point: ${lastRecordedPointRef.current.lat.toFixed(
          6
        )}, ${lastRecordedPointRef.current.lng.toFixed(6)}`
      );
      console.log(
        `- Last recorded noise: ${lastRecordedPointRef.current.noise.toFixed(
          2
        )} dB`
      );
    }

    // Calculate overall noise average
    if (allSamplesRef.current.length > 0) {
      const sum = allSamplesRef.current.reduce(
        (acc, sample) => acc + sample.noise,
        0
      );
      const avg = sum / allSamplesRef.current.length;
      console.log(`- Overall average noise: ${avg.toFixed(2)} dB`);
    }

    setIsTracking(false);
    setCurrentPosition(null);
    setError(null);
    setErrorType(undefined);
  }, [locationKeys.length]);

  // Cleanup and sample history management
  useEffect(() => {
    const MAX_LOCATION_HISTORY = 1000;
    if (locationKeys.length > MAX_LOCATION_HISTORY) {
      const keysToKeep = locationKeys.slice(-MAX_LOCATION_HISTORY);
      setLocationKeys(keysToKeep);

      // Clean up the map to match keys
      setLocationMap((prev) => {
        const newMap: LocationMap = {};
        keysToKeep.forEach((key) => {
          if (prev[key]) {
            newMap[key] = prev[key];
          }
        });
        return newMap;
      });
    }

    const MAX_SAMPLE_HISTORY = 5000;
    if (allSamplesRef.current.length > MAX_SAMPLE_HISTORY) {
      console.log(
        `⚠️ Sample history exceeds ${MAX_SAMPLE_HISTORY}, trimming oldest samples`
      );
      allSamplesRef.current = allSamplesRef.current.slice(-MAX_SAMPLE_HISTORY);
    }
  }, [locationKeys]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      debouncedPositionUpdate.cancel();
    };
  }, [debouncedPositionUpdate]);

  return {
    // Return locationData for backward compatibility
    locationData,
    currentPosition,
    error,
    isTracking,
    hasValidFix: Boolean(currentPosition),
    errorType,
    startTracking,
    stopTracking,
    addNoiseSample,
    getPositionConfidence,
    getDistanceFromLastPoint,
    getAllSamples,
  };
};
