-- AlterEnum
ALTER TYPE "verification_type" ADD VALUE 'VIDEO';

-- CreateTable
CREATE TABLE "video_uploads" (
    "id" UUID NOT NULL,
    "verification_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "s3_key" TEXT NOT NULL,
    "s3_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_uploads_verification_id_idx" ON "video_uploads"("verification_id");

-- CreateIndex
CREATE INDEX "video_uploads_user_id_idx" ON "video_uploads"("user_id");

-- CreateIndex
CREATE INDEX "video_uploads_expires_at_idx" ON "video_uploads"("expires_at");

-- AddForeignKey
ALTER TABLE "video_uploads" ADD CONSTRAINT "video_uploads_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "verification_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_uploads" ADD CONSTRAINT "video_uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
