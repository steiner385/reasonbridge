-- Add composite index on responses(topic_id, author_id).
-- Supports the per-author EXISTS check used to maintain discussion_topics.participant_count
-- incrementally, replacing a per-write groupBy over all topic responses (issue #1307).

CREATE INDEX IF NOT EXISTS "responses_topic_id_author_id_idx" ON "responses"("topic_id", "author_id");
