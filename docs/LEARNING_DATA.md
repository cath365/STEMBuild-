# STEMBuild learning-event and research data design

## Purpose

STEMBuild records **meaningful learning actions**, not generic page views. The event stream exists to answer instructional questions that a teacher can act on: where practical work is failing, which skills need support, how attempts change over time, and whether a learner's quiz knowledge matches hands-on performance.

The event stream is not an AI scoring system. All analytics in the MVP are deterministic calculations over stored events and teacher rubric scores.

## Event model

Each `LearningEvent` stores a controlled `type` plus only the contextual fields needed for analysis:

- learner ID
- actor ID when the action is performed by a teacher
- classroom, course, lesson or project context
- quiz / practical task / submission context where relevant
- hardware platform
- skill taxonomy ID when the event provides skill evidence
- attempt number
- duration in milliseconds when there is an explicit start and finish
- outcome
- numeric score and maximum score where applicable
- minimal structured metadata
- timestamp and event source
- event schema version (`schemaVersion`, currently `1`)

Supported event types in v0.2:

- `LESSON_STARTED`
- `LESSON_COMPLETED`
- `QUIZ_STARTED`
- `QUIZ_ANSWERED`
- `QUIZ_COMPLETED`
- `PRACTICAL_TASK_STARTED`
- `PRACTICAL_TASK_ATTEMPTED`
- `PRACTICAL_TASK_COMPLETED`
- `EVIDENCE_UPLOADED`
- `PROJECT_STARTED`
- `PROJECT_SUBMITTED`
- `TEACHER_FEEDBACK_RECEIVED`
- `RUBRIC_SCORED`
- `TROUBLESHOOTING_ATTEMPTED`
- `HINT_REQUESTED`
- `CODE_SUBMISSION`
- `HARDWARE_PLATFORM_SELECTED`

### Important timing rule

STEMBuild does not treat opening a page as starting a learning activity. Quiz, practical-task and project durations begin only after the learner explicitly presses a **Start** action. This prevents page-view time, abandoned tabs and passive reading time from being misrepresented as practical working time.

Project duration is described as **elapsed time from explicit project start to submission**, not continuous active working time.

## Data minimisation

Analytics events intentionally do **not** duplicate sensitive content unnecessarily:

- quiz events record correctness, question ID and score, not the learner's raw answer text;
- hint events record that a hint was requested and the request length/source mode, not the student's full question;
- code events record that code was submitted and its character count, not a second copy of the code;
- evidence events record MIME type and byte size, not the image/PDF itself;
- teacher-feedback events record that feedback exists and its length, while the actual feedback stays in the assessment record.

The authoritative learning artifacts remain in their purpose-specific tables with their existing access controls.

## Skills taxonomy

The controlled taxonomy is:

1. Electronics fundamentals
2. Circuit building
3. Microcontroller programming
4. Digital input/output
5. Analog input
6. Sensors
7. Motors
8. Communication protocols
9. Debugging
10. IoT
11. Robotics
12. Problem solving

Skills are normalized records with stable slugs. Learning outcomes, quiz questions and rubric criteria can link directly to a skill. New curriculum can therefore use the same skill identifiers rather than inventing inconsistent labels such as `wiring`, `circuits`, `circuit-work` and `hardware-setup` for the same concept.

## Analytics definitions

### Skill mastery

The MVP keeps two evidence channels visible:

- **Practical mastery** = average normalized `RUBRIC_SCORED` events for a skill.
- **Knowledge mastery** = average normalized `QUIZ_ANSWERED` events for a skill.
- **Overall mastery** = average of the available scored events; the UI still shows the practical and knowledge values separately.

A blank value means there is not yet scored evidence. STEMBuild does not invent a score for missing data.

### Learner attention rule

A learner is placed in the teacher's "needs attention" view when at least one transparent rule is true:

- at least two practical rubric scores exist and practical mastery is below 70%;
- two or more stored failed / needs-revision outcomes exist; or
- hints plus troubleshooting events total three or more.

This is a deterministic classroom workflow flag, not a diagnosis and not an AI judgement.

### Coding stronger than wiring

The MVP shows this pattern only when:

- at least two practical rubric scores exist for **microcontroller programming**;
- at least two practical rubric scores exist for **circuit building**;
- programming practical mastery is at least 70%; and
- circuit-building practical mastery is below 60%.

### Repeated hints

A learner appears in the repeated-hint view after three recorded `HINT_REQUESTED` events.

### Lesson difficulty

For each lesson STEMBuild reports:

- completed quiz attempts plus practical submissions as attempts;
- failed quiz reviews and failed/needs-revision practical reviews;
- the resulting observed failure rate;
- average duration where a valid explicit-start duration exists;
- hint count;
- troubleshooting count.

These values describe the observed class data. They should not be generalized to other schools or age groups without appropriate study design.

### Hardware difficulty

For each platform STEMBuild reports attempts and three concrete difficulty signals:

- failed / needs-revision practical reviews;
- hint requests;
- troubleshooting events.

The product does not automatically claim that one platform is inherently more difficult. Differences may reflect lesson choice, teacher support, learner experience, sample size or hardware condition.

### Improvement over time

A trend is calculated only after at least four scored events. Events are sorted chronologically; the average normalized score in the earlier half is compared with the later half:

- improvement: +10 percentage points or more;
- decline: -10 percentage points or more;
- otherwise: stable.

The dashboard displays the actual percentage-point change and sample count.

## Privacy and authorization

### Student isolation

A student dashboard queries `LearningEvent` only with `learnerId = currentUser.id`. There is no student endpoint that accepts an arbitrary learner ID. A student cannot use the learning analytics UI to inspect another learner.

### Teacher scoping

Teacher analytics first resolves classrooms owned by the authenticated teacher and then queries events with `classroomId` restricted to those classrooms and learner IDs restricted to active enrollments. This matters when the same learner belongs to more than one class: a teacher should not see activity produced in another teacher's class.

### Administrators

The MVP does not expose a raw event-browser to administrators. Aggregate research/export capabilities should be added only with explicit governance, access logging and a defined educational purpose.

### Evidence and free text

Uploaded learner evidence remains private. Analytics stores pointers/context, not public copies. Before a real pilot, STEMBuild should have documented consent, retention, deletion and export rules appropriate to the participating school and applicable law.

## Research-readiness

The event architecture could later support education research because it provides timestamped, structured observations connected to learning context and skill definitions. Potential research questions include:

- whether practical rubric performance predicts later project completion better than quiz scores;
- which skill sequences are associated with fewer re-attempts;
- whether debugging behavior changes across repeated projects;
- differences between knowledge and practical mastery by skill;
- time-to-completion distributions by lesson or hardware platform;
- the relationship between hint usage and later independent performance.

### Requirements before using the data for formal research

The current MVP event schema is **research-enabling, not a research study by itself**. Before formal research or publication, establish:

1. a written research question and analysis plan;
2. school/guardian/learner consent or other lawful basis as required;
3. ethics / institutional review where applicable;
4. data minimisation and retention limits;
5. pseudonymisation or de-identification for research datasets;
6. cohort definitions and relevant learner context without collecting unnecessary sensitive data;
7. sample-size and missing-data handling;
8. versioning of curriculum, rubric and event definitions;
9. controls for teacher/classroom/hardware confounders;
10. a reproducible export with a data dictionary and event-schema version.

Do not publish claims such as "STEMBuild improves learning by X%" until a properly designed study supports them.
