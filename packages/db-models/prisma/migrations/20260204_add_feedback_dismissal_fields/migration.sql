-- Add dismissal fields to feedback table
-- These fields track when and why users dismissed AI feedback suggestions

ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "dismissed_at" TIMESTAMP(3);
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "dismissal_reason" TEXT;
