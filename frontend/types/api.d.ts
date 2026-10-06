export interface paths {
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health */
        get: operations["health_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/demo/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Demo Summary */
        get: operations["demo_summary_api_demo_summary_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/analytics/overview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Overview */
        get: operations["get_overview_api_analytics_overview_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/analytics/activity": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Activity */
        get: operations["get_activity_api_analytics_activity_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/analytics/activation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Activation */
        get: operations["get_activation_api_analytics_activation_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/analytics/funnel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Funnel */
        get: operations["get_funnel_api_analytics_funnel_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/analytics/retention": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Retention */
        get: operations["get_retention_api_analytics_retention_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/analytics/segments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Segments */
        get: operations["get_segments_api_analytics_segments_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/analytics/monetization": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Monetization */
        get: operations["get_monetization_api_analytics_monetization_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/experiments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Experiments */
        get: operations["list_experiments_api_experiments_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/experiments/workspace": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Experiment Workspace */
        get: operations["experiment_workspace_api_experiments_workspace_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/experiments/{experiment_id}/analysis": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Experiment Analysis */
        get: operations["experiment_analysis_api_experiments__experiment_id__analysis_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/experiments/power": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Sample Size */
        post: operations["sample_size_api_experiments_power_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/experiments/mde": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Mde */
        post: operations["mde_api_experiments_mde_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** ActivationResponse */
        ActivationResponse: {
            period: components["schemas"]["Period"];
            dimension: components["schemas"]["Dimension"] | null;
            /** Groups */
            groups: components["schemas"]["ActivationRow"][];
            /** Cohorts */
            cohorts: components["schemas"]["ActivationRow"][];
        };
        /** ActivationRow */
        ActivationRow: {
            /** Segment */
            segment: string;
            /** Cohort Start */
            cohort_start?: string | null;
            /** Completed Signups */
            completed_signups: number;
            /** Eligible Users */
            eligible_users: number;
            /** Censored Users */
            censored_users: number;
            /** Activated Users */
            activated_users: number;
            /** Activation Rate */
            activation_rate: number | null;
            /** Median Activation Seconds */
            median_activation_seconds: number | null;
        };
        /** ActivityPoint */
        ActivityPoint: {
            /**
             * Date
             * Format: date
             */
            date: string;
            /** Dau */
            dau: number | null;
            /** Wau */
            wau: number | null;
            /** Mau */
            mau: number | null;
            /** Dau Mau */
            dau_mau: number | null;
            /** Wau Mau */
            wau_mau: number | null;
        };
        /** ActivityResponse */
        ActivityResponse: {
            period: components["schemas"]["Period"];
            previous_period: components["schemas"]["Period"];
            dimension: components["schemas"]["Dimension"] | null;
            /** Segment Value */
            segment_value: string | null;
            /** Series */
            series: components["schemas"]["ActivityPoint"][];
            /** Comparisons */
            comparisons: {
                [key: string]: components["schemas"]["Comparison"];
            };
        };
        /** Comparison */
        Comparison: {
            /** Current */
            current: number | null;
            /** Previous */
            previous: number | null;
            /** Absolute Change */
            absolute_change: number | null;
            /** Relative Change */
            relative_change: number | null;
            /**
             * Direction
             * @enum {string}
             */
            direction: "up" | "down" | "flat" | "unavailable";
        };
        /** ConfidenceInterval */
        ConfidenceInterval: {
            /** Confidence Level */
            confidence_level: number;
            /** Lower */
            lower: number;
            /** Point Estimate */
            point_estimate: number;
            /** Upper */
            upper: number;
            /**
             * Method
             * @default newcombe_wilson_no_continuity_correction
             */
            method: string;
        };
        /** Decision */
        Decision: {
            /**
             * State
             * @enum {string}
             */
            state: "INSUFFICIENT_DATA" | "POSITIVE_SIGNIFICANT" | "NEGATIVE_SIGNIFICANT" | "NO_SIGNIFICANT_DIFFERENCE" | "DATA_QUALITY_WARNING";
            /** Interpretation */
            interpretation: string;
            /**
             * Next Action
             * @enum {string}
             */
            next_action: "review_data_quality" | "collect_mature_data" | "review_product_relevance" | "review_potential_harm" | "no_rollout_evidence";
            /**
             * Rollout Recommended
             * @default false
             */
            rollout_recommended: boolean;
        };
        /** DemoSummary */
        DemoSummary: {
            /** Dataset Start */
            dataset_start: string | null;
            /** Dataset End */
            dataset_end: string | null;
            /** Accounts */
            accounts: number;
            /** Users */
            users: number;
            /** Events */
            events: number;
            /** Subscriptions */
            subscriptions: number;
            /** Experiments */
            experiments: number;
            /** Experiment Assignments */
            experiment_assignments: number;
        };
        /**
         * Dimension
         * @enum {string}
         */
        Dimension: "acquisition_channel" | "company_size" | "country" | "device_type";
        /** Effect */
        Effect: {
            /** Absolute Uplift */
            absolute_uplift: number | null;
            /** Relative Uplift */
            relative_uplift: number | null;
            /** Practical Threshold */
            practical_threshold: number | null;
            /** Exceeds Practical Threshold */
            exceeds_practical_threshold: boolean | null;
        };
        /** ExperimentAnalysis */
        ExperimentAnalysis: {
            /**
             * As Of
             * Format: date
             */
            as_of: string;
            metadata: components["schemas"]["ExperimentMetadata"];
            population: components["schemas"]["Population"];
            /** Variant Results */
            variant_results: components["schemas"]["VariantResult"][];
            effect: components["schemas"]["Effect"];
            inference: components["schemas"]["Inference"];
            health: components["schemas"]["app__experiments__contracts__Health"];
            power: components["schemas"]["Sensitivity"];
            decision: components["schemas"]["Decision"];
            /**
             * Methodological Limitations
             * @default [
             *       "Fixed-horizon snapshot inference; repeated peeking does not preserve nominal error rates.",
             *       "User-level independence is assumed; shared-account dependence is not adjusted.",
             *       "One primary metric per experiment; no joint correction across experiments."
             *     ]
             */
            methodological_limitations: string[];
        };
        /** ExperimentList */
        ExperimentList: {
            /**
             * As Of
             * Format: date
             */
            as_of: string;
            /** Experiments */
            experiments: components["schemas"]["ExperimentListItem"][];
        };
        /** ExperimentListItem */
        ExperimentListItem: {
            /** Id */
            id: number;
            /** Name */
            name: string;
            /** Description */
            description: string;
            /** Status */
            status: string;
            /** Primary Metric */
            primary_metric: string;
            /**
             * Started At
             * Format: date-time
             */
            started_at: string;
            /**
             * Ended At
             * Format: date-time
             */
            ended_at: string;
            /**
             * Variants
             * @default [
             *       "control",
             *       "treatment"
             *     ]
             */
            variants: ("control" | "treatment")[];
            /**
             * Expected Allocation
             * @default {
             *       "control": 0.5,
             *       "treatment": 0.5
             *     }
             */
            expected_allocation: {
                [key: string]: number;
            };
            /** Assignment Counts */
            assignment_counts: {
                [key: string]: number;
            };
        };
        /** ExperimentMetadata */
        ExperimentMetadata: {
            /** Id */
            id: number;
            /** Name */
            name: string;
            /** Description */
            description: string;
            /** Status */
            status: string;
            /** Primary Metric */
            primary_metric: string;
            /**
             * Started At
             * Format: date-time
             */
            started_at: string;
            /**
             * Ended At
             * Format: date-time
             */
            ended_at: string;
            /**
             * Variants
             * @default [
             *       "control",
             *       "treatment"
             *     ]
             */
            variants: ("control" | "treatment")[];
            /**
             * Expected Allocation
             * @default {
             *       "control": 0.5,
             *       "treatment": 0.5
             *     }
             */
            expected_allocation: {
                [key: string]: number;
            };
        };
        /** ExperimentWorkspace */
        ExperimentWorkspace: {
            listing: components["schemas"]["ExperimentList"];
            /** Analyses */
            analyses: components["schemas"]["ExperimentAnalysis"][];
        };
        /** FunnelGroup */
        FunnelGroup: {
            /** Segment */
            segment: string;
            /** Stages */
            stages: components["schemas"]["FunnelStage"][];
            /** Median Signup To Onboarding Seconds */
            median_signup_to_onboarding_seconds: number | null;
            /** Median Signup To Core Action Seconds */
            median_signup_to_core_action_seconds: number | null;
            /** Median Core Action To Paid Seconds */
            median_core_action_to_paid_seconds: number | null;
            /** Insights */
            insights?: components["schemas"]["Insight"][];
        };
        /** FunnelResponse */
        FunnelResponse: {
            period: components["schemas"]["Period"];
            dimension: components["schemas"]["Dimension"] | null;
            /** Groups */
            groups: components["schemas"]["FunnelGroup"][];
            /** Insights */
            insights?: components["schemas"]["Insight"][];
        };
        /** FunnelStage */
        FunnelStage: {
            /** Event Name */
            event_name: string;
            /** Users */
            users: number;
            /** Conversion From Previous */
            conversion_from_previous: number | null;
            /** Cumulative Conversion */
            cumulative_conversion: number | null;
            /** Drop Off Count */
            drop_off_count: number | null;
            /** Drop Off Rate */
            drop_off_rate: number | null;
            /** Median Seconds From Previous */
            median_seconds_from_previous: number | null;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** Inference */
        Inference: {
            /**
             * Method
             * @default two_sided_pooled_two_proportion_z_test
             */
            method: string;
            /**
             * Null Hypothesis
             * @default treatment_rate = control_rate
             */
            null_hypothesis: string;
            /**
             * Alternative Hypothesis
             * @default treatment_rate != control_rate
             */
            alternative_hypothesis: string;
            /** Alpha */
            alpha: number;
            /** Test Statistic */
            test_statistic: number | null;
            /** P Value */
            p_value: number | null;
            /** Significant */
            significant: boolean | null;
            confidence_interval: components["schemas"]["ConfidenceInterval"] | null;
            /** Approximation Valid */
            approximation_valid: boolean;
            /** Valid For Decision */
            valid_for_decision: boolean;
            /** Unavailable Reason */
            unavailable_reason: string | null;
        };
        /** Insight */
        Insight: {
            /** Rule */
            rule: string;
            /**
             * Severity
             * @enum {string}
             */
            severity: "critical" | "warning" | "opportunity" | "information";
            /** Priority */
            priority: number;
            /**
             * Category
             * @enum {string}
             */
            category: "change" | "funnel" | "retention" | "segment";
            /** Metric */
            metric: string;
            /** Message */
            message: string;
            /** Evidence */
            evidence: {
                [key: string]: number | string | null;
            };
            /**
             * Destination
             * @enum {string}
             */
            destination: "/" | "/funnels" | "/retention" | "/segments";
            /** Segment */
            segment?: string | null;
            /** Cohort Start */
            cohort_start?: string | null;
            /**
             * Caveat
             * @default Descriptive comparison; not a significance test or causal conclusion.
             */
            caveat: string;
        };
        /** MDERequest */
        MDERequest: {
            /** Baseline Rate */
            baseline_rate: number;
            /** Sample Size Per Variant */
            sample_size_per_variant: number;
            /**
             * Alpha
             * @default 0.05
             * @enum {number}
             */
            alpha: 0.01 | 0.05 | 0.1;
            /**
             * Target Power
             * @default 0.8
             */
            target_power: number;
        };
        /** MDEResult */
        MDEResult: {
            /** Baseline Rate */
            baseline_rate: number | null;
            /** Sample Size Per Variant */
            sample_size_per_variant: number;
            /** Alpha */
            alpha: number;
            /** Target Power */
            target_power: number;
            /** Absolute Mde */
            absolute_mde: number | null;
            /** Relative Mde */
            relative_mde: number | null;
            /** Unavailable Reason */
            unavailable_reason?: string | null;
            /**
             * Method
             * @default inverse_equal_allocation_normal_approximation
             */
            method: string;
        };
        /** MonetizationResponse */
        MonetizationResponse: {
            period: components["schemas"]["Period"];
            previous_period: components["schemas"]["Period"];
            dimension: components["schemas"]["Dimension"] | null;
            /** Segment Value */
            segment_value: string | null;
            current: components["schemas"]["MonetizationValues"];
            /** Comparisons */
            comparisons: {
                [key: string]: components["schemas"]["Comparison"];
            };
        };
        /** MonetizationValues */
        MonetizationValues: {
            /** Eligible Accounts */
            eligible_accounts: number | null;
            /** Converted Accounts */
            converted_accounts: number | null;
            /** Censored Accounts */
            censored_accounts: number | null;
            /** Paid Conversion Rate */
            paid_conversion_rate: number | null;
            /** Paid Users */
            paid_users: number | null;
            /** Active Subscriptions */
            active_subscriptions: number | null;
            /** Mrr */
            mrr: number | null;
            /** Arpu */
            arpu: number | null;
            /** New Mrr */
            new_mrr: number | null;
            /** Churned Mrr */
            churned_mrr: number | null;
            /** Opening Subscriptions */
            opening_subscriptions: number | null;
            /** Churned Subscriptions */
            churned_subscriptions: number | null;
            /** Churned Opening Subscriptions */
            churned_opening_subscriptions: number | null;
            /** Churn Rate */
            churn_rate: number | null;
        };
        /** OverviewResponse */
        OverviewResponse: {
            period: components["schemas"]["Period"];
            previous_period: components["schemas"]["Period"];
            dimension: components["schemas"]["Dimension"] | null;
            /** Segment Value */
            segment_value: string | null;
            /** Metrics */
            metrics: {
                [key: string]: components["schemas"]["Comparison"];
            };
            /** Insights */
            insights?: components["schemas"]["Insight"][];
        };
        /** Period */
        Period: {
            /**
             * Start Date
             * Format: date
             */
            start_date: string;
            /**
             * End Date
             * Format: date
             */
            end_date: string;
            /**
             * As Of
             * Format: date
             */
            as_of: string;
            /** Fully Observed */
            fully_observed: boolean;
        };
        /** PlanningRequest */
        PlanningRequest: {
            /** Baseline Rate */
            baseline_rate: number;
            /** Minimum Detectable Effect */
            minimum_detectable_effect: number;
            /**
             * Effect Mode
             * @default absolute
             * @enum {string}
             */
            effect_mode: "absolute" | "relative";
            /**
             * Alpha
             * @default 0.05
             * @enum {number}
             */
            alpha: 0.01 | 0.05 | 0.1;
            /**
             * Target Power
             * @default 0.8
             */
            target_power: number;
        };
        /** PlanningResponse */
        PlanningResponse: {
            /** Baseline Rate */
            baseline_rate: number;
            /** Treatment Rate */
            treatment_rate: number;
            /** Absolute Mde */
            absolute_mde: number;
            /** Relative Mde */
            relative_mde: number;
            /** Alpha */
            alpha: number;
            /** Target Power */
            target_power: number;
            /** Required Sample Per Variant */
            required_sample_per_variant: number;
            /** Required Total Sample */
            required_total_sample: number;
            /**
             * Method
             * @default equal_allocation_normal_approximation
             */
            method: string;
            /**
             * Assumptions
             * @default Independent users, fixed horizon, positive effect, equal allocation.
             */
            assumptions: string;
        };
        /** Population */
        Population: {
            /** Assigned */
            assigned: number;
            /** Mature */
            mature: number;
            /** Censored */
            censored: number;
            /** Invalid */
            invalid: number;
            /** Valid */
            valid: number;
            /** Maturity Fraction */
            maturity_fraction: number | null;
            /**
             * Outcome Window Days
             * @default 7
             */
            outcome_window_days: number;
            /** Horizon Fully Observed */
            horizon_fully_observed: boolean;
        };
        /** RetentionCell */
        RetentionCell: {
            /** Week */
            week: number;
            /** Observable */
            observable: boolean;
            /** Active Users */
            active_users: number | null;
            /** Retention Rate */
            retention_rate: number | null;
        };
        /** RetentionCohort */
        RetentionCohort: {
            /** Segment */
            segment: string;
            /**
             * Cohort Start
             * Format: date
             */
            cohort_start: string;
            /** Cohort Size */
            cohort_size: number;
            /** Complete Cohort */
            complete_cohort: boolean;
            /** Periods */
            periods: components["schemas"]["RetentionCell"][];
        };
        /** RetentionResponse */
        RetentionResponse: {
            period: components["schemas"]["Period"];
            dimension: components["schemas"]["Dimension"] | null;
            /** Cohorts */
            cohorts: components["schemas"]["RetentionCohort"][];
            /** Insights */
            insights?: components["schemas"]["Insight"][];
        };
        /** SRMResult */
        SRMResult: {
            /**
             * Expected Allocation
             * @default {
             *       "control": 0.5,
             *       "treatment": 0.5
             *     }
             */
            expected_allocation: {
                [key: string]: number;
            };
            /** Observed Counts */
            observed_counts: {
                [key: string]: number;
            };
            /** Chi Square */
            chi_square: number | null;
            /** P Value */
            p_value: number | null;
            /**
             * Threshold
             * @default 0.01
             */
            threshold: number;
            /** Warning */
            warning: boolean | null;
        };
        /** SegmentRow */
        SegmentRow: {
            /** Segment */
            segment: string;
            activation: components["schemas"]["ActivationRow"];
            monetization: components["schemas"]["MonetizationValues"];
        };
        /** SegmentsResponse */
        SegmentsResponse: {
            period: components["schemas"]["Period"];
            dimension: components["schemas"]["Dimension"];
            /** Groups */
            groups: components["schemas"]["SegmentRow"][];
            /** Insights */
            insights?: components["schemas"]["Insight"][];
        };
        /** Sensitivity */
        Sensitivity: {
            current_mde: components["schemas"]["MDEResult"];
            /**
             * Planning Baseline Source
             * @default observed_mature_control_rate_for_sensitivity_only
             */
            planning_baseline_source: string;
            /** Required Sample Per Variant */
            required_sample_per_variant: number | null;
            /** Sufficient For Configured Threshold */
            sufficient_for_configured_threshold: boolean | null;
            /**
             * Observed Power Calculated
             * @default false
             */
            observed_power_calculated: boolean;
        };
        /** ValidationError */
        ValidationError: {
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
        };
        /** VariantResult */
        VariantResult: {
            /**
             * Variant
             * @enum {string}
             */
            variant: "control" | "treatment";
            /** Assigned */
            assigned: number;
            /** Mature */
            mature: number;
            /** Censored */
            censored: number;
            /** Invalid */
            invalid: number;
            /** Conversions */
            conversions: number;
            /** Conversion Rate */
            conversion_rate: number | null;
        };
        /** Health */
        app__experiments__contracts__Health: {
            /**
             * Status
             * @enum {string}
             */
            status: "healthy" | "warning" | "insufficient_data";
            srm: components["schemas"]["SRMResult"];
            /** Data Valid */
            data_valid: boolean;
            /** Measurement Window Valid */
            measurement_window_valid: boolean;
            /** Invalid Assignment Timing */
            invalid_assignment_timing: number;
            /** Missing Or Mismatched Signup */
            missing_or_mismatched_signup: number;
            /** Pre Assignment Outcomes */
            pre_assignment_outcomes: number;
            /** Warnings */
            warnings: string[];
        };
        /** Health */
        app__schemas__demo__Health: {
            /** Status */
            status: string;
            /** Database */
            database: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    health_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["app__schemas__demo__Health"];
                };
            };
        };
    };
    demo_summary_api_demo_summary_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DemoSummary"];
                };
            };
        };
    };
    get_overview_api_analytics_overview_get: {
        parameters: {
            query?: {
                start_date?: string;
                end_date?: string;
                as_of?: string;
                dimension?: components["schemas"]["Dimension"] | null;
                segment_value?: string | null;
                max_weeks?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OverviewResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_activity_api_analytics_activity_get: {
        parameters: {
            query?: {
                start_date?: string;
                end_date?: string;
                as_of?: string;
                dimension?: components["schemas"]["Dimension"] | null;
                segment_value?: string | null;
                max_weeks?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActivityResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_activation_api_analytics_activation_get: {
        parameters: {
            query?: {
                start_date?: string;
                end_date?: string;
                as_of?: string;
                dimension?: components["schemas"]["Dimension"] | null;
                segment_value?: string | null;
                max_weeks?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActivationResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_funnel_api_analytics_funnel_get: {
        parameters: {
            query?: {
                start_date?: string;
                end_date?: string;
                as_of?: string;
                dimension?: components["schemas"]["Dimension"] | null;
                segment_value?: string | null;
                max_weeks?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FunnelResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_retention_api_analytics_retention_get: {
        parameters: {
            query?: {
                start_date?: string;
                end_date?: string;
                as_of?: string;
                dimension?: components["schemas"]["Dimension"] | null;
                segment_value?: string | null;
                max_weeks?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RetentionResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_segments_api_analytics_segments_get: {
        parameters: {
            query?: {
                start_date?: string;
                end_date?: string;
                as_of?: string;
                dimension?: components["schemas"]["Dimension"] | null;
                segment_value?: string | null;
                max_weeks?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SegmentsResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_monetization_api_analytics_monetization_get: {
        parameters: {
            query?: {
                start_date?: string;
                end_date?: string;
                as_of?: string;
                dimension?: components["schemas"]["Dimension"] | null;
                segment_value?: string | null;
                max_weeks?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MonetizationResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_experiments_api_experiments_get: {
        parameters: {
            query?: {
                as_of?: string;
                alpha?: 0.01 | 0.05 | 0.1;
                target_power?: number;
                practical_threshold?: number | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExperimentList"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    experiment_workspace_api_experiments_workspace_get: {
        parameters: {
            query?: {
                as_of?: string;
                alpha?: 0.01 | 0.05 | 0.1;
                target_power?: number;
                practical_threshold?: number | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExperimentWorkspace"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    experiment_analysis_api_experiments__experiment_id__analysis_get: {
        parameters: {
            query?: {
                as_of?: string;
                alpha?: 0.01 | 0.05 | 0.1;
                target_power?: number;
                practical_threshold?: number | null;
            };
            header?: never;
            path: {
                experiment_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExperimentAnalysis"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    sample_size_api_experiments_power_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PlanningRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlanningResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    mde_api_experiments_mde_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MDERequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MDEResult"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
}
