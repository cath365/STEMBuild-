-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('INVITED', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'NEEDS_REVISION', 'ASSESSED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_TEXT');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('IMAGE', 'PDF', 'LINK', 'CODE');

-- CreateEnum
CREATE TYPE "BadgeKind" AS ENUM ('MODULE', 'COURSE', 'PROJECT', 'SKILL');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('ELIGIBLE', 'ISSUED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "LearningEventType" AS ENUM ('LESSON_STARTED', 'LESSON_COMPLETED', 'QUIZ_STARTED', 'QUIZ_ANSWERED', 'QUIZ_COMPLETED', 'PRACTICAL_TASK_STARTED', 'PRACTICAL_TASK_ATTEMPTED', 'PRACTICAL_TASK_COMPLETED', 'EVIDENCE_UPLOADED', 'PROJECT_STARTED', 'PROJECT_SUBMITTED', 'TEACHER_FEEDBACK_RECEIVED', 'RUBRIC_SCORED', 'TROUBLESHOOTING_ATTEMPTED', 'HINT_REQUESTED', 'CODE_SUBMISSION', 'HARDWARE_PLATFORM_SELECTED');

-- CreateEnum
CREATE TYPE "AiCoachSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "AiCoachStepStatus" AS ENUM ('PENDING', 'VERIFIED', 'NEEDS_HELP', 'SUPERSEDED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AiCoachCheckOutcome" AS ENUM ('WORKED', 'PARTLY_WORKED', 'DID_NOT_WORK', 'NEED_TEACHER');

-- CreateEnum
CREATE TYPE "AiCoachPhase" AS ENUM ('OBSERVE', 'REASON', 'PLAN', 'GUIDE', 'CHECK', 'ADAPT', 'SAFETY');

-- CreateEnum
CREATE TYPE "LearningEventOutcome" AS ENUM ('STARTED', 'COMPLETED', 'SUBMITTED', 'PASSED', 'FAILED', 'CORRECT', 'INCORRECT', 'NEEDS_REVISION', 'RECORDED', 'RECEIVED', 'REQUESTED', 'SELECTED');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "schoolId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "schoolId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassEnrollment" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "difficulty" "Difficulty" NOT NULL DEFAULT 'BEGINNER',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningOutcome" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skillId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LearningOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "concept" TEXT NOT NULL DEFAULT '',
    "objective" TEXT NOT NULL,
    "theory" TEXT NOT NULL,
    "safetyNotes" TEXT NOT NULL,
    "practicalChallenge" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "generalTroubleshoot" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'BEGINNER',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 45,
    "order" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonLearningOutcome" (
    "lessonId" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,

    CONSTRAINT "LessonLearningOutcome_pkey" PRIMARY KEY ("lessonId","outcomeId")
);

-- CreateTable
CREATE TABLE "HardwarePlatform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HardwarePlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonHardwareVariant" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "hardwarePlatformId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "wiringInstructions" TEXT NOT NULL,
    "gpioMappings" TEXT NOT NULL DEFAULT '',
    "codeLanguage" TEXT NOT NULL,
    "programmingFramework" TEXT NOT NULL DEFAULT '',
    "codeSnippet" TEXT NOT NULL,
    "uploadProcedure" TEXT NOT NULL DEFAULT '',
    "expectedOutput" TEXT NOT NULL,
    "troubleshooting" TEXT NOT NULL,

    CONSTRAINT "LessonHardwareVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantComponent" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,

    CONSTRAINT "VariantComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "passScore" INTEGER NOT NULL DEFAULT 70,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "options" JSONB,
    "correctAnswer" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL,
    "skillId" TEXT,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "attemptNo" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rubric" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Rubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricCriterion" (
    "id" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skillTag" TEXT NOT NULL,
    "skillId" TEXT,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticalTask" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "successCriteria" TEXT NOT NULL,
    "evidencePrompt" TEXT NOT NULL,

    CONSTRAINT "PracticalTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticalSubmission" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT,
    "hardwarePlatformId" TEXT NOT NULL,
    "kitUsageId" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "studentNotes" TEXT,
    "codeSnippet" TEXT,
    "submissionNo" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticalSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceAsset" (
    "id" TEXT NOT NULL,
    "practicalSubmissionId" TEXT,
    "projectSubmissionId" TEXT,
    "type" "EvidenceType" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TroubleshootingAttempt" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "actionTried" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TroubleshootingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticalAssessment" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticalAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriterionScore" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,

    CONSTRAINT "CriterionScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonAssignment" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "successCriteria" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'BEGINNER',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectHardware" (
    "projectId" TEXT NOT NULL,
    "hardwarePlatformId" TEXT NOT NULL,
    "notes" TEXT,
    "wiringInstructions" TEXT NOT NULL DEFAULT '',
    "gpioMappings" TEXT NOT NULL DEFAULT '',
    "codeLanguage" TEXT NOT NULL DEFAULT '',
    "programmingFramework" TEXT NOT NULL DEFAULT '',
    "sourceCode" TEXT NOT NULL DEFAULT '',
    "uploadProcedure" TEXT NOT NULL DEFAULT '',
    "expectedOutput" TEXT NOT NULL DEFAULT '',
    "troubleshooting" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ProjectHardware_pkey" PRIMARY KEY ("projectId","hardwarePlatformId")
);

