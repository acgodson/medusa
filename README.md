# Medusa Bridge

Orchestration layer for multi-head dePIN AI agents and Web3 infrastructure.

![sample](public/result.png)

## Core Architecture

### AI Agents ("Heads")

- **CollectionAgent**: Data collection and signing
- **BroadcastingAgent**: IPNS/storage and state broadcasting
- **ResponseAgent**: Data analysis and policy determination

### Infrastructure

- Covalent Zee Agentkit: Agent orchestration
- Privy Server: Autonomous signing
- Lighthouse: IPFS/IPNS storage
- Base Sepolia: Smart contract operations
- GPT-4: Agent intelligence
- CDP: Client bundling and RPC

## Key Features

- Autonomous agent signing via Privy
- Multi-head architecture for specialized tasks
- Integrated IPFS/IPNS data management
- Smart contract state synchronization
- Policy-driven data analysis

## Workflow

```
Collection → Broadcasting → Response
- Collection: Sign & store sensor data
- Broadcasting: Update IPNS & contract state
- Response: Analyze data & determine policies
```

### Workflow State Schema

```json
{
  "agent": "collector",
  "status": "finished",
  "children": [
    {
      "agent": "collector",
      "status": "finished",
      "messages": [
        {
          "role": "function",
          "name": "data_collection"
        }
      ],
      "children": []
    },
    {
      "agent": "broadcaster",
      "status": "finished",
      "messages": [
        {
          "role": "function",
          "name": "data_broadcast"
        }
      ],
      "children": []
    },
    {
      "agent": "analyzer",
      "status": "finished"
    }
  ]
}
```

### Sample Request

```http
POST http://localhost:3000/api/trpc/executeWorkflow
{
  "workflowId": 2,
  "deviceId": "f6z96du37smadruugt90dge5",
  "data": {
    "temperature": 25.5,
    "humidity": 60,
    "timestamp": 8394434221134
  }
}
```

Response:

```json
{
  "result": {
    "data": {
      "success": true,
      "result": {
        "success": true,
        "workflow": {
          "collection": {
            "success": true,
            "signature": "0xe46fef6b260aa38c64b8bbfe0a674a256e22e39a0a782e32a23377351702cbda57e48188b19fd609b794df4e1177e9ac6b9941608383f786fdd5b546487687841c",
            "storageResult": {
              "success": true,
              "data": {
                "temperature": 25.5,
                "humidity": 60,
                "timestamp": 8394434221134
              },
              "cid": "bafkreigigu4kd3zfxpxcl5r2jpwulp5sxh5fs6ppmmwzqsgjhrgbpbhi3y",
              "ipnsName": "48800970781f4c51b98e36f485674e44",
              "ipnsId": "k51qzi5uqu5dj25q6clom1uijcnuk9z5gvkazmsmhzlr08m6ae02dnwfhedixr"
            }
          },
          "broadcast": {
            "success": true,
            "ipnsGatewayUrl": "https://gateway.lighthouse.storage/ipns/k51qzi5uqu5dj25q6clom1uijcnuk9z5gvkazmsmhzlr08m6ae02dnwfhedixr",
            "transactionHash": {
              "success": true,
              "transactionHash": "0xafce76abc49137bd640147303e926d54a354f530270a0d663dc49f2d1ac7d0bc"
            }
          },
          "analysis": {
            "success": true,
            "inference": {
              "deviceId": "f6z96du37smadruugt90dge5",
              "timestamp": 1739145566047,
              "analysis": {
                "policy": {
                  "operation": "inferPolicy",
                  "analysis": {
                    "usagePolicy": "Analyzed",
                    "retention": {
                      "duration": 30,
                      "reason": "Data provides consistent monitoring of environmental conditions and can help in future trend analysis."
                    },
                    "insights": [
                      "The temperature and humidity readings have remained stable at 25.5°C and 60% respectively, indicating a consistent environmental condition.",
                      "No anomalies detected in sensor readings, suggesting good data quality and reliability."
                    ],
                    "recommendations": [
                      "Continue monitoring environmental conditions to detect any future fluctuations or trends.",
                      "Regularly calibrate sensors to ensure sustained accuracy over time.",
                      "Consider expanding data collection to include additional parameters (e.g., air quality) for more comprehensive environmental insights."
                    ]
                  },
                  "statistics": {
                    "temperature": {
                      "min": 25.5,
                      "max": 25.5,
                      "average": 25.5,
                      "variance": 0
                    },
                    "humidity": {
                      "min": 60,
                      "max": 60,
                      "average": 60,
                      "variance": 0
                    }
                  },
                  "confidence": 0.8999999999999999,
                  "processingTimestamp": "2025-02-09T23:59:12.285Z"
                },
                "conditions": {
                  "operation": "checkConditions",
                  "conditions": {
                    "alerts": [],
                    "temperatureStatus": "normal",
                    "temperatureTrend": "stable",
                    "temperatureExplanation": "The current temperature is stable at 25.5°C, consistent with historical readings.",
                    "humidityStatus": "normal",
                    "humidityTrend": "stable",
                    "humidityExplanation": "The current humidity level is stable at 60%, which is also consistent with historical data.",
                    "suggestedActions": [
                      "Continue monitoring temperature and humidity levels.",
                      "Ensure that the sensor equipment is functioning properly and calibrated.",
                      "Maintain current environmental controls as conditions are within normal limits."
                    ]
                  },
                  "statistics": {
                    "temperature": {
                      "min": 25.5,
                      "max": 25.5,
                      "average": 25.5,
                      "variance": 0
                    },
                    "humidity": {
                      "min": 60,
                      "max": 60,
                      "average": 60,
                      "variance": 0
                    }
                  },
                  "analysisTimestamp": "2025-02-09T23:59:26.046Z"
                },
                "metadata": {
                  "analysisTime": "2025-02-09T23:59:26.047Z",
                  "dataSource": "https://gateway.lighthouse.storage/ipns/k51qzi5uqu5dj25q6clom1uijcnuk9z5gvkazmsmhzlr08m6ae02dnwfhedixr",
                  "latestReading": {
                    "temperature": 25.5,
                    "humidity": 60,
                    "timestamp": 8394434221134
                  }
                }
              },
              "storageRef": {
                "cid": "bafkreigigu4kd3zfxpxcl5r2jpwulp5sxh5fs6ppmmwzqsgjhrgbpbhi3y",
                "ipnsId": "k51qzi5uqu5dj25q6clom1uijcnuk9z5gvkazmsmhzlr08m6ae02dnwfhedixr"
              }
            }
          }
        }
      }
    }
  }
}
```


