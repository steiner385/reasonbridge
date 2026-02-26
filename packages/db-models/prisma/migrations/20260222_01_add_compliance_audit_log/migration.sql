-- CreateTable
CREATE TABLE "compliance_audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "metadata" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_audit_logs_user_id_idx" ON "compliance_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "compliance_audit_logs_action_timestamp_idx" ON "compliance_audit_logs"("action", "timestamp");

-- AddForeignKey
ALTER TABLE "compliance_audit_logs" ADD CONSTRAINT "compliance_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
