# STEMBuild low-bandwidth and shared-device design

## Goal

STEMBuild should remain useful in schools where connectivity is intermittent, data bundles are expensive, Android phones are modest, computers are shared, and a class may have fewer robotics kits than learners.

The design uses **selective offline support**. It does not attempt to make every private or assessed workflow offline.

## Supported offline workflow

A learner can:

1. sign in while connected;
2. open an assigned lesson;
3. select **Download lesson**;
4. disconnect from the internet;
5. open the saved lesson from `/offline-lesson.html`;
6. read objectives, theory, safety notes, hardware variants, wiring, starter code, expected output and troubleshooting guidance;
7. save reading checkpoints, build notes, code drafts and troubleshooting notes locally;
8. reconnect while signed in as the same learner;
9. allow STEMBuild to synchronize those unfinished checkpoints in one batched API request;
10. continue the authenticated lesson and submit final evidence online.

Downloaded lesson packages deliberately exclude quiz questions/answers, teacher feedback, evidence files, other learners' data and AI context.

## Browser storage

STEMBuild uses IndexedDB rather than large `localStorage` payloads. Data is namespaced by learner ID:

- `lessons`: sanitized downloaded lesson packages;
- `drafts`: unfinished notes/code/checkpoints;
- `queue`: pending synchronization operations;
- `meta`: the currently active learner for this browser session.

On sign-out the active learner marker is removed. Another learner who signs in on the same device receives a different namespace and does not see the previous learner's offline drafts through the application. Learners can also choose **Clear my offline data** before leaving a shared computer.

This is a browser-level privacy control, not a replacement for operating-system accounts or managed-device policies. Schools using highly shared public computers should still use separate OS/browser profiles where practical.

## Background synchronization

Offline edits are queued as `CHECKPOINT_UPSERT` operations. The service worker uses Background Sync when the browser supports it and also retries when an `online` event occurs.

The sync endpoint:

- requires an authenticated STUDENT session;
- refuses operations whose `ownerId` does not match the authenticated learner;
- verifies the lesson is still assigned to an active class;
- verifies practical tasks belong to that lesson;
- limits each request to 25 operations;
- truncates text fields to defined limits;
- never accepts quiz answers, final practical completion, evidence uploads, rubric scores, AI-generated progress or teacher assessment.

A synchronized offline checkpoint may place a lesson into `IN_PROGRESS` and record a real `LESSON_STARTED` event with source `offline-sync`. It can never mark a practical task or lesson as successfully assessed.

## Service-worker caching policy

Cached:

- public landing shell;
- offline fallback page;
- static offline lesson reader;
- PWA icons;
- Next.js static assets already requested by the app.

Never cached by the service worker:

- `/dashboard/**` authenticated HTML;
- `/api/**` responses;
- `/login`;
- learner evidence;
- AI Lab Coach responses;
- teacher/admin data.

Lesson content is kept in IndexedDB only after the learner explicitly downloads it.

## Data efficiency

- Most STEMBuild pages remain React Server Components, keeping client-side JavaScript limited to PWA controls, connectivity state, local drafts and image compression.
- Offline synchronization batches up to 25 operations instead of sending a request on every keystroke.
- Drafts are stored locally immediately but are queued for synchronization only when the learner explicitly saves them.
- Photos larger than roughly 700 KB are resized to a maximum 1600-pixel side and encoded as WebP at moderate quality on-device when the browser supports it. PDFs are not modified.
- Evidence remains subject to the server's 3.5 MB upload limit.

## Shared robotics kits

`RoboticsKit` represents a physical school resource such as `KIT-01` attached to a hardware platform. `KitUsage` records one learner's use of that physical kit for a classroom practical task.

There is intentionally **no uniqueness rule preventing simultaneous learner usages for the same kit**. A pair or group may physically share one kit, but each learner receives their own:

- kit-usage record;
- practical attempt number;
- learning events;
- notes/troubleshooting history;
- evidence submission;
- rubric assessment and mastery record.

The kit ID is included as metadata on practical learning events so teachers can later distinguish learner difficulty from recurring problems associated with a particular physical kit.

## Offline boundaries

The following stay online-only:

- sign-in and account changes;
- quiz submission/scoring;
- final practical/project submission;
- evidence photo/PDF upload;
- teacher feedback and rubric scoring;
- certificates/badges issuance;
- AI Lab Coach generation/adaptation;
- admin operations.

This boundary prevents stale permissions, duplicate final submissions, fabricated progress, assessment-answer leakage and unsafe conflict resolution.
