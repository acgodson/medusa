import { Stats } from "../../../types";

// Utility Functions
export class StatsCalculator {
  static calculate(values: number[]): Stats {
    if (values.length === 0) {
      throw new Error("Cannot calculate stats for empty dataset");
    }
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      average: sum / values.length,
      variance:
        values.reduce(
          (acc, val) => acc + Math.pow(val - sum / values.length, 2),
          0
        ) / values.length,
    };
  }

  static calculateConfidence(dataPoints: number): number {
    const baseConfidence = 0.7;
    const dataConfidence = Math.min(dataPoints / 100, 0.2);
    return Math.min(baseConfidence + dataConfidence, 0.95);
  }
}
