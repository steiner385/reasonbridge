-- Feature #1040: Full-Text Search for Discussions
-- Add search_vector column and GIN index to responses table for efficient full-text search

-- Add search_vector column to responses
ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS "responses_search_vector_idx" ON "responses" USING GIN("search_vector");

-- Create trigger function to update search_vector when content changes
CREATE OR REPLACE FUNCTION update_response_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS trig_update_response_search_vector ON "responses";

-- Create trigger to keep search_vector updated
CREATE TRIGGER trig_update_response_search_vector
  BEFORE INSERT OR UPDATE OF content ON "responses"
  FOR EACH ROW
  EXECUTE FUNCTION update_response_search_vector();

-- Backfill search_vector for existing responses
-- Uses batch update to avoid locking entire table
UPDATE "responses"
SET "search_vector" = to_tsvector('english', COALESCE(content, ''))
WHERE "search_vector" IS NULL;

-- Create trigram index on content for similarity search (used for related content discovery)
CREATE INDEX IF NOT EXISTS "responses_content_trgm_idx" ON "responses" USING GIN("content" gin_trgm_ops);
