# STEMBuild AI Lab Coach

## Educational purpose

STEMBuild AI Lab Coach is a **next-step learning planner**, not a general chatbot. It is designed to help a learner decide what to review, practise, debug, retry and verify using evidence already stored in STEMBuild.

The workflow is deliberately structured:

1. **OBSERVE** — read the learner's current lesson, completed lessons, quiz/practical history, troubleshooting, teacher feedback and skill mastery.
2. **REASON** — identify a likely learning gap only when stored evidence supports it; otherwise state that evidence is insufficient.
3. **PLAN** — create a short sequence of learning actions.
4. **GUIDE** — provide a teaching hint on demand rather than immediately revealing an answer.
5. **CHECK** — ask the learner to report an observable result.
6. **ADAPT** — replace future recommendations when the result is partial or unsuccessful.

A learner self-check updates only the coaching plan. It does **not** mark a practical task, lesson, badge or certificate as complete.

## Evidence used

The coach may use:

- current assigned lesson and approved lesson troubleshooting guidance;
- completed lessons;
- quiz attempt summaries and skill-linked quiz performance;
- practical submissions and teacher-scored rubrics;
- project assessment summaries;
- troubleshooting attempts;
- teacher feedback;
- stored skill mastery;
- selected hardware platform;
- hint/troubleshooting counts and score trend.

The model is intentionally **not** given quiz question text, correct answers, raw code submissions or uploaded evidence files when building a plan. This reduces answer leakage and unnecessary exposure of learner data.

## Model integration

The implementation uses the Vercel AI SDK through AI Gateway. The default configured model is:

`openai/gpt-6-luna`

It can be changed with `AI_COACH_MODEL`. Vercel deployments can use project OIDC; local/non-Vercel development can set `AI_GATEWAY_API_KEY`.

If AI generation fails or a generated plan triggers a safeguard, STEMBuild returns a clearly labelled **rules-based safety fallback**. The UI never labels this fallback as AI-generated content.

## Safeguards

### No fabricated progress

The system prompt requires all claimed gaps to be grounded in the supplied evidence snapshot. Missing evidence must remain unknown. AI Lab Coach has no code path that writes practical-assessment scores, lesson completion, badges or certificates.

### Assessment integrity

The model does not receive quiz questions or correct answers. It is instructed to teach concepts, propose prerequisite exercises and provide hints rather than answer an assessment. Generated output is also scanned for direct-answer patterns before storage.

### Electrical safety

Hardware advice defaults to low-voltage educational electronics, normally 3.3 V or 5 V logic. The coach must not recommend:

- mains / household AC wiring;
- wall outlets;
- bypassing resistors, fuses or protection;
- shorting a power source;
- charging bare lithium cells;
- increasing voltage/current to force a result.

The safe guidance pattern is to power down before rewiring, confirm polarity and common ground, use current limiting, respect GPIO limits, use motor drivers, and use level shifting where the approved lesson calls for it.

Generated recommendations are scanned for unsafe electrical patterns. A match blocks that output and substitutes the conservative rules-based plan.

### No physical-device control

The AI is not given tools for serial, Bluetooth, Wi-Fi, GPIO, motors, relays, robots or other physical devices. It can explain and ask the learner to verify an observation; it cannot actuate hardware.

### Prompt-injection minimisation

Student troubleshooting notes and teacher feedback are passed as bounded, cleaned evidence fields and are explicitly treated as untrusted data rather than instructions to the model.

## Recommendation logging and future effectiveness evaluation

Each `AiCoachSession` stores:

- the evidence snapshot used at generation time;
- model and prompt version;
- source mode (`ai-gateway` or `rules-fallback`);
- OBSERVE and REASON summaries;
- guardrail flags;
- generated steps;
- timestamps.

Each `AiCoachStep` stores the recommended action, related skill, teaching hint, check prompt, learner check outcome and learner observation. `AiCoachLog` stores phase-level events such as plan creation, hint reveal, check submission, adaptation and guardrail intervention.

This makes later evaluation possible without inventing causal claims. For example, an approved research workflow could compare:

- skill mastery before a coach session vs later teacher-scored rubric evidence;
- whether recommended prerequisite practice is followed by fewer failed attempts;
- hint usage vs later independent task completion;
- recommendations that frequently lead to teacher escalation;
- effectiveness by lesson, skill or hardware platform.

Any research analysis must account for confounders such as teacher support, learner experience, lesson difficulty, hardware condition, missing data and small sample sizes. A recommendation followed by improvement is an association, not proof that the AI caused the improvement.

## Privacy

Students can query and mutate only AI coach sessions whose `learnerId` matches the authenticated account. A student's AI coach page accepts no arbitrary learner ID. The evidence snapshot is server-built from the authenticated learner's data.

AI coach logs should be included in the same retention/deletion policy as other learner records. Formal research exports should use pseudonymous learner identifiers and exclude unnecessary free text.
