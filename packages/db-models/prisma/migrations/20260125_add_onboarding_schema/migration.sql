-- T006-T010: Create enums for onboarding feature
CREATE TYPE "auth_method" AS ENUM ('EMAIL_PASSWORD', 'GOOGLE_OAUTH', 'APPLE_OAUTH');
CREATE TYPE "onboarding_step" AS ENUM ('VERIFICATION', 'TOPICS', 'ORIENTATION', 'COMPLETE');
CREATE TYPE "activity_level" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "account_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- T006: Add onboarding columns to users table
ALTER TABLE "users" ADD COLUMN "auth_method" "auth_method" NOT NULL DEFAULT 'EMAIL_PASSWORD';
ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;
ALTER TABLE "users" ADD COLUMN "account_status" "account_status" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "users" ADD COLUMN "last_login_at" TIMESTAMP(3);

-- T012: Add indexes for User table
CREATE INDEX "users_email_verified_idx" ON "users"("email_verified");

-- T007: Create VerificationToken table
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- T013: Add indexes for VerificationToken
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE INDEX "verification_tokens_user_id_idx" ON "verification_tokens"("user_id");
CREATE INDEX "verification_tokens_expires_at_idx" ON "verification_tokens"("expires_at");

-- T008: Create OnboardingProgress table
CREATE TABLE "onboarding_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "topics_selected" BOOLEAN NOT NULL DEFAULT false,
    "orientation_viewed" BOOLEAN NOT NULL DEFAULT false,
    "first_post_made" BOOLEAN NOT NULL DEFAULT false,
    "current_step" "onboarding_step" NOT NULL,
    "last_updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- T014: Add indexes for OnboardingProgress
CREATE UNIQUE INDEX "onboarding_progress_user_id_key" ON "onboarding_progress"("user_id");
CREATE INDEX "onboarding_progress_current_step_idx" ON "onboarding_progress"("current_step");
CREATE INDEX "onboarding_progress_completed_at_idx" ON "onboarding_progress"("completed_at");

-- T010: Add onboarding columns to discussion_topics table
ALTER TABLE "discussion_topics" ADD COLUMN "active_discussion_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "discussion_topics" ADD COLUMN "activity_level" "activity_level" NOT NULL DEFAULT 'LOW';
ALTER TABLE "discussion_topics" ADD COLUMN "suggested_for_new_users" BOOLEAN NOT NULL DEFAULT false;

-- T005: Add indexes for DiscussionTopic
CREATE INDEX "discussion_topics_activity_level_idx" ON "discussion_topics"("activity_level");
CREATE INDEX "discussion_topics_suggested_for_new_users_idx" ON "discussion_topics"("suggested_for_new_users");

-- T009: Create TopicInterest table
CREATE TABLE "topic_interests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "priority" SMALLINT NOT NULL,
    "selected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_interests_pkey" PRIMARY KEY ("id")
);

-- T015: Add composite index for TopicInterest
CREATE UNIQUE INDEX "topic_interests_user_id_topic_id_key" ON "topic_interests"("user_id", "topic_id");
CREATE INDEX "topic_interests_user_id_priority_idx" ON "topic_interests"("user_id", "priority");

-- T011: Create VisitorSession table
CREATE TABLE "visitor_sessions" (
    "id" UUID NOT NULL,
    "session_id" TEXT NOT NULL,
    "viewed_demo_discussion_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "interaction_timestamps" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
    "referral_source" TEXT,
    "converted_to_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_sessions_pkey" PRIMARY KEY ("id")
);

-- Add indexes for VisitorSession
CREATE UNIQUE INDEX "visitor_sessions_session_id_key" ON "visitor_sessions"("session_id");
CREATE UNIQUE INDEX "visitor_sessions_converted_to_user_id_key" ON "visitor_sessions"("converted_to_user_id");
CREATE INDEX "visitor_sessions_converted_to_user_id_idx" ON "visitor_sessions"("converted_to_user_id");
CREATE INDEX "visitor_sessions_last_activity_at_idx" ON "visitor_sessions"("last_activity_at");

-- Add foreign key constraints
ALTER TABLE "topic_interests" ADD CONSTRAINT "topic_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "topic_interests" ADD CONSTRAINT "topic_interests_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "discussion_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
