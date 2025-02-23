import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/atoms/card";
import { Trophy, Activity, AlertCircle, Star } from "lucide-react";
import { formatAddress, formatTimeAgo } from "@/utils/helpers";
import { useWorkflowLeaderboard } from "@/hooks/useWorkflowLeaderboard";
import { Button } from "@/components/atoms/button";
import { Tooltip } from "@/components/atoms/tooltip";
import AgentAvatar from "../atoms/agent-avatar";


const FilterButton = ({
  filter,
  currentFilter,
  onClick,
  disabled = false,
}: {
  filter: string;
  currentFilter: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <Button
    variant="outline"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className={`${
      currentFilter === filter
        ? "bg-red-50 text-red-600 border-red-200"
        : disabled
        ? "bg-gray-50 text-gray-400"
        : "bg-white hover:bg-gray-50"
    }`}
  >
    {filter.charAt(0).toUpperCase() + filter.slice(1)}
  </Button>
);

const LeaderboardCard = ({
  workflowId,
  ownedDevices = [],
}: {
  workflowId: string | number;
  ownedDevices?: string[];
}) => {
  const { leaderboard, isLoading, filter, setFilter } =
    useWorkflowLeaderboard(workflowId);

  if (isLoading) {
    return (
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {["general", "allTime", "campaign"].map((_, i) => (
              <div
                key={i}
                className="h-8 w-20 bg-gray-100 rounded animate-pulse"
              />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-100 rounded-full" />
                  <div className="w-8 h-8 bg-gray-100 rounded-full" />
                  <div className="w-32 h-4 bg-gray-100 rounded" />
                </div>
                <div className="w-16 h-4 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6">
          <FilterButton
            filter="general"
            currentFilter={filter}
            onClick={() => setFilter("general")}
          />
          <FilterButton
            filter="allTime"
            currentFilter={filter}
            onClick={() => setFilter("allTime")}
          />
          <Tooltip content="Coming soon">
            <span>
              <FilterButton
                filter="campaign"
                currentFilter={filter}
                onClick={() => {}}
                disabled={true}
              />
            </span>
          </Tooltip>
        </div>
        {leaderboard.length > 0 ? (
          <>
            <div className="space-y-4">
              {leaderboard.map((contributor, index) => (
                <div
                  key={contributor.deviceAddress}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors
                           ${
                             ownedDevices.includes(
                               contributor.deviceAddress.toLowerCase()
                             )
                               ? "bg-red-50 hover:bg-red-100 border border-red-100"
                               : "hover:bg-gray-50 border border-transparent hover:border-gray-100"
                           }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`
                      w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium
                      ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : index === 1
                          ? "bg-gray-100 text-gray-700"
                          : index === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-50 text-gray-600"
                      }
                    `}
                    >
                      {index + 1}
                    </span>

                    <div className="relative">
                      <AgentAvatar
                        seed={contributor.deviceAddress}
                        width={32}
                        height={32}
                        className="rounded-full bg-red-50"
                      />
                      {ownedDevices.includes(
                        contributor.deviceAddress.toLowerCase()
                      ) && (
                        <Tooltip content="Your agent">
                          <Star className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1 fill-current" />
                        </Tooltip>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                        {formatAddress(contributor.deviceAddress)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(contributor.lastExecuted)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Activity className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-semibold text-gray-700">
                      {contributor.executions}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 italic">
                {filter === "general"
                  ? "*Unweighted Rankings based on active devices and executions"
                  : "*All-time rankings based on total executions"}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p className="text-sm">No contributors found for this filter</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderboardCard;
