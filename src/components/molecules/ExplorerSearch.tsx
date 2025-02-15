"use client";
import React, { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/atoms/input";

const ExplorerSearch = () => {
  const [gatewayUrl, setGatewayUrl] = useState("");

  return (
    <>
      <div className="relative backdrop-blur-xl bg-white/30 rounded-2xl p-6  border border-white/50">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            value={gatewayUrl}
            readOnly={true}
            onChange={(e) => setGatewayUrl(e.target.value)}
            className="pl-10 py-3 w-full border-r-0  bg-white/80 backdrop-blur-sm border text-center rounded-xl "
            placeholder="Enter Gateway URL"
          />
        </div>
      </div>
    </>
  );
};

export default ExplorerSearch;
