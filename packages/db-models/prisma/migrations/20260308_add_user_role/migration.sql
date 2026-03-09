-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "user_role" "user_role" NOT NULL DEFAULT 'USER';
