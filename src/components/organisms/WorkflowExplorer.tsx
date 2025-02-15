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
import { JoinWorkflowDialog } from "../molecules/DialogModals/JoinWorkflow";
import ExplorerSkeleton from "../molecules/ExplorerSkeleton";
import Schemas from "../molecules/Schemas";
import Workflows from "../molecules/Workflows";
import { useWorkflow } from "@/hooks/useWorkflow";
import ExplorerTabHeader from "../molecules/ExplorerTabHeader";
import WorkflowLayout from "../templates/workflowLayout";

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

  const handleDeployWorkflow = () => {};

  const handleJoinWorkflow = (workflowId: number) => {
    setSelectedWorkflow(workflowId);
    setIsOpen(true);
  };

  const selectedWorkflowData = fetchedWorkflows?.find(
    (w: any) => w.id === selectedWorkflow
  );

  return (
    <WorkflowLayout>
      <Tabs defaultValue="workflows" className="w-full">
        <ExplorerTabHeader />

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

      <JoinWorkflowDialog
        workflowId={selectedWorkflow}
        workflowTitle={selectedWorkflowData?.name || ""}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </WorkflowLayout>
  );
};

export default WorkflowExplorer;
