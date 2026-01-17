-- CreateEnum
CREATE TYPE "verification_level" AS ENUM ('BASIC', 'ENHANCED', 'VERIFIED_HUMAN');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "verification_type" AS ENUM ('EMAIL', 'PHONE', 'GOVERNMENT_ID');

-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "topic_status" AS ENUM ('SEEDING', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "evidence_standard" AS ENUM ('MINIMAL', 'STANDARD', 'RIGOROUS');

-- CreateEnum
CREATE TYPE "tag_source" AS ENUM ('CREATOR', 'AI_SUGGESTED', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "topic_relationship_type" AS ENUM ('BUILDS_ON', 'RESPONDS_TO', 'CONTRADICTS', 'RELATED', 'SHARES_PROPOSITION');

-- CreateEnum
CREATE TYPE "link_source" AS ENUM ('AI_SUGGESTED', 'USER_PROPOSED');

-- CreateEnum
CREATE TYPE "confirmation_status" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "proposition_source" AS ENUM ('AI_IDENTIFIED', 'USER_CREATED');

-- CreateEnum
CREATE TYPE "proposition_status" AS ENUM ('ACTIVE', 'MERGED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "response_status" AS ENUM ('VISIBLE', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "alignment_stance" AS ENUM ('SUPPORT', 'OPPOSE', 'NUANCED');

-- CreateEnum
CREATE TYPE "feedback_type" AS ENUM ('FALLACY', 'INFLAMMATORY', 'UNSOURCED', 'BIAS', 'AFFIRMATION');

-- CreateEnum
CREATE TYPE "helpful_rating" AS ENUM ('HELPFUL', 'NOT_HELPFUL');

-- CreateEnum
CREATE TYPE "moderation_target_type" AS ENUM ('RESPONSE', 'USER', 'TOPIC');

-- CreateEnum
CREATE TYPE "moderation_action_type" AS ENUM ('EDUCATE', 'WARN', 'HIDE', 'REMOVE', 'SUSPEND', 'BAN');

-- CreateEnum
CREATE TYPE "moderation_severity" AS ENUM ('NON_PUNITIVE', 'CONSEQUENTIAL');

-- CreateEnum
CREATE TYPE "moderation_status" AS ENUM ('PENDING', 'ACTIVE', 'APPEALED', 'REVERSED');

-- CreateEnum
CREATE TYPE "appeal_status" AS ENUM ('PENDING', 'UNDER_REVIEW', 'UPHELD', 'DENIED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" VARCHAR(50) NOT NULL,
    "cognito_sub" TEXT NOT NULL,
    "verification_level" "verification_level" NOT NULL DEFAULT 'BASIC',
    "trust_score_ability" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    "trust_score_benevolence" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    "trust_score_integrity" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    "moral_foundation_profile" JSONB,
    "position_fingerprint" JSONB,
    "topic_affinities" JSONB,
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "verification_type" NOT NULL,
    "status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "provider_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follows" (
    "id" UUID NOT NULL,
    "follower_id" UUID NOT NULL,
    "followed_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_topics" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "creator_id" UUID NOT NULL,
    "status" "topic_status" NOT NULL DEFAULT 'SEEDING',
    "evidence_standards" "evidence_standard" NOT NULL DEFAULT 'STANDARD',
    "minimum_diversity_score" DECIMAL(3,2) NOT NULL DEFAULT 0.30,
    "current_diversity_score" DECIMAL(3,2),
    "participant_count" INTEGER NOT NULL DEFAULT 0,
    "response_count" INTEGER NOT NULL DEFAULT 0,
    "cross_cutting_themes" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "discussion_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "slug" TEXT NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "ai_synonyms" TEXT[],
    "parent_theme_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_tags" (
    "topic_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "source" "tag_source" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_tags_pkey" PRIMARY KEY ("topic_id","tag_id")
);

-- CreateTable
CREATE TABLE "topic_links" (
    "id" UUID NOT NULL,
    "source_topic_id" UUID NOT NULL,
    "target_topic_id" UUID NOT NULL,
    "relationship_type" "topic_relationship_type" NOT NULL,
    "link_source" "link_source" NOT NULL,
    "proposer_id" UUID,
    "confirmation_status" "confirmation_status" NOT NULL DEFAULT 'PENDING',
    "confirmed_by_count" INTEGER NOT NULL DEFAULT 0,
    "rejected_by_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propositions" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "statement" VARCHAR(1000) NOT NULL,
    "source" "proposition_source" NOT NULL,
    "creator_id" UUID,
    "parent_proposition_id" UUID,
    "support_count" INTEGER NOT NULL DEFAULT 0,
    "oppose_count" INTEGER NOT NULL DEFAULT 0,
    "nuanced_count" INTEGER NOT NULL DEFAULT 0,
    "consensus_score" DECIMAL(3,2),
    "evidence_pool" JSONB,
    "status" "proposition_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responses" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "cited_sources" JSONB,
    "contains_opinion" BOOLEAN NOT NULL DEFAULT false,
    "contains_factual_claims" BOOLEAN NOT NULL DEFAULT false,
    "status" "response_status" NOT NULL DEFAULT 'VISIBLE',
    "revision_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "response_propositions" (
    "response_id" UUID NOT NULL,
    "proposition_id" UUID NOT NULL,
    "relevance_score" DECIMAL(3,2),

    CONSTRAINT "response_propositions_pkey" PRIMARY KEY ("response_id","proposition_id")
);

-- CreateTable
CREATE TABLE "alignments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "proposition_id" UUID NOT NULL,
    "stance" "alignment_stance" NOT NULL,
    "nuance_explanation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_ground_analyses" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "agreement_zones" JSONB NOT NULL,
    "misunderstandings" JSONB NOT NULL,
    "genuine_disagreements" JSONB NOT NULL,
    "overall_consensus_score" DECIMAL(3,2),
    "participant_count_at_generation" INTEGER NOT NULL,
    "response_count_at_generation" INTEGER NOT NULL,
    "model_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "common_ground_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "response_id" UUID NOT NULL,
    "type" "feedback_type" NOT NULL,
    "subtype" TEXT,
    "suggestion_text" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "confidence_score" DECIMAL(3,2) NOT NULL,
    "educational_resources" JSONB,
    "user_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "user_revised" BOOLEAN NOT NULL DEFAULT false,
    "user_helpful_rating" "helpful_rating",
    "displayed_to_user" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_check_results" (
    "id" UUID NOT NULL,
    "response_id" UUID NOT NULL,
    "claim_text" TEXT NOT NULL,
    "claim_start_offset" INTEGER NOT NULL,
    "claim_end_offset" INTEGER NOT NULL,
    "sources" JSONB NOT NULL,
    "has_conflicting_sources" BOOLEAN NOT NULL DEFAULT false,
    "displayed_as" TEXT NOT NULL DEFAULT 'Related Context',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fact_check_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL,
    "target_type" "moderation_target_type" NOT NULL,
    "target_id" UUID NOT NULL,
    "action_type" "moderation_action_type" NOT NULL,
    "severity" "moderation_severity" NOT NULL,
    "reasoning" TEXT NOT NULL,
    "ai_recommended" BOOLEAN NOT NULL DEFAULT false,
    "ai_confidence" DECIMAL(3,2),
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "status" "moderation_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executed_at" TIMESTAMP(3),

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appeals" (
    "id" UUID NOT NULL,
    "moderation_action_id" UUID NOT NULL,
    "appellant_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "appeal_status" NOT NULL DEFAULT 'PENDING',
    "reviewer_id" UUID,
    "decision_reasoning" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "appeals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_cognito_sub_key" ON "users"("cognito_sub");

-- CreateIndex
CREATE INDEX "users_cognito_sub_idx" ON "users"("cognito_sub");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_display_name_idx" ON "users"("display_name");

-- CreateIndex
CREATE INDEX "verification_records_user_id_type_idx" ON "verification_records"("user_id", "type");

-- CreateIndex
CREATE INDEX "verification_records_status_idx" ON "verification_records"("status");

-- CreateIndex
CREATE INDEX "user_follows_follower_id_idx" ON "user_follows"("follower_id");

-- CreateIndex
CREATE INDEX "user_follows_followed_id_idx" ON "user_follows"("followed_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_follower_id_followed_id_key" ON "user_follows"("follower_id", "followed_id");

-- CreateIndex
CREATE INDEX "discussion_topics_status_idx" ON "discussion_topics"("status");

-- CreateIndex
CREATE INDEX "discussion_topics_creator_id_idx" ON "discussion_topics"("creator_id");

-- CreateIndex
CREATE INDEX "discussion_topics_created_at_idx" ON "discussion_topics"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_usage_count_idx" ON "tags"("usage_count" DESC);

-- CreateIndex
CREATE INDEX "topic_tags_tag_id_idx" ON "topic_tags"("tag_id");

-- CreateIndex
CREATE INDEX "topic_links_source_topic_id_idx" ON "topic_links"("source_topic_id");

-- CreateIndex
CREATE INDEX "topic_links_target_topic_id_idx" ON "topic_links"("target_topic_id");

-- CreateIndex
CREATE INDEX "topic_links_relationship_type_idx" ON "topic_links"("relationship_type");

-- CreateIndex
CREATE INDEX "topic_links_confirmation_status_idx" ON "topic_links"("confirmation_status");

-- CreateIndex
CREATE UNIQUE INDEX "topic_links_source_topic_id_target_topic_id_relationship_ty_key" ON "topic_links"("source_topic_id", "target_topic_id", "relationship_type");

-- CreateIndex
CREATE INDEX "propositions_topic_id_idx" ON "propositions"("topic_id");

-- CreateIndex
CREATE INDEX "propositions_parent_proposition_id_idx" ON "propositions"("parent_proposition_id");

-- CreateIndex
CREATE INDEX "propositions_topic_id_consensus_score_idx" ON "propositions"("topic_id", "consensus_score" DESC);

-- CreateIndex
CREATE INDEX "responses_topic_id_idx" ON "responses"("topic_id");

-- CreateIndex
CREATE INDEX "responses_author_id_idx" ON "responses"("author_id");

-- CreateIndex
CREATE INDEX "responses_topic_id_created_at_idx" ON "responses"("topic_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "responses_status_idx" ON "responses"("status");

-- CreateIndex
CREATE INDEX "alignments_proposition_id_idx" ON "alignments"("proposition_id");

-- CreateIndex
CREATE UNIQUE INDEX "alignments_user_id_proposition_id_key" ON "alignments"("user_id", "proposition_id");

-- CreateIndex
CREATE INDEX "common_ground_analyses_topic_id_idx" ON "common_ground_analyses"("topic_id");

-- CreateIndex
CREATE INDEX "common_ground_analyses_topic_id_version_idx" ON "common_ground_analyses"("topic_id", "version" DESC);

-- CreateIndex
CREATE INDEX "feedback_response_id_idx" ON "feedback"("response_id");

-- CreateIndex
CREATE INDEX "feedback_type_idx" ON "feedback"("type");

-- CreateIndex
CREATE INDEX "feedback_displayed_to_user_created_at_idx" ON "feedback"("displayed_to_user", "created_at");

-- CreateIndex
CREATE INDEX "fact_check_results_response_id_idx" ON "fact_check_results"("response_id");

-- CreateIndex
CREATE INDEX "fact_check_results_expires_at_idx" ON "fact_check_results"("expires_at");

-- CreateIndex
CREATE INDEX "moderation_actions_target_type_target_id_idx" ON "moderation_actions"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "moderation_actions_status_idx" ON "moderation_actions"("status");

-- CreateIndex
CREATE INDEX "moderation_actions_severity_idx" ON "moderation_actions"("severity");

-- CreateIndex
CREATE INDEX "appeals_moderation_action_id_idx" ON "appeals"("moderation_action_id");

-- CreateIndex
CREATE INDEX "appeals_status_idx" ON "appeals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "appeals_moderation_action_id_appellant_id_key" ON "appeals"("moderation_action_id", "appellant_id");

-- AddForeignKey
ALTER TABLE "verification_records" ADD CONSTRAINT "verification_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followed_id_fkey" FOREIGN KEY ("followed_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_topics" ADD CONSTRAINT "discussion_topics_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_parent_theme_id_fkey" FOREIGN KEY ("parent_theme_id") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_tags" ADD CONSTRAINT "topic_tags_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "discussion_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_tags" ADD CONSTRAINT "topic_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_links" ADD CONSTRAINT "topic_links_source_topic_id_fkey" FOREIGN KEY ("source_topic_id") REFERENCES "discussion_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_links" ADD CONSTRAINT "topic_links_target_topic_id_fkey" FOREIGN KEY ("target_topic_id") REFERENCES "discussion_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_links" ADD CONSTRAINT "topic_links_proposer_id_fkey" FOREIGN KEY ("proposer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propositions" ADD CONSTRAINT "propositions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "discussion_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propositions" ADD CONSTRAINT "propositions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propositions" ADD CONSTRAINT "propositions_parent_proposition_id_fkey" FOREIGN KEY ("parent_proposition_id") REFERENCES "propositions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "discussion_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response_propositions" ADD CONSTRAINT "response_propositions_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response_propositions" ADD CONSTRAINT "response_propositions_proposition_id_fkey" FOREIGN KEY ("proposition_id") REFERENCES "propositions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alignments" ADD CONSTRAINT "alignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alignments" ADD CONSTRAINT "alignments_proposition_id_fkey" FOREIGN KEY ("proposition_id") REFERENCES "propositions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common_ground_analyses" ADD CONSTRAINT "common_ground_analyses_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "discussion_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_check_results" ADD CONSTRAINT "fact_check_results_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_moderation_action_id_fkey" FOREIGN KEY ("moderation_action_id") REFERENCES "moderation_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_appellant_id_fkey" FOREIGN KEY ("appellant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
