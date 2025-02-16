import AuroraBackground from "@/components/atoms/aurora-background";
import React from "react";
import WorkflowExplorer from "@/components/organisms/WorkflowExplorer";
import Header from "@/components/molecules/Header";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { gql, request } from "graphql-request";
import { WORKFLOWS_QUERY } from "@/lib/graphql/queries";

const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/61092/medusa/version/latest";

export default async function HomePage() {
  const queryClient = new QueryClient();

  // Prefetch both data and workflows
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["data"],
      queryFn: async () => {
        return await request(SUBGRAPH_URL, WORKFLOWS_QUERY);
      },
    }),
  ]);

  return (
    <>
      {/* <HydrationBoundary state={dehydrate(queryClient)}> */}
      {/* <AuroraBackground className="flex flex-col gap-2 relative"> */}
      <Header />
      <div className="pt-16">
        <WorkflowExplorer />
      </div>
      {/* </AuroraBackground> */}
      {/* </HydrationBoundary> */}
    </>
  );
}
