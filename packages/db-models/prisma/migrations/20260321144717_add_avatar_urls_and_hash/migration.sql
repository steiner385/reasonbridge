-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_hash" TEXT,
ADD COLUMN     "avatar_urls" JSONB;
