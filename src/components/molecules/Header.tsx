"use client";
import React, { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEthContext } from "@/providers/EthContext";
import { ChevronDown, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";

const ExplorerHeader = () => {
  const [gatewayUrl, setGatewayUrl] = useState(
    "https://default-gateway.medusa.network"
  );

  const { authenticated } = usePrivy();
  const { handleLogin, handleLogout } = useEthContext();
  const { wallets } = useWallets();
  const connectedWallet = wallets.find((wallet) => wallet.type === "ethereum");

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="flex items-center space-x-3">
        <img src="/black-logo.png" alt="Medusa Logo" className="h-8 w-8" />
        <h1 className="text-2xl font-bold text-black bg-clip-text">
          Medusa
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        {!authenticated ? (
          <button
            onClick={handleLogin}
            className="px-4 py-2 bg-black text-[#E6B24B] rounded-lg font-medium 
                     hover:bg-black/90 transition-colors duration-200
                     shadow-sm hover:shadow-md
                     flex items-center space-x-2"
          >
            Connect Wallet
          </button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="px-4 py-2 border-2 border-[#E6B24B] text-black rounded-lg
                           hover:bg-[#E6B24B]/10 transition-all duration-200
                           flex items-center space-x-2 group"
              >
                <span className="font-medium">
                  {formatAddress(connectedWallet?.address || "")}
                </span>
                <ChevronDown
                  className="h-4 w-4 text-[#E6B24B] group-hover:text-black 
                             transition-transform duration-200 group-data-[state=open]:rotate-180"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-white/95 backdrop-blur-sm border border-gray-200"
            >
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700
                           focus:text-red-700 focus:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Disconnect</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export default ExplorerHeader;
