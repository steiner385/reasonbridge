-- Add feedback_preferences column to users table
-- This column stores AI feedback preferences as JSON (T117)
ALTER TABLE "users" ADD COLUMN "feedback_preferences" JSONB;
