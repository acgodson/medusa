import { useState, useRef, useCallback, useEffect } from "react";
import { useDecibelMeter } from "./useDecibelMeter";
import { useGPSTracking } from "./useGPSTracking";

interface SimpleNoiseConfig {
  // Basic settings
  minDecibels: number;
  maxDecibels: number;
  samplingInterval: number;
  // device metadata
  deviceInfo?: {
    manufacturer: string;
    model: string;
    sensitivity?: number;
  };
  // stationary detection
  stationarySettings?: {
    maxTimeAtLocation: number;
    minMovementDistance: number;
    autoResume: boolean;
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

// Simplified tracking statistics interface
interface TrackingStatistics {
  totalSamples: number;
  averageNoise: number;
  samplesByLocation: {
    [locationKey: string]: {
      count: number;
      averageNoise: number;
      minNoise: number;
      maxNoise: number;
    };
  };
  allSamples: Array<{
    noise: number;
    timestamp: number;
    location?: string;
    metadata?: NoiseSampleMetadata;
  }>;
}

// Create a status type to better track system state
type SystemInitStatus = {
  audioInitialized: boolean;
  gpsInitialized: boolean;
  initializationComplete: boolean;
  initializationError: string | null;
  trackingActive: boolean;
  trackingPaused: boolean;
};

export const useNoiseTracking = (config: SimpleNoiseConfig) => {
  // Improved system status tracking
  const [systemStatus, setSystemStatus] = useState<SystemInitStatus>({
    audioInitialized: false,
    gpsInitialized: false,
    initializationComplete: false,
    initializationError: null,
    trackingActive: false,
    trackingPaused: false,
  });

  // Core state with better typing
  const [currentNoise, setCurrentNoise] = useState<number>(0);
  const [measurementQuality, setMeasurementQuality] = useState<number>(1.0);
  const [systemError, setSystemError] = useState<string | null>(null);

  // Track initialization state separately from activity state
  const isInitializedRef = useRef<boolean>(false);
  const isActiveRef = useRef<boolean>(false);

  // Add mounted ref to prevent cleanup on re-renders
  const isMountedRef = useRef<boolean>(true);

  // Cleanup timer ref to prevent multiple interval timers
  const stationaryTimerIdRef = useRef<number | null>(null);

  // Noise capture state
  const noiseValueRef = useRef<number | null>(null);
  const noiseMetadataRef = useRef<NoiseSampleMetadata | null>(null);
  const initPromiseRef = useRef<Promise<{
    audioInitialized: boolean;
    gpsInitialized: boolean;
  }> | null>(null);

  // Statistics tracking
  const [trackingStats, setTrackingStats] = useState<TrackingStatistics>({
    totalSamples: 0,
    averageNoise: 0,
    samplesByLocation: {},
    allSamples: [],
  });

  // Stationary detection - improved state structure
  const [stationaryState, setStationaryState] = useState({
    isPaused: false,
    timeAtCurrentLocation: 0,
    lastLocationTimestamp: 0,
    pauseReason: "",
    lastKnownPosition: null as GeolocationCoordinates | null,
  });

  // Stationary settings with defaults
  const stationarySettings = {
    maxTimeAtLocation: 60 * 1000, // 1 minute default
    minMovementDistance: 15, // 15 meters default
    autoResume: true,
    ...config.stationarySettings,
  };

  // Initialize decibel meter
  const {
    currentReading,
    error: audioError,
    isRecording,
    captureAudio,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useDecibelMeter({
    minDecibels: config.minDecibels || 30,
    maxDecibels: config.maxDecibels || 120,
    samplingInterval: config.samplingInterval || 500,
  });

  // Initialize GPS tracking
  const {
    locationData,
    currentPosition,
    error: gpsError,
    isTracking: isGPSTracking,
    startTracking: startGPS,
    stopTracking: stopGPS,
    addNoiseSample: gpsAddNoiseSample,
    hasValidFix,
    getPositionConfidence,
    getDistanceFromLastPoint,
    getAllSamples,
  } = useGPSTracking({
    minDistance: 10,
    maxSamplesPerPoint: 20,
    batteryOptimization: true,
    spikeThreshold: 10,
    useSensorFusion: false,
    accuracyThreshold: 1000,
  });

  // Set mounted flag on mount/unmount - FIXES THE MAIN ISSUE
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Clean up resources on true unmount (not re-renders)
      if (isActiveRef.current) {
        console.log("🧹 Cleanup: stopping tracking due to component unmount");
        // Call internal cleanup without state updates
        cleanupResources();
      }
    };
  }, []);

