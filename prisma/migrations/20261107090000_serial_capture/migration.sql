-- Additive and nullable: existing submissions are unaffected.
ALTER TABLE "PracticalSubmission" ADD COLUMN "serialCapture" JSONB;
