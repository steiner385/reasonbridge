-- AlterTable: Add mentor and contact discovery fields to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_mentor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "discoverable_by_contacts" BOOLEAN NOT NULL DEFAULT false;
