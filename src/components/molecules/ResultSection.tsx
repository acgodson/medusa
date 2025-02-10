import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/atoms/sheet";
import { ScrollArea } from "@/components/atoms/scroll-area";
import { Badge } from "@/components/atoms/badge";
import {
  Copy,
  ExternalLink,
  AlertTriangle,
  Droplets,
  Thermometer,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";

interface InfoItemInterface {
  label: string;
  value: string | number | any;
  isCopyable?: boolean;
  isLink?: boolean;
  href?: string;
}

interface WorkflowResultInterface {
  open: boolean;
  onClose: () => void;
  result: any;
}

const ResultSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-6">
    <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const InfoItem = ({
  label,
  value,
  isCopyable,
  isLink,
  href,
}: InfoItemInterface) => {
  const handleCopy = () => {
    if (value) navigator.clipboard.writeText(value.toString());
  };

  if (isLink && href) {
    return (
      <div className="flex items-center justify-between py-1.5 text-sm">
        <span className="text-gray-600">{label}</span>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          {typeof value === "string" && value.length > 20
            ? `${value.slice(0, 20)}...`
            : value || "View"}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-gray-900">
          {typeof value === "string" && value.length > 30
            ? `${value.slice(0, 30)}...`
            : value || "-"}
        </span>
        {isCopyable && value && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleCopy}
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  unit,
}: {
  label: string;
  value?: number;
  unit: string;
}) => (
  <Card className="flex-1">
    <CardContent className="pt-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-semibold mt-1">
        {typeof value === "number" ? `${value.toFixed(1)}${unit}` : "-"}
      </div>
    </CardContent>
  </Card>
);

const StatusBadge = ({ status }: { status?: string }) => {
  const getStatusColor = (status?: string) => {
    if (!status) return "bg-gray-100 text-gray-800";

    switch (status.toLowerCase()) {
      case "normal":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Badge className={getStatusColor(status)}>{status || "Unknown"}</Badge>
  );
};

export function WorkflowResultsDrawer({
  open,
  onClose,
  result,
}: WorkflowResultInterface) {
  if (!result?.result?.workflow) return null;

  const { collection, broadcast, analysis } = result.result.workflow;
  const { policy, conditions } = analysis?.inference?.analysis || {};

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[640px] overflow-y-auto bg-white">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold flex items-center">
            Workflow Results
            <Badge className="ml-2 bg-green-100 text-green-800">Success</Badge>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] px-1">
          <div className="space-y-6 py-6">
            {/* Collection & Broadcast Sections */}
            <ResultSection title="Collection Results">
              <InfoItem
                label="Signature"
                value={collection?.signature || ""}
                isCopyable
              />
              <InfoItem
                label="IPFS CID"
                value={collection?.storageResult?.cid || ""}
                isCopyable
              />
              <InfoItem
                label="IPNS ID"
                value={collection?.storageResult?.ipnsId || ""}
                isCopyable
              />
            </ResultSection>

            <ResultSection title="Broadcast Results">
              <InfoItem
                label="IPNS Gateway"
                value="View Storage"
                isLink
                href={broadcast?.ipnsGatewayUrl}
              />
              <InfoItem
                label="Transaction"
                value="View on Basescan"
                isLink
                href={`https://sepolia.basescan.org/tx/${broadcast?.transactionHash?.transactionHash}`}
              />
            </ResultSection>

            {/* Analysis Section */}
            <ResultSection title="Analysis Results">
              <div className="space-y-6">
                {/* Current Readings */}
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    label="Temperature"
                    value={policy?.statistics?.temperature?.average || 0}
                    unit="°C"
                  />
                  <StatCard
                    label="Humidity"
                    value={policy?.statistics?.humidity?.average || 0}
                    unit="%"
                  />
                </div>

                {/* Conditions Status */}
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="text-sm font-medium mb-4">
                      Environmental Conditions
                    </h4>
                    <div className="space-y-4">
                      {/* Temperature Status */}
                      <div className="flex items-start gap-4">
                        <Thermometer className="h-5 w-5 text-gray-500 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Temperature
                            </span>
                            <StatusBadge
                              status={conditions?.conditions?.temperatureStatus}
                            />
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {conditions?.conditions?.temperatureExplanation ||
                              "No explanation available"}
                          </p>
                          <div className="text-xs text-gray-500 mt-1">
                            Trend:{" "}
                            {conditions?.conditions?.temperatureTrend ||
                              "Unknown"}
                          </div>
                        </div>
                      </div>

                      {/* Humidity Status */}
                      <div className="flex items-start gap-4">
                        <Droplets className="h-5 w-5 text-gray-500 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Humidity
                            </span>
                            <StatusBadge
                              status={conditions?.conditions?.humidityStatus}
                            />
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {conditions?.conditions?.humidityExplanation ||
                              "No explanation available"}
                          </p>
                          <div className="text-xs text-gray-500 mt-1">
                            Trend:{" "}
                            {conditions?.conditions?.humidityTrend || "Unknown"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Alerts */}
                {conditions?.alerts && conditions.alerts.length > 0 && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <h4 className="text-sm font-medium">Active Alerts</h4>
                      </div>
                      <div className="space-y-2">
                        {conditions.alerts.map(
                          (alert: string, index: number) => (
                            <div
                              key={index}
                              className="text-sm text-gray-600 flex gap-2"
                            >
                              <span>•</span>
                              <span>{alert}</span>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Policy Information */}
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="text-sm font-medium mb-3">Data Policy</h4>
                    <div className="space-y-3">
                      <InfoItem
                        label="Usage Policy"
                        value={policy?.analysis?.usagePolicy}
                      />
                      <InfoItem
                        label="Retention Period"
                        value={`${policy?.analysis?.retention?.duration} days`}
                      />
                      <div className="text-sm">
                        <div className="text-gray-600 mb-2">
                          Retention Reason:
                        </div>
                        <p className="text-gray-900">
                          {policy?.analysis?.retention?.reason}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions & Insights */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Suggested Actions */}
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="text-sm font-medium mb-3">
                        Suggested Actions
                      </h4>
                      <div className="space-y-2">
                        {conditions?.suggestedActions?.map(
                          (action: string, index: number) => (
                            <div
                              key={index}
                              className="text-sm text-gray-600 flex gap-2"
                            >
                              <span>•</span>
                              <span>{action}</span>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Insights */}
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="text-sm font-medium mb-3">Key Insights</h4>
                      <div className="space-y-2">
                        {policy?.analysis?.insights?.map(
                          (insight: string, index: number) => (
                            <div
                              key={index}
                              className="text-sm text-gray-600 flex gap-2"
                            >
                              <span>•</span>
                              <span>{insight}</span>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </ResultSection>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
