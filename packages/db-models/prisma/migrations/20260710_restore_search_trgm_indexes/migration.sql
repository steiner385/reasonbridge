-- Restore pg_trgm GIN indexes for text search (Issues #1290, #1291)
--
-- Migration 20260320232632_add_verification_token_type dropped the search_vector
-- columns AND the trigram indexes backing text search:
--   * discussion_topics_title_trgm_idx   (line 82)
--   * responses_content_trgm_idx         (line 88)
-- TopicsSearchService and ResponsesSearchService were (re)written to use ILIKE
-- '%query%' matching, but without a pg_trgm GIN index those leading-wildcard
-- ILIKE scans degrade to sequential scans on every search/duplicate-detection
-- query. Recreating the trigram indexes makes the ILIKE scans index-backed
-- again (pg_trgm GIN indexes accelerate LIKE/ILIKE with wildcards).
--
-- A description trigram index is also (re)added so ILIKE on the description
-- column and the similarity(description, ...) duplicate-detection predicate are
-- likewise index-supported.

-- Ensure the trigram extension is present (retained by prior migrations, but be
-- defensive so this migration is self-contained).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Topics: title + description trigram indexes for search and duplicate detection.
CREATE INDEX IF NOT EXISTS "discussion_topics_title_trgm_idx"
  ON "discussion_topics" USING GIN ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "discussion_topics_description_trgm_idx"
  ON "discussion_topics" USING GIN ("description" gin_trgm_ops);

-- Responses: content trigram index for full-text ILIKE search.
CREATE INDEX IF NOT EXISTS "responses_content_trgm_idx"
  ON "responses" USING GIN ("content" gin_trgm_ops);
