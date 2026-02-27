-- AlterTable: Add age re-verification fields to users table
ALTER TABLE "users" ADD COLUMN "last_age_verified_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "requires_age_reverification" BOOLEAN NOT NULL DEFAULT false;
