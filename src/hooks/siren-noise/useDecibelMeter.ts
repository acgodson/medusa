import { useState, useRef, useCallback, useEffect } from "react";
import { NoiseConfig } from "@/types/noise";
import { throttle } from "lodash";

export const useDecibelMeter = (
  config: Pick<NoiseConfig, "minDecibels" | "maxDecibels" | "samplingInterval">
) => {
  const [currentReading, setCurrentReading] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [calibrationOffset, setCalibrationOffset] = useState(0);
  const [initStatus, setInitStatus] = useState({
    micPermission: false,
    audioContextCreated: false,
    analyzerCreated: false,
    streamActive: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const measurementIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousIntervalDurationRef = useRef<number | null>(null);

  const calculateDecibels = useCallback(() => {
    if (!analyserRef.current) return null;

    const bufferLength = analyserRef.current.fftSize;
    const dataArray = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / bufferLength);

    const safeRMS = Math.max(rms, 0.000001);
    const rawDecibels = 20 * Math.log10(safeRMS);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const baseNoiseFloor = isMobile ? -70 : -60;
    const baseScalingFactor = isMobile ? 80 : 90;
    const adjustedDecibels = Math.round(
      ((rawDecibels - baseNoiseFloor) / baseScalingFactor) * 100 +
        calibrationOffset
    );
    const finalReading = Math.max(0, adjustedDecibels);
    return finalReading;
  }, [calibrationOffset]);

  const throttledCalculate = useCallback(
    throttle(() => {
      const value = calculateDecibels();
      if (value !== null) {
        setCurrentReading((prev) => {
          const smoothingFactor = 0.3;
          return Math.round(
            (1 - smoothingFactor) * prev + smoothingFactor * value
          );
        });
      } else {
        console.log("⚠️ Skipping update due to null reading");
      }
    }, config.samplingInterval),
    [calculateDecibels, config.samplingInterval]
  );

  const captureAudio = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Audio API not supported");
      }
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      setInitStatus((prev) => ({
        ...prev,
        micPermission: true,
        streamActive: true,
      }));
      audioContextRef.current = new AudioContext({
        latencyHint: "interactive",
        sampleRate: 48000,
      });
      setInitStatus((prev) => ({ ...prev, audioContextCreated: true }));
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
        setTimeout(async () => {
          if (audioContextRef.current?.state === "suspended") {
            console.warn("⚠️ AudioContext still suspended, forcing resume...");
            await audioContextRef.current.resume();
          }
        }, 500);
      }
      // Validate microphone stream
      if (!streamRef.current || !streamRef.current.active) {
        throw new Error("Microphone stream is inactive or unavailable.");
      }
      sourceRef.current = audioContextRef.current.createMediaStreamSource(
        streamRef.current
      );

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.2;
      setInitStatus((prev) => ({ ...prev, analyzerCreated: true }));
      sourceRef.current.connect(analyserRef.current);
      setIsRecording(true);
      setIsPaused(false);
      setError(null);

      setTimeout(() => {
        const initialReading = calculateDecibels();
        if (initialReading === null) {
          console.warn("⚠️ Initial decibel reading is null, possible issue.");
        }
      }, 500);
      const measurementInterval = setInterval(() => {
        throttledCalculate();
      }, config.samplingInterval);
      measurementIntervalRef.current = measurementInterval;
      previousIntervalDurationRef.current = config.samplingInterval;
      setTimeout(() => {
        throttledCalculate();
      }, 100);
    } catch (err) {
      console.error("❌ captureAudio error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to initialize audio"
      );
      setInitStatus((prev) => ({
        ...prev,
        micPermission: false,
        audioContextCreated: Boolean(audioContextRef.current),
        analyzerCreated: Boolean(analyserRef.current),
        streamActive: Boolean(streamRef.current?.active),
      }));
      throw err;
    }
  };

  const stopRecording = useCallback(() => {
    // Clear measurement interval
    if (measurementIntervalRef.current) {
      clearInterval(measurementIntervalRef.current);
      measurementIntervalRef.current = null;
    }

    if (streamRef.current) {
      console.log("Stopping audio tracks...");
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (sourceRef.current) {
      console.log("Disconnecting audio source...");
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (analyserRef.current) {
      console.log("Disconnecting analyzer...");
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      console.log("Closing audio context...");
      audioContextRef.current.close().catch((err) => {
        console.error("Error closing AudioContext:", err);
      });
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);

    // Reset initialization status
    setInitStatus({
      micPermission: false,
      audioContextCreated: false,
      analyzerCreated: false,
      streamActive: false,
    });
  }, []);

  const pauseRecording = useCallback(() => {
    console.log("⏸️ Pausing audio recording");

    if (!isRecording || isPaused) {
      console.warn("Cannot pause: either not recording or already paused");
      return;
    }

    if (measurementIntervalRef.current) {
      previousIntervalDurationRef.current = config.samplingInterval;
      clearInterval(measurementIntervalRef.current);
      measurementIntervalRef.current = null;
    }
    if (
      audioContextRef.current &&
      audioContextRef.current.state === "running"
    ) {
      audioContextRef.current.suspend().catch((err) => {
        console.error("Error suspending AudioContext:", err);
      });
    }
    setIsPaused(true);
    console.log("Recording paused successfully");
  }, [isRecording, isPaused, config.samplingInterval]);

  const resumeRecording = useCallback(() => {
    console.log("▶️ Resuming audio recording");

    if (!isRecording || !isPaused) {
      console.warn("Cannot resume: either not recording or not paused");
      return;
    }
    if (
      audioContextRef.current &&
      audioContextRef.current.state === "suspended"
    ) {
      audioContextRef.current.resume().catch((err) => {
        console.error("Error resuming AudioContext:", err);
      });
    }
    if (!measurementIntervalRef.current) {
      const interval =
        previousIntervalDurationRef.current || config.samplingInterval;
      const measurementInterval = setInterval(() => {
        throttledCalculate();
      }, interval);
      measurementIntervalRef.current = measurementInterval;
    }
    setIsPaused(false);
    setTimeout(() => {
      throttledCalculate();
    }, 100);
  }, [isRecording, isPaused, config.samplingInterval, throttledCalculate]);

  const calibrate = useCallback(async () => {
    if (!isRecording) {
      console.warn("⚠️ Not recording, cannot calibrate.");
      return;
    }
    const samples: number[] = [];
    for (let i = 0; i < 30; i++) {
      const reading = calculateDecibels();
      if (reading !== null) samples.push(reading);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (samples.length === 0) {
      console.warn("⚠️ No valid samples collected.");
      return;
    }
    samples.sort((a, b) => a - b);
    const startIdx = Math.floor(samples.length * 0.2);
    const endIdx = Math.floor(samples.length * 0.8);
    const trimmedSamples = samples.slice(startIdx, endIdx);
    const avgReading =
      trimmedSamples.reduce((a, b) => a + b, 0) / trimmedSamples.length;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const expectedQuietLevel = isMobile ? 15 : 25;
    const newOffset = expectedQuietLevel - avgReading;
    setCalibrationOffset(newOffset);
  }, [isRecording, calculateDecibels]);

  // Automatic cleanup
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    currentReading,
    error,
    isRecording,
    isPaused,
    captureAudio,
    stopRecording,
    pauseRecording,
    resumeRecording,
    calculateDecibels,
    calibrate,
    initStatus,
  };
};
