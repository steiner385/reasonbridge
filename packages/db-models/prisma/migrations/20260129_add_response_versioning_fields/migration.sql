-- AlterTable
-- Add optimistic locking and edit tracking fields to responses table for Feature 009
-- These columns support response versioning, edit history, and conflict resolution

-- Add version field for optimistic locking (default 1 for existing responses)
ALTER TABLE "responses" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Add edit tracking fields (nullable for existing responses)
ALTER TABLE "responses" ADD COLUMN "edited_at" TIMESTAMP(3);
ALTER TABLE "responses" ADD COLUMN "edit_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "responses" ADD COLUMN "revision_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
-- Add index on version for optimistic locking queries
CREATE INDEX "responses_version_idx" ON "responses"("version");
