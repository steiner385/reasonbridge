-- AlterTable
ALTER TABLE "verification_records" ADD COLUMN "otp_code" TEXT,
ADD COLUMN "otp_expires_at" TIMESTAMP(3),
ADD COLUMN "otp_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "phone_number" TEXT;

-- CreateIndex
CREATE INDEX "verification_records_phone_number_idx" ON "verification_records"("phone_number");
