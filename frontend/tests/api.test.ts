import { afterEach, describe, expect, it, vi } from "vitest";
import { getAnalytics, parseResponse } from "@/lib/api";
import { parseContext } from "@/lib/context";
import { overviewData } from "./fixtures";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("typed API boundary", () => {
  it("validates generated contracts and keeps unavailable metrics null", () => {
    expect(
      parseResponse("overview", overviewData.overview).metrics
        .paid_conversion_rate.current,
    ).toBeNull();
    expect(() => parseResponse("overview", { metrics: [] })).toThrow(
      "response could not be read",
    );
  });
  it("uses server URL, fresh requests and serialized dates", async () => {
    vi.stubEnv("PRODUCTPULSE_API_URL", "http://example.test");
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(overviewData.overview)));
    vi.stubGlobal("fetch", fetcher);
    await getAnalytics("overview", parseContext({}));
    expect(fetcher).toHaveBeenCalledWith(
      "http://example.test/api/analytics/overview?start_date=2025-06-01&end_date=2025-07-01&as_of=2025-07-01",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
  it("sanitizes backend validation errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("internal details", { status: 422 })),
    );
    await expect(getAnalytics("overview", parseContext({}))).rejects.toThrow(
      "could not accept these inputs",
    );
  });
  it("handles unavailable backend without fabricated data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("private connection info")),
    );
    await expect(getAnalytics("overview", parseContext({}))).rejects.toThrow(
      "Check that the ProductPulse API is running",
    );
  });
  it("rejects non-JSON upstream success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>bad response</html>")),
    );
    await expect(getAnalytics("overview", parseContext({}))).rejects.toThrow(
      "response could not be read",
    );
  });
});
