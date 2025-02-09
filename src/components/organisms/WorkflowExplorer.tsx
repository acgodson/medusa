"use client";
import React, { useState } from "react";
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
    if (selectedWorkflow === workflowId) {
      setIsOpen(true);
    }
  };

  const selectedWorkflowData = fetchedWorkflows?.find(
    (w: any) => w.id === selectedWorkflow
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
        {/* Enhanced Search Section */}
        <div className="flex items-center justify-center w-full">
          <div className="max-w-[600px] w-full relative">
            <div className="absolute inset-0 bg-white/40 backdrop-blur-xl rounded-xl shadow-lg"></div>
            <ExplorerSearch />
          </div>
        </div>

        {/* Enhanced Main Content Area */}
        <div className="relative">
          {/* Layered Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-2xl rounded-2xl"></div>
          <div className="absolute inset-0 bg-[#E6B24B]/5 mix-blend-overlay rounded-2xl"></div>
          <div className="absolute inset-0 border border-white/60 rounded-2xl shadow-xl"></div>

          {/* Content */}
          <div className="relative p-8">
            <Tabs defaultValue="workflows" className="w-full">
              <div className="flex justify-between items-center mb-8">
                <TabsList className="bg-white/80 backdrop-blur-md border border-white/60 shadow-md p-1 rounded-xl">
                  <TabsTrigger
                    value="workflows"
                    className="px-6 py-2 data-[state=active]:bg-[#E6B24B] data-[state=active]:text-white
                               data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                  >
                    Explore Workflows
                  </TabsTrigger>
                  <TabsTrigger
                    value="schemas"
                    className="px-6 py-2 data-[state=active]:bg-[#E6B24B] data-[state=active]:text-white
                               data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                  >
                    Available Schemas
                  </TabsTrigger>
                </TabsList>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setViewMode(viewMode === "grid" ? "list" : "grid")
                    }
                    className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-md 
                             hover:bg-white/90 px-4 py-2 rounded-lg transition-all duration-200"
                  >
                    {viewMode === "grid" ? (
                      <Grid className="h-4 w-4 text-gray-600" />
                    ) : (
                      <List className="h-4 w-4 text-gray-600" />
                    )}
                  </Button>
                  <Button
                    onClick={handleDeployWorkflow}
                    className="bg-gradient-to-r from-[#E6B24B] to-[#B88A2D] text-white shadow-lg 
                             hover:shadow-xl hover:opacity-90 px-6 py-2 rounded-lg transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Deploy Workflow
                  </Button>
                </div>
              </div>

              <TabsContent value="workflows" className="mt-8">
                <div
                  className={`grid ${
                    viewMode === "grid"
                      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-1"
                  } gap-6`}
                >
                  {isLoading ? (
                    <ExplorerSkeleton />
                  ) : (
                    fetchedWorkflows &&
                    fetchedWorkflows.length > 0 &&
                    fetchedWorkflows.map((workflow: any, i: number) => (
                      // <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Workflows
                          key={i}
                          workflow={workflow}
                          handleJoinWorkflow={handleJoinWorkflow}
                          isPending={createWorkflow.isPending}
                          isListView={viewMode !== "grid"}
                        />
                      // </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="schemas" className="mt-8">
                <div
                  className={`grid ${
                    viewMode === "grid"
                      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-1"
                  } gap-6`}
                >
                  <Schemas handleDeployWorkflow={handleDeployWorkflow} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <JoinWorkflowDialog
        workflowId={selectedWorkflow}
        workflowTitle={selectedWorkflowData?.name || ""}
        open={isOpen}
        onClose={() => setIsOpen(!isOpen)}
      />
    </div>
  );
};

export default WorkflowExplorer;
