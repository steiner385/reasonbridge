-- CreateEnum
CREATE TYPE "access_source" AS ENUM ('INVITATION', 'DIRECT_GRANT', 'CREATOR');

-- CreateTable
CREATE TABLE "topic_access" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "granted_by" UUID,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "access_source" NOT NULL DEFAULT 'INVITATION',
    "invitation_id" UUID,

    CONSTRAINT "topic_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "topic_access_user_id_idx" ON "topic_access"("user_id");

-- CreateIndex
CREATE INDEX "topic_access_topic_id_idx" ON "topic_access"("topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "topic_access_topic_id_user_id_key" ON "topic_access"("topic_id", "user_id");
