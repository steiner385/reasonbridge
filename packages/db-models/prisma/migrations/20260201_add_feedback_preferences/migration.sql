-- Add feedback_preferences column to users table
-- This stores user preferences for AI feedback (T117)

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "feedback_preferences" JSONB;
