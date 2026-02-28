-- CreateTable
CREATE TABLE "user_topic_read_state" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "last_read_at" TIMESTAMP(3) NOT NULL,
    "last_response_id" UUID,

    CONSTRAINT "user_topic_read_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_topic_read_state_user_id_idx" ON "user_topic_read_state"("user_id");

-- CreateIndex
CREATE INDEX "user_topic_read_state_topic_id_idx" ON "user_topic_read_state"("topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_topic_read_state_user_id_topic_id_key" ON "user_topic_read_state"("user_id", "topic_id");

-- AddForeignKey
ALTER TABLE "user_topic_read_state" ADD CONSTRAINT "user_topic_read_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_topic_read_state" ADD CONSTRAINT "user_topic_read_state_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "discussion_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