-- CreateTable
CREATE TABLE "ProjectAssignment" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSubmission" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "hardwarePlatformId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "studentNotes" TEXT,
    "codeSnippet" TEXT,
    "troubleshootingNotes" TEXT,
    "submissionNo" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAssessment" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCriterionScore" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,

    CONSTRAINT "ProjectCriterionScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeDefinition" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" "BadgeKind" NOT NULL,
    "rule" JSONB NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BadgeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentBadge" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evidence" JSONB NOT NULL,

    CONSTRAINT "StudentBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'ELIGIBLE',
    "issuedAt" TIMESTAMP(3),

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'STEM',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningEvent" (
    "id" TEXT NOT NULL,
    "type" "LearningEventType" NOT NULL,
    "outcome" "LearningEventOutcome",
    "learnerId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "classroomId" TEXT,
    "courseId" TEXT,
    "lessonId" TEXT,
    "projectId" TEXT,
    "quizId" TEXT,
    "quizAttemptId" TEXT,
    "practicalTaskId" TEXT,
    "practicalSubmissionId" TEXT,
    "projectSubmissionId" TEXT,
    "hardwarePlatformId" TEXT,
    "skillId" TEXT,
    "attemptNo" INTEGER,
    "durationMs" INTEGER,
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'server',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineLessonCheckpoint" (
    "id" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "practicalTaskId" TEXT,
    "completedSections" JSONB,
    "notes" TEXT NOT NULL DEFAULT '',
    "codeDraft" TEXT NOT NULL DEFAULT '',
    "troubleshooting" TEXT NOT NULL DEFAULT '',
    "clientUpdatedAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfflineLessonCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoboticsKit" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "hardwarePlatformId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoboticsKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitUsage" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "lessonId" TEXT,
    "practicalTaskId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "KitUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCoachSession" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "hardwarePlatformId" TEXT,
    "status" "AiCoachSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "model" TEXT NOT NULL,
    "sourceMode" TEXT NOT NULL DEFAULT 'ai-gateway',
    "promptVersion" TEXT NOT NULL DEFAULT 'lab-coach-v1',
    "evidenceSnapshot" JSONB NOT NULL,
    "observeSummary" TEXT NOT NULL,
    "reasonSummary" TEXT NOT NULL,
    "guardrailFlags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiCoachSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCoachStep" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "skillId" TEXT,
    "order" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "actionType" TEXT NOT NULL,
    "sourceMode" TEXT NOT NULL DEFAULT 'ai-gateway',
    "title" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "checkPrompt" TEXT NOT NULL,
    "hint" TEXT NOT NULL,
    "safetyNote" TEXT,
    "status" "AiCoachStepStatus" NOT NULL DEFAULT 'PENDING',
    "hintRevealedAt" TIMESTAMP(3),
    "checkOutcome" "AiCoachCheckOutcome",
    "learnerResult" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCoachStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCoachLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "phase" "AiCoachPhase" NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCoachLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiHelpRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "sourceMode" TEXT NOT NULL DEFAULT 'approved-guidance',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiHelpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_schoolId_role_idx" ON "User"("schoolId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_joinCode_key" ON "Classroom"("joinCode");

-- CreateIndex
CREATE INDEX "Classroom_teacherId_idx" ON "Classroom"("teacherId");

