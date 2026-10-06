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
import { RetentionView } from "@/features/retention";
export const metadata = { title: "Retention" };
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
    return <ErrorState message={(error as Error).message} retry="/retention" />;
  }
  return (
    <>
      <PageHeading
        eyebrow="Workspace / Retention"
        title="Cohort retention"
        description="Compare fully observed cohorts at the same age."
      />
      <FilterBar context={context} path="/retention" segmentation />
      <Suspense
        key={contextQuery(context)}
        fallback={<AnalyticsLoading name="retention" compact />}
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
      getAnalytics("retention", context),
      getAnalytics("retention", context, context.dimension),
    ]);
  } catch (error) {
    return (
      <ErrorState
        message={(error as Error).message}
        retry={`/retention?${contextQuery(context)}`}
      />
    );
  }
  return (
    <RetentionView
      key={`${contextQuery(context)}:${search.segment ?? "all"}:${search.cohort ?? ""}`}
      total={total}
      comparison={comparison}
      query={contextQuery(context)}
      initialSegment={
        typeof search.segment === "string" &&
        comparison.cohorts.some((c) => c.segment === search.segment)
          ? search.segment
          : "all"
      }
      initialCohort={
        typeof search.cohort === "string" &&
        total.cohorts.some((c) => c.cohort_start === search.cohort)
          ? search.cohort
          : undefined
      }
    />
  );
}
