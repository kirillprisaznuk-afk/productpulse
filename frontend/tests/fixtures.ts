import type { components } from "@/types/api";
import type { OverviewData } from "@/features/overview";
type S = components["schemas"];
export const period = {
  start_date: "2025-06-01",
  end_date: "2025-07-01",
  as_of: "2025-07-01",
  fully_observed: true,
};
export const change: S["Comparison"] = {
  current: 120,
  previous: 100,
  absolute_change: 20,
  relative_change: 0.2,
  direction: "up",
};
const rate: S["Comparison"] = {
  current: 0.5428,
  previous: 0.52,
  absolute_change: 0.0228,
  relative_change: 0.0228 / 0.52,
  direction: "up",
};
const missing: S["Comparison"] = {
  current: null,
  previous: null,
  absolute_change: null,
  relative_change: null,
  direction: "unavailable",
};
export const activation: S["ActivationRow"] = {
  segment: "all",
  cohort_start: null,
  completed_signups: 140,
  eligible_users: 120,
  censored_users: 20,
  activated_users: 65,
  activation_rate: 0.5428,
  median_activation_seconds: 86400,
};
export const money: S["MonetizationValues"] = {
  eligible_accounts: 0,
  converted_accounts: 0,
  censored_accounts: 30,
  paid_conversion_rate: null,
  paid_users: 200,
  active_subscriptions: 50,
  mrr: 1000,
  arpu: 10,
  new_mrr: 100,
  churned_mrr: 20,
  opening_subscriptions: 40,
  churned_subscriptions: 2,
  churned_opening_subscriptions: 2,
  churn_rate: 0.05,
};
export const overviewData: OverviewData = {
  overview: {
    period,
    previous_period: {
      ...period,
      start_date: "2025-05-02",
      end_date: "2025-06-01",
    },
    dimension: null,
    segment_value: null,
    metrics: {
      dau: change,
      wau: change,
      mau: change,
      dau_mau: rate,
      activation_rate: rate,
      paid_conversion_rate: missing,
      mrr: { ...change, current: 1000 },
      churn_rate: rate,
    },
  },
  activity: {
    period,
    previous_period: period,
    dimension: null,
    segment_value: null,
    series: [
      {
        date: "2025-06-01",
        dau: 12,
        wau: 70,
        mau: 120,
        dau_mau: 0.1,
        wau_mau: 0.58,
      },
      {
        date: "2025-06-02",
        dau: 15,
        wau: 80,
        mau: 125,
        dau_mau: 0.12,
        wau_mau: 0.64,
      },
    ],
    comparisons: {},
  },
  activation: { period, dimension: null, groups: [activation], cohorts: [] },
  segments: {
    period,
    dimension: "acquisition_channel",
    groups: [{ segment: "referral", activation, monetization: money }],
  },
  monetization: {
    period,
    previous_period: period,
    dimension: null,
    segment_value: null,
    current: money,
    comparisons: {},
  },
};
export const funnel: S["FunnelResponse"] = {
  period,
  dimension: null,
  groups: [
    {
      segment: "all",
      median_signup_to_onboarding_seconds: 3600,
      median_signup_to_core_action_seconds: 86400,
      median_core_action_to_paid_seconds: 172800,
      stages: [
        {
          event_name: "landing_view",
          users: 100,
          conversion_from_previous: null,
          cumulative_conversion: 1,
          drop_off_count: null,
          drop_off_rate: null,
          median_seconds_from_previous: null,
        },
        {
          event_name: "signup_completed",
          users: 100,
          conversion_from_previous: 1,
          cumulative_conversion: 1,
          drop_off_count: 0,
          drop_off_rate: 0,
          median_seconds_from_previous: 60,
        },
        {
          event_name: "core_action",
          users: 50,
          conversion_from_previous: 0.5,
          cumulative_conversion: 0.5,
          drop_off_count: 50,
          drop_off_rate: 0.5,
          median_seconds_from_previous: 86400,
        },
        {
          event_name: "subscription_started",
          users: 10,
          conversion_from_previous: 0.2,
          cumulative_conversion: 0.1,
          drop_off_count: 40,
          drop_off_rate: 0.8,
          median_seconds_from_previous: 172800,
        },
      ],
    },
  ],
};
export const segmentedFunnel: S["FunnelResponse"] = {
  ...funnel,
  dimension: "acquisition_channel",
  groups: [
    {
      ...funnel.groups[0],
      segment: "referral",
      stages: funnel.groups[0].stages.map((stage) => ({
        ...stage,
        users: stage.users / 2,
      })),
    },
  ],
};
