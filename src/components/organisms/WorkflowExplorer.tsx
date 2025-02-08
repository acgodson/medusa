"use client";
import React, { useEffect, useState } from "react";
import { Plus, Grid, List } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/atoms/tabs";
import { Button } from "@/components/atoms/button";
import ExplorerSearch from "../molecules/ExplorerSearch";
import { useAuthenticatedAction } from "@/hooks/useAuth";
import { JoinWorkflowDialog } from "../molecules/joinWorkflowDialog";
import ExplorerSkeleton from "../molecules/ExplorerSkeleton";
import Schemas from "../molecules/Schemas";
import Workflows from "../molecules/Workflows";
import { useWorkflow } from "@/hooks/useWorkflow";

const WorkflowExplorer = () => {
  const { withAuth } = useAuthenticatedAction();
  const [viewMode, setViewMode] = useState("grid");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<number>(0);

  const {
    fetchedWorkflows,
    isLoading,
    handleSubmit,
    isPending,
    createWorkflow,
  } = useWorkflow();

  const handleDeployWorkflow = () => {
    withAuth(handleSubmit);
  };

  const handleJoinWorkflow = (workflowId: number) => {
    setSelectedWorkflow(workflowId);
    setIsOpen(true);
  };

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
              {isLoading ? (
                <ExplorerSkeleton />
              ) : (
                fetchedWorkflows &&
                fetchedWorkflows.length > 0 &&
                fetchedWorkflows.map((workflow: any, i: number) => (
                  <Workflows
                    key={i}
                    workflow={workflow}
                    handleJoinWorkflow={handleJoinWorkflow}
                    isPending={createWorkflow.isPending}
                  />
                ))
              )}
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
              <Schemas handleDeployWorkflow={handleDeployWorkflow} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <JoinWorkflowDialog
        workflowId={selectedWorkflow}
        workflowTitle={""}
        open={isOpen}
        onClose={() => setIsOpen(!isOpen)}
      />
    </div>
  );
};

export default WorkflowExplorer;
