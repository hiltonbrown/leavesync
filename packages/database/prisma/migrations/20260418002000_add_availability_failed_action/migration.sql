CREATE TYPE "availability_failed_action" AS ENUM ('submit', 'approve', 'decline', 'withdraw');

ALTER TYPE "availability_approval_status" ADD VALUE IF NOT EXISTS 'withdrawn';
ALTER TYPE "availability_approval_status" ADD VALUE IF NOT EXISTS 'xero_sync_failed';

ALTER TABLE "availability_records"
ADD COLUMN "failed_action" "availability_failed_action";

UPDATE "availability_records"
SET "failed_action" = 'submit'
WHERE "approval_status"::text = 'xero_sync_failed';

ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'leave_approved';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'leave_declined';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'leave_info_requested';
