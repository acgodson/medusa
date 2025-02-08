"use client";
import React, { useState } from "react";

const ExplorerHeader = () => {
  const [gatewayUrl, setGatewayUrl] = useState(
    "https://default-gateway.medusa.network"
  );

  return (
    <>
      <div className="flex space-x-2 px-6 py-6 bg-yellow-50/20">
        <img src="/black-logo.png" alt="Medusa Logo" className="h-8 w-8" />
        <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#5555] to-[#333] bg-clip-text text-transparent">
          Medusa
        </h1>
      </div>
    </>
  );
};

export default ExplorerHeader;
