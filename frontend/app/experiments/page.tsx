import { ErrorState, PageHeading } from "@/components/states";
import { getExperimentWorkspace } from "@/lib/api";
import type { Search } from "@/lib/context";
import { ExperimentList, ExperimentDetail } from "@/features/experiments";
import { PlanningPanel } from "@/features/planning";
export const metadata = { title: "Experiments" };
export const dynamic = "force-dynamic";
export default async function ExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  let workspace;
  try {
    workspace = await getExperimentWorkspace();
  } catch (error) {
    return (
      <ErrorState message={(error as Error).message} retry="/experiments" />
    );
  }
  const list = workspace.listing;
  const id =
    search.experiment == null
      ? list.experiments[0]?.id
      : typeof search.experiment === "string" &&
          /^[1-9]\d*$/.test(search.experiment)
        ? Number(search.experiment)
        : NaN;
  const decisions = Object.fromEntries(
    workspace.analyses.map((a) => [a.metadata.id, a]),
  );
  const data = id ? decisions[id] : undefined;
  const message = !list.experiments.some((e) => e.id === id)
    ? "This experiment could not be found. Select one from the list."
    : "The selected analysis could not be loaded. Check the API and try again.";
  return (
    <>
      <PageHeading
        eyebrow="Workspace / Experiments"
        title="Experiment evidence"
        description="Inspect effects, uncertainty and measurement health before making a product decision."
      />
      <p className="notice">
        Experiments use their own assignment windows and the fixed dataset
        cutoff. Dashboard date filters do not change these analyses.
      </p>
      <ExperimentList
        items={list.experiments}
        selected={id}
        decisions={decisions}
      />
      {data ? (
        <ExperimentDetail data={data} />
      ) : list.experiments.length > 0 ? (
        <ErrorState
          message={message}
          retry={`/experiments${Number.isSafeInteger(id) ? `?experiment=${id}` : ""}`}
        />
      ) : null}
      <PlanningPanel />
    </>
  );
}
