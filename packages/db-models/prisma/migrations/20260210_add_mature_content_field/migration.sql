-- AlterTable - Add mature content flag to discussion_topics for child safety
ALTER TABLE "discussion_topics" ADD COLUMN "is_mature_content" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "discussion_topics_is_mature_content_idx" ON "discussion_topics"("is_mature_content");
