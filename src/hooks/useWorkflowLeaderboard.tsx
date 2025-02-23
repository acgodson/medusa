import { useState, useEffect } from "react";
import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";
import request from "graphql-request";
import { getDeviceExecutionInfo } from "@/utils/contractHelpers";
import RegistryArtifacts from "../../contracts/artifacts/MedusaRegistry.json";

export type LeaderboardEntry = {
  deviceAddress: string;
  walletId: string;
  executions: number;
  lastExecuted: number;
  isActive: boolean;
};

export type LeaderboardFilter = "general" | "allTime" | "campaign";

export const useWorkflowLeaderboard = (workflowId: string | number) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<LeaderboardFilter>("general");

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setIsLoading(true);
        const publicClient = createPublicClient({
          chain: bscTestnet,
          transport: http(),
        });

        // Fetch all registered devices for this workflow
        const response: any = await request(
          process.env.NEXT_PUBLIC_SUBGRAPH_URL!,
          `
          {
            deviceRegistereds(where: {workflowId: "${workflowId}"}) {
              deviceAddress
              walletId
              workflowId
            }
          }
        `
        );

        // Fetch execution info for each device using your existing function
        const devicesData = await Promise.all(
          response.deviceRegistereds.map(async (device: any) => {
            try {
              const result: any = await getDeviceExecutionInfo(
                publicClient,
                process.env.NEXT_PUBLIC_REGISTRY_CONTRACT! as `0x${string}`,
                RegistryArtifacts.abi,
                device.deviceAddress
              );

              return {
                deviceAddress: device.deviceAddress,
                walletId: device.walletId,
                executions: result.count || 0,
                lastExecuted: result.lastExecuted || 0,
                isActive: result.isActive || false,
              };
            } catch (error) {
              console.error(
                `Error fetching device ${device.deviceAddress} execution info:`,
                error
              );
              return null;
            }
          })
        );

        // Filter and sort devices
        // Filter and sort devices
        const validDevices = devicesData
          .filter(
            (device): device is LeaderboardEntry =>
              device !== null && device.executions > 0
          )
          .sort((a, b) => {
            // Primary sort by execution count
            if (b.executions !== a.executions) {
              return b.executions - a.executions;
            }
            // Secondary sort by last execution time
            return Number(b.lastExecuted) - Number(a.lastExecuted);
          });
        setLeaderboard(validDevices);
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        setLeaderboard([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (workflowId) {
      fetchLeaderboardData();
    }
  }, [workflowId]);

  // Apply filters to the leaderboard data
  const filteredLeaderboard = leaderboard.filter((entry) => {
    switch (filter) {
      case "general":
        return entry.isActive;
      case "allTime":
        return true;
      case "campaign":
        // Campaign filter logic to be implemented
        return false;
      default:
        return true;
    }
  });

  return {
    leaderboard: filteredLeaderboard.slice(0, 10), // Top 10
    isLoading,
    filter,
    setFilter,
  };
};
