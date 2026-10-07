# ProductPulse frontend

Next.js / React / TypeScript interface for Overview, Funnels, Retention, Segments, Experiments
and Methodology. Uses the existing design system and generated OpenAPI types with runtime Ajv
validation. Server-side requests keep database configuration out of the browser.

See the [main README](../README.md) for screenshots and one-click Docker launch,
[developer guide](../docs/DEVELOPMENT.md) for commands, and
[release validation](../docs/RELEASE.md) for current test results.

Dates, dimension, selected funnel/matrix segment, comparison cohort and selected experiment use
URL state. Curve visibility and table sorting are local presentation controls. Experiments use
fixed experiment windows independently of dashboard date filters. Analytics and statistical
interpretations are computed by FastAPI; React fetches, formats and displays them.

The API base is `PRODUCTPULSE_API_URL` (default `http://127.0.0.1:8000` for host development;
`http://api:8000` inside Compose). Copy `.env.example` to `.env.local` for host-only configuration.
Use Node 24 and pnpm 11.25.0. The authoritative lockfile is `pnpm-lock.yaml`.

`pnpm dev`, `pnpm build`, `pnpm start`, `pnpm test`, `pnpm lint`, `pnpm format:check`,
`pnpm typecheck`, `pnpm generate:api`. Live six-route acceptance: `node scripts/smoke.mjs`.

No authentication, tracking SDK, AI, imports or deployment. Browser review is manual; Playwright
is not a project dependency. Tests include accessible tables, null/censored data, experiment
states, planning, rule evidence and URL selection restoration.
