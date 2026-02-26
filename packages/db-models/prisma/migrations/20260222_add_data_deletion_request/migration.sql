-- CreateEnum
CREATE TYPE "deletion_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "data_deletion_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "requested_by" VARCHAR(20) NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "status" "deletion_status" NOT NULL DEFAULT 'PENDING',
    "deletion_log" JSONB,

    CONSTRAINT "data_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_deletion_requests_user_id_key" ON "data_deletion_requests"("user_id");

-- CreateIndex
CREATE INDEX "data_deletion_requests_status_scheduled_for_idx" ON "data_deletion_requests"("status", "scheduled_for");

-- AddForeignKey
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