  // Internal cleanup function that doesn't depend on state
  const cleanupResources = useCallback(() => {
    // Cancel stationary check interval
    if (stationaryTimerIdRef.current !== null) {
      clearInterval(stationaryTimerIdRef.current);
      stationaryTimerIdRef.current = null;
    }

    // Stop recording subsystems directly
    stopRecording();
    stopGPS();

    // Reset refs
    isActiveRef.current = false;
    isInitializedRef.current = false;
    initPromiseRef.current = null;
  }, [stopGPS, stopRecording]);

  // Helper to update tracking stats - logic extracted to pure function for better reliability
  const updateTrackingStats = useCallback(
    (noise: number, position: GeolocationCoordinates | null) => {
      if (!position || !isMountedRef.current) return; // Safety check

      const locationKey = `${position.latitude.toFixed(
        5
      )},${position.longitude.toFixed(5)}`;
      const timestamp = Date.now();

      const newSample = {
        noise,
        timestamp,
        location: locationKey,
        metadata: noiseMetadataRef.current,
      };

      setTrackingStats((prev: any) => {
        // Get existing location stats or initialize
        const locationStats = prev.samplesByLocation[locationKey] || {
          count: 0,
          averageNoise: 0,
          minNoise: Number.MAX_VALUE,
          maxNoise: Number.MIN_VALUE,
        };

        // Calculate new values
        const newCount = locationStats.count + 1;
        const newAvg =
          (locationStats.averageNoise * locationStats.count + noise) / newCount;
        const newTotalSamples = prev.totalSamples + 1;
        const newOverallAvg =
          (prev.averageNoise * prev.totalSamples + noise) / newTotalSamples;

        // Return updated state
        return {
          totalSamples: newTotalSamples,
          averageNoise: newOverallAvg,
          samplesByLocation: {
            ...prev.samplesByLocation,
            [locationKey]: {
              count: newCount,
              averageNoise: newAvg,
              minNoise: Math.min(locationStats.minNoise, noise),
              maxNoise: Math.max(locationStats.maxNoise, noise),
            },
          },
          allSamples: [...prev.allSamples, newSample],
        };
      });

      // For debugging/logging
      return true;
    },
    []
  );

  // Process noise reading - improved sync with location data
  const processNoiseReading = useCallback(
    (noiseLevel: number) => {
      if (
        !isInitializedRef.current ||
        !isActiveRef.current ||
        !isMountedRef.current
      ) {
        console.log(
          "🔍 Skipping noise processing - system not ready, inactive, or unmounted"
        );
        return false;
      }

      if (stationaryState.isPaused) {
        console.log("🔍 Skipping noise processing - tracking paused");
        return false;
      }

      if (noiseLevel === null || noiseLevel === undefined) {
        console.log("🔍 Skipping null noise reading");
        return false;
      }

      // Update noise refs and state
      const timestamp = new Date().toISOString();

      noiseValueRef.current = noiseLevel;
      noiseMetadataRef.current = {
        deviceInfo: config.deviceInfo,
        timestamp,
        rawReading: noiseLevel,
      };

      // Update UI state if component is still mounted
      if (isMountedRef.current) {
        setCurrentNoise(noiseLevel);
      }

      // Add to GPS tracking system
      const added = gpsAddNoiseSample(noiseLevel, noiseMetadataRef.current);

      // Log the outcome
      // console.log(
      //   `📡 Noise sample ${added ? "added to" : "rejected by"} GPS tracking:`,
      //   {
      //     noiseLevel: noiseLevel.toFixed(2),
      //     hasPosition: !!currentPosition,
      //     trackingActive: isActiveRef.current,
      //     isStationary: stationaryState.isPaused,
      //   }
      // );

      // Local tracking update (separate from GPS system)
      if (currentPosition) {
        updateTrackingStats(noiseLevel, currentPosition);
      }

      return added;
    },
    [
      config.deviceInfo,
      currentPosition,
      gpsAddNoiseSample,
      stationaryState.isPaused,
      updateTrackingStats,
    ]
  );

