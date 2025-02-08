"use client";
import React, { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/atoms/input";

const ExplorerHeader = () => {
  const [gatewayUrl, setGatewayUrl] = useState(
    "https://default-gateway.medusa.network"
  );

  return (
    <>
      {/* Glossy Header with Gateway URL */}
      <div className="relative backdrop-blur-xl bg-white/30 rounded-2xl p-6 shadow-lg border border-white/50">
        <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#E6B24B] to-[#B88A2D] bg-clip-text text-transparent">
          Medusa Workflow Explorer
        </h1>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            value={gatewayUrl}
            onChange={(e) => setGatewayUrl(e.target.value)}
            className="pl-10 pr-4 py-3 w-full bg-white/80 backdrop-blur-sm border border-white/50 rounded-xl shadow-sm"
            placeholder="Enter Gateway URL"
          />
        </div>
      </div>
    </>
  );
};

export default ExplorerHeader;
