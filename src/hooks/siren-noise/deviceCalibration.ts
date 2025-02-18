//Development in Progress
import { useState, useEffect } from "react";

interface CalibrationData {
  deviceId: string;
  micSensitivityDB: number;
  calibrationOffset: number;
  lastCalibrated: string;
  calibrationPoints: CalibrationPoint[];
}

interface CalibrationPoint {
  measuredDB: number;
  referenceDB: number;
  timestamp: string;
}

interface DeviceInfo {
  deviceId: string;
  label: string;
  groupId: string;
}

const STORAGE_KEY = "DEVICE_CALIBRATION_DATA";
const DEFAULT_SENSITIVITY = -35;
const DEFAULT_OFFSET = -60;
const SAMPLE_DURATION = 5000;

export const useDeviceCalibration = () => {
  const [currentDevice, setCurrentDevice] = useState<DeviceInfo | null>(null);
  const [calibrationData, setCalibrationData] =
    useState<CalibrationData | null>(null);
  const [availableDevices, setAvailableDevices] = useState<DeviceInfo[]>([]);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load calibration data from localStorage
  const loadCalibrationData = async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedData = JSON.parse(stored) as Record<
          string,
          CalibrationData
        >;
        if (currentDevice?.deviceId && parsedData[currentDevice.deviceId]) {
          setCalibrationData(parsedData[currentDevice.deviceId]);
        }
      }
    } catch (err) {
      console.error("Error loading calibration data:", err);
      setError("Failed to load calibration data");
    }
  };

  // Save calibration data to localStorage
  const saveCalibrationData = async (data: CalibrationData) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const existingData = stored ? JSON.parse(stored) : {};

      const updatedData = {
        ...existingData,
        [data.deviceId]: data,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
      setCalibrationData(data);
    } catch (err) {
      console.error("Error saving calibration data:", err);
      setError("Failed to save calibration data");
    }
  };

  // Get available audio input devices
  const getAvailableDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices
        .filter((device) => device.kind === "audioinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 4)}`,
          groupId: device.groupId,
        }));

      console.log("audio devices: ", audioDevices);

      setAvailableDevices(audioDevices);

      // If no current device is selected, select the default one
      if (!currentDevice && audioDevices.length > 0) {
        setCurrentDevice(audioDevices[0]);
      }
    } catch (err) {
      console.error("Error getting audio devices:", err);
      setError("Failed to enumerate audio devices");
    }
  };

  const updateCurrentDevice = async (device: DeviceInfo) => {
    try {
      // Verify device is still available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const exists = devices.some((d) => d.deviceId === device.deviceId);

      if (!exists) {
        throw new Error("Selected device no longer available");
      }

      setCurrentDevice(device);
      await loadCalibrationData();
    } catch (err) {
      setError("Failed to select device");
    }
  };

  // Calculate calibration values based on collected points
  const calculateCalibrationValues = (points: CalibrationPoint[]) => {
    if (points.length < 2)
      return {
        micSensitivityDB: DEFAULT_SENSITIVITY,
        calibrationOffset: DEFAULT_OFFSET,
      };

    // Sort points by reference dB
    const sortedPoints = [...points].sort(
      (a, b) => a.referenceDB - b.referenceDB
    );

    // Calculate average difference between measured and reference
    const differences = sortedPoints.map((p) => p.referenceDB - p.measuredDB);
    const avgDifference =
      differences.reduce((sum, diff) => sum + diff, 0) / differences.length;

    // Calculate slope for sensitivity adjustment
    const slope =
      (sortedPoints[points.length - 1].referenceDB -
        sortedPoints[0].referenceDB) /
      (sortedPoints[points.length - 1].measuredDB - sortedPoints[0].measuredDB);

    // Adjust sensitivity based on slope
    const micSensitivityDB = DEFAULT_SENSITIVITY * slope;

    // Use the average difference as calibration offset
    const calibrationOffset = avgDifference;

    return { micSensitivityDB, calibrationOffset };
  };

  const startCalibration = async (referenceDB: number = 0) => {
    if (!currentDevice) {
      throw new Error("No audio device selected");
    }

    setIsCalibrating(true);
    setError(null);

    try {
      const calibrationPromise = new Promise<void>((resolve, reject) => {
        const startCalibrationProcess = async () => {
          try {
            console.log("Starting detailed calibration process");

            // Request audio stream with specific device
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: { exact: currentDevice.deviceId },
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
              },
            });

            console.log("Audio stream obtained for calibration");

            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            analyser.minDecibels = -100;
            analyser.maxDecibels = 0;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            const samples: number[] = [];
            const startTime = Date.now();
            const CALIBRATION_DURATION = 10000; // 10 seconds
            const MAX_SAMPLES = 100;

            const collectSample = () => {
              const dataArray = new Float32Array(analyser.frequencyBinCount);

              // Try different methods to get sound data
              try {
                analyser.getFloatTimeDomainData(dataArray);
              } catch (err) {
                console.warn("Failed to get time domain data", err);
                try {
                  analyser.getFloatFrequencyData(dataArray);
                } catch (innerErr) {
                  console.error("Failed to get frequency data", innerErr);
                  return;
                }
              }

              // More robust RMS calculation
              const rms = Math.sqrt(
                dataArray.reduce((sum, val) => sum + Math.abs(val), 0) /
                  dataArray.length
              );

              // Convert to decibels with lower threshold
              const db = 20 * Math.log10(Math.max(rms, 0.00001));

              // Only add non-zero samples
              if (db > -100) {
                samples.push(db);
                console.log(`Calibration sample (${samples.length}): ${db}`);
              }

              // Continue collecting samples or resolve
              const elapsed = Date.now() - startTime;
              if (
                elapsed < CALIBRATION_DURATION &&
                samples.length < MAX_SAMPLES
              ) {
                requestAnimationFrame(collectSample);
              } else {
                // Clean up
                stream.getTracks().forEach((track) => track.stop());
                source.disconnect();
                analyser.disconnect();
                audioContext.close();

                console.log("Calibration collection complete", {
                  duration: elapsed,
                  sampleCount: samples.length,
                });

                if (samples.length > 0) {
                  // Calculate median of samples
                  const sortedSamples = [...samples].sort((a, b) => a - b);
                  const measuredDB =
                    sortedSamples.length % 2 === 0
                      ? (sortedSamples[sortedSamples.length / 2 - 1] +
                          sortedSamples[sortedSamples.length / 2]) /
                        2
                      : sortedSamples[Math.floor(sortedSamples.length / 2)];

                  console.log("Calibration result", {
                    sampleCount: samples.length,
                    measuredDB,
                    sortedSamples,
                  });

                  // Create calibration point
                  const newPoint: CalibrationPoint = {
                    measuredDB,
                    referenceDB,
                    timestamp: new Date().toISOString(),
                  };

                  // Update existing calibration logic
                  const existingData = calibrationData || {
                    deviceId: currentDevice.deviceId,
                    micSensitivityDB: DEFAULT_SENSITIVITY,
                    calibrationOffset: DEFAULT_OFFSET,
                    lastCalibrated: new Date().toISOString(),
                    calibrationPoints: [],
                  };

                  const updatedPoints = [
                    ...existingData.calibrationPoints,
                    newPoint,
                  ];
                  const { micSensitivityDB, calibrationOffset } =
                    calculateCalibrationValues(updatedPoints);

                  const newCalibrationData: CalibrationData = {
                    ...existingData,
                    micSensitivityDB,
                    calibrationOffset,
                    lastCalibrated: new Date().toISOString(),
                    calibrationPoints: updatedPoints,
                  };

                  saveCalibrationData(newCalibrationData);
                  setIsCalibrating(false);
                  resolve();
                } else {
                  reject(
                    new Error("No valid samples collected during calibration")
                  );
                }
              }
            };

            // Delay start to ensure everything is set up
            setTimeout(collectSample, 500);
          } catch (err) {
            console.error("Calibration process error:", err);
            reject(err);
          }
        };

        // Set overall timeout
        const timeoutId = setTimeout(() => {
          reject(new Error("Calibration process timed out"));
        }, 15000);

        // Start the calibration process
        startCalibrationProcess().finally(() => {
          clearTimeout(timeoutId);
        });
      });

      await calibrationPromise;
    } catch (err) {
      console.error("Calibration error:", err);
      setError(err instanceof Error ? err.message : "Calibration failed");
      setIsCalibrating(false);
      throw err;
    }
  };

  function calculateMedian(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  const initializeAudioDevice = async () => {
    try {
      // Force a permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop()); // Clean up

      // Now enumerate devices (they will have labels after permission)
      await getAvailableDevices();

      return true;
    } catch (err) {
      setError("Failed to initialize audio device");
      return false;
    }
  };

  const resetCalibration = () => {
    setIsCalibrating(false);
    setError(null);
  };

  // Add error recovery effect
  useEffect(() => {
    if (error) {
      resetCalibration();
      // Optionally attempt to reinitialize
      initializeAudioDevice();
    }
  }, [error]);

  // Initialize device list and load calibration data
  useEffect(() => {
    getAvailableDevices();
  }, []);

  useEffect(() => {
    if (currentDevice) {
      loadCalibrationData();
    }
  }, [currentDevice]);

  // Handle device permission changes
  useEffect(() => {
    navigator.mediaDevices.addEventListener(
      "devicechange",
      getAvailableDevices
    );
    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        getAvailableDevices
      );
    };
  }, []);

  return {
    currentDevice,
    calibrationData,
    availableDevices,
    isCalibrating,
    error,
    setCurrentDevice: updateCurrentDevice,
    startCalibration,
    getCalibrationValues: () => ({
      micSensitivityDB:
        calibrationData?.micSensitivityDB ?? DEFAULT_SENSITIVITY,
      calibrationOffset: calibrationData?.calibrationOffset ?? DEFAULT_OFFSET,
    }),
  };
};
