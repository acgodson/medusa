"use client";
import { Card, CardHeader, CardContent } from "../atoms";

const ExplorerSkeleton = ({ count }: { count: number }) => {
  return (
    <>
      {Array(count)
        .fill(null)
        .map((_, index) => (
          <Card
            key={`skeleton-${index}`}
            className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border border-white/50"
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="space-y-3 w-full">
                <div className="h-6 bg-gray-200 rounded-md w-3/4 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded-md w-full animate-pulse" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 w-1/2">
                    <div className="h-4 w-4 bg-gray-200 rounded-full animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded-md w-24 animate-pulse" />
                  </div>
                  <div className="h-4 bg-gray-200 rounded-md w-20 animate-pulse" />
                </div>
                <div className="p-3 bg-gray-50/50 rounded-lg space-y-2">
                  <div className="h-3 bg-gray-200 rounded-md w-16 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded-md w-full animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded-md w-full animate-pulse" />
                  </div>
                </div>
                <div className="h-9 bg-gray-200 rounded-md w-full animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
    </>
  );
};

export default ExplorerSkeleton;
