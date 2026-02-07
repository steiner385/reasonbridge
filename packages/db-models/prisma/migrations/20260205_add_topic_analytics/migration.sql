-- T039 [US5]: Add TopicAnalytics table for pre-aggregated metrics (Feature 016)

-- CreateTable
CREATE TABLE "topic_analytics" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "unique_viewers" INTEGER NOT NULL DEFAULT 0,
    "response_count" INTEGER NOT NULL DEFAULT 0,
    "participant_count" INTEGER NOT NULL DEFAULT 0,
    "new_participants" INTEGER NOT NULL DEFAULT 0,
    "avg_response_length" INTEGER NOT NULL DEFAULT 0,
    "engagement_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "peak_activity_hour" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "topic_analytics_topic_id_date_key" ON "topic_analytics"("topic_id", "date");

-- CreateIndex
CREATE INDEX "topic_analytics_topic_id_date_idx" ON "topic_analytics"("topic_id", "date" DESC);

-- CreateIndex
CREATE INDEX "topic_analytics_date_idx" ON "topic_analytics"("date");

-- AddForeignKey
ALTER TABLE "topic_analytics" ADD CONSTRAINT "topic_analytics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "discussion_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
