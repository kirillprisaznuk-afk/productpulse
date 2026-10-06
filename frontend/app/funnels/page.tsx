import { Suspense } from "react";
import { FilterBar } from "@/components/filter-bar";
import { AnalyticsLoading } from "@/components/analytics-loading";
import { ErrorState, PageHeading } from "@/components/states";
import { getAnalytics } from "@/lib/api";
import {
  parseContext,
  contextQuery,
  type Search,
  type AnalyticsContext,
} from "@/lib/context";
import { FunnelView } from "@/features/funnels";
export const metadata = { title: "Funnels" };
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  let context;
  try {
    context = parseContext(search);
  } catch (error) {
    return <ErrorState message={(error as Error).message} retry="/funnels" />;
  }
  return (
    <>
      <PageHeading
        eyebrow="Workspace / Funnels"
        title="Conversion funnels"
        description="Find the largest losses in the ordered journey."
      />
      <FilterBar context={context} path="/funnels" segmentation />
      <Suspense
        key={contextQuery(context)}
        fallback={<AnalyticsLoading name="funnels" compact />}
      >
        <Content context={context} search={search} />
      </Suspense>
    </>
  );
}
async function Content({
  context,
  search,
}: {
  context: AnalyticsContext;
  search: Search;
}) {
  let total, comparison;
  try {
    [total, comparison] = await Promise.all([
      getAnalytics("funnel", context),
      getAnalytics("funnel", context, context.dimension),
    ]);
  } catch (error) {
    return (
      <ErrorState
        message={(error as Error).message}
        retry={`/funnels?${contextQuery(context)}`}
      />
    );
  }
  return (
    <FunnelView
      key={`${contextQuery(context)}:${search.segment ?? "all"}`}
      total={total}
      comparison={comparison}
      query={contextQuery(context)}
      initialSegment={
        typeof search.segment === "string" &&
        comparison.groups.some((g) => g.segment === search.segment)
          ? search.segment
          : "all"
      }
    />
  );
}
