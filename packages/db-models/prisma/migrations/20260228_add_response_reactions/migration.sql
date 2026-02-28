-- CreateTable
CREATE TABLE "response_reactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "response_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "emoji" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "response_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "response_reactions_response_id_idx" ON "response_reactions"("response_id");

-- CreateIndex
CREATE INDEX "response_reactions_user_id_idx" ON "response_reactions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "response_reactions_response_id_user_id_emoji_key" ON "response_reactions"("response_id", "user_id", "emoji");

-- AddForeignKey
ALTER TABLE "response_reactions" ADD CONSTRAINT "response_reactions_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response_reactions" ADD CONSTRAINT "response_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
