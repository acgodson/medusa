import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { ConnectedWallet, usePrivy, useWallets } from "@privy-io/react-auth";

import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

interface EthContextType {
  network: any;
  isLoggingIn: boolean;
  switchNetwork: (index: number) => void;
  handleLogin: () => void;
  handleLogout: () => void;
  publicClient: any;
}

const EthContext = createContext<EthContextType | undefined>(undefined);

export const Erc4337Provider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { authenticated, login, logout, connectWallet } = usePrivy();
  const { wallets } = useWallets();

  const [network, switchNetwork] = useState<any | null>(baseSepolia);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);

    try {
      if (authenticated) {
        await logout();
      }
      login();
      connectWallet();
    } catch (e) {
      console.log((e as any).message as any);
    }
  };

  const handleLogout = async () => {
    try {
      setIsAccountModalOpen(false);
      await logout();
    } catch (e) {
      console.log(e);
      console.log((e as any).message);
    }
  };

  const publicClient = createPublicClient({
    chain: network,
    transport: http(),
  });

  return (
    <EthContext.Provider
      value={{
        network,
        publicClient,
        isLoggingIn,
        handleLogin,
        handleLogout,
        switchNetwork,
      }}
    >
      {children}
    </EthContext.Provider>
  );
};

export const useEthContext = () => {
  const context = useContext(EthContext);
  if (context === undefined) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
};
