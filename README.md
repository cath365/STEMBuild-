# STEMBuild: Robotics & IoT

Independent education-technology MVP for measuring practical STEM skills, not just quiz completion.

> **Ownership boundary:** This project is independent. It contains no Robotix Institute branding, curriculum, student data, logos, private information, or resources. Seed data is synthetic and labeled **DEMO**.

## 1. Proposed architecture

### Application architecture

- **Next.js 16 App Router + TypeScript**: responsive student, teacher and admin web application.
- **PostgreSQL + Prisma 7**: normalized learning, hardware, evidence, assessment and analytics data.
- **Server Actions / Route Handlers**: mutations and uploads stay server-side with role checks.
- **Private Vercel Blob**: student evidence images/files are private by default; only metadata and object paths are stored in PostgreSQL.
- **Session authentication**: password hashes use Node `scrypt`; browser sessions use random opaque tokens, hashed in the database, sent only in HttpOnly/Secure/SameSite cookies.
- **PWA shell**: installable manifest and a conservative service worker that caches only public/static pages. Private learner records are not cached on shared devices.
- **AI assistance boundary**: MVP exposes a lesson troubleshooting assistant based on approved lesson guidance. It does not auto-grade practical work or invent skill scores. A provider adapter can be added later.

### Domain boundaries

1. **Identity & tenancy** — users, roles, schools, classes, enrollments, sessions.
2. **Curriculum** — courses, modules, lessons, outcomes, components, hardware-specific lesson variants.
3. **Assessment** — quizzes, practical tasks, evidence, troubleshooting attempts, rubrics and teacher scoring.
4. **Learning state** — assignments, lesson progress, badge/certificate eligibility.
5. **Analytics** — computed from attempts, rubric criteria, submissions and completion events.

### Hardware abstraction

A lesson is hardware-agnostic. Hardware-specific details live in `LessonHardwareVariant` records. The same lesson can therefore have Arduino Uno, ESP32, micro:bit, Pico, Nano or STM32 variants with different pins, code and wiring without duplicating the learning objective.

## 2. Data model

Key relationships:

- `School -> User / Classroom`
- `Classroom -> ClassEnrollment -> Student`
- `Course -> Module -> Lesson`
- `Lesson <-> LearningOutcome`
- `Lesson -> LessonHardwareVariant -> HardwarePlatform`
- `LessonHardwareVariant -> VariantComponent -> Component`
- `Lesson -> Quiz -> QuizQuestion -> QuizAttempt -> QuizAnswer`
- `Lesson -> PracticalTask -> PracticalSubmission`
- `PracticalSubmission -> EvidenceAsset / TroubleshootingAttempt / PracticalAssessment`
- `Rubric -> RubricCriterion -> CriterionScore`
- `Classroom -> LessonAssignment / ProjectAssignment`
- `User + Lesson -> LessonProgress`
- `Project -> ProjectHardware / ProjectSubmission`
- `Course -> Certificate`; `BadgeDefinition -> StudentBadge`

See `prisma/schema.prisma` for the complete implementation.

## 3. Page map

### Public
- `/` — product overview and practical-skills problem
- `/login` — secure sign-in
- `/offline` — safe PWA fallback

### Student
- `/dashboard/student` — overview, current path, pending work
- `/dashboard/student/learning-path` — 10-module beginner pathway
- `/dashboard/student/lessons/[lessonId]` — theory, components, board variant, wiring/code, safety, practical task, quiz and evidence
- `/dashboard/student/projects` — assigned projects and submissions
- `/dashboard/student/progress` — lesson, quiz and practical progress

### Teacher
- `/dashboard/teacher` — class summary and review queue
- `/dashboard/teacher/classes` — create/view classes
- `/dashboard/teacher/classes/[classId]` — roster, assignments and learner status
- `/dashboard/teacher/reviews` — practical evidence awaiting review
- `/dashboard/teacher/analytics` — quiz vs practical performance, attempts and completion

