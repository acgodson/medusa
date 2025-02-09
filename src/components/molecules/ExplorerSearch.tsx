"use client";
import React, { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/atoms/input";

const ExplorerSearch = () => {
  const [gatewayUrl, setGatewayUrl] = useState(
    "https://<device-id>.medusa.network"
  );

  return (
    <>
      <div className="relative backdrop-blur-xl bg-white/30 rounded-2xl p-6 shadow-md border border-white/50">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            value={gatewayUrl}
            onChange={(e) => setGatewayUrl(e.target.value)}
            className="pl-10 pr-4 py-3 w-full bg-white/80 backdrop-blur-sm border  border-[#E6B24B]/20 rounded-xl shadow-sm"
            placeholder="Enter Gateway URL"
          />
        </div>
      </div>
    </>
  );
};

export default ExplorerSearch;
