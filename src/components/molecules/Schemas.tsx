"use client";
import React, { useState } from "react";
import { ExternalLink, GitBranch, Search } from "lucide-react";
import { Card, CardHeader, CardContent, Button } from "../atoms";

const Schemas = ({ handleDeployWorkflow }: { handleDeployWorkflow: any }) => {
  const [gatewayUrl, setGatewayUrl] = useState(
    "https://default-gateway.medusa.network"
  );

  // Available schemas
  const availableSchemas = [
    {
      id: "temp-humid-basic",
      name: "Temperature & Humidity Monitor",
      description: "Basic sensor data collection and analysis workflow",
      agents: {
        collection: { type: "StandardSensorCollection" },
        broadcast: { type: "LighthouseStorage" },
        response: { type: "TemperatureAnalysis" },
      },
      deployedWorkflows: 12,
    },
  ];

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
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </h3>
              <p className="text-sm text-gray-500">{schema.description}</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 relative">
              <div className="flex items-center gap-2 text-sm">
                <GitBranch className="h-4 w-4 text-[#E6B24B]" />
                <span className="text-gray-600">
                  {schema.deployedWorkflows} active workflows
                </span>
              </div>
              <div className="p-3 bg-gray-50/50 rounded-lg space-y-2">
                <div className="text-xs text-gray-500">
                  Agent Configuration:
                </div>
                <div className="text-sm space-y-1">
                  <div>🔍 Collection: {schema.agents.collection.type}</div>
                  <div>📡 Broadcast: {schema.agents.broadcast.type}</div>
                  <div>📊 Response: {schema.agents.response.type}</div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full hover:bg-[#E6B24B]/10"
                onClick={handleDeployWorkflow}
                style={
                  {
                    // zIndex: 9999999,
                  }
                }
                // disabled={!createWorkflow.isPending}
              >
                Deploy Using Schema
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
};

export default Schemas;
