-- Add GIN trigram indexes to support infix ILIKE ('%query%') searches that
-- currently fall back to sequential scans (issue #1310).
--
-- - users.display_name / users.email back the @mention autocomplete
--   (searchUsers ORs infix ILIKE over both columns; an OR needs every branch
--   indexed to avoid a seq scan).
-- - discussion_topics.description backs topic recommendations, whose predicate
--   ORs ILIKE over title AND description; title already has a trigram index,
--   so indexing description lets the whole OR be index-assisted.
--
-- These cannot be expressed in the Prisma schema, so they live in a raw
-- migration (mirroring the existing discussion_topics_title_trgm_idx).

-- pg_trgm is already enabled by an earlier migration; keep this idempotent.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "users_display_name_trgm_idx"
  ON "users" USING GIN ("display_name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "users_email_trgm_idx"
  ON "users" USING GIN ("email" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "discussion_topics_description_trgm_idx"
  ON "discussion_topics" USING GIN ("description" gin_trgm_ops);
