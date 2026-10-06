import { PageHeading } from "@/components/states";
export const metadata = { title: "Methodology" };
export default function MethodologyPage() {
  const definitions = [
    [
      "insights",
      "Descriptive rules and thresholds",
      "Key changes flag activation movements of at least 2 percentage points, MAU or MRR changes of at least 5% relative, and churn changes of at least 1 point. Segment activation must differ from the weighted overall rate by at least 5 points, with at least 100 mature users; signup share at 20% separates high-volume weaknesses from low-volume opportunities. These are descriptive thresholds, not significance tests.",
    ],
    [
      "cohort-signals",
      "Cohort and funnel signals",
      "Week 4 retention trends require three consecutive complete cohorts, each with at least 100 users, a monotonic movement and at least 3 percentage points from first to last. Best/weakest cohort ranges require the same 3-point spread. Same-cohort segment gaps require 5 points and 100 users per segment. Funnels require 100 entrants; slow transitions require 100 reached users and a median of at least one hour. End-to-end segment gaps require 2 points. No rule establishes causality.",
    ],
    [
      "priorities",
      "What appears first",
      "Signals use explicit ordering: material negative period changes, high-volume activation weaknesses, funnel losses, retention declines, segment opportunities and informative changes. Equal priorities use a stable rule and segment order. Overview shows up to four signals and does not invent messages to fill space. Experiment warnings and decision validity are displayed directly from the statistical engine.",
    ],
    [
      "segmentation",
      "Segment populations",
      "Dimensions are acquisition channel, company size, country and device type. Activation uses mature signup users; paid conversion uses mature accounts. Revenue is account stock at period end, attributed by the earliest account member. Sorting compares returned values, not a composite quality score.",
    ],
    [
      "inference",
      "Confidence and significance",
      "Absolute uplift is treatment minus control in percentage points. Relative uplift divides that difference by the control rate. Newcombe–Wilson intervals describe uncertainty in the absolute difference. A two-sided p-value is compared with alpha; significance is not the probability of success, practical importance or permission to roll out.",
    ],
    [
      "sensitivity",
      "SRM, MDE and planning",
      "Sample ratio mismatch (SRM) compares assignment counts against expected allocation. A warning calls for investigation, not an automatic diagnosis of a pipeline bug. MDE is the approximate positive effect detectable at target power under equal allocation and independent-user assumptions. Sample planning uses a normal approximation and must precede a fixed-horizon test; repeated peeking invalidates nominal error rates.",
    ],
    [
      "activity",
      "Active users",
      "An active user performs a core action. DAU counts one day; WAU and MAU count distinct users over rolling seven- and 30-day windows. Overview shows the last daily snapshot, not a sum across the selected period.",
    ],
    [
      "activation",
      "Activation",
      "First core action within seven days of completed signup. Only signups with seven fully observed days enter the denominator. Recent signups are censored, even when an early success is visible. Median time describes activated users.",
    ],
    [
      "funnel",
      "Funnel ordering",
      "Landing → signup completed → onboarding started → onboarding completed → core action → subscription started. Each event must occur strictly after its predecessor. Users enter during the chosen period and can progress until the observation cutoff. Recent entrants have less follow-up. Paid stage counts initiating users.",
    ],
    [
      "retention",
      "Retention and censoring",
      "Retention follows UTC Monday signup cohorts into calendar weeks. A cell is available only when both the signup cohort and activity week are fully observable. Unobserved cells remain unavailable rather than becoming zero. Date filters select signup cohorts, with follow-up to the observation cutoff. Curves compare segments within the same selected cohort; summary values describe individual latest observable cohorts and are not pooled averages.",
    ],
    [
      "paid",
      "Paid conversion and revenue",
      "Paid conversion is account-level: the share of eligible accounts starting a contract within 30 days of the earliest member’s signup. Accounts require 30 complete days. MRR sums active monthly contracts; ARPU divides MRR by all accounts, including free accounts. Churn measures cancelled opening subscriptions.",
    ],
    [
      "experiments",
      "Experiment methodology",
      "Assigned variants are preserved. Mature seven-day activation rates use a two-sided pooled proportion z-test and Newcombe–Wilson confidence interval. SRM checks 50/50 allocation. Statistical significance is separate from practical relevance and never automatically recommends rollout. Snapshot inference does not support continuous peeking.",
    ],
  ];
  return (
    <>
      <PageHeading
        eyebrow="Workspace / Methodology"
        title="Know what you’re measuring"
        description="Definitions, observation windows and the limits of this dataset."
      />
      <div className="methodology-intro panel">
        <h2>A fixed, synthetic observation window</h2>
        <p>
          TaskHarbor is a fictional B2B SaaS product. All data is synthetic,
          observed from 1 January through 30 June 2025 in UTC. Date presets end
          at the dataset cutoff, not today.
        </p>
        <p>
          UI date ranges include both displayed dates. The API uses an exclusive
          end date. Comparisons use the immediately preceding period of equal
          length. Rate changes use percentage points; count and revenue changes
          use relative percentages.
        </p>
        <p>
          A dash (—) means unavailable or undefined. It never implies zero. No
          results are fabricated when the API cannot be reached.
        </p>
      </div>
      <div className="methodology-grid">
        {definitions.map(([id, title, text]) => (
          <section id={id} className="panel" key={id}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
      </div>
    </>
  );
}
