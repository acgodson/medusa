"use client";
import React, { useState, useEffect } from "react";
import Header from "@/components/molecules/Header";
import Footer from "@/components/molecules/footer";
import { useWorkflow } from "@/hooks/useWorkflow";
import { useAuthenticatedAction } from "@/hooks/useAuth";
import { JoinWorkflowDialog } from "@/components/molecules/DialogModals/JoinWorkflow";
import WorkflowLayout from "@/components/templates/workflowLayout";
import ExplorerSkeleton from "@/components/molecules/ExplorerSkeleton";
import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";
import RegistryArtifacts from "../../../contracts/artifacts/MedusaRegistry.json";
import DeviceNFTArtifacts from "../../../contracts/artifacts/DeviceNFT.json";
import WorkflowCard from "../molecules/Workflows";
import { fetchWorkflowFromContract } from "@/utils/contractHelpers";
import { checkDeviceOwnership } from "@/utils/deviceOwnership";
import request from "graphql-request";
import LeaderboardCard from "../molecules/LeaderboardCard";
import HelpfulHints from "../molecules/HelpfulHints";
import VersionBanner from "../molecules/version-banner";

export default function WorkflowView({ params }: { params: { slug: string } }) {
  const [isOpen, setIsOpen] = useState(false);
  const { withAuth } = useAuthenticatedAction();
  const [singleWorkflow, setSingleWorkflow] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { address, workflows, createWorkflow } = useWorkflow();

  const SUBGRAPH_URL =
    "https://api.studio.thegraph.com/query/61092/medusa/version/latest";

  // Find the specific workflow once data is loaded
  useEffect(() => {
    if (workflows && params.slug) {
      const workflowId = parseInt(params.slug);
      const foundWorkflow = workflows.find((w) => w.id === workflowId);

      if (foundWorkflow) {
        setSingleWorkflow(foundWorkflow);
      }
      setIsLoading(false);
    }
  }, [workflows, params.slug]);

  // Updated fetchSingleWorkflow function for WorkflowView component
  useEffect(() => {
    const fetchSingleWorkflow = async () => {
      if (!workflows?.length && params.slug && !singleWorkflow) {
        try {
          setIsLoading(true);
          const workflowId = parseInt(params.slug);
          const publicClient = createPublicClient({
            chain: bscTestnet,
            transport: http(),
          });

          // fetch workflow data
          const workflowData = await fetchWorkflowFromContract(
            publicClient,
            process.env.NEXT_PUBLIC_REGISTRY_CONTRACT!,
            RegistryArtifacts.abi,
            BigInt(workflowId)
          );

          // Fetch associated devices from subgraph
          const response: any = await request(
            SUBGRAPH_URL,
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

          const registeredDevices = response?.deviceRegistereds || [];
          const deviceAddresses = registeredDevices.map((reg: any) =>
            reg.deviceAddress.toLowerCase()
          );

          // Check if user owns any of these devices
          let isContributor = false;
          let deviceIds = [];
          let deviceWalletIds = [];

          if (address && deviceAddresses.length > 0) {
            const ownershipMap = await checkDeviceOwnership(
              publicClient,
              process.env.NEXT_PUBLIC_DEVICE_NFT_CONTRACT!,
              DeviceNFTArtifacts.abi,
              new Set(deviceAddresses),
              address
            );

            // Filter owned devices
            const ownedDevicesInfo = registeredDevices
              .filter(
                (registration: any) =>
                  ownershipMap[registration.deviceAddress.toLowerCase()]
              )
              .map((registration: any) => ({
                address: registration.deviceAddress,
                walletId: registration.walletId,
              }));

            isContributor = ownedDevicesInfo.length > 0;
            deviceIds = ownedDevicesInfo.map((device: any) => device.address);
            deviceWalletIds = ownedDevicesInfo.map(
              (device: any) => device.walletId
            );
          }

          const workflowObj = {
            ...workflowData,
            deviceIds,
            deviceWalletIds,
            isContributor,
          };

          setSingleWorkflow(workflowObj);
        } catch (error) {
          console.error("Error fetching single workflow:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchSingleWorkflow();
  }, [params.slug, workflows, singleWorkflow, address]);

  const handleJoinWorkflow = (workflowId: any) => {
    withAuth(() => {
      setIsOpen(true);
    });
  };

  if (isLoading) {
    return (
      <WorkflowLayout>
        <ExplorerSkeleton count={1} />
      </WorkflowLayout>
    );
  }

  if (!singleWorkflow) {
    return (
      <WorkflowLayout>
        <div className="flex flex-col items-center justify-center p-8">
          <h2 className="text-xl font-semibold mb-2">Workflow Not Found</h2>
          <p className="text-gray-600">
            The requested workflow does not exist or you don't have access to
            view it.
          </p>
        </div>
      </WorkflowLayout>
    );
  }

  return (
    <>
      <Header />
      <VersionBanner />

      <WorkflowLayout>
        {/* <div className="mb-6">
            <h1 className="text-2xl font-bold">Workflow</h1>
          </div> */}

        {singleWorkflow && (
          <>
            {/* Helpful Hints Section */}
            <HelpfulHints />

            {/* Responsive grid container */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Workflow card takes up 2/3 of space on desktop */}
              <div className="lg:col-span-2">
                <WorkflowCard
                  workflow={singleWorkflow}
                  handleJoinWorkflow={handleJoinWorkflow}
                  isPending={createWorkflow.isPending}
                  isListView={true}
                  showLink={false}
                />
              </div>

              {/* Leaderboard takes up 1/3 of space on desktop */}
              <div className="lg:col-span-1">
                <LeaderboardCard
                  workflowId={singleWorkflow.id}
                  ownedDevices={singleWorkflow.deviceIds}
                />
              </div>
            </div>

            <JoinWorkflowDialog
              workflowId={singleWorkflow.id}
              workflowTitle={singleWorkflow.title}
              open={isOpen}
              onClose={() => setIsOpen(false)}
            />
          </>
        )}
      </WorkflowLayout>
      <Footer />
    </>
  );
}
