-- CreateEnum
CREATE TYPE "activity_type" AS ENUM ('TOPIC_CREATED', 'RESPONSE_POSTED', 'DISCUSSION_JOINED');

-- CreateEnum
CREATE TYPE "target_type" AS ENUM ('TOPIC', 'RESPONSE', 'DISCUSSION');

-- CreateTable
CREATE TABLE "activity_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "activity_type" "activity_type" NOT NULL,
    "target_id" UUID NOT NULL,
    "target_type" "target_type" NOT NULL,
    "target_title" TEXT,
    "target_slug" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_events_user_id_created_at_idx" ON "activity_events"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "activity_events_created_at_idx" ON "activity_events"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
