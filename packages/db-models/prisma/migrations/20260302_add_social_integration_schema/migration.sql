-- Migration: Add missing social integration schema elements
-- Part of Social Media Integration (#782, #926) - migrations were missing
--
-- This migration adds:
-- 1. email_hash column to users table (for contact matching)
-- 2. SocialProvider enum
-- 3. InvitationStatus enum
-- 4. social_connections table
-- 5. imported_contacts table
-- 6. topic_invitations table

-- 1. Add email_hash column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_hash" TEXT;
CREATE INDEX IF NOT EXISTS "users_email_hash_idx" ON "users"("email_hash");

-- 2. Create SocialProvider enum
DO $$ BEGIN
    CREATE TYPE "social_provider" AS ENUM ('GOOGLE', 'FACEBOOK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create InvitationStatus enum
DO $$ BEGIN
    CREATE TYPE "invitation_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Create social_connections table
CREATE TABLE IF NOT EXISTS "social_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "social_provider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expiry" TIMESTAMP(3),
    "scopes" TEXT[] NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_connections_pkey" PRIMARY KEY ("id")
);

-- Add indexes and constraints for social_connections
CREATE UNIQUE INDEX IF NOT EXISTS "social_connections_user_id_provider_key" ON "social_connections"("user_id", "provider");
CREATE INDEX IF NOT EXISTS "social_connections_user_id_idx" ON "social_connections"("user_id");

-- 5. Create imported_contacts table
CREATE TABLE IF NOT EXISTS "imported_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "email_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "provider" "social_provider" NOT NULL,
    "matched_user_id" UUID,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imported_contacts_pkey" PRIMARY KEY ("id")
);

-- Add indexes and constraints for imported_contacts
CREATE UNIQUE INDEX IF NOT EXISTS "imported_contacts_owner_id_email_hash_key" ON "imported_contacts"("owner_id", "email_hash");
CREATE INDEX IF NOT EXISTS "imported_contacts_email_hash_idx" ON "imported_contacts"("email_hash");
CREATE INDEX IF NOT EXISTS "imported_contacts_owner_id_idx" ON "imported_contacts"("owner_id");

-- 6. Create topic_invitations table
CREATE TABLE IF NOT EXISTS "topic_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topic_id" UUID NOT NULL,
    "inviter_id" UUID NOT NULL,
    "invitee_user_id" UUID,
    "invitee_email" TEXT,
    "status" "invitation_status" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "topic_invitations_pkey" PRIMARY KEY ("id")
);

-- Add indexes and constraints for topic_invitations
CREATE UNIQUE INDEX IF NOT EXISTS "topic_invitations_token_key" ON "topic_invitations"("token");
CREATE INDEX IF NOT EXISTS "topic_invitations_invitee_user_id_idx" ON "topic_invitations"("invitee_user_id");
CREATE INDEX IF NOT EXISTS "topic_invitations_invitee_email_idx" ON "topic_invitations"("invitee_email");
CREATE INDEX IF NOT EXISTS "topic_invitations_topic_id_idx" ON "topic_invitations"("topic_id");
CREATE INDEX IF NOT EXISTS "topic_invitations_token_idx" ON "topic_invitations"("token");
