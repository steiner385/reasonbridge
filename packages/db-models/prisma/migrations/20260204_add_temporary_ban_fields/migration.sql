-- AddTemporaryBanFields
-- Add temporary ban fields to moderation_actions table

ALTER TABLE "moderation_actions" ADD COLUMN "is_temporary" BOOLEAN DEFAULT false;
ALTER TABLE "moderation_actions" ADD COLUMN "ban_duration_days" INTEGER;
ALTER TABLE "moderation_actions" ADD COLUMN "expires_at" TIMESTAMP(3);
ALTER TABLE "moderation_actions" ADD COLUMN "lifted_at" TIMESTAMP(3);
