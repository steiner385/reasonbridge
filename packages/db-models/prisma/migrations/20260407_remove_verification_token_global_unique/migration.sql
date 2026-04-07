-- Remove global unique constraint on verification_tokens.token
-- This allows the same verification code to be used by different users,
-- which is required for E2E tests that use a fixed verification code.
-- Security note: Token verification always requires the email address,
-- so global uniqueness provides no additional security benefit.

DROP INDEX IF EXISTS "verification_tokens_token_key";
