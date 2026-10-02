# STEMBuild low-bandwidth and shared-device design

## Goal
STEMBuild should remain useful where connectivity is intermittent, data bundles are expensive, Android devices are modest, computers are shared, and classes have fewer robotics kits than learners.

## Supported offline workflow
A learner can sign in online, explicitly download an assigned lesson, disconnect, read objectives/theory/safety/wiring/starter code/troubleshooting, save unfinished notes/code/checkpoints locally, reconnect as the same learner, synchronize drafts in a batched authenticated request, then submit final evidence online.

Downloaded lesson packages exclude quiz questions/answers, teacher feedback, evidence files, other learners' data and AI context.

## Browser storage
IndexedDB stores sanitized lesson packages, drafts, pending sync operations and the active learner namespace. Data is namespaced by learner ID. Shared-device users can clear their own offline data before sign-out.

## Synchronization rules
Offline checkpoint sync:
- requires an authenticated STUDENT session;
- rejects another learner's owner ID;
- verifies the lesson is still assigned;
- verifies practical-task ownership;
- batches at most 25 operations;
- truncates free text to server limits;
- may record IN_PROGRESS/LESSON_STARTED;
- can never mark practical work or a lesson as successfully assessed.

## Cache policy
Cached: public shell, offline reader, PWA icons and requested static assets.
Never cached: authenticated dashboard HTML, APIs, login, evidence, AI Lab Coach responses, teacher/admin data.
Lesson content enters IndexedDB only after explicit learner download.

## Data efficiency
Most pages remain React Server Components. Client JavaScript is limited to PWA controls, connectivity, offline drafts and image compression. Sync is batched rather than sent on every keystroke. Large photos are resized on-device to a maximum 1600px side and WebP where useful. PDFs are unchanged.

## Shared robotics kits
A RoboticsKit represents a physical school resource. KitUsage records one learner's use of that kit for a classroom practical task. Multiple learners may physically share the same kit, but every learner keeps an independent usage record, attempt number, learning events, notes, evidence, rubric assessment and mastery record. Kit IDs are attached to practical event metadata so recurring physical-kit problems can later be distinguished from learner difficulty.

## Online-only boundaries
The following remain online-only: sign-in/account changes, quiz submission/scoring, final practical/project submission, evidence upload, teacher feedback/rubric scoring, certificates/badges, AI Lab Coach generation/adaptation and admin operations.

These boundaries prevent stale permissions, duplicate final submissions, fabricated progress, assessment-answer leakage and unsafe conflict resolution.
