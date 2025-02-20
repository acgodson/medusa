import { trpc } from "@/trpc/server";
import { notFound } from "next/navigation";
import WorkflowView from "@/components/organisms/WorkflowView";
import { Metadata } from "next";
import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";
import RegistryArtifacts from "../../../../contracts/artifacts/MedusaRegistry.json";
import { fetchWorkflowFromContract } from "@/utils/contractHelpers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    // 1. Get bucket stats from trpc (execution count)
    const bucketData = await trpc.getWorkflow({ workflowId: slug });

    // 2. Get workflow details from blockchain using the helper function
    const publicClient = createPublicClient({
      chain: bscTestnet,
      transport: http(),
    });

    const workflowId = slug;
    const workflowData = await fetchWorkflowFromContract(
      publicClient,
      process.env.REGISTRY_CONTRACT!,
      RegistryArtifacts.abi,
      BigInt(workflowId)
    );

    // Get the required values from the helper result
    const status = workflowData.status || "Active";
    const schemaId = workflowData.schemaId || "unknown";
    const title = workflowData.title || `Workflow ${workflowId}`;

    // Get execution count from objects in bucket
    const executionCount =
      bucketData.success && bucketData.workflow.executions
        ? bucketData.workflow.executions.body
            ?.GfSpListObjectsByBucketNameResponse?.Objects?.length || 0
        : 0;

    // Format creation date if available
    const createdDate = workflowData.timestamp
      ? new Date(Number(workflowData.timestamp)).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "N/A";

    // Define OpenGraph image
    const openGraphImage = {
      images: [
        {
          url: "https://sirenwatch.xyz/bus.jpg",
          width: 1200,
          height: 630,
          alt: "Medusa Workflow",
        },
      ],
    };

    // Generate dynamic metadata based on workflow details
    return {
      title: `${title} - Siren`,
      description: `A Medusa workflow with schema ${schemaId}, ${executionCount} executions, ${status} since ${createdDate}`,
      openGraph: {
        type: "website",
        url: `https://sirenwatch.xyz/workflow/${slug}`,
        title: `${title} - Siren`,
        description: `A Medusa workflow with schema ${schemaId}, ${executionCount} executions, ${status} since ${createdDate}`,
        images: openGraphImage.images,
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} - Sirenwatch`,
        description: `A Medusa workflow with schema ${schemaId}, ${executionCount} executions, ${status} since ${createdDate}`,
        images: [openGraphImage.images[0].url],
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Medusa Workflow - Siren",
      description: "View detailed workflow information on Siren",
    };
  }
}

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    // We still fetch basic execution data to confirm the workflow exists
    const bucketData = await trpc.getWorkflow({ workflowId: slug });

    if (!bucketData.success) {
      notFound();
    }

    // Pass the slug to the client component which will fetch complete data
    // using the useWorkflow hook
    return <WorkflowView params={{ slug }} />;
  } catch (error) {
    console.error("Error fetching workflow:", error);
    notFound();
  }
}
