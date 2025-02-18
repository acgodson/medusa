export interface NoiseConfig {
  minDecibels: number; // Minimum dB to record (e.g., 30dB)
  maxDecibels: number; // Maximum dB to consider valid (e.g., 140dB)
  spikeThreshold: number; // dB change to consider as spike
  minDistance: number; // Meters between measurements
  maxSamplesPerPoint: number; // Max samples before forced update
  samplingInterval: number; // MS between measurements
  batteryOptimization: boolean; // Enable battery saving features
  processSample?: (buffer: Float32Array) => number;
}

export interface LocationPoint {
  lat: number;
  lng: number;
  noise: number;
  timestamp: number;
  accuracy: number;
  samples: number;
  minNoise: number;
  maxNoise: number;
  spikes: number;
}

export interface GeolocationCoordinate {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
}

export interface StoredData {
  timestamp: number;
  locationData: LocationPoint[];
}
