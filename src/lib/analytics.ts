import { db } from "@/lib/db";

const SCORED_EVENT_TYPES = new Set(["RUBRIC_SCORED", "QUIZ_ANSWERED"]);
const FAILURE_OUTCOMES = new Set(["FAILED", "NEEDS_REVISION"]);

type StateEvent = {
  id: string;
  type: string;
  practicalSubmissionId: string | null;
  projectSubmissionId: string | null;
  skillId: string | null;
  occurredAt: Date;
};

function effectiveLearningEvents<T extends StateEvent>(events: T[]) {
  const latest = new Map<string, T>();
  const passthrough: T[] = [];
  for (const event of events) {
    let key: string | null = null;
    if (event.type === "RUBRIC_SCORED") {
      const submissionId = event.practicalSubmissionId ?? event.projectSubmissionId;
      if (submissionId) key = `rubric:${submissionId}:${event.skillId ?? "unmapped"}`;
    } else if (event.type === "PRACTICAL_TASK_COMPLETED" && event.practicalSubmissionId) {
      key = `practical-review:${event.practicalSubmissionId}`;
    }
    if (!key) { passthrough.push(event); continue; }
    const previous = latest.get(key);
    if (!previous || previous.occurredAt <= event.occurredAt) latest.set(key, event);
  }
  return [...passthrough, ...latest.values()].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}

