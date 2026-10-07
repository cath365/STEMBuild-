-- CreateEnum
CREATE TYPE "ComponentMediaKind" AS ENUM ('PHOTO', 'PINOUT', 'WIRING', 'EXPECTED_RESULT', 'COMMON_MISTAKE');

-- CreateTable
CREATE TABLE "ComponentMedia" (
    "id" TEXT NOT NULL,
    "componentSlug" TEXT NOT NULL,
    "kind" "ComponentMediaKind" NOT NULL DEFAULT 'PHOTO',
    "storagePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "altText" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "credit" TEXT,
    "licenseName" TEXT,
    "licenseUrl" TEXT,
    "sourceUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComponentMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComponentMedia_componentSlug_verified_sortOrder_idx"
ON "ComponentMedia"("componentSlug", "verified", "sortOrder");
