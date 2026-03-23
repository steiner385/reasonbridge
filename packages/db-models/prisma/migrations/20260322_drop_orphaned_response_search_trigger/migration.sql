-- Fix: Drop orphaned trigger and function for response search_vector
-- The search_vector column was dropped in migration 20260320232632_add_verification_token_type
-- but the trigger and function were not removed, causing "record 'new' has no field 'search_vector'" errors

-- Drop the trigger first (depends on the function)
DROP TRIGGER IF EXISTS trig_update_response_search_vector ON "responses";

-- Drop the orphaned function
DROP FUNCTION IF EXISTS update_response_search_vector();
