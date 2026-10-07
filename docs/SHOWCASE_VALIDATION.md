# Public showcase and classroom workflow

## Public routes
- `/showcase/smart-environment-monitor`: twelve-step sample, Arduino Uno/classic ESP32 selection, DHT22 firmware, blank reading log, formative self-check, evidence guidance and six-criterion rubric.
- `/teachers`: account preparation, class creation, existing-student enrolment, assignment, review and offline guidance.
- `/about`: independent ownership, project stage, proposed pilot measures, sustainability questions and cost categories.

Public practice answers are transient browser state. They create no learner records, grades or certificates. Firmware and planning/log templates are available under `/lessons/`. The sample uses DHT22 by default; assigned lesson content may configure a different sensor. Teachers must verify exact board/sensor compatibility and physically test their kit.

## Verification
`npm run verify:local` creates an isolated transient PGlite database, applies the migration, seeds explicitly synthetic users/content and runs Playwright. It never seeds production. The classroom test creates a new class, enrols a learner and assigns the lesson/project; seeded assignments for that content are closed in the test database so the new class is the authoritative context. It checks practical evidence authorization, quiz records, teacher rubric completion, feedback/events, projects, analytics, rules-based AI guidance and offline sync/ownership. Public tests check phone layout, board-specific code/pins, knowledge feedback, downloads and guide/impact navigation. `npm run verify:public` builds and starts the production application locally, then also checks offline reload and board switching with cached production assets. Development-server hot reload dependencies are not used as evidence of production offline behaviour.

Install the official Playwright browser with `npx playwright install chromium`. If using an already reviewed Chromium executable, the configuration accepts `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; do not commit that machine-specific path or authentication state.

Build/lint/type checks and existing unit tests also apply. Automated browser workflow validation is distinct from physical firmware validation, live production authenticated testing and learning-impact evaluation. A provisioned production administrator, published classroom content and pilot consent arrangements remain prerequisites for a real school launch.

## Offline boundary
Service-worker cache v6 adds only the three public pages and four public downloads. Browser assets fetched while online are cached; private dashboards/APIs/evidence/authentication remain excluded. Saved assigned lessons retain the existing learner ownership controls. Browser storage eviction can remove offline content. Evidence uploads and teacher assessment require connectivity.
