"use client";
import React, { useState } from "react";
import { ExternalLink, GitBranch, Search } from "lucide-react";
import { Card, CardHeader, CardContent, Button, Spinner } from "../atoms";

const Schemas = ({
  handleDeployWorkflow,
  isPending,
}: {
  handleDeployWorkflow: any;
  isPending: boolean;
}) => {
  // Default schemas
  const availableSchemas = [
    {
      id: "temp-humid-basic",
      name: "Temperature & Humidity Monitor",
      description: "Basic sensor data collection and analysis workflow",
      agents: {
        collection: { type: "StandardSensorCollection" },
        broadcast: { type: "Greenfield" },
        response: { type: "TemperatureAnalysis" },
      },
      deployedWorkflows: 1,
    },
    {
      id: "m-schema-002",
      name: "Sonic Environment Recorder",
      description: "Urban soundscape collection with geolocation tagging",
      agents: {
        calibration: { type: "AcousticCalibrationTool" },
        collection: { type: "GeotaggedAudioCollection" },
        broadcast: { type: "GreenFieldBSCConnector" },
        response: { type: "NoisePatternReporting" },
      },
      deployedWorkflows: 2,
    },
  ];

  // Helper function to render agent icons based on type
  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case "calibration":
        return "🔧";
      case "collection":
        return "🔍";
      case "storage":
        return "💾";
      case "broadcast":
        return "📡";
      case "response":
        return "📊";
      default:
        return "⚙️";
    }
  };

  return (
    <>
      {availableSchemas.map((schema) => (
        <Card
          key={schema.id}
          className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border border-white/50 hover:border-[#E6B24B]/50 transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                {schema.name}
                {/* <ExternalLink className="h-4 w-4 text-gray-400" /> */}
              </h3>
              <p className="text-sm text-gray-500">{schema.description}</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 relative">
              <div className="flex items-center gap-2 text-sm">
                <GitBranch className="h-4 w-4 text-[#E6B24B]" />
                <span className="text-gray-600">
                  {schema.deployedWorkflows} workflows
                </span>
              </div>
              <div className="p-3 bg-gray-50/50 rounded-lg space-y-2">
                <div className="text-xs text-gray-500">
                  Agent Configuration:
                </div>
                <div className="text-sm space-y-1">
                  {/* Dynamically render all agents in the schema */}
                  {Object.entries(schema.agents).map(([agentKey, agent]) => (
                    <div key={agentKey} className="flex items-start">
                      <span className="w-5">{getAgentIcon(agentKey)}</span>
                      <span className="capitalize">{agentKey}:</span>
                      <span className="ml-1 text-gray-700">{agent.type}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full hover:bg-[#E6B24B]/10"
                // onClick={() => handleDeployWorkflow(schema.id)}
                disabled={true}
              >
                {isPending ? <Spinner /> : "Deploy Using Schema"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
};

export default Schemas;
