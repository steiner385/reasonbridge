-- CreateEnum: NotificationChannel
CREATE TYPE "NotificationChannel" AS ENUM (
  'IN_APP',
  'EMAIL',
  'PUSH',
  'SMS'
);

-- CreateEnum: NotificationDeliveryStatus
CREATE TYPE "NotificationDeliveryStatus" AS ENUM (
  'PENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'BOUNCED'
);

-- CreateTable: notifications
CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "body" TEXT NOT NULL,
  "action_url" VARCHAR(500),
  "metadata" JSONB,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notification_logs
CREATE TABLE "notification_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "notification_id" UUID,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "recipient_email" TEXT,
  "recipient_phone" TEXT,
  "external_id" TEXT,
  "error_message" TEXT,
  "metadata" JSONB,
  "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "delivered_at" TIMESTAMP(3),

  CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: notifications indexes
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex: notification_logs indexes
CREATE INDEX "notification_logs_notification_id_idx" ON "notification_logs"("notification_id");
CREATE INDEX "notification_logs_channel_status_idx" ON "notification_logs"("channel", "status");
CREATE INDEX "notification_logs_attempted_at_idx" ON "notification_logs"("attempted_at");

-- AddForeignKey: notifications -> users
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: notification_logs -> notifications
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_notification_id_fkey"
  FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
