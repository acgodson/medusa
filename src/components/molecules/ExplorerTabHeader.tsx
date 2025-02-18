"use client";
import React, { useState } from "react";
import { Plus, Grid, List } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/atoms/tabs";
import { Button } from "@/components/atoms/button";
import CreateWorkflowDialog from "./DialogModals/CreateWorkflow";

const ExplorerTabHeader = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  return (
    <>
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

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="flex-none bg-white/80 backdrop-blur-xl border border-white/60 shadow-md 
                             hover:bg-white/90 px-3 py-2 rounded-lg transition-all duration-200"
          >
            {viewMode === "grid" ? (
              <Grid className="h-4 w-4 text-gray-600" />
            ) : (
              <List className="h-4 w-4 text-gray-600" />
            )}
          </Button>
          {/* <Button
            className="flex-1 bg-gradient-to-r from-[#e64b4b] to-[#be3b3b] text-white shadow-lg 
                    hover:shadow-xl hover:opacity-90 px-4 py-2 rounded-lg transition-all duration-200
                    text-sm"
            disabled={true}
          >
            <Plus className="h-4 w-4 mr-2" />
            Deploy Workflow
          </Button> */}
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
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-md 
                             hover:bg-white/90 px-4 py-2 rounded-lg transition-all duration-200"
          >
            {viewMode === "grid" ? (
              <Grid className="h-4 w-4 text-gray-600" />
            ) : (
              <List className="h-4 w-4 text-gray-600" />
            )}
          </Button>
          {/* <Button
            className="bg-gradient-to-r from-[#E6B24B] to-[#B88A2D] text-white shadow-lg 
                             hover:shadow-xl hover:opacity-90 px-6 py-2 rounded-lg transition-all duration-200"
            disabled={true}
          >
            <Plus className="h-4 w-4 mr-2" />
            Deploy Workflow
          </Button> */}
        </div>
      </div>

      <CreateWorkflowDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
};

export default ExplorerTabHeader;