  // Pause tracking with reliable state updates
  const pauseTracking = useCallback(
    (reason: string) => {
      if (
        !isActiveRef.current ||
        stationaryState.isPaused ||
        !isMountedRef.current
      ) {
        console.log(
          "⚠️ Cannot pause: tracking not active, already paused, or unmounted"
        );
        return;
      }

      console.log(`⏸️ Pausing tracking: ${reason}`);
      pauseRecording();

      // Update stationary state
      setStationaryState((prev) => ({
        ...prev,
        isPaused: true,
        pauseReason: reason,
      }));

      // Update system status
      setSystemStatus((prev) => ({
        ...prev,
        trackingPaused: true,
      }));

      console.log("✅ Tracking paused successfully");
    },
    [pauseRecording, stationaryState.isPaused]
  );

  // Synchronize noise data when currentReading changes
  useEffect(() => {
    if (
      currentReading !== null &&
      currentReading !== undefined &&
      isMountedRef.current
    ) {
      processNoiseReading(currentReading);
    }
  }, [currentReading, processNoiseReading]);

  // Check for stationary state - improved with better position validation
  const checkStationary = useCallback(() => {
    if (
      !isActiveRef.current ||
      stationaryState.isPaused ||
      !currentPosition ||
      !isMountedRef.current
    ) {
      return;
    }

    const now = Date.now();
    const timeAtLocation = stationaryState.lastLocationTimestamp
      ? now - stationaryState.lastLocationTimestamp
      : 0;

    // If we've been in one place too long, pause
    if (timeAtLocation >= stationarySettings.maxTimeAtLocation) {
      console.log(
        `⏸️ Auto-pausing: device stationary for ${Math.round(
          timeAtLocation / 1000
        )}s`
      );
      pauseTracking("Device has been stationary for a while");
      return;
    }

    if (!stationaryState.lastKnownPosition) {
      console.log(
        "📍 Initializing first known position for stationary detection"
      );
      setStationaryState((prev) => ({
        ...prev,
        lastLocationTimestamp: now,
        lastKnownPosition: currentPosition,
        timeAtCurrentLocation: 0,
      }));
      return;
    }

    // Check if we've moved enough to reset the timer
    const hasMoved =
      getDistanceFromLastPoint(currentPosition) >=
      stationarySettings.minMovementDistance;

    if (hasMoved) {
      // Reset stationary timer and update position
      setStationaryState((prev) => ({
        ...prev,
        lastLocationTimestamp: now,
        lastKnownPosition: currentPosition,
        timeAtCurrentLocation: 0,
      }));

      console.log(
        "🚶 Significant movement detected, resetting stationary timer"
      );
    } else {
      // Just update the timer
      setStationaryState((prev) => ({
        ...prev,
        timeAtCurrentLocation: timeAtLocation,
      }));
    }
  }, [
    currentPosition,
    stationarySettings.maxTimeAtLocation,
    stationarySettings.minMovementDistance,
    stationaryState.isPaused,
    stationaryState.lastKnownPosition,
    stationaryState.lastLocationTimestamp,
    getDistanceFromLastPoint,
    pauseTracking,
  ]);

