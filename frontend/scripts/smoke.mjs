// Read-only live HTTP acceptance checks. No fixtures or database writes.
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
const web = process.env.FRONTEND_URL ?? "http://127.0.0.1:3000";
const api = process.env.PRODUCTPULSE_API_URL ?? "http://127.0.0.1:8000";
async function page(path) {
  const response = await fetch(web + path);
  assert.equal(response.status, 200, path);
  return new JSDOM(await response.text()).window.document;
}
async function analytics(endpoint, params) {
  const response = await fetch(
    `${api}/api/analytics/${endpoint}?${new URLSearchParams(params)}`,
  );
  assert.equal(response.status, 200);
  return response.json();
}
if (process.argv.includes("--expect-unavailable")) {
  for (const path of [
    "/",
    "/funnels",
    "/retention",
    "/segments",
    "/experiments",
  ]) {
    const document = await page(path);
    assert.match(
      document.querySelector('[role="alert"]').textContent,
      /Check that the ProductPulse API is running/,
    );
    assert.equal(
      document.querySelectorAll(".metric-value,.funnel-count").length,
      0,
    );
  }
  console.log("Backend-unavailable pages verified; no fabricated metrics.");
} else {
  const results = [];
  for (const start of ["2025-06-01", "2025-04-02", "2025-01-01"]) {
    const end = start === "2025-01-01" ? "2025-01-01" : "2025-06-30";
    const apiEnd = start === "2025-01-01" ? "2025-01-02" : "2025-07-01";
    const result = await analytics("overview", {
      start_date: start,
      end_date: apiEnd,
    });
    const document = await page(`/?start=${start}&end=${end}`);
    const values = [...document.querySelectorAll(".metric-value")].map(
      (el) => el.textContent,
    );
    const m = result.metrics;
    const integer = (value) =>
      value == null ? "—" : new Intl.NumberFormat("en-US").format(value);
    const percentage = (value) =>
      value == null
        ? "—"
        : new Intl.NumberFormat("en-US", {
            style: "percent",
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          }).format(value);
    assert.equal(values[0], integer(m.dau.current));
    assert.equal(values[2], integer(m.mau.current));
    assert.equal(values[4], percentage(m.activation_rate.current));
    assert.equal(values[5], percentage(m.paid_conversion_rate.current));
    results.push({
      start,
      end,
      activation: values[4],
      paid: values[5],
      mau: values[2],
    });
  }
  assert.notEqual(
    results[0].paid,
    results[1].paid,
    "Changing dates must change real cohort results",
  );
  assert.equal(
    results[2].mau,
    "—",
    "Unobserved MAU window remains unavailable",
  );
  for (const dimension of [
    "acquisition_channel",
    "company_size",
    "country",
    "device_type",
  ]) {
    const document = await page(
      `/funnels?start=2025-01-01&end=2025-06-30&dimension=${dimension}`,
    );
    const total = await analytics("funnel", {
      start_date: "2025-01-01",
      end_date: "2025-07-01",
    });
    const split = await analytics("funnel", {
      start_date: "2025-01-01",
      end_date: "2025-07-01",
      dimension,
    });
    const counts = [...document.querySelectorAll(".funnel-count")].map((el) =>
      Number(el.textContent.replaceAll(",", "")),
    );
    assert.deepEqual(
      counts,
      total.groups[0].stages.map((stage) => stage.users),
    );
    const select = document.querySelector(".segment-picker select");
    assert.equal(select.options.length, split.groups.length + 1);
    console.log(
      "Full-dataset funnel and dimension verified:",
      dimension,
      counts.join(" → "),
    );
  }
  const invalid = await page("/?start=2025-06-30&end=2025-01-01");
  assert.match(
    invalid.querySelector('[role="alert"]').textContent,
    /Choose a valid date range/,
  );
  const pct = (value) =>
    value == null
      ? "—"
      : new Intl.NumberFormat("en-US", {
          style: "percent",
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }).format(value);
  const num = (value) =>
    value == null ? "—" : new Intl.NumberFormat("en-US").format(value);
  for (const dimension of [
    "acquisition_channel",
    "company_size",
    "country",
    "device_type",
  ]) {
    const params = {
      start_date: "2025-01-01",
      end_date: "2025-07-01",
      dimension,
    };
    const split = await analytics("segments", params);
    const overview = await analytics("overview", params);
    const document = await page(
      `/segments?start=2025-01-01&end=2025-06-30&dimension=${dimension}`,
    );
    const table = [...document.querySelectorAll("table")].find(
      (t) => t.caption?.textContent === "Segment metrics",
    );
    assert.equal(table.tBodies[0].rows.length, split.groups.length);
    for (const group of split.groups)
      assert.ok(
        [...table.tBodies[0].rows].some(
          (r) =>
            r.cells[1].textContent ===
              num(group.activation.completed_signups) &&
            r.cells[2].textContent === pct(group.activation.activation_rate) &&
            r.cells[3].textContent ===
              pct(group.monetization.paid_conversion_rate),
        ),
      );
    // Validation-only arithmetic checks cross-page denominators; no UI analytics calculations.
    const eligible = split.groups.reduce(
        (n, g) => n + g.activation.eligible_users,
        0,
      ),
      activated = split.groups.reduce(
        (n, g) => n + g.activation.activated_users,
        0,
      );
    assert.ok(
      Math.abs(
        activated / eligible - overview.metrics.activation_rate.current,
      ) < 1e-10,
    );
    assert.ok(
      Math.abs(
        split.groups.reduce((n, g) => n + g.monetization.mrr, 0) -
          overview.metrics.mrr.current,
      ) < 1e-6,
    );
    const retention = await analytics("retention", {
      ...params,
      max_weeks: "26",
    });
    const total = await analytics("retention", {
      start_date: params.start_date,
      end_date: params.end_date,
      max_weeks: "26",
    });
    const retentionPage = await page(
      `/retention?start=2025-01-01&end=2025-06-30&dimension=${dimension}`,
    );
    const matrix = retentionPage.querySelector(".retention-table");
    assert.equal(matrix.tBodies[0].rows.length, total.cohorts.length);
    for (let i = 0; i < total.cohorts.length; i++)
      for (let j = 0; j < total.cohorts[i].periods.length; j++)
        assert.equal(
          matrix.tBodies[0].rows[i].cells[j + 2].textContent,
          pct(total.cohorts[i].periods[j].retention_rate),
        );
    assert.ok(
      retention.cohorts.some((c) =>
        c.periods.some((p) => !p.observable && p.retention_rate === null),
      ),
    );
    console.log(
      "Retention matrix and segment consistency verified:",
      dimension,
    );
  }
  for (const id of [1, 2]) {
    const response = await fetch(`${api}/api/experiments/${id}/analysis`);
    assert.equal(response.status, 200);
    const data = await response.json();
    const document = await page(`/experiments?experiment=${id}`);
    assert.equal(
      document.querySelector(".interpretation").textContent,
      data.decision.interpretation,
    );
    const cards = document.querySelectorAll(".variant-card");
    data.variant_results.forEach((v, i) =>
      assert.equal(
        cards[i].querySelector(".metric-value").textContent,
        pct(v.conversion_rate),
      ),
    );
    assert.ok(
      document
        .querySelector(".effect-chart")
        .textContent.includes(
          pct(data.inference.confidence_interval.confidence_level),
        ),
    );
    console.log(
      `Experiment ${id}:`,
      data.decision.state,
      JSON.stringify({
        effect: data.effect.absolute_uplift,
        p: data.inference.p_value,
        ci: data.inference.confidence_interval,
        mature: data.population.mature,
        censored: data.population.censored,
      }),
    );
  }
  const missing = await page("/experiments?experiment=999");
  assert.match(
    missing.querySelector('[role="alert"]').textContent,
    /could not be found/,
  );
  const methods = await page("/methodology");
  assert.ok(methods.querySelector("#activation"));
  console.log(
    "All six routes, date changes, unavailable metrics, cross-page consistency and both experiment results passed.",
  );
  console.log(JSON.stringify(results, null, 2));
}
