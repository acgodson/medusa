import { useState, useRef, useCallback, useEffect } from "react";
import { NoiseConfig } from "@/types/noise";
import { throttle } from "lodash";

export const useDecibelMeter = (
  config: Pick<NoiseConfig, "minDecibels" | "maxDecibels" | "samplingInterval">
) => {
  const [currentReading, setCurrentReading] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [calibrationOffset, setCalibrationOffset] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Throttled decibel calculation to prevent excessive updates
  const calculateDecibels = useCallback(
    throttle(() => {
      if (!isRecording || !analyserRef.current) return null;

      try {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate RMS value
        const rms = Math.sqrt(
          dataArray.reduce((sum, val) => sum + val * val, 0) / dataArray.length
        );

        // Convert to decibels with calibration
        const uncalibratedDb = 20 * Math.log10(rms + 1) + calibrationOffset;
        const db = Math.max(
          config.minDecibels,
          Math.min(config.maxDecibels, uncalibratedDb)
        );

        return Math.round(db);
      } catch (err) {
        console.error("Error calculating decibels:", err);
        return null;
      }
    }, config.samplingInterval),
    [isRecording, calibrationOffset, config]
  );

  const captureAudio = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Audio API not supported");
      }

      // Request audio with specific constraints for better quality
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      audioContextRef.current = new AudioContext({
        latencyHint: "interactive",
        sampleRate: 48000,
      });

      sourceRef.current = audioContextRef.current.createMediaStreamSource(
        streamRef.current
      );
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048; // precise frequency analysis
      analyserRef.current.smoothingTimeConstant = 0.2;

      sourceRef.current.connect(analyserRef.current);
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to initialize audio"
      );
      throw err;
    }
  };

  const stopRecording = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsRecording(false);
  }, []);

  const calibrate = useCallback(async () => {
    if (!isRecording) return;

    // Take 100 samples in a quiet environment
    const samples: number[] = [];
    for (let i = 0; i < 100; i++) {
      const reading = await calculateDecibels();
      if (reading !== null) samples.push(reading);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Calculate offset from expected ambient noise level
    const avgReading = samples.reduce((a, b) => a + b, 0) / samples.length;
    const expectedAmbient = 35; // typical quiet room
    setCalibrationOffset(expectedAmbient - avgReading);
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
    captureAudio,
    stopRecording,
    calculateDecibels,
    calibrate,
  };
};
