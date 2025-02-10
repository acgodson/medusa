import React, { useState } from "react";
import WorkflowExplorer from "@/components/organisms/WorkflowExplorer";
import Header from "@/components/molecules/Header";
import AuroraBackground from "@/components/atoms/aurora-background";

const Home = () => {
  return (
    <AuroraBackground className="flex flex-col gap-2 w-full">
      <Header />
      <WorkflowExplorer />
    </AuroraBackground>
  );
};

export default Home;
