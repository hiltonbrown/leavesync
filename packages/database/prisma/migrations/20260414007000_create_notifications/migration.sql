-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('sync_failed', 'feed_token_rotated', 'privacy_conflict', 'missing_alternative_contact');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "clerk_org_id" TEXT NOT NULL,
    "recipient_user_id" TEXT NOT NULL,
    "type" "notification_type" NOT NULL,
    "payload" JSONB NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "clerk_org_id" TEXT NOT NULL,
    "notification_type" "notification_type" NOT NULL,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_clerk_org_id_idx" ON "notifications"("clerk_org_id");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_is_read_idx" ON "notifications"("recipient_user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_created_at_idx" ON "notifications"("recipient_user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_clerk_org_id_notification_type_key" ON "notification_preferences"("user_id", "clerk_org_id", "notification_type");

-- CreateIndex
CREATE INDEX "notification_preferences_clerk_org_id_idx" ON "notification_preferences"("clerk_org_id");

-- CreateIndex
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences"("user_id");
