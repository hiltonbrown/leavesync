CREATE TYPE "notification_email_status" AS ENUM ('queued', 'sent', 'failed');

ALTER TABLE "notifications"
  ADD COLUMN "organisation_id" UUID,
  ADD COLUMN "recipient_person_id" UUID,
  ADD COLUMN "title" TEXT,
  ADD COLUMN "body" TEXT,
  ADD COLUMN "action_url" TEXT,
  ADD COLUMN "object_type" TEXT,
  ADD COLUMN "object_id" UUID,
  ADD COLUMN "actor_user_id" TEXT,
  ADD COLUMN "read_at" TIMESTAMP(3);

UPDATE "notifications" AS n
SET
  "action_url" = COALESCE(n."payload"->>'action_url', n."payload"->>'actionUrl'),
  "actor_user_id" = COALESCE(n."payload"->>'actor_user_id', n."payload"->>'actorUserId'),
  "body" = COALESCE(
    n."payload"->'payload'->>'body',
    n."payload"->>'body',
    n."payload"->'payload'->>'message',
    n."payload"->>'message',
    'Review this notification.'
  ),
  "object_type" = COALESCE(n."payload"->>'object_type', n."payload"->>'objectType'),
  "read_at" = CASE WHEN n."is_read" THEN n."updated_at" ELSE NULL END,
  "title" = CASE n."type"
    WHEN 'leave_submitted' THEN 'Leave submitted for approval'
    WHEN 'leave_approved' THEN 'Leave approved'
    WHEN 'leave_declined' THEN 'Leave declined'
    WHEN 'leave_info_requested' THEN 'More information requested'
    WHEN 'leave_xero_sync_failed' THEN 'Xero sync failed'
    WHEN 'leave_withdrawn' THEN 'Leave withdrawn'
    WHEN 'sync_failed' THEN 'Sync failed'
    WHEN 'feed_token_rotated' THEN 'Feed token rotated'
    WHEN 'privacy_conflict' THEN 'Privacy conflict'
    WHEN 'missing_alternative_contact' THEN 'Missing alternative contact'
    ELSE 'Notification'
  END;

UPDATE "notifications" AS n
SET "object_id" = COALESCE(n."payload"->>'object_id', n."payload"->>'objectId')::UUID
WHERE COALESCE(n."payload"->>'object_id', n."payload"->>'objectId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

UPDATE "notifications" AS n
SET "organisation_id" = ar."organisation_id"
FROM "availability_records" AS ar
WHERE n."object_type" = 'availability_record'
  AND n."object_id" = ar."id";

UPDATE "notifications" AS n
SET "organisation_id" = f."organisation_id"
FROM "feeds" AS f
WHERE n."object_type" = 'feed'
  AND n."object_id" = f."id"
  AND f."organisation_id" IS NOT NULL;

UPDATE "notifications" AS n
SET "organisation_id" = sr."organisation_id"
FROM "sync_runs" AS sr
WHERE n."object_type" = 'sync_run'
  AND n."object_id" = sr."id";

UPDATE "notifications" AS n
SET "organisation_id" = fallback."id"
FROM LATERAL (
  SELECT o."id"
  FROM "organisations" AS o
  WHERE o."clerk_org_id" = n."clerk_org_id"
  ORDER BY o."created_at" ASC
  LIMIT 1
) AS fallback
WHERE n."organisation_id" IS NULL;

UPDATE "notifications" AS n
SET "recipient_person_id" = p."id"
FROM "people" AS p
WHERE n."organisation_id" = p."organisation_id"
  AND n."recipient_user_id" = p."clerk_user_id";

ALTER TABLE "notifications"
  ALTER COLUMN "organisation_id" SET NOT NULL,
  ALTER COLUMN "title" SET NOT NULL,
  ALTER COLUMN "body" SET NOT NULL,
  ALTER COLUMN "payload" DROP NOT NULL;

ALTER TABLE "notifications" DROP COLUMN "is_read";

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_organisation_id_fkey"
    FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "notifications_recipient_person_id_fkey"
    FOREIGN KEY ("recipient_person_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "notifications_recipient_user_id_is_read_idx";
CREATE INDEX "notifications_organisation_id_idx" ON "notifications"("organisation_id");
CREATE INDEX "notifications_recipient_person_id_idx" ON "notifications"("recipient_person_id");
CREATE INDEX "notifications_recipient_user_id_read_at_idx" ON "notifications"("recipient_user_id", "read_at");
CREATE INDEX "notifications_organisation_id_recipient_user_id_created_at_idx" ON "notifications"("organisation_id", "recipient_user_id", "created_at");

ALTER TABLE "notification_preferences"
  ADD COLUMN "organisation_id" UUID;

UPDATE "notification_preferences" AS np
SET "organisation_id" = fallback."id"
FROM LATERAL (
  SELECT o."id"
  FROM "organisations" AS o
  WHERE o."clerk_org_id" = np."clerk_org_id"
  ORDER BY o."created_at" ASC
  LIMIT 1
) AS fallback
WHERE np."organisation_id" IS NULL;

INSERT INTO "notification_preferences" (
  "id",
  "user_id",
  "clerk_org_id",
  "organisation_id",
  "notification_type",
  "in_app_enabled",
  "email_enabled",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  np."user_id",
  np."clerk_org_id",
  o."id",
  np."notification_type",
  np."in_app_enabled",
  np."email_enabled",
  np."created_at",
  np."updated_at"
FROM "notification_preferences" AS np
JOIN "organisations" AS o
  ON o."clerk_org_id" = np."clerk_org_id"
WHERE o."id" <> np."organisation_id"
ON CONFLICT DO NOTHING;

DROP INDEX IF EXISTS "notification_preferences_user_id_clerk_org_id_notification_type_key";

ALTER TABLE "notification_preferences"
  ALTER COLUMN "organisation_id" SET NOT NULL,
  ADD CONSTRAINT "notification_preferences_organisation_id_fkey"
    FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "notification_preferences_user_id_organisation_id_notification_type_key"
  ON "notification_preferences"("user_id", "organisation_id", "notification_type");
CREATE INDEX "notification_preferences_organisation_id_idx" ON "notification_preferences"("organisation_id");

CREATE TABLE "notification_email_queue" (
  "id" UUID NOT NULL,
  "clerk_org_id" TEXT NOT NULL,
  "organisation_id" UUID NOT NULL,
  "notification_id" UUID,
  "recipient_user_id" TEXT NOT NULL,
  "notification_type" "notification_type" NOT NULL,
  "email_template" TEXT NOT NULL,
  "recipient_email" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "action_url" TEXT,
  "unsubscribe_url" TEXT NOT NULL,
  "merge_data" JSONB,
  "status" "notification_email_status" NOT NULL DEFAULT 'queued',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notification_email_queue_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notification_email_queue"
  ADD CONSTRAINT "notification_email_queue_organisation_id_fkey"
    FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "notification_email_queue_notification_id_fkey"
    FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "notification_email_queue_clerk_org_id_idx" ON "notification_email_queue"("clerk_org_id");
CREATE INDEX "notification_email_queue_organisation_id_idx" ON "notification_email_queue"("organisation_id");
CREATE INDEX "notification_email_queue_notification_id_idx" ON "notification_email_queue"("notification_id");
CREATE INDEX "notification_email_queue_recipient_user_id_status_idx" ON "notification_email_queue"("recipient_user_id", "status");
CREATE INDEX "notification_email_queue_status_queued_at_idx" ON "notification_email_queue"("status", "queued_at");
