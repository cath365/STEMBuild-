-- Additive: one new column with a default, one new enum and one new table.
ALTER TABLE "Classroom" ADD COLUMN "joinOpen" BOOLEAN NOT NULL DEFAULT true;

CREATE TYPE "AccountTokenKind" AS ENUM ('TEACHER_INVITE', 'PASSWORD_RESET');

CREATE TABLE "AccountToken" (
    "id" TEXT NOT NULL,
    "kind" "AccountTokenKind" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT,
    "schoolId" TEXT,
    "userId" TEXT,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountToken_tokenHash_key" ON "AccountToken"("tokenHash");

CREATE INDEX "AccountToken_userId_kind_idx" ON "AccountToken"("userId", "kind");

ALTER TABLE "AccountToken" ADD CONSTRAINT "AccountToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountToken" ADD CONSTRAINT "AccountToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
