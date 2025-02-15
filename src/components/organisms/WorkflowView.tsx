"use client";
import React, { useEffect, useState } from "react";
import Workflows from "@/components/molecules/Workflows";
import { useAuthenticatedAction } from "@/hooks/useAuth";

interface WorkflowProps {
  workflow: {
    owner: string;
    bucketName: string;
    bucketId: string;
    createdAt: string;
    PaymentAddress: string;
    status: string;
    visibility: string;
    objects: Array<{
      owner: string;
      creator: string;
      operator: string;
      createAt: any;
      visibility: string;
    }>;
    executions: number;
  };
}

export default function WorkflowView({ workflow }: WorkflowProps) {
  const [fetchedWorkflow, setFetchedWorkflow] = useState<any | null>(null);
  const { withAuth } = useAuthenticatedAction();

  useEffect(() => {
    if (workflow && !fetchedWorkflow) {
      console.log("found workflow", workflow);
      setFetchedWorkflow(workflow);
    }
  }, [workflow, fetchedWorkflow]);
  const handleSubmit = () => {};

  const handleJoinWorkflow = () => {
    withAuth(handleSubmit);
  };

  return (
    <>
      {fetchedWorkflow && (
        <div className="pt-16">
          <Workflows
            workflow={fetchedWorkflow}
            handleJoinWorkflow={handleJoinWorkflow}
            isPending={!fetchedWorkflow}
            isListView={true}
          />
        </div>
      )}
    </>
  );
}
