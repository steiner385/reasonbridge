-- Migration: Add Discussion Participation (Feature 009)
-- This migration adds the missing tables and columns for the discussion
-- participation feature that was merged without a corresponding migration.

-- CreateEnum (only if it doesn't exist)
-- Note: evidence_standard and activity_level enums already exist from previous migrations
DO $$ BEGIN
    CREATE TYPE "discussion_status" AS ENUM ('DRAFT', 'ACTIVE', 'CONCLUDED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "discussions" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "response_count" INTEGER NOT NULL DEFAULT 0,
    "participant_count" INTEGER NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "discussion_status" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "discussions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citations" (
    "id" UUID NOT NULL,
    "response_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "title" VARCHAR(500),
    "domain" VARCHAR(255) NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMP(3),
    "is_trusted_source" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant_activities" (
    "id" UUID NOT NULL,
    "discussion_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "first_contribution_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_contribution_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response_count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "participant_activities_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add new columns to responses
ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "discussion_id" UUID;
ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "edited_at" TIMESTAMP(3);
ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "edit_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "revision_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "discussions_topic_id_idx" ON "discussions"("topic_id");
CREATE INDEX "discussions_creator_id_idx" ON "discussions"("creator_id");
CREATE INDEX "discussions_status_idx" ON "discussions"("status");

-- CreateIndex
CREATE INDEX "citations_response_id_idx" ON "citations"("response_id");
CREATE INDEX "citations_domain_idx" ON "citations"("domain");

-- CreateIndex
CREATE INDEX "participant_activities_discussion_id_idx" ON "participant_activities"("discussion_id");
CREATE INDEX "participant_activities_user_id_idx" ON "participant_activities"("user_id");
CREATE UNIQUE INDEX "participant_activities_discussion_id_user_id_key" ON "participant_activities"("discussion_id", "user_id");

-- CreateIndex (for responses)
CREATE INDEX IF NOT EXISTS "responses_discussion_id_idx" ON "responses"("discussion_id");

-- AddForeignKey
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "discussion_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_activities" ADD CONSTRAINT "participant_activities_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "participant_activities" ADD CONSTRAINT "participant_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (responses.discussion_id is nullable)
ALTER TABLE "responses" ADD CONSTRAINT "responses_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "discussions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