  // Improved initialization with atomic operations and better state management
  const initializeSubsystems = useCallback(async () => {
    // Check if component is still mounted
    if (!isMountedRef.current) {
      console.log("⚠️ Aborting initialization - component unmounted");
      throw new Error("Component unmounted during initialization");
    }

    // Track partial successes for better error handling
    let audioInitialized = false;
    let gpsInitialized = false;

    try {
      // Initialize audio
      console.log("🎤 Initializing audio capture...");
      try {
        await captureAudio();
        audioInitialized = true;
        console.log("✅ Audio capture initialized successfully");

        if (isMountedRef.current) {
          setSystemStatus((prev) => ({
            ...prev,
            audioInitialized: true,
          }));
        }
      } catch (audioErr: any) {
        console.warn("⚠️ Audio initialization error:", audioErr);

        // Only throw for permission errors
        if (
          typeof audioErr === "string" &&
          (audioErr.includes("permission") || audioErr.includes("denied"))
        ) {
          throw new Error(`Audio permission denied: ${audioErr}`);
        }
      }

      // Check if component is still mounted after audio init
      if (!isMountedRef.current) {
        console.log(
          "⚠️ Aborting initialization after audio - component unmounted"
        );
        if (audioInitialized) stopRecording();
        throw new Error("Component unmounted during initialization");
      }

      // Initialize GPS
      console.log("🌍 Initializing GPS tracking...");
      try {
        await startGPS();
        gpsInitialized = true;
        console.log("✅ GPS tracking initialized successfully");

        if (isMountedRef.current) {
          setSystemStatus((prev) => ({
            ...prev,
            gpsInitialized: true,
          }));
        }
      } catch (gpsErr: any) {
        console.warn("⚠️ GPS initialization error:", gpsErr);

        // Only throw for permission errors
        if (
          typeof gpsErr === "string" &&
          (gpsErr.includes("permission") || gpsErr.includes("denied"))
        ) {
          throw new Error(`GPS permission denied: ${gpsErr}`);
        }
      }

      // Final mounted check
      if (!isMountedRef.current) {
        console.log(
          "⚠️ Aborting initialization after GPS - component unmounted"
        );
        if (audioInitialized) stopRecording();
        if (gpsInitialized) stopGPS();
        throw new Error("Component unmounted during initialization");
      }

      // Final check - we need at least one subsystem working
      if (!audioInitialized && !gpsInitialized) {
        throw new Error(
          "Failed to initialize both audio and GPS - neither subsystem available"
        );
      }

      // Mark initialization complete
      isInitializedRef.current = true;

      // Update system status atomically
      if (isMountedRef.current) {
        setSystemStatus((prev) => ({
          ...prev,
          audioInitialized,
          gpsInitialized,
          initializationComplete: true,
          initializationError: null,
        }));
      }

      console.log("🚀 System initialized with:", {
        audio: audioInitialized,
        gps: gpsInitialized,
      });

      return { audioInitialized, gpsInitialized };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("❌ Initialization failed:", errorMessage);

      // Update error state if still mounted
      if (isMountedRef.current) {
        setSystemError(errorMessage);
        setSystemStatus((prev) => ({
          ...prev,
          audioInitialized,
          gpsInitialized,
          initializationComplete: true,
          initializationError: errorMessage,
        }));
      }

      // Clean up what we can
      if (audioInitialized) stopRecording();
      if (gpsInitialized) stopGPS();

      throw err;
    }
  }, [captureAudio, startGPS, stopGPS, stopRecording]);

