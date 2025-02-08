"use client";
import React, { useState } from "react";
import { Plus, Grid, List, ExternalLink, GitBranch, Users } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/atoms";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/atoms/tabs";
import { Input } from "@/components/atoms/input";
import { Button } from "@/components/atoms/button";
import ExplorerSearch from "../molecules/ExplorerSearch";

const WorkflowExplorer = () => {
  const [gatewayUrl, setGatewayUrl] = useState(
    "https://default-gateway.medusa.network"
  );
  const [viewMode, setViewMode] = useState("grid");

  // Sample active workflows
  const sampleWorkflows = [
    {
      id: "weather-mon-001",
      name: "Global Weather Monitoring",
      description: "Collaborative weather data collection network",
      schema: "temp-humid-basic",
      contributors: 15,
      totalExecutions: 1205,
      creator: "0x742...3ab4",
    },
    {
      id: "city-sens-002",
      name: "City Sensor Network",
      description: "Urban environment monitoring system",
      schema: "temp-humid-basic",
      contributors: 8,
      totalExecutions: 892,
      creator: "0x123...4567",
    },
  ];

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
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-center w-full">
        <div className="max-w-[600px] w-full">
          <ExplorerSearch />
        </div>
      </div>

      <div className="relative backdrop-blur-xl bg-white/30 rounded-2xl p-6 shadow-lg border border-white/50">
        {/* Main Content */}
        <Tabs defaultValue="workflows" className="w-full">
          <div className="flex justify-between items-center mb-6">
            <TabsList className="bg-white/50 backdrop-blur-sm border border-white/20">
              <TabsTrigger value="workflows">Explore Workflows</TabsTrigger>
              <TabsTrigger value="schemas">Available Schemas</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "list" : "grid")
                }
                className="bg-white/50 backdrop-blur-sm hover:bg-white/70"
              >
                {viewMode === "grid" ? (
                  <Grid className="h-4 w-4" />
                ) : (
                  <List className="h-4 w-4" />
                )}
              </Button>
              <Button className="bg-gradient-to-r from-[#E6B24B] to-[#B88A2D] text-white hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Deploy Workflow
              </Button>
            </div>
          </div>

          <TabsContent value="workflows" className="mt-6">
            <div
              className={`grid ${
                viewMode === "grid"
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1"
              } gap-4`}
            >
              {sampleWorkflows.map((workflow) => (
                <Card
                  key={workflow.id}
                  className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border border-white/50 hover:border-[#E6B24B]/50 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        {workflow.name}
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </h3>
                      <p className="text-sm text-gray-500">
                        {workflow.description}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-[#E6B24B]" />
                          <span>{workflow.contributors} contributors</span>
                        </div>
                        <div className="text-gray-500">
                          {workflow.totalExecutions} executions
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50/50 rounded-lg space-y-2">
                        <div className="text-xs text-gray-500">Details:</div>
                        <div className="text-sm space-y-1">
                          <div>Schema: {workflow.schema}</div>
                          <div>Creator: {workflow.creator}</div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full hover:bg-[#E6B24B]/10"
                      >
                        Join Workflow
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="schemas" className="mt-6">
            <div
              className={`grid ${
                viewMode === "grid"
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1"
              } gap-4`}
            >
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
                      <p className="text-sm text-gray-500">
                        {schema.description}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
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
                          <div>
                            🔍 Collection: {schema.agents.collection.type}
                          </div>
                          <div>
                            📡 Broadcast: {schema.agents.broadcast.type}
                          </div>
                          <div>📊 Response: {schema.agents.response.type}</div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full hover:bg-[#E6B24B]/10"
                      >
                        Deploy Using Schema
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WorkflowExplorer;
