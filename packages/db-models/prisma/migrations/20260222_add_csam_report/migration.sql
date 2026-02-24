-- CreateEnum
CREATE TYPE "csam_detection_source" AS ENUM ('AI_DETECTION', 'USER_REPORT', 'MODERATOR_REVIEW', 'HASH_MATCH');

-- CreateEnum
CREATE TYPE "csam_report_status" AS ENUM ('PENDING_REVIEW', 'EVIDENCE_PRESERVED', 'SUBMITTED_NCMEC', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "csam_reports" (
    "id" UUID NOT NULL,
    "detection_source" "csam_detection_source" NOT NULL,
    "status" "csam_report_status" NOT NULL DEFAULT 'PENDING_REVIEW',
    "content_type" VARCHAR(50) NOT NULL,
    "content_id" UUID NOT NULL,
    "content_author_id" UUID,
    "evidence_s3_key" VARCHAR(500),
    "evidence_hash" VARCHAR(128),
    "ncmec_report_id" VARCHAR(50),
    "ncmec_submitted_at" TIMESTAMP(3),
    "internal_notes" TEXT,
    "is_legal_hold" BOOLEAN NOT NULL DEFAULT true,
    "reported_by_id" UUID,
    "ai_confidence_score" DECIMAL(3,2),
    "hash_match_details" JSONB,
    "ncmec_deadline" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "csam_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "csam_reports_status_ncmec_deadline_idx" ON "csam_reports"("status", "ncmec_deadline");

-- CreateIndex
CREATE INDEX "csam_reports_content_type_content_id_idx" ON "csam_reports"("content_type", "content_id");

-- CreateIndex
CREATE INDEX "csam_reports_ncmec_report_id_idx" ON "csam_reports"("ncmec_report_id");

-- CreateIndex
CREATE INDEX "csam_reports_is_legal_hold_idx" ON "csam_reports"("is_legal_hold");