  // Start tracking with improved state transitions
  const startTracking = useCallback(async () => {
    if (isActiveRef.current) {
      console.warn("Tracking already active - ignoring start request");
      return;
    }

    if (!isMountedRef.current) {
      console.warn("Cannot start tracking - component unmounted");
      return;
    }

    // Reset state
    setSystemError(null);
    setCurrentNoise(0);
    noiseValueRef.current = null;
    noiseMetadataRef.current = null;

    setStationaryState({
      isPaused: false,
      timeAtCurrentLocation: 0,
      lastLocationTimestamp: Date.now(),
      pauseReason: "",
      lastKnownPosition: currentPosition,
    });

    setTrackingStats({
      totalSamples: 0,
      averageNoise: 0,
      samplesByLocation: {},
      allSamples: [],
    });

    setSystemStatus({
      audioInitialized: false,
      gpsInitialized: false,
      initializationComplete: false,
      initializationError: null,
      trackingActive: false,
      trackingPaused: false,
    });

    try {
      // Create and store initialization promise
      const initPromise = initializeSubsystems();
      initPromiseRef.current = initPromise;

      // Wait for initialization to complete
      const { audioInitialized, gpsInitialized } = await initPromise;

      // Double-check that we haven't been stopped during initialization
      if (initPromiseRef.current !== initPromise || !isMountedRef.current) {
        console.warn(
          "Initialization was superseded by another operation or component unmounted - aborting"
        );

        // Clean up if needed
        if (audioInitialized) stopRecording();
        if (gpsInitialized) stopGPS();

        return;
      }

      // Only mark as active if initialization succeeded
      isActiveRef.current = true;

      // Update system status
      if (isMountedRef.current) {
        setSystemStatus((prev) => ({
          ...prev,
          trackingActive: true,
        }));
      }

      console.log("🚀 Noise tracking started successfully:", {
        audio: audioInitialized,
        gps: gpsInitialized,
      });

      // Start stationary checks - handle timer reference
      if (stationaryTimerIdRef.current !== null) {
        clearInterval(stationaryTimerIdRef.current);
      }

      stationaryTimerIdRef.current = window.setInterval(
        checkStationary,
        5000
      ) as unknown as number;
    } catch (err) {
      // Error already handled in initializeSubsystems
      isActiveRef.current = false;
      initPromiseRef.current = null;

      // Ensure system status reflects the failure if still mounted
      if (isMountedRef.current) {
        setSystemStatus((prev) => ({
          ...prev,
          trackingActive: false,
        }));
      }

      // Re-throw for upstream handling
      throw err;
    }
  }, [initializeSubsystems, checkStationary, stopGPS, stopRecording]);

  // Improved stop tracking with better cleanup
  const stopTracking = useCallback(() => {
    console.log("🛑 Stopping tracking system");

    // Cancel any pending initialization
    initPromiseRef.current = null;

    if (isActiveRef.current) {
      // Log final statistics
      const allRawSamples = getAllSamples();
      console.log("📊 Final tracking statistics:", {
        totalSamples: trackingStats.totalSamples,
        averageNoise: trackingStats.averageNoise.toFixed(2),
        locationCount: Object.keys(trackingStats.samplesByLocation).length,
        rawSamplesCount: allRawSamples?.length || 0,
      });
    }

    // Clean up resources
    cleanupResources();

    // Only update state if still mounted
    if (isMountedRef.current) {
      // Reset state
      setCurrentNoise(0);
      setMeasurementQuality(1.0);

      // Reset system status
      setSystemStatus({
        audioInitialized: false,
        gpsInitialized: false,
        initializationComplete: true,
        initializationError: null,
        trackingActive: false,
        trackingPaused: false,
      });

      // Reset stationary state
      setStationaryState({
        isPaused: false,
        timeAtCurrentLocation: 0,
        lastLocationTimestamp: 0,
        pauseReason: "",
        lastKnownPosition: null,
      });
    }

    console.log("✅ Tracking system stopped and cleaned up");
  }, [getAllSamples, trackingStats, cleanupResources]);

