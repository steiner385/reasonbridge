-- Add otp_plaintext field to verification_records table
-- This field is only populated in test/E2E mode for automated testing
-- NEVER populated in production environments

ALTER TABLE "verification_records" ADD COLUMN "otp_plaintext" TEXT;
