"use client";
import React, { useCallback, useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEthContext } from "@/providers/EthContext";
import { ChevronDown, LogOut, Globe, Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";
import { supportedChains } from "@/config/env";
import { trpc } from "@/trpc/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "../atoms";

const ExplorerHeader = () => {
  const networks = supportedChains;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { authenticated } = usePrivy();
  const { handleLogin, handleLogout, switchNetwork, network } = useEthContext();
  const { wallets } = useWallets();
  const connectedWallet = wallets.find((wallet) => wallet.type === "ethereum");

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  const { replace, push } = useRouter();

  // const searchParams = useSearchParams();
  // const pathname = usePathname();

  // const authCode = searchParams.get("code");
  // const { data: authUrl, refetch } = trpc.initiateAuth.useQuery(undefined, {
  //   enabled: false,
  // });
  // const exchangeToken = trpc.exchangeToken.useMutation();

  // const handleZohoAuthCallBack = useCallback(async () => {
  //   if (!authCode || !authCode.length) {
  //     return;
  //   }
  //   await exchangeToken.mutateAsync({
  //     code: authCode,
  //   });
  //   const params = new URLSearchParams(searchParams);
  //   params.delete("code");
  //   params.delete("location");
  //   params.delete("accounts-server");
  //   replace(`${pathname}?${params.toString()}`);
  // }, [authCode, searchParams, pathname, replace]);

  // useEffect(() => {
  //   handleZohoAuthCallBack();
  // }, [handleZohoAuthCallBack]);

  // const handleZohoAuth = useCallback(async () => {
  //   await refetch();
  //   if (authUrl && authUrl.authorizationUrl) {
  //     window.location.href = authUrl.authorizationUrl;
  //   }
  // }, [refetch, authUrl]);

  const NetworkSelector = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="px-4 py-2 bg-gray-50 text-[#9a2529] rounded-lg
                     hover:bg-gray-50 transition-all duration-200
                     flex items-center space-x-2 group w-[160px] justify-between"
        >
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4 shrink-0" />
            <span className="font-medium truncate">
              {network.id === 97 ? "BNB Testnet" : network.name}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[160px] bg-gray-50/95 backdrop-blur-sm border border-gray-50"
      >
        {networks.map((network) => (
          <DropdownMenuItem
            key={network.id}
            disabled={network.id !== 97}
            onClick={() => switchNetwork(network as any)}
            className={`first-line:text-[#9a2529] hover:text-white hover:bg-[#9a2529]
                     focus:text-white focus:bg-[#9a2529]`}
          >
            {network.id === 97 ? "BNB Testnet" : network.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const WalletConnection = () =>
    !authenticated ? (
      <button
        onClick={handleLogin}
        className="px-4 py-2 bg-[#000000] rounded-lg font-medium 
                 hover:bg-[#6a1a1e] transition-colors duration-200
                 shadow-sm hover:shadow-md
                 flex items-center space-x-2 text-white w-full justify-center"
      >
        Connect Wallet
      </button>
    ) : (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="px-4 py-2 border-2 border-[#9a2529] text-[#9a2529] rounded-lg
                       hover:bg-[#9a2529] hover:text-white transition-all duration-200
                       flex items-center justify-between space-x-2 group w-full"
          >
            <span className="font-medium">
              {formatAddress(connectedWallet?.address || "")}
            </span>
            <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 bg-gray-50/95 backdrop-blur-sm border border-gray-50"
        >
          <DropdownMenuItem
            onClick={handleLogout}
            className="flex items-center space-x-2 text-[#9a2529] hover:text-white
                       hover:bg-[#9a2529] focus:text-white focus:bg-[#9a2529]"
          >
            <LogOut className="h-4 w-4" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

  return (
    <>
      <div className="flex fixed z-50 items-center w-full justify-between px-6 py-4 bg-white/85 backdrop-blur-lg border-b border-gray-800">
        <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => push("/")}
        >
          <img src="/black-logo.png" alt="Medusa Logo" className="h-8 w-8" />
          {/* <h1 className="text-2xl font-bold text-black bg-clip-text">
            DePIN Agents
          </h1> */}
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-4">
          <NetworkSelector />
          <WalletConnection />
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden text-black"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed top-[73px] left-0 right-0 bg-white/50 backdrop-blur-lg z-40 
                   border-b border-gray-800 transition-all duration-300 md:hidden
                   ${
                     isMobileMenuOpen
                       ? "translate-y-0 opacity-100"
                       : "-translate-y-full opacity-0"
                   }`}
      >
        <div className="p-4 space-y-4">
          <NetworkSelector />
          <WalletConnection />
        </div>
      </div>
    </>
  );
};

export default ExplorerHeader;
