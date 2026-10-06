import "server-only";
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import schema from "@/types/openapi.json";
import type { components } from "@/types/api";
import { apiParams, type AnalyticsContext, type Dimension } from "./context";

const contracts = {
  overview: "OverviewResponse",
  activity: "ActivityResponse",
  activation: "ActivationResponse",
  segments: "SegmentsResponse",
  monetization: "MonetizationResponse",
  funnel: "FunnelResponse",
  retention: "RetentionResponse",
  experiments: "ExperimentList",
  analysis: "ExperimentAnalysis",
  planning: "PlanningResponse",
  workspace: "ExperimentWorkspace",
} as const;
type Endpoint = keyof typeof contracts;
type Response<K extends Endpoint> =
  components["schemas"][(typeof contracts)[K]];
const ajv = new Ajv({ strict: false, allErrors: false });
addFormats(ajv);
const validators = Object.fromEntries(
  Object.entries(contracts).map(([endpoint, name]) => [
    endpoint,
    ajv.compile({
      components: schema.components,
      $ref: `#/components/schemas/${name}`,
    }),
  ]),
);
export class AnalyticsError extends Error {
  constructor(
    public kind: "unavailable" | "validation" | "contract" | "not-found",
  ) {
    super(
      kind === "not-found"
        ? "This experiment could not be found. Select another experiment."
        : kind === "validation"
          ? "The API could not accept these inputs. Check the selected values and try again."
          : kind === "contract"
            ? "The analytics response could not be read. Check the API version and try again."
            : "Analytics could not be loaded. Check that the ProductPulse API is running.",
    );
  }
}
export function parseResponse<K extends Endpoint>(
  endpoint: K,
  data: unknown,
): Response<K> {
  if (!validators[endpoint](data)) throw new AnalyticsError("contract");
  return data as Response<K>;
}
export async function getAnalytics<
  K extends Exclude<
    Endpoint,
    "experiments" | "analysis" | "planning" | "workspace"
  >,
>(
  endpoint: K,
  context: AnalyticsContext,
  dimension?: Dimension,
): Promise<Response<K>> {
  const params = apiParams(context, dimension);
  if (endpoint === "retention") params.set("max_weeks", "26");
  return request(endpoint, `/api/analytics/${endpoint}?${params}`);
}
export function getExperiments() {
  return request("experiments", "/api/experiments");
}
export function getExperimentWorkspace() {
  return request("workspace", "/api/experiments/workspace");
}
export function getExperiment(id: number) {
  return request("analysis", `/api/experiments/${id}/analysis`);
}
export function planExperiment(
  input: components["schemas"]["PlanningRequest"],
) {
  return request("planning", "/api/experiments/power", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
async function request<K extends Endpoint>(
  endpoint: K,
  path: string,
  init: RequestInit = {},
): Promise<Response<K>> {
  const base = (
    process.env.PRODUCTPULSE_API_URL ?? "http://127.0.0.1:8000"
  ).replace(/\/$/, "");
  let response: globalThis.Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new AnalyticsError("unavailable");
  }
  if (!response.ok)
    throw new AnalyticsError(
      response.status === 404
        ? "not-found"
        : response.status === 422
          ? "validation"
          : "unavailable",
    );
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new AnalyticsError("contract");
  }
  return parseResponse(endpoint, data);
}
