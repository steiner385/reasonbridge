-- CreateEnum
CREATE TYPE "child_review_status" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "review_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "child_content_review_queue" (
    "id" UUID NOT NULL,
    "response_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "status" "child_review_status" NOT NULL DEFAULT 'PENDING',
    "priority" "review_priority" NOT NULL DEFAULT 'NORMAL',
    "ai_flags" JSONB,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "decision" VARCHAR(20),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_content_review_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "child_content_review_queue_response_id_key" ON "child_content_review_queue"("response_id");

-- CreateIndex
CREATE INDEX "child_content_review_queue_status_priority_created_at_idx" ON "child_content_review_queue"("status", "priority", "created_at");

-- CreateIndex
CREATE INDEX "child_content_review_queue_topic_id_idx" ON "child_content_review_queue"("topic_id");

-- CreateIndex
CREATE INDEX "child_content_review_queue_author_id_idx" ON "child_content_review_queue"("author_id");

-- AddForeignKey
ALTER TABLE "child_content_review_queue" ADD CONSTRAINT "child_content_review_queue_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_content_review_queue" ADD CONSTRAINT "child_content_review_queue_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "discussion_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_content_review_queue" ADD CONSTRAINT "child_content_review_queue_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_content_review_queue" ADD CONSTRAINT "child_content_review_queue_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
