-- CreateEnum
CREATE TYPE "parent_consent_status" AS ENUM ('NOT_REQUIRED', 'PENDING', 'VERIFIED', 'WITHDRAWN');

-- AlterTable - Add child-friendly mode fields to users
ALTER TABLE "users" ADD COLUMN "birth_date" DATE;
ALTER TABLE "users" ADD COLUMN "is_minor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "declared_country" VARCHAR(2);
ALTER TABLE "users" ADD COLUMN "regional_consent_age" INTEGER;
ALTER TABLE "users" ADD COLUMN "parent_email" TEXT;
ALTER TABLE "users" ADD COLUMN "parent_consent_status" "parent_consent_status" NOT NULL DEFAULT 'NOT_REQUIRED';

-- CreateTable
CREATE TABLE "parental_consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "parent_email" TEXT NOT NULL,
    "consent_token" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "withdrawn_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parental_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parental_consents_user_id_key" ON "parental_consents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "parental_consents_consent_token_key" ON "parental_consents"("consent_token");

-- CreateIndex
CREATE INDEX "parental_consents_consent_token_idx" ON "parental_consents"("consent_token");

-- CreateIndex
CREATE INDEX "parental_consents_parent_email_idx" ON "parental_consents"("parent_email");

-- CreateIndex
CREATE INDEX "parental_consents_token_expires_at_idx" ON "parental_consents"("token_expires_at");

-- AddForeignKey
ALTER TABLE "parental_consents" ADD CONSTRAINT "parental_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
