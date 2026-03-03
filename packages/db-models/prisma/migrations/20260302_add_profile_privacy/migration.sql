-- CreateEnum
CREATE TYPE "profile_visibility" AS ENUM ('PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "bio" VARCHAR(300);

-- CreateTable
CREATE TABLE "user_privacy_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "activity_history" "profile_visibility" NOT NULL DEFAULT 'PUBLIC',
    "detailed_trust_scores" "profile_visibility" NOT NULL DEFAULT 'PUBLIC',
    "follower_list" "profile_visibility" NOT NULL DEFAULT 'PUBLIC',
    "following_list" "profile_visibility" NOT NULL DEFAULT 'PUBLIC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_privacy_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_privacy_settings_user_id_key" ON "user_privacy_settings"("user_id");

-- CreateIndex
CREATE INDEX "user_privacy_settings_user_id_idx" ON "user_privacy_settings"("user_id");

-- AddForeignKey
ALTER TABLE "user_privacy_settings" ADD CONSTRAINT "user_privacy_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
