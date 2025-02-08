import React, { useState } from "react";
import WorkflowExplorer from "@/components/organisms/WorkflowExplorer";

const Home = () => {
  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <WorkflowExplorer />
    </div>
  );
};

export default Home;