function ratio(score: number | null, maxScore: number | null) {
  if (score == null || maxScore == null || maxScore <= 0) return null;
  return score / maxScore;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function trendFromEvents(events: Array<{ score: number | null; maxScore: number | null; occurredAt: Date }>) {
  const values = events
    .map((event) => ({ value: ratio(event.score, event.maxScore), occurredAt: event.occurredAt }))
    .filter((item): item is { value: number; occurredAt: Date } => item.value !== null)
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  if (values.length < 4) return { label: "Not enough evidence", delta: null, samples: values.length };
  const midpoint = Math.floor(values.length / 2);
  const earlier = average(values.slice(0, midpoint).map((item) => item.value)) ?? 0;
  const later = average(values.slice(midpoint).map((item) => item.value)) ?? 0;
  const delta = later - earlier;
  const label = delta >= 0.1 ? "Improving" : delta <= -0.1 ? "Declining" : "Stable";
  return { label, delta, samples: values.length };
}

export function summarizeSkillEvents(
  events: Array<{ type: string; skillId: string | null; score: number | null; maxScore: number | null }>,
  skills: Array<{ id: string; slug: string; name: string; description: string }>,
) {
  return skills.map((skill) => {
    const practical = events.filter((event) => event.skillId === skill.id && event.type === "RUBRIC_SCORED").map((event) => ratio(event.score, event.maxScore)).filter((value): value is number => value !== null);
    const knowledge = events.filter((event) => event.skillId === skill.id && event.type === "QUIZ_ANSWERED").map((event) => ratio(event.score, event.maxScore)).filter((value): value is number => value !== null);
    const practicalMastery = average(practical);
    const knowledgeMastery = average(knowledge);
    const evidence = [...practical, ...knowledge];
    return {
      ...skill,
      practicalMastery,
      knowledgeMastery,
      overallMastery: average(evidence),
      practicalEvidence: practical.length,
      knowledgeEvidence: knowledge.length,
      evidenceCount: evidence.length,
    };
  });
}

export async function getStudentLearningAnalytics(studentId: string) {
  const [skills, events] = await Promise.all([
    db.skill.findMany({ orderBy: { name: "asc" } }),
    db.learningEvent.findMany({
      where: { learnerId: studentId },
      include: { lesson: true, skill: true, hardwarePlatform: true, project: true },
      orderBy: { occurredAt: "desc" },
    }),
  ]);
  const effectiveEvents = effectiveLearningEvents(events);
  const skillMastery = summarizeSkillEvents(effectiveEvents, skills);
  const scored = effectiveEvents.filter((event) => SCORED_EVENT_TYPES.has(event.type));
  const trend = trendFromEvents(scored);
  return {
    events,
    skillMastery,
    trend,
    hints: events.filter((event) => event.type === "HINT_REQUESTED").length,
    troubleshooting: events.filter((event) => event.type === "TROUBLESHOOTING_ATTEMPTED").length,
    practicalAttempts: events.filter((event) => event.type === "PRACTICAL_TASK_ATTEMPTED").length,
    quizAttempts: events.filter((event) => event.type === "QUIZ_COMPLETED").length,
  };
}

export async function getTeacherLearningAnalytics(teacherId: string, onlyClassroomId?: string) {
  const classes = await db.classroom.findMany({
    where: { teacherId, ...(onlyClassroomId ? { id: onlyClassroomId } : {}) },
    include: { enrollments: { where: { status: "ACTIVE" }, include: { student: { select: { id: true, displayName: true } } } } },
    orderBy: { name: "asc" },
  });
  if (onlyClassroomId && classes.length === 0) return null;
  const classroomIds = classes.map((item) => item.id);
  const students = new Map<string, { id: string; displayName: string }>();
  for (const classroom of classes) {
    for (const enrollment of classroom.enrollments) students.set(enrollment.student.id, enrollment.student);
  }
  const [skills, events] = await Promise.all([
    db.skill.findMany({ orderBy: { name: "asc" } }),
    classroomIds.length
      ? db.learningEvent.findMany({
          where: { classroomId: { in: classroomIds }, learnerId: { in: [...students.keys()] } },
          include: { learner: { select: { id: true, displayName: true } }, lesson: true, skill: true, hardwarePlatform: true, project: true },
          orderBy: { occurredAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const effectiveEvents = effectiveLearningEvents(events);
  const learnerRows = [...students.values()].map((student) => {
    const learnerEvents = effectiveEvents.filter((event) => event.learnerId === student.id);
    const scored = learnerEvents.filter((event) => SCORED_EVENT_TYPES.has(event.type));
    const mastery = summarizeSkillEvents(learnerEvents, skills);
    const practicalScores = learnerEvents.filter((event) => event.type === "RUBRIC_SCORED").map((event) => ratio(event.score, event.maxScore)).filter((value): value is number => value !== null);
    const failed = learnerEvents.filter((event) => FAILURE_OUTCOMES.has(event.outcome ?? "")).length;
    const hints = learnerEvents.filter((event) => event.type === "HINT_REQUESTED").length;
    const troubleshooting = learnerEvents.filter((event) => event.type === "TROUBLESHOOTING_ATTEMPTED").length;
    const coding = mastery.find((skill) => skill.slug === "microcontroller-programming");
    const wiring = mastery.find((skill) => skill.slug === "circuit-building");
    const codingStrongWiringWeak = Boolean(
      coding && wiring &&
      coding.practicalEvidence >= 2 && wiring.practicalEvidence >= 2 &&
      (coding.practicalMastery ?? 0) >= 0.7 && (wiring.practicalMastery ?? 1) < 0.6,
    );
    const practicalMastery = average(practicalScores);
    const needsAttention = (practicalScores.length >= 2 && (practicalMastery ?? 1) < 0.7) || failed >= 2 || hints + troubleshooting >= 3;
    return {
      ...student,
      eventCount: learnerEvents.length,
      practicalMastery,
      failedOutcomes: failed,
      hints,
      troubleshooting,
      repeatedHints: hints >= 3,
      codingStrongWiringWeak,
      needsAttention,
      trend: trendFromEvents(scored),
      mastery,
    };
  });

  type LessonDifficultyRow = { lessonId: string; lessonTitle: string; attempts: number; failed: number; hints: number; troubleshooting: number; durations: number[] };
  const lessonMap = new Map<string, LessonDifficultyRow>();
  for (const event of effectiveEvents) {
    if (!event.lessonId || !event.lesson) continue;
    const row: LessonDifficultyRow = lessonMap.get(event.lessonId) ?? { lessonId: event.lessonId, lessonTitle: event.lesson.title, attempts: 0, failed: 0, hints: 0, troubleshooting: 0, durations: [] };
    if (event.type === "QUIZ_COMPLETED" || event.type === "PRACTICAL_TASK_ATTEMPTED") row.attempts += 1;
    if ((event.type === "QUIZ_COMPLETED" || event.type === "PRACTICAL_TASK_COMPLETED") && FAILURE_OUTCOMES.has(event.outcome ?? "")) row.failed += 1;
    if (event.type === "HINT_REQUESTED") row.hints += 1;
    if (event.type === "TROUBLESHOOTING_ATTEMPTED") row.troubleshooting += 1;
    if ((event.type === "QUIZ_COMPLETED" || event.type === "PRACTICAL_TASK_ATTEMPTED") && event.durationMs != null) row.durations.push(event.durationMs);
    lessonMap.set(event.lessonId, row);
  }
  const lessonDifficulty = [...lessonMap.values()].map((row) => ({
    ...row,
    failureRate: row.attempts ? row.failed / row.attempts : null,
    averageDurationMs: row.durations.length ? Math.round(row.durations.reduce((sum, value) => sum + value, 0) / row.durations.length) : null,
  })).sort((a, b) => (b.failureRate ?? -1) - (a.failureRate ?? -1) || b.attempts - a.attempts);

  const hardwareMap = new Map<string, { id: string; name: string; attempts: number; failed: number; hints: number; troubleshooting: number }>();
  for (const event of effectiveEvents) {
    if (!event.hardwarePlatformId || !event.hardwarePlatform) continue;
    const row = hardwareMap.get(event.hardwarePlatformId) ?? { id: event.hardwarePlatformId, name: event.hardwarePlatform.name, attempts: 0, failed: 0, hints: 0, troubleshooting: 0 };
    if (event.type === "PRACTICAL_TASK_ATTEMPTED" || event.type === "PROJECT_SUBMITTED") row.attempts += 1;
    if (event.type === "PRACTICAL_TASK_COMPLETED" && FAILURE_OUTCOMES.has(event.outcome ?? "")) row.failed += 1;
    if (event.type === "HINT_REQUESTED") row.hints += 1;
    if (event.type === "TROUBLESHOOTING_ATTEMPTED") row.troubleshooting += 1;
    hardwareMap.set(event.hardwarePlatformId, row);
  }
  const hardwareDifficulty = [...hardwareMap.values()].map((row) => ({ ...row, difficultySignals: row.failed + row.hints + row.troubleshooting }));

  const classSkillMastery = summarizeSkillEvents(effectiveEvents, skills);
  const quizCompleted = effectiveEvents.filter((event) => event.type === "QUIZ_COMPLETED");
  const practicalCompleted = effectiveEvents.filter((event) => event.type === "PRACTICAL_TASK_COMPLETED");
  const projectSubmitted = effectiveEvents.filter((event) => event.type === "PROJECT_SUBMITTED");
  const normalizedQuizScores = quizCompleted.map((event) => ratio(event.score, event.maxScore)).filter((value): value is number => value !== null);
  const normalizedPracticalScores = practicalCompleted.map((event) => ratio(event.score, event.maxScore)).filter((value): value is number => value !== null);
  const projectDurations = projectSubmitted.map((event) => event.durationMs).filter((value): value is number => value != null);

  return {
    classes,
    events,
    learnerRows,
    classSkillMastery,
    lessonDifficulty,
    hardwareDifficulty,
    assessment: {
      quizAttempts: quizCompleted.length,
      quizPassRate: quizCompleted.length ? quizCompleted.filter((event) => event.outcome === "PASSED").length / quizCompleted.length : null,
      averageQuizScore: average(normalizedQuizScores),
      practicalReviews: practicalCompleted.length,
      practicalPassRate: practicalCompleted.length ? practicalCompleted.filter((event) => event.outcome === "PASSED").length / practicalCompleted.length : null,
      averagePracticalScore: average(normalizedPracticalScores),
      averageProjectDurationMs: projectDurations.length ? Math.round(projectDurations.reduce((sum, value) => sum + value, 0) / projectDurations.length) : null,
    },
  };
}
