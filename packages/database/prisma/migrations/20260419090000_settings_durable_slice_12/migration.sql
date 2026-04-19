ALTER TABLE "organisations"
  ADD COLUMN "region_code" TEXT;

CREATE TABLE "organisation_settings" (
  "id" UUID NOT NULL,
  "clerk_org_id" TEXT NOT NULL,
  "organisation_id" UUID NOT NULL,
  "show_pending_on_calendar" BOOLEAN NOT NULL DEFAULT true,
  "show_declined_on_approvals" BOOLEAN NOT NULL DEFAULT true,
  "notify_managers_on_status_change" BOOLEAN NOT NULL DEFAULT true,
  "manager_visibility_scope" TEXT NOT NULL DEFAULT 'direct_reports_only',
  "default_leave_request_advance_days" INTEGER NOT NULL DEFAULT 0,
  "require_decline_reason" BOOLEAN NOT NULL DEFAULT true,
  "default_privacy_mode" "availability_privacy_mode" NOT NULL DEFAULT 'named',
  "feeds_include_public_holidays_default" BOOLEAN NOT NULL DEFAULT false,
  "default_feed_privacy_mode" "availability_privacy_mode" NOT NULL DEFAULT 'named',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organisation_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organisation_settings_manager_visibility_scope_check"
    CHECK ("manager_visibility_scope" IN ('all_team_leave', 'direct_reports_only'))
);

CREATE UNIQUE INDEX "organisation_settings_organisation_id_key"
ON "organisation_settings"("organisation_id");

CREATE INDEX "organisation_settings_clerk_org_id_idx"
ON "organisation_settings"("clerk_org_id");

ALTER TABLE "organisation_settings"
  ADD CONSTRAINT "organisation_settings_organisation_id_fkey"
  FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "organisation_settings" (
  "id",
  "clerk_org_id",
  "organisation_id",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  "clerk_org_id",
  "id",
  CURRENT_TIMESTAMP
FROM "organisations";

ALTER TABLE "xero_tenants"
  ADD COLUMN "sync_paused_at" TIMESTAMP(3);

CREATE TABLE "clerk_org_subscriptions" (
  "id" UUID NOT NULL,
  "clerk_org_id" TEXT NOT NULL,
  "plan_key" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "current_period_end" TIMESTAMP(3),
  "seats_purchased" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "clerk_org_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clerk_org_subscriptions_plan_key_check"
    CHECK ("plan_key" IN ('free', 'pro', 'enterprise')),
  CONSTRAINT "clerk_org_subscriptions_status_check"
    CHECK ("status" IN ('active', 'past_due', 'cancelled', 'trialing'))
);

CREATE UNIQUE INDEX "clerk_org_subscriptions_clerk_org_id_key"
ON "clerk_org_subscriptions"("clerk_org_id");

CREATE INDEX "clerk_org_subscriptions_clerk_org_id_idx"
ON "clerk_org_subscriptions"("clerk_org_id");

CREATE TABLE "usage_counters" (
  "id" UUID NOT NULL,
  "clerk_org_id" TEXT NOT NULL,
  "metric_key" TEXT NOT NULL,
  "current_value" INTEGER NOT NULL DEFAULT 0,
  "period_start" TIMESTAMP(3) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usage_counters_clerk_org_id_metric_key_period_start_period_end_key"
ON "usage_counters"("clerk_org_id", "metric_key", "period_start", "period_end");

CREATE INDEX "usage_counters_clerk_org_id_idx"
ON "usage_counters"("clerk_org_id");

ALTER TABLE "audit_events"
  ADD COLUMN "actor_display" TEXT,
  ADD COLUMN "entity_type" TEXT,
  ADD COLUMN "entity_id" TEXT,
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "before_value" JSONB,
  ADD COLUMN "after_value" JSONB,
  ADD COLUMN "ip_address" TEXT,
  ADD COLUMN "user_agent" TEXT;

UPDATE "audit_events"
SET
  "entity_type" = "resource_type",
  "entity_id" = "resource_id",
  "metadata" = "payload"
WHERE "entity_type" IS NULL
   OR "entity_id" IS NULL
   OR "metadata" IS NULL;

CREATE INDEX "audit_events_organisation_id_entity_id_idx"
ON "audit_events"("organisation_id", "entity_id");

CREATE INDEX "audit_events_organisation_id_action_created_at_id_idx"
ON "audit_events"("organisation_id", "action", "created_at" DESC, "id" DESC);

CREATE INDEX "audit_events_organisation_id_entity_type_created_at_id_idx"
ON "audit_events"("organisation_id", "entity_type", "created_at" DESC, "id" DESC);
