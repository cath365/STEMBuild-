-- Additive: a new table only. Existing data is unaffected.
CREATE TABLE "ChallengeAttempt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "checks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChallengeAttempt_studentId_challengeId_idx" ON "ChallengeAttempt"("studentId", "challengeId");

CREATE INDEX "ChallengeAttempt_challengeId_passed_idx" ON "ChallengeAttempt"("challengeId", "passed");

ALTER TABLE "ChallengeAttempt" ADD CONSTRAINT "ChallengeAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