### Administrator
- `/dashboard/admin` — system overview
- `/dashboard/admin/users` — users and roles
- `/dashboard/admin/schools` — schools
- `/dashboard/admin/curriculum` — courses, modules, lessons and projects
- `/dashboard/admin/hardware` — boards and components
- `/dashboard/admin/rubrics` — rubrics and criteria
- `/dashboard/admin/outcomes` — learning outcomes

## 4. MVP implementation plan

### Phase 1 — Foundation
- Project shell, responsive design system, PWA metadata.
- PostgreSQL/Prisma schema and secure session authentication.
- Role-aware dashboard shell and authorization helpers.

### Phase 2 — Curriculum + hardware abstraction
- Beginner 10-module pathway.
- Multi-board lesson variants for Arduino Uno, Nano, ESP32, BBC micro:bit, Raspberry Pi Pico and STM32.
- Components, safety, wiring, code, expected output and troubleshooting content model.

### Phase 3 — Practical assessment
- Quizzes and attempts.
- Practical tasks, private evidence upload, troubleshooting logs and submission workflow.
- Teacher rubric scoring and feedback.

### Phase 4 — Teacher/admin operations
- Classes, enrollments and assignments.
- Curriculum/hardware/rubric administration surfaces.
- Review queue and skill-level analytics.

### Phase 5 — Validation + deployment
- Typecheck/lint/build, migrations and seed verification.
- Vercel environment setup and private Blob configuration.
- GitHub branch/repository push.

## Local setup

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The seed script creates only synthetic records prefixed/labeled as **DEMO**.


## Learning engineering v0.2

STEMBuild now includes a structured learner-event layer for meaningful learning actions such as lesson starts/completions, quiz answers, practical attempts, evidence uploads, rubric scoring, hints, troubleshooting, code submissions and hardware selections. Teacher and learner analytics are calculated from these stored events rather than page views or fabricated AI insights.

The platform also uses a controlled 12-skill taxonomy covering electronics fundamentals, circuit building, microcontroller programming, digital I/O, analog input, sensors, motors, communication protocols, debugging, IoT, robotics and problem solving.

See `docs/LEARNING_DATA.md` for the event schema, analytics rules, privacy model and future education-research guidance.

## Security notes

- No plaintext passwords are stored.
- Session tokens are stored only as SHA-256 hashes in PostgreSQL.
- Role checks are performed server-side for protected pages/actions.
- Student evidence is restricted to image/PDF MIME types, size-limited, and stored in private Blob storage.
- Private dashboard pages use `no-store` patterns and are excluded from service-worker caching.
- Practical grades remain teacher-owned; the assistant can explain/troubleshoot but does not issue final practical scores.


## STEMBuild AI Lab Coach

The student dashboard includes an evidence-grounded AI Lab Coach. It follows **OBSERVE → REASON → PLAN → GUIDE → CHECK → ADAPT**, uses stored learner evidence, clearly labels AI-generated guidance, and logs recommendations for later evaluation. It never marks practical work as passed and has no capability to control physical hardware. See `docs/AI_LAB_COACH.md`.

## Low-bandwidth PWA and shared-kit support

STEMBuild now includes a selective low-bandwidth mode for schools with unstable internet, limited mobile data, affordable Android devices, shared computers and limited robotics kits.

Learners can explicitly download a sanitized lesson package, read it offline, save unfinished notes/code/checkpoints locally, and synchronize those drafts when the same learner reconnects. Authenticated dashboards, quizzes, final evidence submission, AI coaching and teacher assessment remain online-only so offline support does not weaken privacy or assessment integrity.

Large learner evidence images are compressed on-device when useful before upload. Shared physical robotics kits are represented separately from learner records: several learners can use the same registered kit while retaining individual attempts, events, evidence and teacher assessments.

See `docs/LOW_BANDWIDTH_PWA.md` for the caching policy, background-sync rules, shared-device isolation model and offline security boundaries.