  // Resume tracking with synchronized state updates
  const resumeTracking = useCallback(() => {
    if (
      !isActiveRef.current ||
      !stationaryState.isPaused ||
      !isMountedRef.current
    ) {
      console.log(
        "⚠️ Cannot resume: tracking not active, not paused, or unmounted"
      );
      return;
    }

    console.log("▶️ Resuming tracking");
    resumeRecording();

    // IMPORTANT FIX: When resuming, don't reset lastKnownPosition unless position actually changed
    // Instead, verify current position against last known position
    const shouldUpdatePosition =
      currentPosition &&
      stationaryState.lastKnownPosition &&
      getDistanceFromLastPoint(currentPosition) >=
        stationarySettings.minMovementDistance;

    setStationaryState((prev) => ({
      ...prev,
      isPaused: false,
      timeAtCurrentLocation: shouldUpdatePosition
        ? 0
        : prev.timeAtCurrentLocation,
      lastLocationTimestamp: shouldUpdatePosition
        ? Date.now()
        : prev.lastLocationTimestamp,
      pauseReason: "",
      // Only update position reference if movement was significant
      lastKnownPosition: shouldUpdatePosition
        ? currentPosition
        : prev.lastKnownPosition,
    }));

    // Update system status
    setSystemStatus((prev) => ({
      ...prev,
      trackingPaused: false,
    }));

    console.log("✅ Tracking resumed successfully with position continuity");
  }, [
    resumeRecording,
    stationaryState.isPaused,
    currentPosition,
    stationaryState.lastKnownPosition,
    getDistanceFromLastPoint,
    stationarySettings.minMovementDistance,
  ]);

  // Update measurement quality based on position confidence
  useEffect(() => {
    if (isActiveRef.current && currentPosition && isMountedRef.current) {
      const positionQuality = getPositionConfidence();
      setMeasurementQuality(positionQuality);
    }
  }, [currentPosition, getPositionConfidence]);

  // Improved error handling with better recovery options
  useEffect(() => {
    if ((audioError || gpsError) && isMountedRef.current) {
      const error = audioError || gpsError;

      // Is this a critical error?
      const isCriticalError =
        error &&
        typeof error === "string" &&
        (error.includes("permission denied") ||
          error.includes("not allowed") ||
          error.includes("PERMISSION_DENIED"));

      if (isCriticalError) {
        console.error("❌ Critical permission error detected:", error);
        setSystemError(error);

        // Update system status
        setSystemStatus((prev) => ({
          ...prev,
          initializationError: error,
        }));

        if (isActiveRef.current) {
          stopTracking();
        }
      } else {
        // For non-critical errors, log but don't stop
        console.warn("⚠️ Non-critical error detected:", error);
        setSystemError(error);

        // Update status but don't change active state
        setSystemStatus((prev) => ({
          ...prev,
          initializationError: error,
        }));
      }
    }
  }, [audioError, gpsError, stopTracking]);

  useEffect(() => {
    if (isActiveRef.current && !stationaryTimerIdRef.current) {
      console.log("🕒 Setting up stationary detection interval");
      stationaryTimerIdRef.current = window.setInterval(() => {
        // Debug log every minute
        if (stationaryState.timeAtCurrentLocation % 60000 < 5000) {
          console.log(`📊 Stationary tracking status:`, {
            timeAtLocation: Math.round(
              stationaryState.timeAtCurrentLocation / 1000
            ),
            hasLastPosition: !!stationaryState.lastKnownPosition,
            maxTimeAllowed: stationarySettings.maxTimeAtLocation / 1000,
            minMovementDistance: stationarySettings.minMovementDistance,
            isPaused: stationaryState.isPaused,
          });
        }
        checkStationary();
      }, 5000);
    }

    return () => {
      if (stationaryTimerIdRef.current) {
        clearInterval(stationaryTimerIdRef.current);
        stationaryTimerIdRef.current = null;
      }
    };
  }, [isActiveRef.current, stationaryState, checkStationary]);

  // Return consistent API with improved status reporting
  return {
    // State indicators
    isTracking: isActiveRef.current && !stationaryState.isPaused,
    isPaused: stationaryState.isPaused,
    isInitialized: isInitializedRef.current,

    // Measurement data
    currentNoise,
    locationData,
    measurementQuality,
    hasValidFix,

    // Error and status information
    error: systemError,
    systemStatus: {
      ...systemStatus,
      isPaused: stationaryState.isPaused,
    },

    // Stationary tracking info
    stationaryInfo: {
      timeAtCurrentLocation: stationaryState.timeAtCurrentLocation,
      pauseReason: stationaryState.pauseReason,
      lastKnownPosition: stationaryState.lastKnownPosition,
    },

    // Statistics
    trackingStats,

    // Actions
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
  };
};
