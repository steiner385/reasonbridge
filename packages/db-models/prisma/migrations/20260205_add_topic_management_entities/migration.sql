-- Feature 016: Topic Management
-- Phase 1 (T001-T005): Add entities and fields for topic creation, editing, merging, and lifecycle management

-- T001: Add TopicVisibility enum
CREATE TYPE "topic_visibility" AS ENUM ('PUBLIC', 'PRIVATE', 'UNLISTED');

-- T001: Add LOCKED status to TopicStatus enum
ALTER TYPE "topic_status" ADD VALUE IF NOT EXISTS 'LOCKED';

-- T001: Extend discussion_topics table with new fields
ALTER TABLE "discussion_topics"
  ADD COLUMN IF NOT EXISTS "visibility" "topic_visibility" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN IF NOT EXISTS "slug" VARCHAR(250) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "locked_at" TIMESTAMP(3);

-- T001: Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS "discussion_topics_slug_key" ON "discussion_topics"("slug");

-- T001: Create indexes for topic management queries
CREATE INDEX IF NOT EXISTS "discussion_topics_visibility_idx" ON "discussion_topics"("visibility");
CREATE INDEX IF NOT EXISTS "discussion_topics_last_activity_at_idx" ON "discussion_topics"("last_activity_at" DESC);
CREATE INDEX IF NOT EXISTS "discussion_topics_status_visibility_idx" ON "discussion_topics"("status", "visibility");

-- T002: Create topic_edits table for edit history tracking
CREATE TABLE IF NOT EXISTS "topic_edits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topic_id" UUID NOT NULL,
    "editor_id" UUID NOT NULL,
    "edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previous_title" VARCHAR(200),
    "new_title" VARCHAR(200),
    "previous_description" TEXT,
    "new_description" TEXT,
    "previous_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "new_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "change_reason" TEXT,
    "flagged_for_review" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "topic_edits_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "topic_edits_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "discussion_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "topic_edits_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- T002: Create indexes for topic_edits
CREATE INDEX IF NOT EXISTS "topic_edits_topic_id_edited_at_idx" ON "topic_edits"("topic_id", "edited_at" DESC);
CREATE INDEX IF NOT EXISTS "topic_edits_editor_id_idx" ON "topic_edits"("editor_id");
CREATE INDEX IF NOT EXISTS "topic_edits_flagged_for_review_idx" ON "topic_edits"("flagged_for_review");

-- T003: Create topic_merges table for merge operations
CREATE TABLE IF NOT EXISTS "topic_merges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_topic_ids" UUID[] NOT NULL,
    "target_topic_id" UUID NOT NULL,
    "moderator_id" UUID NOT NULL,
    "merge_reason" TEXT NOT NULL,
    "merged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rolled_back_at" TIMESTAMP(3),
    "rollback_reason" TEXT,
    "source_snapshots" JSONB NOT NULL,
    "responses_moved" INTEGER NOT NULL DEFAULT 0,
    "participants_merged" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "topic_merges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "topic_merges_target_topic_id_fkey" FOREIGN KEY ("target_topic_id") REFERENCES "discussion_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "topic_merges_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- T003: Create indexes for topic_merges
CREATE INDEX IF NOT EXISTS "topic_merges_target_topic_id_idx" ON "topic_merges"("target_topic_id");
CREATE INDEX IF NOT EXISTS "topic_merges_moderator_id_idx" ON "topic_merges"("moderator_id");
CREATE INDEX IF NOT EXISTS "topic_merges_merged_at_idx" ON "topic_merges"("merged_at");
CREATE INDEX IF NOT EXISTS "topic_merges_rolled_back_at_idx" ON "topic_merges"("rolled_back_at");

-- T005: Create full-text search index for topic titles and descriptions (PostgreSQL tsvector)
-- This enables fast full-text search using PostgreSQL native capabilities
ALTER TABLE "discussion_topics" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Generate search vector from title and description
CREATE INDEX IF NOT EXISTS "discussion_topics_search_vector_idx" ON "discussion_topics" USING GIN("search_vector");

-- Create trigger to keep search_vector updated
CREATE OR REPLACE FUNCTION update_topic_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_update_topic_search_vector
  BEFORE INSERT OR UPDATE OF title, description ON "discussion_topics"
  FOR EACH ROW
  EXECUTE FUNCTION update_topic_search_vector();

-- T005: Enable pg_trgm extension for trigram similarity matching (duplicate detection)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index on title for fast similarity search
CREATE INDEX IF NOT EXISTS "discussion_topics_title_trgm_idx" ON "discussion_topics" USING GIN("title" gin_trgm_ops);

-- Backfill search_vector for existing topics
UPDATE "discussion_topics"
SET "search_vector" =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B')
WHERE "search_vector" IS NULL;

-- Generate default slugs for existing topics (will be properly generated by application)
-- Temporary placeholder slugs to satisfy NOT NULL constraint
UPDATE "discussion_topics"
SET "slug" = LOWER(REGEXP_REPLACE(
  REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
  '\s+', '-', 'g'
)) || '-' || SUBSTRING(id::text FROM 1 FOR 8)
WHERE "slug" = '';
