-- AddFeedbackPreferences
-- Adds the feedback_preferences JSON column to users table for AI feedback preferences (T117)

ALTER TABLE "users" ADD COLUMN "feedback_preferences" JSONB;
