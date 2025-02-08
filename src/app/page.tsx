import React, { useState } from "react";
import WorkflowExplorer from "@/components/organisms/WorkflowExplorer";
import Header from "@/components/molecules/Header";

const Home = () => {
  return (
    <>
      <Header />

      <WorkflowExplorer />
    </>
  );
};

export default Home;
