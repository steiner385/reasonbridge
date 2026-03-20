/*
  Warnings:

  - The values [DRAFT,CONCLUDED] on the enum `discussion_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `target_title` on the `activity_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `target_slug` on the `activity_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(250)`.
  - You are about to drop the column `added_at` on the `citations` table. All the data in the column will be lost.
  - You are about to drop the column `domain` on the `citations` table. All the data in the column will be lost.
  - You are about to drop the column `is_trusted_source` on the `citations` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `citations` table. All the data in the column will be lost.
  - You are about to drop the column `verified_at` on the `citations` table. All the data in the column will be lost.
  - You are about to drop the column `search_vector` on the `discussion_topics` table. All the data in the column will be lost.
  - You are about to drop the column `search_vector` on the `responses` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[verification_id]` on the table `video_uploads` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `normalized_url` to the `citations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `original_url` to the `citations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "tier_level" AS ENUM ('NEWCOMER', 'CONTRIBUTOR', 'TRUSTED', 'LEADER', 'EXPERT');

-- CreateEnum
CREATE TYPE "expertise_level" AS ENUM ('NOVICE', 'FAMILIAR', 'KNOWLEDGEABLE', 'EXPERT');

-- CreateEnum
CREATE TYPE "credential_type" AS ENUM ('ACADEMIC_DOCTORATE', 'ACADEMIC_MASTERS', 'ACADEMIC_BACHELORS', 'PROFESSIONAL_LICENSE', 'INDUSTRY_CERTIFICATION', 'PUBLICATION');

-- CreateEnum
CREATE TYPE "credential_status" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "tier_appeal_type" AS ENUM ('GLOBAL_TIER', 'DOMAIN_EXPERTISE');

-- CreateEnum
CREATE TYPE "tier_appeal_status" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "provisional_access_status" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "citation_validation_status" AS ENUM ('ACTIVE', 'BROKEN', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "report_category" AS ENUM ('SPAM', 'HARASSMENT', 'MISINFORMATION', 'HATE_SPEECH', 'VIOLENCE', 'COPYRIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationTokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "safety_report_reason" AS ENUM ('UNCOMFORTABLE', 'SCARY_CONTENT', 'STRANGER_CONTACT', 'PERSONAL_QUESTIONS', 'OTHER');

-- CreateEnum
CREATE TYPE "safety_report_status" AS ENUM ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED');

-- AlterEnum
BEGIN;
CREATE TYPE "discussion_status_new" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');
ALTER TABLE "public"."discussions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "discussions" ALTER COLUMN "status" TYPE "discussion_status_new" USING ("status"::text::"discussion_status_new");
ALTER TYPE "discussion_status" RENAME TO "discussion_status_old";
ALTER TYPE "discussion_status_new" RENAME TO "discussion_status";
DROP TYPE "public"."discussion_status_old";
ALTER TABLE "discussions" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "discussions" DROP CONSTRAINT "discussions_creator_id_fkey";

-- DropForeignKey
ALTER TABLE "responses" DROP CONSTRAINT "responses_discussion_id_fkey";

-- DropIndex
DROP INDEX "citations_domain_idx";

-- DropIndex
DROP INDEX "discussion_topics_search_vector_idx";

-- DropIndex
DROP INDEX "discussion_topics_title_trgm_idx";

-- DropIndex
DROP INDEX "discussions_topic_id_idx";

-- DropIndex
DROP INDEX "responses_content_trgm_idx";

-- DropIndex
DROP INDEX "responses_discussion_id_idx";

-- DropIndex
DROP INDEX "responses_search_vector_idx";

-- DropIndex
DROP INDEX "responses_version_idx";

-- AlterTable
ALTER TABLE "activity_events" ALTER COLUMN "target_title" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "target_slug" SET DATA TYPE VARCHAR(250);

-- AlterTable
ALTER TABLE "citations" DROP COLUMN "added_at",
DROP COLUMN "domain",
DROP COLUMN "is_trusted_source",
DROP COLUMN "url",
DROP COLUMN "verified_at",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "normalized_url" VARCHAR(2048) NOT NULL,
ADD COLUMN     "original_url" VARCHAR(2048) NOT NULL,
ADD COLUMN     "resolved_ip" VARCHAR(45),
ADD COLUMN     "validated_at" TIMESTAMP(3),
ADD COLUMN     "validation_status" "citation_validation_status" NOT NULL DEFAULT 'UNVERIFIED';

-- AlterTable
ALTER TABLE "discussion_topics" DROP COLUMN "search_vector",
ALTER COLUMN "slug" DROP DEFAULT;

-- AlterTable
ALTER TABLE "imported_contacts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notification_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "response_reactions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "responses" DROP COLUMN "search_vector";

-- AlterTable
ALTER TABLE "social_connections" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "scopes" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "topic_edits" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "topic_invitations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "topic_merges" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "fcm_token" TEXT,
ADD COLUMN     "notify_by_email" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_by_push" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notify_by_sms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parent_phone" TEXT,
ALTER COLUMN "display_name" DROP NOT NULL,
ALTER COLUMN "auth_method" DROP DEFAULT;

-- AlterTable
ALTER TABLE "verification_tokens" ADD COLUMN     "type" "VerificationTokenType" NOT NULL DEFAULT 'EMAIL_VERIFICATION';

-- CreateTable
CREATE TABLE "user_ranks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tier_level" "tier_level" NOT NULL DEFAULT 'NEWCOMER',
    "composite_score" DECIMAL(4,3) NOT NULL DEFAULT 0.00,
    "engagement_score" DECIMAL(4,3) NOT NULL DEFAULT 0.00,
    "quality_score" DECIMAL(4,3) NOT NULL DEFAULT 0.00,
    "tenure_bonus" DECIMAL(4,3) NOT NULL DEFAULT 0.00,
    "badges" JSONB NOT NULL DEFAULT '[]',
    "last_calculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_tier_threshold" DECIMAL(4,3) NOT NULL DEFAULT 0.20,
    "last_activity_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_expertise" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "expertise_score" DECIMAL(4,3) NOT NULL DEFAULT 0.00,
    "expertise_level" "expertise_level" NOT NULL DEFAULT 'NOVICE',
    "response_count" INTEGER NOT NULL DEFAULT 0,
    "avg_quality_score" DECIMAL(4,3) NOT NULL DEFAULT 0.00,
    "credential_boost" DECIMAL(4,3) NOT NULL DEFAULT 0.00,
    "last_active" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_expertise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_credentials" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "type" "credential_type" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "institution" VARCHAR(200),
    "document_url" TEXT,
    "verification_url" TEXT,
    "status" "credential_status" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "review_notes" TEXT,
    "verified_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "boost_value" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tier_appeals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "appeal_type" "tier_appeal_type" NOT NULL,
    "tag_id" UUID,
    "requested_level" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "tier_appeal_status" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "tier_appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provisional_access" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "granted_by_id" UUID NOT NULL,
    "reason" VARCHAR(500),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "provisional_access_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provisional_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_drafts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibility" "topic_visibility" NOT NULL DEFAULT 'PUBLIC',
    "evidence_standards" "evidence_standard" NOT NULL DEFAULT 'STANDARD',
    "is_mature_content" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "topic_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "content_type" VARCHAR(50) NOT NULL,
    "content_id" UUID NOT NULL,
    "category" "report_category" NOT NULL,
    "description" TEXT,
    "status" "report_status" NOT NULL DEFAULT 'PENDING',
    "moderator_id" UUID,
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reason" "safety_report_reason" NOT NULL,
    "additional_info" TEXT,
    "status" "safety_report_status" NOT NULL DEFAULT 'PENDING',
    "priority" "review_priority" NOT NULL DEFAULT 'NORMAL',
    "context_url" VARCHAR(500),
    "context_topic_id" UUID,
    "context_response_id" UUID,
    "moderator_notes" TEXT,
    "handled_by_id" UUID,
    "handled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_ranks_user_id_key" ON "user_ranks"("user_id");

-- CreateIndex
CREATE INDEX "user_ranks_tier_level_idx" ON "user_ranks"("tier_level");

-- CreateIndex
CREATE INDEX "user_ranks_composite_score_idx" ON "user_ranks"("composite_score" DESC);

-- CreateIndex
CREATE INDEX "user_ranks_last_calculated_idx" ON "user_ranks"("last_calculated");

-- CreateIndex
CREATE INDEX "topic_expertise_expertise_level_idx" ON "topic_expertise"("expertise_level");

-- CreateIndex
CREATE INDEX "topic_expertise_expertise_score_idx" ON "topic_expertise"("expertise_score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "topic_expertise_user_id_tag_id_key" ON "topic_expertise"("user_id", "tag_id");

-- CreateIndex
CREATE INDEX "domain_credentials_user_id_tag_id_idx" ON "domain_credentials"("user_id", "tag_id");

-- CreateIndex
CREATE INDEX "domain_credentials_status_idx" ON "domain_credentials"("status");

-- CreateIndex
CREATE INDEX "domain_credentials_expires_at_idx" ON "domain_credentials"("expires_at");

-- CreateIndex
CREATE INDEX "tier_appeals_user_id_idx" ON "tier_appeals"("user_id");

-- CreateIndex
CREATE INDEX "tier_appeals_status_idx" ON "tier_appeals"("status");

-- CreateIndex
CREATE INDEX "provisional_access_expires_at_idx" ON "provisional_access"("expires_at");

-- CreateIndex
CREATE INDEX "provisional_access_status_idx" ON "provisional_access"("status");

-- CreateIndex
CREATE UNIQUE INDEX "provisional_access_user_id_topic_id_key" ON "provisional_access"("user_id", "topic_id");

-- CreateIndex
CREATE INDEX "topic_drafts_user_id_idx" ON "topic_drafts"("user_id");

-- CreateIndex
CREATE INDEX "topic_drafts_updated_at_idx" ON "topic_drafts"("updated_at" DESC);

-- CreateIndex
CREATE INDEX "topic_drafts_expires_at_idx" ON "topic_drafts"("expires_at");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_content_type_content_id_idx" ON "reports"("content_type", "content_id");

-- CreateIndex
CREATE INDEX "reports_reporter_id_idx" ON "reports"("reporter_id");

-- CreateIndex
CREATE INDEX "reports_created_at_idx" ON "reports"("created_at");

-- CreateIndex
CREATE INDEX "reports_category_idx" ON "reports"("category");

-- CreateIndex
CREATE INDEX "safety_reports_reporter_id_idx" ON "safety_reports"("reporter_id");

-- CreateIndex
CREATE INDEX "safety_reports_status_priority_created_at_idx" ON "safety_reports"("status", "priority", "created_at");

-- CreateIndex
CREATE INDEX "safety_reports_context_topic_id_idx" ON "safety_reports"("context_topic_id");

-- CreateIndex
CREATE INDEX "citations_normalized_url_idx" ON "citations"("normalized_url");

-- CreateIndex
CREATE INDEX "citations_validation_status_idx" ON "citations"("validation_status");

-- CreateIndex
CREATE INDEX "discussion_topics_slug_idx" ON "discussion_topics"("slug");

-- CreateIndex
CREATE INDEX "discussions_topic_id_status_last_activity_at_idx" ON "discussions"("topic_id", "status", "last_activity_at" DESC);

-- CreateIndex
CREATE INDEX "discussions_created_at_idx" ON "discussions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "moderation_actions_expires_at_idx" ON "moderation_actions"("expires_at");

-- CreateIndex
CREATE INDEX "responses_discussion_id_deleted_at_idx" ON "responses"("discussion_id", "deleted_at");

-- CreateIndex
CREATE INDEX "responses_deleted_at_idx" ON "responses"("deleted_at");

-- CreateIndex
CREATE INDEX "users_phone_number_idx" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_is_minor_idx" ON "users"("is_minor");

-- CreateIndex
CREATE INDEX "users_parent_consent_status_idx" ON "users"("parent_consent_status");

-- CreateIndex
CREATE INDEX "verification_tokens_type_idx" ON "verification_tokens"("type");

-- CreateIndex
CREATE UNIQUE INDEX "video_uploads_verification_id_key" ON "video_uploads"("verification_id");

-- AddForeignKey
ALTER TABLE "user_ranks" ADD CONSTRAINT "user_ranks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_expertise" ADD CONSTRAINT "topic_expertise_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_expertise" ADD CONSTRAINT "topic_expertise_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_credentials" ADD CONSTRAINT "domain_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_credentials" ADD CONSTRAINT "domain_credentials_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_credentials" ADD CONSTRAINT "domain_credentials_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tier_appeals" ADD CONSTRAINT "tier_appeals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tier_appeals" ADD CONSTRAINT "tier_appeals_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tier_appeals" ADD CONSTRAINT "tier_appeals_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provisional_access" ADD CONSTRAINT "provisional_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provisional_access" ADD CONSTRAINT "provisional_access_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "discussion_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provisional_access" ADD CONSTRAINT "provisional_access_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_topics" ADD CONSTRAINT "discussion_topics_required_tag_id_fkey" FOREIGN KEY ("required_tag_id") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_drafts" ADD CONSTRAINT "topic_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_reports" ADD CONSTRAINT "safety_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_reports" ADD CONSTRAINT "safety_reports_handled_by_id_fkey" FOREIGN KEY ("handled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
