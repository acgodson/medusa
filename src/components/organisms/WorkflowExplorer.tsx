"use client";
import React, { useState } from "react";
import {
  Search,
  Plus,
  Grid,
  List,
  ExternalLink,
  GitBranch,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/atoms";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/atoms/tabs";
import { Input } from "@/components/atoms/input";
import { Button } from "@/components/atoms/button";
import ExplorerHeader from "../molecules/ExplorerHeader";

const WorkflowExplorer = () => {
  const [gatewayUrl, setGatewayUrl] = useState(
    "https://default-gateway.medusa.network"
  );
  const [viewMode, setViewMode] = useState("grid");

  // Sample workflow schemas
  const sampleSchemas = [
    {
      id: "temp-humid-basic",
      name: "Temperature & Humidity Monitor",
      description: "Basic sensor data collection and analysis workflow",
      workflow: {
        collection: "Standard Sensor Collection",
        broadcast: "Lighthouse Storage",
        response: "Temperature Analysis",
      },
      activeInstances: 12,
    },
    {
      id: "advanced-sensor",
      name: "Multi-Sensor Array",
      description: "Advanced sensor array with real-time analysis",
      workflow: {
        collection: "Multi-Point Collection",
        broadcast: "Distributed Storage",
        response: "Real-time Analytics",
      },
      activeInstances: 8,
    },
  ];

  return (
    <>
      <ExplorerHeader />

      {/* Main Content */}
      <Tabs defaultValue="explore" className="w-full">
        <div className="flex justify-between items-center mb-6">
          <TabsList className="bg-white/50 backdrop-blur-sm border border-white/20">
            <TabsTrigger value="explore">Explore Schema</TabsTrigger>
            <TabsTrigger value="my-workflows">My Workflows</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
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
              Create Workflow
            </Button>
          </div>
        </div>

        <TabsContent value="explore" className="mt-6">
          <div
            className={`grid ${
              viewMode === "grid"
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1"
            } gap-4`}
          >
            {sampleSchemas.map((schema) => (
              <Card
                key={schema.id}
                className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border border-white/50 hover:border-[#E6B24B]/50 transition-all duration-300"
              >
                {/* Glossy highlight effect */}
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
                        {schema.activeInstances} active instances
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50/50 rounded-lg space-y-2">
                      <div className="text-xs text-gray-500">
                        Workflow Components:
                      </div>
                      <div className="text-sm space-y-1">
                        <div>🔍 Collection: {schema.workflow.collection}</div>
                        <div>📡 Broadcast: {schema.workflow.broadcast}</div>
                        <div>📊 Response: {schema.workflow.response}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="my-workflows">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-600">
              No workflows configured
            </h3>
            <p className="text-gray-400 mt-2">
              Create your first workflow schema to get started
            </p>
            <Button className="mt-4 bg-gradient-to-r from-[#E6B24B] to-[#B88A2D] text-white hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default WorkflowExplorer;
