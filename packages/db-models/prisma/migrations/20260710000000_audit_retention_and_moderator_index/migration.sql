-- Issue #1325: index moderator/admin lookups (SLA-breach notification sweep
-- filters user_role IN ('MODERATOR','ADMIN') AND account_status = 'ACTIVE').
CREATE INDEX "users_user_role_account_status_idx" ON "users"("user_role", "account_status");

-- Issue #1324: compliance/deletion audit rows are retained for COPPA/GDPR legal
-- requirements, so a user hard-delete must not cascade them away. Switch the
-- foreign keys from ON DELETE CASCADE to ON DELETE RESTRICT.
ALTER TABLE "compliance_audit_logs" DROP CONSTRAINT "compliance_audit_logs_user_id_fkey";
ALTER TABLE "compliance_audit_logs" ADD CONSTRAINT "compliance_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "data_deletion_requests" DROP CONSTRAINT "data_deletion_requests_user_id_fkey";
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
