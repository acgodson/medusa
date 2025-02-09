import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/atoms/sheet";
import { ScrollArea } from "@/components/atoms/scroll-area";
import { Badge } from "@/components/atoms/badge";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/atoms/button";

interface InfoItemInterface {
  label: string;
  value: string | number | any;
  isCopyable?: boolean;
  isLink?: boolean;
  href?: string;
}

interface WorkflowResultInterface {
  open: any;
  onClose: any;
  result: any;
}
const ResultSection = ({ title, children }: any) => (
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
    navigator.clipboard.writeText(value);
  };

  if (isLink) {
    return (
      <div className="flex items-center justify-between py-1.5 text-sm">
        <span className="text-gray-600">{label}</span>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          {value.length > 20 ? `${value.slice(0, 20)}...` : value}
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
          {value.length > 30 ? `${value.slice(0, 30)}...` : value}
        </span>
        {isCopyable && (
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

const ProcessingNote = ({ note }: any) => {
  const [label, value] = note.split(": ");
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
};
export function WorkflowResultsDrawer({
  open,
  onClose,
  result,
}: WorkflowResultInterface) {
  if (!result?.result?.workflow) return null;

  const { collection, broadcast, analysis } = result.result.workflow;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto bg-white">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">
            Workflow Results
            <Badge className="ml-2 bg-green-100 text-green-800">Success</Badge>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] px-1">
          <div className="space-y-6 py-6">
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

            <ResultSection title="Analysis Results">
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Processing Notes</h4>
                  <div className="space-y-1">
                    {analysis?.inference?.analysis?.policy?.processingNotes?.map(
                      (note: any, i: number) => (
                        <ProcessingNote key={i} note={note} />
                      )
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Conditions</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Temperature Status</span>
                      <Badge
                        className={
                          analysis?.inference?.analysis?.conditions?.conditions
                            ?.temperature?.status === "normal"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {
                          analysis?.inference?.analysis?.conditions?.conditions
                            ?.temperature?.status
                        }
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Humidity Status</span>
                      <Badge
                        className={
                          analysis?.inference?.analysis?.conditions?.conditions
                            ?.humidity?.status === "normal"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {
                          analysis?.inference?.analysis?.conditions?.conditions
                            ?.humidity?.status
                        }
                      </Badge>
                    </div>
                  </div>
                </div>

                {analysis?.inference?.analysis?.conditions?.suggestedActions
                  ?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Suggested Actions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis?.inference?.analysis?.conditions?.suggestedActions?.map(
                        (action: any, i: number) => (
                          <Badge key={i} className="bg-blue-100 text-blue-800">
                            {action}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ResultSection>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
