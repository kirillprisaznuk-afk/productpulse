import { FilterBar } from "@/components/filter-bar";
import { Suspense } from "react";
import { AnalyticsLoading } from "@/components/analytics-loading";
import { ErrorState, PageHeading } from "@/components/states";
import { getAnalytics, AnalyticsError } from "@/lib/api";
import {
  parseContext,
  contextQuery,
  type Search,
  type AnalyticsContext,
} from "@/lib/context";
import { Overview } from "@/features/overview";
import { InsightList } from "@/components/insights";
export const dynamic = "force-dynamic";
export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  let context;
  try {
    context = parseContext(search);
  } catch (error) {
    return <ErrorState message={(error as Error).message} />;
  }
  return (
    <>
      <PageHeading
        eyebrow="Workspace / Overview"
        title="Product overview"
        description="Review material changes, then inspect the underlying metrics."
      />
      <FilterBar context={context} path="/" />
      <Suspense
        key={contextQuery(context)}
        fallback={<AnalyticsLoading name="overview" compact />}
      >
        <Content context={context} />
      </Suspense>
    </>
  );
}
async function Content({ context }: { context: AnalyticsContext }) {
  let data;
  let message = "";
  try {
    const [overview, activity, activation, segments, monetization] =
      await Promise.all([
        getAnalytics("overview", context),
        getAnalytics("activity", context),
        getAnalytics("activation", context),
        getAnalytics("segments", context, "acquisition_channel"),
        getAnalytics("monetization", context),
      ]);
    data = { overview, activity, activation, segments, monetization };
  } catch (error) {
    message =
      error instanceof AnalyticsError
        ? error.message
        : "Analytics could not be loaded. Please try again.";
  }
  return (
    <>
      {data ? (
        <>
          <InsightList
            title="Key changes"
            items={[
              ...(data.overview.insights ?? []),
              ...(data.segments.insights ?? []),
            ]}
            query={contextQuery({
              ...context,
              dimension: "acquisition_channel",
            })}
          />
          <Overview data={data} />
        </>
      ) : (
        <ErrorState message={message} retry={`/?${contextQuery(context)}`} />
      )}
    </>
  );
}