-- CreateIndex
CREATE INDEX "Classroom_schoolId_idx" ON "Classroom"("schoolId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_studentId_status_idx" ON "ClassEnrollment"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClassEnrollment_classroomId_studentId_key" ON "ClassEnrollment"("classroomId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Module_courseId_slug_key" ON "Module"("courseId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Module_courseId_order_key" ON "Module"("courseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "LearningOutcome_code_key" ON "LearningOutcome"("code");

-- CreateIndex
CREATE INDEX "LearningOutcome_skillId_idx" ON "LearningOutcome"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_moduleId_slug_key" ON "Lesson"("moduleId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_moduleId_order_key" ON "Lesson"("moduleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "HardwarePlatform_slug_key" ON "HardwarePlatform"("slug");

-- CreateIndex
CREATE INDEX "LessonHardwareVariant_hardwarePlatformId_idx" ON "LessonHardwareVariant"("hardwarePlatformId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonHardwareVariant_lessonId_hardwarePlatformId_key" ON "LessonHardwareVariant"("lessonId", "hardwarePlatformId");

-- CreateIndex
CREATE UNIQUE INDEX "VariantComponent_variantId_componentId_key" ON "VariantComponent"("variantId", "componentId");

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_lessonId_key" ON "Quiz"("lessonId");

-- CreateIndex
CREATE INDEX "QuizQuestion_skillId_idx" ON "QuizQuestion"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_quizId_order_key" ON "QuizQuestion"("quizId", "order");

-- CreateIndex
CREATE INDEX "QuizAttempt_studentId_completedAt_idx" ON "QuizAttempt"("studentId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAttempt_quizId_studentId_attemptNo_key" ON "QuizAttempt"("quizId", "studentId", "attemptNo");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAnswer_attemptId_questionId_key" ON "QuizAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "RubricCriterion_skillId_idx" ON "RubricCriterion"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "RubricCriterion_rubricId_order_key" ON "RubricCriterion"("rubricId", "order");

-- CreateIndex
CREATE INDEX "PracticalTask_lessonId_idx" ON "PracticalTask"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticalSubmission_kitUsageId_key" ON "PracticalSubmission"("kitUsageId");

-- CreateIndex
CREATE INDEX "PracticalSubmission_studentId_status_idx" ON "PracticalSubmission"("studentId", "status");

-- CreateIndex
CREATE INDEX "PracticalSubmission_classroomId_status_idx" ON "PracticalSubmission"("classroomId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PracticalSubmission_taskId_studentId_submissionNo_key" ON "PracticalSubmission"("taskId", "studentId", "submissionNo");

-- CreateIndex
CREATE INDEX "EvidenceAsset_practicalSubmissionId_idx" ON "EvidenceAsset"("practicalSubmissionId");

-- CreateIndex
CREATE INDEX "EvidenceAsset_projectSubmissionId_idx" ON "EvidenceAsset"("projectSubmissionId");

-- CreateIndex
CREATE INDEX "TroubleshootingAttempt_submissionId_createdAt_idx" ON "TroubleshootingAttempt"("submissionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PracticalAssessment_submissionId_key" ON "PracticalAssessment"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "CriterionScore_assessmentId_criterionId_key" ON "CriterionScore"("assessmentId", "criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonAssignment_classroomId_lessonId_key" ON "LessonAssignment"("classroomId", "lessonId");

-- CreateIndex
CREATE INDEX "LessonProgress_studentId_status_idx" ON "LessonProgress"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_studentId_lessonId_key" ON "LessonProgress"("studentId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_courseId_slug_key" ON "Project"("courseId", "slug");

-- CreateIndex
CREATE INDEX "ProjectHardware_hardwarePlatformId_idx" ON "ProjectHardware"("hardwarePlatformId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAssignment_classroomId_projectId_key" ON "ProjectAssignment"("classroomId", "projectId");

-- CreateIndex
CREATE INDEX "ProjectSubmission_studentId_status_idx" ON "ProjectSubmission"("studentId", "status");

-- CreateIndex
CREATE INDEX "ProjectSubmission_classroomId_status_idx" ON "ProjectSubmission"("classroomId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSubmission_projectId_studentId_submissionNo_key" ON "ProjectSubmission"("projectId", "studentId", "submissionNo");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAssessment_submissionId_key" ON "ProjectAssessment"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCriterionScore_assessmentId_criterionId_key" ON "ProjectCriterionScore"("assessmentId", "criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentBadge_studentId_badgeId_key" ON "StudentBadge"("studentId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificateNumber_key" ON "Certificate"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_studentId_courseId_key" ON "Certificate"("studentId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");

-- CreateIndex
CREATE INDEX "LearningEvent_learnerId_occurredAt_idx" ON "LearningEvent"("learnerId", "occurredAt");

-- CreateIndex
CREATE INDEX "LearningEvent_learnerId_skillId_occurredAt_idx" ON "LearningEvent"("learnerId", "skillId", "occurredAt");

-- CreateIndex
CREATE INDEX "LearningEvent_classroomId_occurredAt_idx" ON "LearningEvent"("classroomId", "occurredAt");

-- CreateIndex
CREATE INDEX "LearningEvent_classroomId_learnerId_occurredAt_idx" ON "LearningEvent"("classroomId", "learnerId", "occurredAt");

-- CreateIndex
CREATE INDEX "LearningEvent_courseId_occurredAt_idx" ON "LearningEvent"("courseId", "occurredAt");

-- CreateIndex
CREATE INDEX "LearningEvent_lessonId_type_occurredAt_idx" ON "LearningEvent"("lessonId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "LearningEvent_skillId_type_occurredAt_idx" ON "LearningEvent"("skillId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "LearningEvent_hardwarePlatformId_type_occurredAt_idx" ON "LearningEvent"("hardwarePlatformId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "LearningEvent_projectId_type_occurredAt_idx" ON "LearningEvent"("projectId", "type", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "OfflineLessonCheckpoint_clientKey_key" ON "OfflineLessonCheckpoint"("clientKey");

-- CreateIndex
CREATE INDEX "OfflineLessonCheckpoint_learnerId_lessonId_updatedAt_idx" ON "OfflineLessonCheckpoint"("learnerId", "lessonId", "updatedAt");

-- CreateIndex
CREATE INDEX "OfflineLessonCheckpoint_lessonId_practicalTaskId_idx" ON "OfflineLessonCheckpoint"("lessonId", "practicalTaskId");

-- CreateIndex
CREATE INDEX "RoboticsKit_schoolId_active_idx" ON "RoboticsKit"("schoolId", "active");

-- CreateIndex
CREATE INDEX "RoboticsKit_hardwarePlatformId_active_idx" ON "RoboticsKit"("hardwarePlatformId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "RoboticsKit_schoolId_code_key" ON "RoboticsKit"("schoolId", "code");

-- CreateIndex
CREATE INDEX "KitUsage_kitId_startedAt_idx" ON "KitUsage"("kitId", "startedAt");

-- CreateIndex
CREATE INDEX "KitUsage_learnerId_startedAt_idx" ON "KitUsage"("learnerId", "startedAt");

-- CreateIndex
CREATE INDEX "KitUsage_classroomId_startedAt_idx" ON "KitUsage"("classroomId", "startedAt");

-- CreateIndex
CREATE INDEX "KitUsage_practicalTaskId_learnerId_endedAt_idx" ON "KitUsage"("practicalTaskId", "learnerId", "endedAt");

-- CreateIndex
CREATE INDEX "AiCoachSession_learnerId_createdAt_idx" ON "AiCoachSession"("learnerId", "createdAt");

-- CreateIndex
CREATE INDEX "AiCoachSession_learnerId_lessonId_createdAt_idx" ON "AiCoachSession"("learnerId", "lessonId", "createdAt");

-- CreateIndex
CREATE INDEX "AiCoachStep_sessionId_order_idx" ON "AiCoachStep"("sessionId", "order");

-- CreateIndex
CREATE INDEX "AiCoachStep_skillId_status_idx" ON "AiCoachStep"("skillId", "status");

-- CreateIndex
CREATE INDEX "AiCoachLog_sessionId_createdAt_idx" ON "AiCoachLog"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "AiCoachLog_phase_createdAt_idx" ON "AiCoachLog"("phase", "createdAt");

-- CreateIndex
CREATE INDEX "AiHelpRequest_studentId_lessonId_createdAt_idx" ON "AiHelpRequest"("studentId", "lessonId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningOutcome" ADD CONSTRAINT "LearningOutcome_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonLearningOutcome" ADD CONSTRAINT "LessonLearningOutcome_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonLearningOutcome" ADD CONSTRAINT "LessonLearningOutcome_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "LearningOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonHardwareVariant" ADD CONSTRAINT "LessonHardwareVariant_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonHardwareVariant" ADD CONSTRAINT "LessonHardwareVariant_hardwarePlatformId_fkey" FOREIGN KEY ("hardwarePlatformId") REFERENCES "HardwarePlatform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantComponent" ADD CONSTRAINT "VariantComponent_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "LessonHardwareVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantComponent" ADD CONSTRAINT "VariantComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricCriterion" ADD CONSTRAINT "RubricCriterion_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricCriterion" ADD CONSTRAINT "RubricCriterion_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalTask" ADD CONSTRAINT "PracticalTask_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalTask" ADD CONSTRAINT "PracticalTask_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalSubmission" ADD CONSTRAINT "PracticalSubmission_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PracticalTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalSubmission" ADD CONSTRAINT "PracticalSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalSubmission" ADD CONSTRAINT "PracticalSubmission_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalSubmission" ADD CONSTRAINT "PracticalSubmission_hardwarePlatformId_fkey" FOREIGN KEY ("hardwarePlatformId") REFERENCES "HardwarePlatform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalSubmission" ADD CONSTRAINT "PracticalSubmission_kitUsageId_fkey" FOREIGN KEY ("kitUsageId") REFERENCES "KitUsage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceAsset" ADD CONSTRAINT "EvidenceAsset_practicalSubmissionId_fkey" FOREIGN KEY ("practicalSubmissionId") REFERENCES "PracticalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceAsset" ADD CONSTRAINT "EvidenceAsset_projectSubmissionId_fkey" FOREIGN KEY ("projectSubmissionId") REFERENCES "ProjectSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TroubleshootingAttempt" ADD CONSTRAINT "TroubleshootingAttempt_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "PracticalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalAssessment" ADD CONSTRAINT "PracticalAssessment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "PracticalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalAssessment" ADD CONSTRAINT "PracticalAssessment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterionScore" ADD CONSTRAINT "CriterionScore_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "PracticalAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterionScore" ADD CONSTRAINT "CriterionScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "RubricCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAssignment" ADD CONSTRAINT "LessonAssignment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAssignment" ADD CONSTRAINT "LessonAssignment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAssignment" ADD CONSTRAINT "LessonAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHardware" ADD CONSTRAINT "ProjectHardware_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHardware" ADD CONSTRAINT "ProjectHardware_hardwarePlatformId_fkey" FOREIGN KEY ("hardwarePlatformId") REFERENCES "HardwarePlatform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_hardwarePlatformId_fkey" FOREIGN KEY ("hardwarePlatformId") REFERENCES "HardwarePlatform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssessment" ADD CONSTRAINT "ProjectAssessment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ProjectSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssessment" ADD CONSTRAINT "ProjectAssessment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCriterionScore" ADD CONSTRAINT "ProjectCriterionScore_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "ProjectAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCriterionScore" ADD CONSTRAINT "ProjectCriterionScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "RubricCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "BadgeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_quizAttemptId_fkey" FOREIGN KEY ("quizAttemptId") REFERENCES "QuizAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_practicalTaskId_fkey" FOREIGN KEY ("practicalTaskId") REFERENCES "PracticalTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_practicalSubmissionId_fkey" FOREIGN KEY ("practicalSubmissionId") REFERENCES "PracticalSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_projectSubmissionId_fkey" FOREIGN KEY ("projectSubmissionId") REFERENCES "ProjectSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_hardwarePlatformId_fkey" FOREIGN KEY ("hardwarePlatformId") REFERENCES "HardwarePlatform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineLessonCheckpoint" ADD CONSTRAINT "OfflineLessonCheckpoint_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineLessonCheckpoint" ADD CONSTRAINT "OfflineLessonCheckpoint_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineLessonCheckpoint" ADD CONSTRAINT "OfflineLessonCheckpoint_practicalTaskId_fkey" FOREIGN KEY ("practicalTaskId") REFERENCES "PracticalTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoboticsKit" ADD CONSTRAINT "RoboticsKit_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoboticsKit" ADD CONSTRAINT "RoboticsKit_hardwarePlatformId_fkey" FOREIGN KEY ("hardwarePlatformId") REFERENCES "HardwarePlatform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitUsage" ADD CONSTRAINT "KitUsage_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "RoboticsKit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitUsage" ADD CONSTRAINT "KitUsage_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitUsage" ADD CONSTRAINT "KitUsage_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitUsage" ADD CONSTRAINT "KitUsage_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitUsage" ADD CONSTRAINT "KitUsage_practicalTaskId_fkey" FOREIGN KEY ("practicalTaskId") REFERENCES "PracticalTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCoachSession" ADD CONSTRAINT "AiCoachSession_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCoachSession" ADD CONSTRAINT "AiCoachSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCoachSession" ADD CONSTRAINT "AiCoachSession_hardwarePlatformId_fkey" FOREIGN KEY ("hardwarePlatformId") REFERENCES "HardwarePlatform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCoachStep" ADD CONSTRAINT "AiCoachStep_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AiCoachSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCoachStep" ADD CONSTRAINT "AiCoachStep_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCoachLog" ADD CONSTRAINT "AiCoachLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AiCoachSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiHelpRequest" ADD CONSTRAINT "AiHelpRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiHelpRequest" ADD CONSTRAINT "AiHelpRequest_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

