-- AlterTable
-- Add discussion_id column to responses table for Feature 009 (discussion participation)
-- This column links responses to specific discussions within a topic
-- Nullable during migration to support existing responses
ALTER TABLE "responses" ADD COLUMN "discussion_id" UUID;

-- CreateIndex
-- Add index on discussion_id for efficient queries filtering responses by discussion
CREATE INDEX "responses_discussion_id_idx" ON "responses"("discussion_id");
