# Medusa Bridge

Orchestration layer connecting multi-head dePIN AI agent and tools

## AI agents ("heads"):

- CollectionAgent: Handles data collection and signing
- BroadcastingAgent: Manages IPNS/storage and state broadcasting
- ResponseAgent: Analyzes data and determines policies

## Tools:

- Built on Covalent's Zee Agentkit for agent logic
- Uses Privy Server wallet for autonomous signing
- Lighthouse for IPFS/IPNS storage
- Base Sepolia for smart contract interactions
- OpenAI's GPT-4 models for agent intelligence
- CDP For Client Bundler and RPC

## Zee WorkFlow:

```
Collection -> Broadcasting -> Response
- Collection: Signs & stores sensor data
- Broadcasting: Updates IPNS & contract state
- Response: Analyzes data & determines policies
```

## Unique Features:

- Autonomous agent signing via Privy
- Multi-head architecture for specialized tasks
- Integrated IPFS/IPNS data management
- Smart contract integration for state management
- Policy-based data analysis

### Example

Raw Request
`POST http://localhost:3000/api/trpc/executeWorkflow
{
  "workflowId": 2,
  "deviceId": "f6z96du37smadruugt90dge5",
  "data": {
    "temperature": 25.5,
    "humidity": 60,
    "timestamp": 8394434221134
  }
}`
Raw Response

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
          },
          "workflowState": {
            "agent": "collector",
            "messages": [
              {
                "role": "function",
                "name": "workflow_init",
                "content": "{\"deviceId\":\"f6z96du37smadruugt90dge5\",\"workflowId\":2,\"contractAddress\":\"0x07D60F1Cf13b4b1E32AA4eB97352CC1037286361\",\"data\":{\"temperature\":25.5,\"humidity\":60,\"timestamp\":8394434221134}}"
              }
            ],
            "status": "finished",
            "children": [
              {
                "agent": "collector",
                "status": "finished",
                "messages": [
                  {
                    "role": "function",
                    "name": "data_collection",
                    "content": "{\"success\":true,\"signature\":\"0xe46fef6b260aa38c64b8bbfe0a674a256e22e39a0a782e32a23377351702cbda57e48188b19fd609b794df4e1177e9ac6b9941608383f786fdd5b546487687841c\",\"storageResult\":{\"success\":true,\"data\":{\"temperature\":25.5,\"humidity\":60,\"timestamp\":8394434221134},\"cid\":\"bafkreigigu4kd3zfxpxcl5r2jpwulp5sxh5fs6ppmmwzqsgjhrgbpbhi3y\",\"ipnsName\":\"48800970781f4c51b98e36f485674e44\",\"ipnsId\":\"k51qzi5uqu5dj25q6clom1uijcnuk9z5gvkazmsmhzlr08m6ae02dnwfhedixr\"}}"
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
                    "name": "data_broadcast",
                    "content": "{\"success\":true,\"ipnsGatewayUrl\":\"https://gateway.lighthouse.storage/ipns/k51qzi5uqu5dj25q6clom1uijcnuk9z5gvkazmsmhzlr08m6ae02dnwfhedixr\",\"transactionHash\":{\"success\":true,\"transactionHash\":\"0xafce76abc49137bd640147303e926d54a354f530270a0d663dc49f2d1ac7d0bc\"}}"
                  }
                ],
                "children": []
              },
              {
                "agent": "analyzer",
                "status": "finished",
                "messages": [
                  {
                    "role": "function",
                    "name": "data_analysis",
                    "content": "{\"success\":true,\"inference\":{\"deviceId\":\"f6z96du37smadruugt90dge5\",\"timestamp\":1739145566047,\"analysis\":{\"policy\":{\"operation\":\"inferPolicy\",\"analysis\":{\"usagePolicy\":\"Analyzed\",\"retention\":{\"duration\":30,\"reason\":\"Data provides consistent monitoring of environmental conditions and can help in future trend analysis.\"},\"insights\":[\"The temperature and humidity readings have remained stable at 25.5°C and 60% respectively, indicating a consistent environmental condition.\",\"No anomalies detected in sensor readings, suggesting good data quality and reliability.\"],\"recommendations\":[\"Continue monitoring environmental conditions to detect any future fluctuations or trends.\",\"Regularly calibrate sensors to ensure sustained accuracy over time.\",\"Consider expanding data collection to include additional parameters (e.g., air quality) for more comprehensive environmental insights.\"]},\"statistics\":{\"temperature\":{\"min\":25.5,\"max\":25.5,\"average\":25.5,\"variance\":0},\"humidity\":{\"min\":60,\"max\":60,\"average\":60,\"variance\":0}},\"confidence\":0.8999999999999999,\"processingTimestamp\":\"2025-02-09T23:59:12.285Z\"},\"conditions\":{\"operation\":\"checkConditions\",\"conditions\":{\"alerts\":[],\"temperatureStatus\":\"normal\",\"temperatureTrend\":\"stable\",\"temperatureExplanation\":\"The current temperature is stable at 25.5°C, consistent with historical readings.\",\"humidityStatus\":\"normal\",\"humidityTrend\":\"stable\",\"humidityExplanation\":\"The current humidity level is stable at 60%, which is also consistent with historical data.\",\"suggestedActions\":[\"Continue monitoring temperature and humidity levels.\",\"Ensure that the sensor equipment is functioning properly and calibrated.\",\"Maintain current environmental controls as conditions are within normal limits.\"]},\"statistics\":{\"temperature\":{\"min\":25.5,\"max\":25.5,\"average\":25.5,\"variance\":0},\"humidity\":{\"min\":60,\"max\":60,\"average\":60,\"variance\":0}},\"analysisTimestamp\":\"2025-02-09T23:59:26.046Z\"},\"metadata\":{\"analysisTime\":\"2025-02-09T23:59:26.047Z\",\"dataSource\":\"https://gateway.lighthouse.storage/ipns/k51qzi5uqu5dj25q6clom1uijcnuk9z5gvkazmsmhzlr08m6ae02dnwfhedixr\",\"latestReading\":{\"temperature\":25.5,\"humidity\":60,\"timestamp\":8394434221134}}},\"storageRef\":{\"cid\":\"bafkreigigu4kd3zfxpxcl5r2jpwulp5sxh5fs6ppmmwzqsgjhrgbpbhi3y\",\"ipnsId\":\"k51qzi5uqu5dj25q6clom1uijcnuk9z5gvkazmsmhzlr08m6ae02dnwfhedixr\"}}}"
                  }
                ],
                "children": []
              }
            ]
          }
        }
      }
    }
  }
}
```
