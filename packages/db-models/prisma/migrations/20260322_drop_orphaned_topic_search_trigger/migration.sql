-- Fix: Drop orphaned trigger and function for search_vector
-- The search_vector column was dropped in migration 20260320232632_add_verification_token_type
-- but the trigger was not removed, causing errors on topic INSERT/UPDATE

-- Drop the trigger first (depends on the function)
DROP TRIGGER IF EXISTS trig_update_topic_search_vector ON "discussion_topics";

-- Drop the function (no longer needed)
DROP FUNCTION IF EXISTS update_topic_search_vector();
