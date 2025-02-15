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

  const selectedWorkflowData = fetchedWorkflows?.find(
    (w: any) => w.id === selectedWorkflow
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto p-3 md:p-6 space-y-4 md:space-y-8">
        <div className="relative">
          {/* Layered Background */}
          <div className="absolute inset-0 bg-gradient-to-br backdrop-blur-2xl rounded-2xl"></div>
          <div className="absolute inset-0 bg-[#E6B24B]/5 mix-blend-overlay rounded-2xl"></div>
          <div className="absolute inset-0 border border-white/60 rounded-2xl"></div>

          {/* Content */}
          <div className="relative p-4 md:p-8">
            <Tabs defaultValue="workflows" className="w-full">
              {/* Mobile Layout */}
              <div className="flex flex-col space-y-4 md:hidden">
                <TabsList className="bg-white/80 border border-white/60 shadow-sm p-1 w-full">
                  <TabsTrigger
                    value="workflows"
                    className="flex-1 px-4 py-2 data-[state=active]:bg-[#0d0a04] data-[state=active]:text-white
                             rounded-lg transition-all duration-200 text-sm"
                  >
                    Workflows
                  </TabsTrigger>
                  <TabsTrigger
                    value="schemas"
                    className="flex-1 px-4 py-2 data-[state=active]:bg-[#0d0a04] data-[state=active]:text-white
                           data-[state=active]:shadow-md rounded-lg transition-all duration-200 text-sm"
                  >
                    Schemas
                  </TabsTrigger>
                </TabsList>

                <div className="flex justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setViewMode(viewMode === "grid" ? "list" : "grid")
                    }
                    className="flex-none bg-white/80 backdrop-blur-xl border border-white/60 shadow-md 
                             hover:bg-white/90 px-3 py-2 rounded-lg transition-all duration-200"
                  >
                    {viewMode === "grid" ? (
                      <Grid className="h-4 w-4 text-gray-600" />
                    ) : (
                      <List className="h-4 w-4 text-gray-600" />
                    )}
                  </Button>
                  <Button
                    disabled={true}
                    className="flex-1 bg-gradient-to-r from-[#e64b4b] to-[#be3b3b] text-white shadow-lg 
                    hover:shadow-xl hover:opacity-90 px-4 py-2 rounded-lg transition-all duration-200
                    text-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Deploy Workflow
                  </Button>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:flex justify-between items-center mb-8">
                <TabsList className="bg-white/80 border border-white/60 shadow-sm p-1">
                  <TabsTrigger
                    value="workflows"
                    className="px-6 py-2 data-[state=active]:bg-[#0d0a04] data-[state=active]:text-white
                             rounded-lg transition-all duration-200"
                  >
                    Explore Workflows
                  </TabsTrigger>
                  <TabsTrigger
                    value="schemas"
                    className="px-6 py-2 data-[state=active]:bg-[#0d0a04] data-[state=active]:text-white
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
                    disabled={true}
                    className="bg-gradient-to-r from-[#E6B24B] to-[#B88A2D] text-white shadow-lg 
                             hover:shadow-xl hover:opacity-90 px-6 py-2 rounded-lg transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Deploy Workflow
                  </Button>
                </div>
              </div>

              {/* Content Sections */}
              <TabsContent value="workflows" className="mt-4 md:mt-8">
                <div
                  className={`grid ${
                    viewMode === "grid"
                      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-1"
                  } gap-4 md:gap-6`}
                >
                  {fetchedWorkflows && fetchedWorkflows.length > 0 ? (
                    fetchedWorkflows.map((workflow: any, i: number) => (
                      <Workflows
                        key={i}
                        workflow={workflow}
                        handleJoinWorkflow={handleJoinWorkflow}
                        isPending={createWorkflow.isPending}
                        isListView={viewMode !== "grid"}
                      />
                    ))
                  ) : (
                    <ExplorerSkeleton count={3} />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="schemas" className="mt-4 md:mt-8">
                <div
                  className={`grid ${
                    viewMode === "grid"
                      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-1"
                  } gap-4 md:gap-6`}
                >
                  <Schemas
                    isPending={createWorkflow.isPending}
                    handleDeployWorkflow={handleDeployWorkflow}
                  />
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
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
};

export default WorkflowExplorer;
