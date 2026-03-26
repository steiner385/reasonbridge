-- Add brute force protection fields to verification_tokens table
-- These fields track failed verification attempts and lockout state

-- Add attempts counter (defaults to 0 for existing tokens)
ALTER TABLE "verification_tokens" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- Add locked_at timestamp (null means not locked)
ALTER TABLE "verification_tokens" ADD COLUMN "locked_at" TIMESTAMP(3);
