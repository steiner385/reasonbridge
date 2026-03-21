/*
  Warnings:

  - The `type` column on the `verification_tokens` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "verification_token_type" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- AlterTable
ALTER TABLE "verification_tokens" DROP COLUMN "type",
ADD COLUMN     "type" "verification_token_type" NOT NULL DEFAULT 'EMAIL_VERIFICATION';

-- DropEnum
DROP TYPE "VerificationTokenType";

-- CreateIndex
CREATE INDEX "verification_tokens_type_idx" ON "verification_tokens"("type");
