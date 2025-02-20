import React from "react";
import WorkflowExplorer from "@/components/organisms/WorkflowExplorer";
import Header from "@/components/molecules/Header";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { request } from "graphql-request";
import { WORKFLOWS_QUERY } from "@/lib/graphql/queries";
import Footer from "@/components/molecules/footer";

const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/61092/medusa/version/latest";

export default async function HomePage() {
  const queryClient = new QueryClient();

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
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Header />
        <div className="pt-16">
          <WorkflowExplorer />
        </div>
        <Footer />
      </HydrationBoundary>
    </>
  );
}
