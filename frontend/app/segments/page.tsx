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
import { SegmentsView } from "@/features/segments";
export const metadata = { title: "Segments" };
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
    return <ErrorState message={(error as Error).message} retry="/segments" />;
  }
  return (
    <>
      <PageHeading
        eyebrow="Workspace / Segments"
        title="Segment performance"
        description="Compare signup volume, activation and account outcomes."
      />
      <FilterBar context={context} path="/segments" segmentation />
      <Suspense
        key={contextQuery(context)}
        fallback={<AnalyticsLoading name="segments" compact />}
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
  void search;
  let data;
  try {
    data = await getAnalytics("segments", context, context.dimension);
  } catch (error) {
    return (
      <ErrorState
        message={(error as Error).message}
        retry={`/segments?${contextQuery(context)}`}
      />
    );
  }
  return <SegmentsView data={data} query={contextQuery(context)} />;
}
