import { SensorData, Stats } from "../../../types";

export class MessageBuilder {
  static createPolicyAnalysisMessage(
    latestData: SensorData,
    historicalData: SensorData[],
    tempStats: Stats,
    humidityStats: Stats,
    guidelines: string[]
  ) {
    return [
      {
        role: "system",
        content:
          "You are an intelligent sensor analysis system that provides detailed insights and policy recommendations based on environmental data.",
      },
      {
        role: "user",
        content: `Analyze this sensor data and provide policy recommendations:
            Current Reading: Temperature ${
              latestData.temperature
            }°C, Humidity ${latestData.humidity}%
            Historical Context: ${JSON.stringify(historicalData.slice(0, 5))}
            Statistical Summary: 
            - Temperature: Range ${tempStats.min}°C to ${
          tempStats.max
        }°C, Avg ${tempStats.average.toFixed(1)}°C
            - Humidity: Range ${humidityStats.min}% to ${
          humidityStats.max
        }%, Avg ${humidityStats.average.toFixed(1)}%
            Guidelines: ${guidelines.join(", ")}
            
            Provide a detailed analysis including:
            1. Usage policy (Processed/Analyzed/Monetized)
            2. Retention period and justification
            3. Key insights from the data
            4. Recommendations for action`,
      },
    ];
  }

  static createConditionsAnalysisMessage(
    latestData: SensorData,
    historicalData: SensorData[],
    alertCriteria: string[]
  ) {
    return [
      {
        role: "system",
        content:
          "You are an intelligent condition monitoring system that analyzes sensor data for anomalies and provides actionable insights.",
      },
      {
        role: "user",
        content: `Analyze these sensor readings for conditions and anomalies:
            Current Reading: Temperature ${
              latestData.temperature
            }°C, Humidity ${latestData.humidity}%
            Historical Context: ${JSON.stringify(historicalData.slice(0, 5))}
            Alert Criteria: ${alertCriteria.join(", ")}
            
            Provide a detailed analysis including:
            1. Any alerts or anomalies that need attention
            2. For temperature:
               - Current status (normal/warning/critical)
               - Trend (stable/increasing/decreasing)
               - Brief explanation
            3. For humidity:
               - Current status (normal/warning/critical)
               - Trend (stable/increasing/decreasing)
               - Brief explanation
            4. Suggested actions to maintain or improve conditions`,
      },
    ];
  }
}
