import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

function certificateNumber() {
  return `STEM-${new Date().getUTCFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export async function recomputeCredentials(studentId: string) {
  const courses = await db.course.findMany({ where: { status: "PUBLISHED" }, select: { id: true } });
  for (const course of courses) {
    const requiredLessons = await db.lesson.count({ where: { status: "PUBLISHED", module: { courseId: course.id } } });
    const completedLessons = await db.lessonProgress.count({ where: { studentId, status: "COMPLETED", lesson: { status: "PUBLISHED", module: { courseId: course.id } } } });
    if (!requiredLessons || completedLessons < requiredLessons) continue;

    const projects = await db.project.findMany({
      where: { courseId: course.id, status: "PUBLISHED" },
      include: { submissions: { where: { studentId, status: "ASSESSED" }, include: { assessment: true } } },
    });
    const projectRequirementMet = projects.length === 0 || projects.every((project) => project.submissions.some((submission) => submission.assessment && submission.assessment.maxScore > 0 && (submission.assessment.totalScore / submission.assessment.maxScore) * 100 >= 70));
    if (!projectRequirementMet) continue;

    await db.certificate.upsert({
      where: { studentId_courseId: { studentId, courseId: course.id } },
      create: { studentId, courseId: course.id, certificateNumber: certificateNumber(), status: "ISSUED", issuedAt: new Date() },
      update: { status: "ISSUED", issuedAt: new Date() },
    });
  }

  const practicals = await db.practicalSubmission.findMany({ where: { studentId, status: "ASSESSED" }, include: { assessment: true } });
  const passingPracticals = new Set(practicals.filter((p) => p.assessment && p.assessment.maxScore > 0 && (p.assessment.totalScore / p.assessment.maxScore) * 100 >= 70).map((p) => p.taskId)).size;
  const badges = await db.badgeDefinition.findMany();
  for (const badge of badges) {
    const rule = badge.rule as { type?: string; minimumCompleted?: number };
    if (rule.type === "teacher_assessed_practicals" && passingPracticals >= (rule.minimumCompleted ?? Number.MAX_SAFE_INTEGER)) {
      await db.studentBadge.upsert({
        where: { studentId_badgeId: { studentId, badgeId: badge.id } },
        create: { studentId, badgeId: badge.id, evidence: { passingPracticals } },
        update: { evidence: { passingPracticals } },
      });
    }
  }
}
