-- Add rejection-audit columns to moderation_actions (Issue #1320)
-- Records WHO rejected a pending moderation action and WHEN, mirroring the
-- existing approved_by_id / approved_at columns so rejections are queryable
-- rather than only appended as free text into the reasoning field.

ALTER TABLE "moderation_actions" ADD COLUMN IF NOT EXISTS "rejected_by_id" UUID;
ALTER TABLE "moderation_actions" ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP(3);

-- FK to users (nullable; ON DELETE SET NULL to preserve the action if the
-- moderator account is later removed, matching ModeratorApproval semantics).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'moderation_actions_rejected_by_id_fkey'
  ) THEN
    ALTER TABLE "moderation_actions"
      ADD CONSTRAINT "moderation_actions_rejected_by_id_fkey"
      FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
