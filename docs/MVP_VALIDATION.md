# STEMBuild MVP implementation and validation

Validation date: 7 October 2026. All learner activity used synthetic DEMO records; no pilot outcomes are implied.

## Completed MVP coverage

| Area | Implemented and checked |
| --- | --- |
| Learning-event system | Stored quiz, practical, project, board-selection, evidence and teacher-review events; progress changes only after the required quiz and teacher assessment. |
| Teacher analytics | Evidence-based summaries; rubric re-reviews replace the same criterion while preserving distinct criteria sharing a skill. Unknown skills remain unknown. |
| AI Lab Coach | Evidence-grounded guidance, labelled deterministic fallback, bounded model requests, teacher-owned assessment. Browser workflow exercises fallback without model credentials. |
| Offline/PWA | Downloaded lesson reader survives an offline reload; checkpoint queues synchronize on reconnect; older drafts cannot overwrite newer ones; cross-origin and foreign-learner operations are rejected. |
| Multi-board lessons | Uno/ESP32 showcase board switching and practical/project selection; board variants remain separate from shared lesson assessments. Robot starter firmware includes distance timeout and stops on missing sensor data. |
| Curriculum administration | Module creation and draft lesson creation with a quiz editor, practical task and rubric; publication requires complete active board variants. |
| Evidence and credentials | Private evidence authorization, MIME/signature and size checks, cleanup after failed persistence, strict rubric validation, all published projects required for course certificates and distinct tasks counted for badges. |

## Recorded local results

| Check | Result |
| --- | --- |
| TypeScript and ESLint | Passed |
| Unit regressions | 5 passed, 0 failed |
| Chromium workflow | 1 passed in 30.0 seconds |
| Optimized production build | Passed; all application routes generated |
| Production dependency audit | 0 vulnerabilities reported |
| GitHub CI | Check the pull request for the remote run; local results do not imply remote success. |

## Reproducible verification

- `npm run typecheck` and `npm run lint`.
- `npm test`: five focused regression tests for assessment input, evidence signatures, quiz drafts and analytics.
- `npm run build`: optimized production build.
- `npm audit --omit=dev --audit-level=high`: production dependency audit.
- `npm run verify:local`: committed migration + synthetic seed + isolated PostgreSQL-compatible PGlite + Chromium browser workflow. This creates its own temporary database and starts a development app. Install the Playwright Chromium browser first.
- GitHub CI uses PostgreSQL 16, committed migration deployment, the same code checks and the browser workflow. Its actual remote result must be checked before merging.

The browser workflow covers teacher assignment, learner login and role boundaries, board switching, quiz scoring, practical evidence upload and authorized retrieval, teacher rubric review, progress and event analytics, project assessment, AI fallback, downloaded offline reading, reconnect synchronization and admin curriculum authoring. Mobile learner and desktop teacher screenshots are generated under `test-results/` for visual review.

## Live deployment and pilot boundaries

Production database migration, private Vercel Blob operations and live AI Gateway responses still require deployment credentials and an environment-level smoke test. Local evidence storage is deliberately prohibited in production. Firmware has not been compiled with board-specific toolchains or validated on physical boards; a teacher must verify pin mappings, exact sensor versions, voltage levels and safe motor operation before classroom use. This MVP is not evidence of educational efficacy or completed school pilot activity.

Before a real pilot, finish the controls in `DEPLOYMENT.md`, configure real accounts, establish evidence retention/consent, and test representative low-end devices and school connectivity. Preserve teacher assessment ownership.

## Tools Competition attention

Prepare a concise product/demo narrative, evidence of learning-engineering instrumentation, evaluation plan, teacher workflow, budget and delivery milestones. Use this synthetic demo as implementation evidence only; do not describe the regression tests as learner-impact evidence. Track the application cycle and confirm the applicant's actual stage and official deadlines before claiming a submission or invitation. The weekly Friday summary should surface competition deliverables alongside product blockers.
