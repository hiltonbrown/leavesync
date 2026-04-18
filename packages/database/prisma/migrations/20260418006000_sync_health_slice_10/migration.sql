ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'sync.reconciliation_complete';

CREATE TYPE "sync_run_status" AS ENUM (
  'running',
  'succeeded',
  'partial_success',
  'failed',
  'cancelled'
);

CREATE TYPE "sync_run_type" AS ENUM (
  'people',
  'leave_records',
  'leave_balances',
  'approval_state_reconciliation'
);

CREATE TYPE "sync_trigger_type" AS ENUM (
  'scheduled',
  'manual',
  'webhook'
);

CREATE TYPE "sync_failed_record_type" AS ENUM (
  'people',
  'leave_records',
  'leave_balances',
  'approval_state_reconciliation',
  'leave',
  'annual_leave',
  'personal_leave',
  'holiday',
  'sick_leave',
  'long_service_leave',
  'unpaid_leave',
  'public_holiday',
  'wfh',
  'travel',
  'travelling',
  'training',
  'client_site',
  'another_office',
  'offsite_meeting',
  'contractor_unavailable',
  'limited_availability',
  'alternative_contact',
  'other',
  'leave_request'
);

ALTER TABLE "xero_connections"
  ADD COLUMN "last_refreshed_at" TIMESTAMP(3);

UPDATE "xero_connections"
SET "last_refreshed_at" = "updated_at"
WHERE "last_refreshed_at" IS NULL;

ALTER TABLE "xero_tenants"
  ADD COLUMN "tenant_name" TEXT;

UPDATE "xero_tenants"
SET "tenant_name" = "xero_tenant_id"
WHERE "tenant_name" IS NULL;

ALTER TABLE "sync_runs"
  ADD COLUMN "run_type" "sync_run_type",
  ADD COLUMN "trigger_type" "sync_trigger_type" NOT NULL DEFAULT 'scheduled',
  ADD COLUMN "triggered_by_user_id" TEXT,
  ADD COLUMN "records_fetched" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "records_upserted" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "records_skipped" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "error_summary" TEXT,
  ADD COLUMN "cancel_requested_at" TIMESTAMP(3);

UPDATE "sync_runs"
SET
  "run_type" = CASE "entity_type"
    WHEN 'people' THEN 'people'::"sync_run_type"
    WHEN 'leave_records' THEN 'leave_records'::"sync_run_type"
    WHEN 'leave_balances' THEN 'leave_balances'::"sync_run_type"
    ELSE 'people'::"sync_run_type"
  END,
  "records_upserted" = COALESCE("records_synced", 0),
  "error_summary" = "error_message";

ALTER TABLE "sync_runs"
  ALTER COLUMN "run_type" SET NOT NULL,
  ALTER COLUMN "status" TYPE "sync_run_status"
    USING CASE
      WHEN "status" IN ('running', 'succeeded', 'partial_success', 'failed', 'cancelled')
        THEN "status"::"sync_run_status"
      WHEN "status" = 'success'
        THEN 'succeeded'::"sync_run_status"
      ELSE 'failed'::"sync_run_status"
    END,
  ALTER COLUMN "status" SET DEFAULT 'running';

ALTER TABLE "failed_records"
  ADD COLUMN "record_type" "sync_failed_record_type",
  ADD COLUMN "source_remote_id" TEXT,
  ADD COLUMN "error_code" TEXT NOT NULL DEFAULT 'unknown_error';

UPDATE "failed_records"
SET
  "record_type" = CASE "entity_type"
    WHEN 'people' THEN 'people'::"sync_failed_record_type"
    WHEN 'leave_records' THEN 'leave_records'::"sync_failed_record_type"
    WHEN 'leave_balances' THEN 'leave_balances'::"sync_failed_record_type"
    ELSE 'leave_records'::"sync_failed_record_type"
  END,
  "source_remote_id" = "source_id";

ALTER TABLE "failed_records"
  ALTER COLUMN "record_type" SET NOT NULL;

ALTER TABLE "sync_runs"
  ADD CONSTRAINT "sync_runs_xero_tenant_id_fkey"
    FOREIGN KEY ("xero_tenant_id") REFERENCES "xero_tenants"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "sync_runs_clerk_org_id_organisation_id_xero_tenant_id_run_type_status_started_at_idx"
ON "sync_runs"("clerk_org_id", "organisation_id", "xero_tenant_id", "run_type", "status", "started_at");

CREATE INDEX "failed_records_sync_run_id_created_at_idx"
ON "failed_records"("sync_run_id", "created_at");
