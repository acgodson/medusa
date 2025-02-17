import { useState, useRef, useCallback, useEffect } from "react";
import { NoiseConfig } from "@/types/noise";
import { throttle } from "lodash";

export const useDecibelMeter = (
  config: Pick<NoiseConfig, "minDecibels" | "maxDecibels" | "samplingInterval">
) => {
  const [currentReading, setCurrentReading] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Standard reference pressure for dB SPL (20 micropascals)
  const REFERENCE_PRESSURE = 0.00002;

  // Mobile microphone sensitivity (typical smartphone mic)
  const MIC_SENSITIVITY_DB = -35; // Mobile mics are generally more sensitive
  const MIC_SENSITIVITY = Math.pow(10, MIC_SENSITIVITY_DB / 20);

  // Calibration offset to align with typical environmental levels
  const CALIBRATION_OFFSET = -60; // Adjust this based on testing

  const calculateDecibels = useCallback(() => {
    if (!isRecording || !analyserRef.current) return null;

    try {
      const dataArray = new Float32Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getFloatTimeDomainData(dataArray);

      // Calculate RMS of the time-domain signal
      let rmsSum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        rmsSum += dataArray[i] * dataArray[i];
      }

      const rms = Math.sqrt(rmsSum / dataArray.length);

      // Convert to pressure using mic sensitivity
      const pressure = rms / MIC_SENSITIVITY;

      // Calculate dB SPL with calibration offset
      let db =
        20 * Math.log10(pressure / REFERENCE_PRESSURE) + CALIBRATION_OFFSET;

      // Add basic A-weighting approximation
      db += 2.0;

      // Constrain to min/max range
      return Math.max(config.minDecibels, Math.min(config.maxDecibels, db));
    } catch (err) {
      console.error("Error calculating decibels:", err);
      return null;
    }
  }, [isRecording, config.minDecibels, config.maxDecibels]);

  const updateReading = useCallback(
    throttle(() => {
      const db = calculateDecibels();
      if (db !== null) {
        setCurrentReading(Math.round(db));
      }
    }, config.samplingInterval),
    [calculateDecibels, config.samplingInterval]
  );

  const setupAudioGraph = (context: AudioContext, stream: MediaStream) => {
    // Create and configure analyzer
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024; // Good balance between precision and performance
    analyser.smoothingTimeConstant = 0.125; // Balanced response time

    // Create gain node for potential calibration adjustments
    const gainNode = context.createGain();
    gainNode.gain.value = 1.0;

    // Create source from stream
    const source = context.createMediaStreamSource(stream);

    // Connect the audio graph
    source.connect(gainNode);
    gainNode.connect(analyser);

    return { analyser, gainNode, source };
  };

  const captureAudio = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Audio API not supported");
      }

      // Request audio input with optimal settings
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 48000,
        },
      });

      // Create audio context with optimal settings
      audioContextRef.current = new AudioContext({
        latencyHint: "interactive",
        sampleRate: 48000,
      });

      // Setup audio processing graph
      const { analyser, gainNode, source } = setupAudioGraph(
        audioContextRef.current,
        streamRef.current
      );

      // Store refs
      analyserRef.current = analyser;
      gainNodeRef.current = gainNode;
      sourceRef.current = source;

      setIsRecording(true);
      setError(null);

      // Start measurements
      const measurementInterval = setInterval(
        updateReading,
        config.samplingInterval
      );

      return () => clearInterval(measurementInterval);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to initialize audio";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const stopRecording = useCallback(() => {
    // Stop and cleanup media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Disconnect and cleanup audio nodes
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }

    setIsRecording(false);
    setCurrentReading(0);
  }, []);

  // Cleanup on unmount
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
  };
};
