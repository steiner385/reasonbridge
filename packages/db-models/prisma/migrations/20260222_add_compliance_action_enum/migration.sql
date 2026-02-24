-- CreateEnum
CREATE TYPE "compliance_action" AS ENUM ('AGE_VERIFIED', 'CONSENT_REQUESTED', 'CONSENT_VERIFIED', 'CONSENT_WITHDRAWN', 'DATA_DELETION_REQUESTED', 'DATA_DELETION_COMPLETED', 'ANNUAL_REVERIFICATION');

-- AlterTable: Convert action column from VARCHAR to enum
-- First, add a new temporary column with the enum type
ALTER TABLE "compliance_audit_logs" ADD COLUMN "action_new" "compliance_action";

-- Copy existing values (with mapping to enum values)
UPDATE "compliance_audit_logs" SET "action_new" = "action"::compliance_action;

-- Drop the old column and rename the new one
ALTER TABLE "compliance_audit_logs" DROP COLUMN "action";
ALTER TABLE "compliance_audit_logs" RENAME COLUMN "action_new" TO "action";

-- Make the column NOT NULL
ALTER TABLE "compliance_audit_logs" ALTER COLUMN "action" SET NOT NULL;

-- Recreate the index on the new column
DROP INDEX IF EXISTS "compliance_audit_logs_action_timestamp_idx";
CREATE INDEX "compliance_audit_logs_action_timestamp_idx" ON "compliance_audit_logs"("action", "timestamp");
