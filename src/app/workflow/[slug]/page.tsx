import { trpc } from "@/trpc/server";
import ExplorerSkeleton from "@/components/molecules/ExplorerSkeleton";
import { notFound } from "next/navigation";
import Header from "@/components/molecules/Header";
import WorkflowView from "@/components/organisms/WorkflowView";
import { formatLongToDate } from "@/utils/helpers";

export default async function Workflow({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const data = await trpc.getWorkflow({ workflowId: slug });

  if (!slug) {
    notFound();
  }

  const bucketInfo = data.workflow.bucketInfo.bucketInfo;
  const objects =
    data.workflow.executions.body?.GfSpListObjectsByBucketNameResponse.Objects;

  const metadata = {
    owner: bucketInfo?.owner,
    bucketName: bucketInfo?.bucketName,
    bucketId: bucketInfo?.id,
    createdAt: formatLongToDate(bucketInfo?.createAt),
    PaymentAddress: bucketInfo?.paymentAddress,
    status: bucketInfo?.bucketStatus,
    visibility: bucketInfo?.visibility,
    objects: JSON.stringify(
      objects?.slice(-5).map((object) => ({
        owner: object.ObjectInfo.Owner,
        creator: object.ObjectInfo.Creator,
        operator: object.Operator,
        createAt: object.ObjectInfo.CreateAt,
        visibility: object.ObjectInfo.Visibility,
      }))
    ),
    totalExecutions: objects?.length,
  };

  return !data.success ? (
    <>
      <Header />
      <ExplorerSkeleton count={1} />
    </>
  ) : (
    <>
      <Header />
      <div className="pt-16 px-2">
        <WorkflowView workflow={metadata as any} />
      </div>
    </>
  );
}
