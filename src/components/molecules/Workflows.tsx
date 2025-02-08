"use client";
import React, { useState } from "react";
import { ExternalLink, GitBranch, Search, Users, Workflow } from "lucide-react";
import { Card, CardHeader, CardContent, Button, Spinner } from "../atoms";

const Workflows = ({
  workflow,
  handleJoinWorkflow,
  isPending,
}: {
  workflow: any;
  handleJoinWorkflow: any;
  isPending: boolean;
}) => {
  const [gatewayUrl, setGatewayUrl] = useState(
    "https://default-gateway.medusa.network"
  );

  return (
    <>
      <Card
        key={workflow.id}
        className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border border-[#E6B24B]/50  hover:border-[#E6B24B]/80 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              {workflow.name}
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </h3>
            <p className="text-sm text-gray-500">{workflow.description}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 relative">
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
              onClick={() => handleJoinWorkflow(workflow.id)}
              style={{}}
            >
              {isPending ? <Spinner /> : "Join Workflow"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default Workflows;
